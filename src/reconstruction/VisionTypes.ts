/** Cardinal capture directions supported by the deterministic visual-hull backend. */
export const PHOTO_VIEWS = ["front", "back", "left", "right", "top", "bottom"] as const;

/** Direction from which a source photo observes the object. */
export type PhotoView = (typeof PHOTO_VIEWS)[number];

/** Capabilities that a vision provider can advertise to a reconstruction pipeline. */
export type VisionCapability =
  "recognition" | "segmentation" | "depth-estimation" | "camera-pose" | "mesh-generation";

/** RGBA color represented with normalized 0..1 components. */
export type VisionColor = readonly [number, number, number, number];

/** A decoded source photograph. Pixels are required by local providers and dataUrl by remote ones. */
export interface VisionPhoto {
  readonly id: string;
  readonly view: PhotoView;
  readonly width: number;
  readonly height: number;
  readonly pixels?: Uint8ClampedArray;
  readonly dataUrl?: string;
  readonly fileName?: string;
}

/** Normalized rectangle where every component is expressed in the 0..1 image range. */
export interface NormalizedBoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Binary foreground mask. A non-zero byte means that the pixel belongs to the object. */
export interface VisionMask {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

/**
 * Calibrated perspective camera expressed in normalized reconstruction space.
 * The object is centered at the origin and fits inside a two-unit bounding cube.
 */
export interface VisionCameraPose {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly up: readonly [number, number, number];
  readonly verticalFovRadians: number;
  readonly near: number;
  readonly far: number;
  readonly confidence: number;
}

/** Validated analysis for one photograph. */
export interface VisionViewAnalysis {
  readonly photoId: string;
  readonly view: PhotoView;
  readonly confidence: number;
  readonly boundingBox: NormalizedBoundingBox;
  readonly foregroundColor: VisionColor;
  readonly mask: VisionMask;
  readonly depth?: Float32Array;
  readonly cameraPose?: VisionCameraPose;
}

/** Provider-neutral recognition and segmentation output. */
export interface VisionAnalysis {
  readonly label: string;
  readonly confidence: number;
  readonly views: readonly VisionViewAnalysis[];
  readonly warnings: readonly string[];
}

/** Options shared by local, hosted and application-defined vision providers. */
export interface VisionAnalyzeOptions {
  readonly objectHint?: string;
  readonly segmentationThreshold?: number;
  readonly signal?: AbortSignal;
}

/** Sanitized indexed triangle mesh supplied by an optional AI mesh-generation provider. */
export interface ReconstructionMeshData {
  readonly positions: Float32Array;
  readonly normals?: Float32Array;
  readonly indices: Uint16Array | Uint32Array;
  readonly color?: VisionColor;
}

/** A progress event emitted at stable reconstruction pipeline boundaries. */
export interface ReconstructionProgress {
  readonly stage:
    "validating" | "analyzing" | "enhancing" | "reconstructing" | "projecting" | "complete";
  readonly progress: number;
  readonly message: string;
}
