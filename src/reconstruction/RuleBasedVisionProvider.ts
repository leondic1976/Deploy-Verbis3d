import type { VisionAIProvider } from "./VisionAIProvider.js";
import type {
  NormalizedBoundingBox,
  VisionAnalysis,
  VisionAnalyzeOptions,
  VisionColor,
  VisionPhoto,
  VisionViewAnalysis,
} from "./VisionTypes.js";
import { validateVisionPhotos } from "./VisionValidation.js";

const MASK_LIMIT = 128;

/**
 * Offline foreground recognizer for controlled captures with a mostly uniform background.
 * It provides a deterministic baseline and never uploads source photographs.
 */
export class RuleBasedVisionProvider implements VisionAIProvider {
  readonly id = "offline-silhouette";
  readonly name = "Offline silhouette";
  readonly capabilities = new Set(["recognition", "segmentation"] as const);

  /** Segment decoded RGBA photos locally without network access. */
  analyze(
    photos: readonly VisionPhoto[],
    options: VisionAnalyzeOptions = {},
  ): Promise<VisionAnalysis> {
    validateVisionPhotos(photos);
    options.signal?.throwIfAborted();
    const threshold = Math.min(180, Math.max(5, options.segmentationThreshold ?? 46));
    const views = photos.map((photo) => analyzePhoto(photo, threshold));
    const label = options.objectHint?.trim() || inferLabel(views);
    const confidence = views.reduce((sum, view) => sum + view.confidence, 0) / views.length;
    return Promise.resolve({
      label,
      confidence,
      views,
      warnings: [
        "Offline segmentation assumes a contrasting, mostly uniform background.",
        "Assign each photograph's capture direction before reconstruction.",
      ],
    });
  }
}

function analyzePhoto(photo: VisionPhoto, threshold: number): VisionViewAnalysis {
  const pixels = photo.pixels;
  if (!pixels) {
    throw new TypeError(`Offline vision requires decoded RGBA pixels for photo '${photo.id}'.`);
  }
  const scale = Math.min(1, MASK_LIMIT / Math.max(photo.width, photo.height));
  const width = Math.max(4, Math.round(photo.width * scale));
  const height = Math.max(4, Math.round(photo.height * scale));
  const background = estimateBackground(photo, pixels);
  const rawMask = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(photo.height - 1, Math.floor(((y + 0.5) / height) * photo.height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(photo.width - 1, Math.floor(((x + 0.5) / width) * photo.width));
      const offset = (sourceY * photo.width + sourceX) * 4;
      const alpha = pixels[offset + 3] ?? 0;
      const distance = colorDistance(
        pixels[offset] ?? 0,
        pixels[offset + 1] ?? 0,
        pixels[offset + 2] ?? 0,
        background,
      );
      rawMask[y * width + x] = alpha > 24 && distance >= threshold ? 255 : 0;
    }
  }

  const mask = cleanMask(rawMask, width, height);
  const bounds = findBounds(mask, width, height, photo.id);
  const foregroundColor = estimateForegroundColor(photo, pixels, mask, width, height);
  const foregroundPixels = mask.reduce((sum, value) => sum + (value === 0 ? 0 : 1), 0);
  const occupancy = foregroundPixels / mask.length;
  const contrastConfidence = Math.min(1, threshold / 64);
  const occupancyConfidence = occupancy > 0.01 && occupancy < 0.9 ? 1 : 0.45;
  return {
    photoId: photo.id,
    view: photo.view,
    confidence: Math.min(0.92, 0.55 + contrastConfidence * 0.2 + occupancyConfidence * 0.17),
    boundingBox: bounds,
    foregroundColor,
    mask: { width, height, data: mask },
  };
}

function estimateBackground(
  photo: VisionPhoto,
  pixels: Uint8ClampedArray,
): readonly [number, number, number] {
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  const step = Math.max(1, Math.floor(Math.max(photo.width, photo.height) / 64));
  const sample = (x: number, y: number): void => {
    const offset = (y * photo.width + x) * 4;
    red += pixels[offset] ?? 0;
    green += pixels[offset + 1] ?? 0;
    blue += pixels[offset + 2] ?? 0;
    count += 1;
  };
  for (let x = 0; x < photo.width; x += step) {
    sample(x, 0);
    sample(x, photo.height - 1);
  }
  for (let y = step; y < photo.height - step; y += step) {
    sample(0, y);
    sample(photo.width - 1, y);
  }
  return [red / count, green / count, blue / count];
}

function colorDistance(
  red: number,
  green: number,
  blue: number,
  background: readonly [number, number, number],
): number {
  return Math.hypot(red - background[0], green - background[1], blue - background[2]);
}

function cleanMask(source: Uint8Array, width: number, height: number): Uint8Array {
  const result = source.slice();
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let neighbors = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (source[(y + offsetY) * width + x + offsetX] !== 0) neighbors += 1;
        }
      }
      const index = y * width + x;
      result[index] = source[index] === 0 ? (neighbors >= 7 ? 255 : 0) : neighbors >= 3 ? 255 : 0;
    }
  }
  return result;
}

function findBounds(
  mask: Uint8Array,
  width: number,
  height: number,
  photoId: string,
): NormalizedBoundingBox {
  let minimumX = width;
  let minimumY = height;
  let maximumX = -1;
  let maximumY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 0) continue;
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
    }
  }
  if (maximumX < minimumX || maximumY < minimumY) {
    throw new Error(
      `No foreground was detected in photo '${photoId}'. Use a contrasting background or an AI provider.`,
    );
  }
  return {
    x: minimumX / width,
    y: minimumY / height,
    width: (maximumX - minimumX + 1) / width,
    height: (maximumY - minimumY + 1) / height,
  };
}

function estimateForegroundColor(
  photo: VisionPhoto,
  pixels: Uint8ClampedArray,
  mask: Uint8Array,
  maskWidth: number,
  maskHeight: number,
): VisionColor {
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (let y = 0; y < maskHeight; y += 1) {
    for (let x = 0; x < maskWidth; x += 1) {
      if (mask[y * maskWidth + x] === 0) continue;
      const sourceX = Math.min(photo.width - 1, Math.floor(((x + 0.5) / maskWidth) * photo.width));
      const sourceY = Math.min(
        photo.height - 1,
        Math.floor(((y + 0.5) / maskHeight) * photo.height),
      );
      const offset = (sourceY * photo.width + sourceX) * 4;
      red += pixels[offset] ?? 0;
      green += pixels[offset + 1] ?? 0;
      blue += pixels[offset + 2] ?? 0;
      count += 1;
    }
  }
  if (count === 0) return [0.65, 0.7, 0.76, 1];
  return [red / count / 255, green / count / 255, blue / count / 255, 1];
}

function inferLabel(views: readonly VisionViewAnalysis[]): string {
  const frontViews = views.filter((view) => view.view === "front" || view.view === "back");
  const candidates = frontViews.length > 0 ? frontViews : views;
  const aspect =
    candidates.reduce((sum, view) => sum + view.boundingBox.width / view.boundingBox.height, 0) /
    candidates.length;
  if (aspect >= 1.45) return "car-like object";
  if (aspect <= 0.72) return "person-like object";
  return "recognized object";
}
