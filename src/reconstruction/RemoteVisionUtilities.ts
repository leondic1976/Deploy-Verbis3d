import type {
  NormalizedBoundingBox,
  VisionAnalysis,
  VisionColor,
  VisionPhoto,
  VisionViewAnalysis,
} from "./VisionTypes.js";

const REMOTE_MASK_SIZE = 96;

/** Prompt shared by multimodal adapters. It requests bounded data rather than executable content. */
export function visionAnalysisPrompt(photos: readonly VisionPhoto[], objectHint?: string): string {
  const imageOrder = photos
    .map((photo, index) => `${index + 1}:${photo.id}:${photo.view}`)
    .join(", ");
  return [
    "Analyze the same foreground object across all supplied images.",
    objectHint ? `Object hint: ${objectHint}.` : "Identify the most likely object category.",
    `Image order is ${imageOrder}.`,
    "Return JSON only with label, confidence, warnings, and views.",
    "Each view must contain photoId, confidence, foregroundColor as four 0..1 numbers,",
    "and silhouette as 8..64 clockwise [x,y] points normalized to the full image.",
    "Do not return code, markdown, URLs, prose outside JSON, or instructions.",
  ].join(" ");
}

/** Parse the restricted polygon schema produced by remote multimodal providers. */
export function parseRemoteVisionJSON(
  content: string,
  photos: readonly VisionPhoto[],
): VisionAnalysis {
  if (content.length > 1_000_000) throw new RangeError("Vision provider response is too large.");
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const value: unknown = JSON.parse(fenced?.[1] ?? content);
  const record = asRecord(value, "Vision provider response");
  const label = asString(record["label"], "label");
  const confidence = asUnit(record["confidence"], "confidence");
  const rawViews = record["views"];
  if (!Array.isArray(rawViews)) throw new TypeError("Vision provider views must be an array.");
  const photoById = new Map(photos.map((photo) => [photo.id, photo]));
  const views = rawViews.map((entry) => parseRemoteView(entry, photoById));
  const rawWarnings = record["warnings"];
  const warnings = Array.isArray(rawWarnings)
    ? rawWarnings.map((warning) => asString(warning, "warning"))
    : [];
  return { label, confidence, views, warnings };
}

/** Extract raw base64 bytes from a browser data URL for Ollama's image array. */
export function dataUrlBase64(photo: VisionPhoto): string {
  const match = photo.dataUrl?.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=]+)$/);
  if (!match?.[1]) {
    throw new TypeError(`Remote vision requires a base64 image data URL for photo '${photo.id}'.`);
  }
  return match[1];
}

function parseRemoteView(
  value: unknown,
  photoById: ReadonlyMap<string, VisionPhoto>,
): VisionViewAnalysis {
  const record = asRecord(value, "Vision provider view");
  const photoId = asString(record["photoId"], "photoId");
  const photo = photoById.get(photoId);
  if (!photo) throw new Error(`Vision provider referenced unknown photo '${photoId}'.`);
  const confidence = asUnit(record["confidence"], `View '${photoId}' confidence`);
  const color = parseColor(record["foregroundColor"], photoId);
  const polygon = parsePolygon(record["silhouette"], photoId);
  const boundingBox = polygonBounds(polygon);
  const mask = rasterizePolygon(polygon, REMOTE_MASK_SIZE, REMOTE_MASK_SIZE);
  return {
    photoId,
    view: photo.view,
    confidence,
    boundingBox,
    foregroundColor: color,
    mask: { width: REMOTE_MASK_SIZE, height: REMOTE_MASK_SIZE, data: mask },
  };
}

function parsePolygon(value: unknown, photoId: string): ReadonlyArray<readonly [number, number]> {
  if (!Array.isArray(value) || value.length < 3 || value.length > 128) {
    throw new RangeError(`View '${photoId}' silhouette requires 3..128 normalized points.`);
  }
  return value.map((point) => {
    if (!Array.isArray(point) || point.length !== 2) {
      throw new TypeError(`View '${photoId}' silhouette points must be [x,y] pairs.`);
    }
    return [
      asUnit(point[0], `View '${photoId}' silhouette x`),
      asUnit(point[1], `View '${photoId}' silhouette y`),
    ] as const;
  });
}

function parseColor(value: unknown, photoId: string): VisionColor {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new TypeError(`View '${photoId}' foregroundColor must contain four components.`);
  }
  return [
    asUnit(value[0], "foreground red"),
    asUnit(value[1], "foreground green"),
    asUnit(value[2], "foreground blue"),
    asUnit(value[3], "foreground alpha"),
  ];
}

function polygonBounds(polygon: ReadonlyArray<readonly [number, number]>): NormalizedBoundingBox {
  const xs = polygon.map((point) => point[0]);
  const ys = polygon.map((point) => point[1]);
  const minimumX = Math.min(...xs);
  const minimumY = Math.min(...ys);
  return {
    x: minimumX,
    y: minimumY,
    width: Math.max(1 / REMOTE_MASK_SIZE, Math.max(...xs) - minimumX),
    height: Math.max(1 / REMOTE_MASK_SIZE, Math.max(...ys) - minimumY),
  };
}

function rasterizePolygon(
  polygon: ReadonlyArray<readonly [number, number]>,
  width: number,
  height: number,
): Uint8Array {
  const result = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pointX = (x + 0.5) / width;
      const pointY = (y + 0.5) / height;
      if (pointInPolygon(pointX, pointY, polygon)) result[y * width + x] = 255;
    }
  }
  return result;
}

function pointInPolygon(
  x: number,
  y: number,
  polygon: ReadonlyArray<readonly [number, number]>,
): boolean {
  let inside = false;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1
  ) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    if (!currentPoint || !previousPoint) continue;
    const intersects =
      currentPoint[1] > y !== previousPoint[1] > y &&
      x <
        ((previousPoint[0] - currentPoint[0]) * (y - currentPoint[1])) /
          (previousPoint[1] - currentPoint[1]) +
          currentPoint[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 500) {
    throw new TypeError(`Vision provider ${label} must be a non-empty string.`);
  }
  return value.trim();
}

function asUnit(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} must be a number in the 0..1 range.`);
  }
  return value;
}
