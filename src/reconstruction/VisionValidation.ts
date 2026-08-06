import { PHOTO_VIEWS } from "./VisionTypes.js";
import type {
  NormalizedBoundingBox,
  ReconstructionMeshData,
  VisionAnalysis,
  VisionColor,
  VisionMask,
  VisionPhoto,
  VisionViewAnalysis,
} from "./VisionTypes.js";

/** Resource limits applied before local or remote vision work starts. */
export interface VisionInputLimits {
  readonly minimumPhotos: number;
  readonly maximumPhotos: number;
  readonly maximumDimension: number;
  readonly maximumTotalPixels: number;
  readonly maximumDataUrlBytes: number;
}

export const DEFAULT_VISION_INPUT_LIMITS: VisionInputLimits = Object.freeze({
  minimumPhotos: 2,
  maximumPhotos: 12,
  maximumDimension: 4096,
  maximumTotalPixels: 48_000_000,
  maximumDataUrlBytes: 32_000_000,
});

const viewAxes = new Map([
  ["front", "z"],
  ["back", "z"],
  ["left", "x"],
  ["right", "x"],
  ["top", "y"],
  ["bottom", "y"],
] as const);

/** Validate untrusted photo metadata and enforce a useful multi-view capture set. */
export function validateVisionPhotos(
  photos: readonly VisionPhoto[],
  limits: VisionInputLimits = DEFAULT_VISION_INPUT_LIMITS,
): void {
  if (photos.length < limits.minimumPhotos || photos.length > limits.maximumPhotos) {
    throw new RangeError(
      `Photo reconstruction requires ${limits.minimumPhotos}..${limits.maximumPhotos} photos.`,
    );
  }

  const ids = new Set<string>();
  const axes = new Set<string>();
  let totalPixels = 0;
  let totalDataUrlBytes = 0;
  for (const photo of photos) {
    if (!photo.id.trim()) throw new TypeError("Every vision photo requires a non-empty id.");
    if (ids.has(photo.id)) throw new Error(`Duplicate vision photo id '${photo.id}'.`);
    ids.add(photo.id);
    if (!PHOTO_VIEWS.includes(photo.view))
      throw new TypeError(`Unsupported photo view '${photo.view}'.`);
    axes.add(viewAxes.get(photo.view) ?? "");
    if (
      !Number.isInteger(photo.width) ||
      !Number.isInteger(photo.height) ||
      photo.width <= 0 ||
      photo.height <= 0 ||
      photo.width > limits.maximumDimension ||
      photo.height > limits.maximumDimension
    ) {
      throw new RangeError(
        `Photo '${photo.id}' dimensions must be positive integers up to ${limits.maximumDimension}.`,
      );
    }
    const pixelCount = photo.width * photo.height;
    totalPixels += pixelCount;
    if (photo.pixels && photo.pixels.length !== pixelCount * 4) {
      throw new RangeError(`Photo '${photo.id}' RGBA pixel length does not match its dimensions.`);
    }
    if (!photo.pixels && !photo.dataUrl) {
      throw new TypeError(`Photo '${photo.id}' requires decoded pixels or a data URL.`);
    }
    totalDataUrlBytes += photo.dataUrl?.length ?? 0;
  }
  if (axes.size < 2) {
    throw new Error("Use photos from at least two perpendicular directions to recover 3D volume.");
  }
  if (totalPixels > limits.maximumTotalPixels) {
    throw new RangeError(`Photo set exceeds the ${limits.maximumTotalPixels} pixel safety limit.`);
  }
  if (totalDataUrlBytes > limits.maximumDataUrlBytes) {
    throw new RangeError(
      `Photo set exceeds the ${limits.maximumDataUrlBytes} byte data URL limit.`,
    );
  }
}

/** Validate provider-produced masks, colors, confidence and photo correspondence. */
export function validateVisionAnalysis(
  analysis: VisionAnalysis,
  photos: readonly VisionPhoto[],
): VisionAnalysis {
  if (!analysis.label.trim() || analysis.label.length > 120) {
    throw new TypeError("Vision analysis label must contain 1..120 characters.");
  }
  assertUnit(analysis.confidence, "Vision analysis confidence");
  if (analysis.warnings.length > 32 || analysis.warnings.some((value) => value.length > 500)) {
    throw new RangeError("Vision analysis warnings exceed the supported limits.");
  }
  const expected = new Map(photos.map((photo) => [photo.id, photo]));
  const received = new Set<string>();
  if (analysis.views.length !== photos.length) {
    throw new Error("Vision provider must return exactly one view analysis per source photo.");
  }
  for (const view of analysis.views) {
    const photo = expected.get(view.photoId);
    if (!photo || photo.view !== view.view) {
      throw new Error(`Vision provider returned an unknown or mismatched photo '${view.photoId}'.`);
    }
    if (received.has(view.photoId)) {
      throw new Error(`Vision provider returned duplicate analysis for '${view.photoId}'.`);
    }
    received.add(view.photoId);
    validateView(view);
  }
  return analysis;
}

/** Validate provider-supplied triangle data before creating GPU-facing resources. */
export function validateReconstructionMeshData(mesh: ReconstructionMeshData): void {
  if (mesh.positions.length < 9 || mesh.positions.length % 3 !== 0) {
    throw new RangeError(
      "Reconstruction positions must contain complete triangles or indexed vertices.",
    );
  }
  if (mesh.positions.length > 3_000_000) {
    throw new RangeError("Reconstruction exceeds the one-million-vertex safety limit.");
  }
  if (mesh.normals && mesh.normals.length !== mesh.positions.length) {
    throw new RangeError("Reconstruction normals must match the position array length.");
  }
  if (mesh.normals) {
    for (const value of mesh.normals) {
      if (!Number.isFinite(value) || Math.abs(value) > 1_000) {
        throw new RangeError("Reconstruction normals must be finite and within safe bounds.");
      }
    }
  }
  if (mesh.indices.length < 3 || mesh.indices.length % 3 !== 0) {
    throw new RangeError("Reconstruction indices must contain complete triangles.");
  }
  if (mesh.indices.length > 6_000_000) {
    throw new RangeError("Reconstruction exceeds the two-million-triangle safety limit.");
  }
  const vertexCount = mesh.positions.length / 3;
  for (const value of mesh.positions) {
    if (!Number.isFinite(value) || Math.abs(value) > 100_000) {
      throw new RangeError("Reconstruction positions must be finite and within safe bounds.");
    }
  }
  for (const index of mesh.indices) {
    if (index >= vertexCount) throw new RangeError("Reconstruction index exceeds vertex count.");
  }
  if (mesh.color) validateColor(mesh.color, "Reconstruction color");
}

function validateView(view: VisionViewAnalysis): void {
  assertUnit(view.confidence, `View '${view.photoId}' confidence`);
  validateBox(view.boundingBox, view.photoId);
  validateColor(view.foregroundColor, `View '${view.photoId}' color`);
  validateMask(view.mask, view.photoId);
  if (view.depth) {
    if (view.depth.length !== view.mask.data.length) {
      throw new RangeError(`View '${view.photoId}' depth length must match its mask.`);
    }
    for (const value of view.depth) {
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        throw new RangeError(`View '${view.photoId}' depth values must be in the 0..1 range.`);
      }
    }
  }
}

function validateMask(mask: VisionMask, photoId: string): void {
  if (
    !Number.isInteger(mask.width) ||
    !Number.isInteger(mask.height) ||
    mask.width < 4 ||
    mask.height < 4 ||
    mask.width > 512 ||
    mask.height > 512 ||
    mask.data.length !== mask.width * mask.height
  ) {
    throw new RangeError(`View '${photoId}' contains an invalid segmentation mask.`);
  }
  if (!mask.data.some((value) => value !== 0)) {
    throw new Error(`View '${photoId}' segmentation mask contains no foreground.`);
  }
}

function validateBox(box: NormalizedBoundingBox, photoId: string): void {
  for (const value of [box.x, box.y, box.width, box.height]) {
    if (!Number.isFinite(value)) throw new RangeError(`View '${photoId}' box must be finite.`);
  }
  if (
    box.x < 0 ||
    box.y < 0 ||
    box.width <= 0 ||
    box.height <= 0 ||
    box.x + box.width > 1.000_001 ||
    box.y + box.height > 1.000_001
  ) {
    throw new RangeError(`View '${photoId}' box must fit inside the normalized image.`);
  }
}

function validateColor(color: VisionColor, label: string): void {
  for (const value of color) assertUnit(value, label);
}

function assertUnit(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} must be in the 0..1 range.`);
  }
}
