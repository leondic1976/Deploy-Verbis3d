import { BufferAttribute, Geometry } from "../geometry/index.js";
import type {
  VisionAnalysis,
  VisionCameraPose,
  VisionColor,
  VisionViewAnalysis,
} from "./VisionTypes.js";

export interface VisualHullOptions {
  /** Cubic sampling resolution. Higher values improve detail and increase CPU/GPU cost cubically. */
  readonly resolution?: number;
  /** Maximum triangle count accepted from the generated surface. */
  readonly maximumTriangles?: number;
  /** Use normalized provider depth to reject voxels in front of observed surfaces. */
  readonly useDepth?: boolean;
  /** Allowed normalized distance in front of an observed depth surface. */
  readonly depthTolerance?: number;
  /** Cancel asynchronous carving and surface extraction. */
  readonly signal?: AbortSignal;
  /** Number of z slices processed before the asynchronous path yields to its host. */
  readonly yieldEverySlices?: number;
  /** Fine-grained voxel progress for diagnostics and UI feedback. */
  readonly onVoxelProgress?: (event: VisualHullProgress) => void;
}

export interface VisualHullProgress {
  readonly phase: "carving" | "surfacing";
  readonly progress: number;
}

export interface VisualHullResult {
  readonly geometry: Geometry;
  readonly color: VisionColor;
  readonly resolution: number;
  readonly occupiedVoxelCount: number;
  readonly triangleCount: number;
  readonly dimensions: readonly [number, number, number];
  readonly depthViewCount: number;
  readonly poseViewCount: number;
}

interface FaceDefinition {
  readonly neighbor: readonly [number, number, number];
  readonly normal: readonly [number, number, number];
  readonly corners: readonly (readonly [number, number, number])[];
}

interface PreparedHull {
  readonly resolution: number;
  readonly maximumTriangles: number;
  readonly dimensions: readonly [number, number, number];
  readonly occupied: Uint8Array;
  readonly useDepth: boolean;
  readonly depthTolerance: number;
  readonly yieldEverySlices: number;
}

interface SurfaceData {
  readonly positions: number[];
  readonly normals: number[];
  readonly indices: number[];
}

interface ProjectedSample {
  readonly u: number;
  readonly v: number;
  readonly depth: number;
  readonly fullFrame: boolean;
}

type VectorTuple = readonly [number, number, number];

const faces: readonly FaceDefinition[] = [
  {
    neighbor: [0, 0, 1],
    normal: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
  },
  {
    neighbor: [0, 0, -1],
    normal: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  },
  {
    neighbor: [1, 0, 0],
    normal: [1, 0, 0],
    corners: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
  },
  {
    neighbor: [-1, 0, 0],
    normal: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
  },
  {
    neighbor: [0, 1, 0],
    normal: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  {
    neighbor: [0, -1, 0],
    normal: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
  },
];

/** Deterministic visual-hull reconstruction from validated silhouettes, depth and camera poses. */
export class VisualHullReconstructor {
  /** Carve and surface a bounded voxel volume synchronously. */
  reconstruct(analysis: VisionAnalysis, options: VisualHullOptions = {}): VisualHullResult {
    const prepared = prepareHull(analysis, options);
    for (let z = 0; z < prepared.resolution; z += 1) {
      options.signal?.throwIfAborted();
      carveSlice(analysis.views, prepared, z);
      emitVoxelProgress(options, "carving", (z + 1) / prepared.resolution);
    }
    const occupiedVoxelCount = countOccupied(prepared.occupied);
    assertOccupied(occupiedVoxelCount);
    const surface = createSurfaceData();
    for (let z = 0; z < prepared.resolution; z += 1) {
      options.signal?.throwIfAborted();
      buildSurfaceSlice(prepared, surface, z);
      emitVoxelProgress(options, "surfacing", (z + 1) / prepared.resolution);
    }
    return createResult(analysis, prepared, surface, occupiedVoxelCount);
  }

  /**
   * Carve and surface while yielding between bounded slice batches.
   * This allows browser controls and AbortSignal cancellation to remain responsive.
   */
  async reconstructAsync(
    analysis: VisionAnalysis,
    options: VisualHullOptions = {},
  ): Promise<VisualHullResult> {
    const prepared = prepareHull(analysis, options);
    for (let z = 0; z < prepared.resolution; z += 1) {
      options.signal?.throwIfAborted();
      carveSlice(analysis.views, prepared, z);
      emitVoxelProgress(options, "carving", (z + 1) / prepared.resolution);
      if ((z + 1) % prepared.yieldEverySlices === 0) await yieldToHost();
    }
    const occupiedVoxelCount = countOccupied(prepared.occupied);
    assertOccupied(occupiedVoxelCount);
    const surface = createSurfaceData();
    for (let z = 0; z < prepared.resolution; z += 1) {
      options.signal?.throwIfAborted();
      buildSurfaceSlice(prepared, surface, z);
      emitVoxelProgress(options, "surfacing", (z + 1) / prepared.resolution);
      if ((z + 1) % prepared.yieldEverySlices === 0) await yieldToHost();
    }
    options.signal?.throwIfAborted();
    return createResult(analysis, prepared, surface, occupiedVoxelCount);
  }
}

function prepareHull(analysis: VisionAnalysis, options: VisualHullOptions): PreparedHull {
  const resolution = options.resolution ?? 20;
  if (!Number.isInteger(resolution) || resolution < 8 || resolution > 48) {
    throw new RangeError("Visual-hull resolution must be an integer in the 8..48 range.");
  }
  const maximumTriangles = options.maximumTriangles ?? 500_000;
  if (!Number.isInteger(maximumTriangles) || maximumTriangles < 12) {
    throw new RangeError("Visual-hull maximumTriangles must be an integer of at least 12.");
  }
  const depthTolerance = options.depthTolerance ?? 0.06;
  if (!Number.isFinite(depthTolerance) || depthTolerance < 0 || depthTolerance > 0.5) {
    throw new RangeError("Visual-hull depthTolerance must be in the 0..0.5 range.");
  }
  const yieldEverySlices = options.yieldEverySlices ?? 2;
  if (!Number.isInteger(yieldEverySlices) || yieldEverySlices < 1 || yieldEverySlices > 48) {
    throw new RangeError("Visual-hull yieldEverySlices must be an integer in the 1..48 range.");
  }
  return {
    resolution,
    maximumTriangles,
    dimensions: inferDimensions(analysis.views),
    occupied: new Uint8Array(resolution * resolution * resolution),
    useDepth: options.useDepth ?? true,
    depthTolerance,
    yieldEverySlices,
  };
}

function carveSlice(views: readonly VisionViewAnalysis[], prepared: PreparedHull, z: number): void {
  const { resolution } = prepared;
  for (let y = 0; y < resolution; y += 1) {
    for (let x = 0; x < resolution; x += 1) {
      const normalizedX = (x + 0.5) / resolution;
      const normalizedY = (y + 0.5) / resolution;
      const normalizedZ = (z + 0.5) / resolution;
      const visible = views.every((view) =>
        sampleView(view, normalizedX, normalizedY, normalizedZ, prepared),
      );
      if (visible) prepared.occupied[volumeIndex(x, y, z, resolution)] = 1;
    }
  }
}

function sampleView(
  analysis: VisionViewAnalysis,
  x: number,
  y: number,
  z: number,
  prepared: PreparedHull,
): boolean {
  const projected = analysis.cameraPose
    ? projectCameraPose(analysis.cameraPose, x, y, z, prepared.dimensions, analysis.mask)
    : projectCardinal(analysis, x, y, z);
  if (!projected || projected.u < 0 || projected.u > 1 || projected.v < 0 || projected.v > 1) {
    return false;
  }
  const { boundingBox, mask } = analysis;
  const imageU = projected.fullFrame
    ? projected.u
    : boundingBox.x + projected.u * boundingBox.width;
  const imageV = projected.fullFrame
    ? projected.v
    : boundingBox.y + projected.v * boundingBox.height;
  const pixelX = Math.min(mask.width - 1, Math.max(0, Math.floor(imageU * mask.width)));
  const pixelY = Math.min(mask.height - 1, Math.max(0, Math.floor(imageV * mask.height)));
  const pixelIndex = pixelY * mask.width + pixelX;
  if (mask.data[pixelIndex] === 0) return false;
  if (prepared.useDepth && analysis.depth) {
    const observedDepth = analysis.depth[pixelIndex] ?? 1;
    if (projected.depth + prepared.depthTolerance < observedDepth) return false;
  }
  return true;
}

function projectCardinal(
  analysis: VisionViewAnalysis,
  x: number,
  y: number,
  z: number,
): ProjectedSample {
  let u = x;
  let v = 1 - y;
  let depth = 1 - z;
  switch (analysis.view) {
    case "back":
      u = 1 - x;
      depth = z;
      break;
    case "left":
      u = z;
      depth = x;
      break;
    case "right":
      u = 1 - z;
      depth = 1 - x;
      break;
    case "top":
      u = x;
      v = z;
      depth = 1 - y;
      break;
    case "bottom":
      u = x;
      v = 1 - z;
      depth = y;
      break;
    case "front":
      break;
  }
  return { u, v, depth, fullFrame: false };
}

function projectCameraPose(
  pose: VisionCameraPose,
  x: number,
  y: number,
  z: number,
  dimensions: readonly [number, number, number],
  mask: VisionViewAnalysis["mask"],
): ProjectedSample | null {
  const point: VectorTuple = [
    -dimensions[0] / 2 + x * dimensions[0],
    -dimensions[1] / 2 + y * dimensions[1],
    -dimensions[2] / 2 + z * dimensions[2],
  ];
  const forward = normalize(subtract(pose.target, pose.position));
  const right = normalize(cross(forward, pose.up));
  const cameraUp = normalize(cross(right, forward));
  const relative = subtract(point, pose.position);
  const cameraX = dot(relative, right);
  const cameraY = dot(relative, cameraUp);
  const cameraZ = dot(relative, forward);
  if (cameraZ <= pose.near || cameraZ >= pose.far) return null;
  const tangent = Math.tan(pose.verticalFovRadians / 2);
  const aspect = mask.width / mask.height;
  const u = 0.5 + cameraX / (2 * cameraZ * tangent * aspect);
  const v = 0.5 - cameraY / (2 * cameraZ * tangent);
  const depth = (cameraZ - pose.near) / (pose.far - pose.near);
  return { u, v, depth, fullFrame: true };
}

function createSurfaceData(): SurfaceData {
  return { positions: [], normals: [], indices: [] };
}

function buildSurfaceSlice(prepared: PreparedHull, surface: SurfaceData, z: number): void {
  const { occupied, resolution, dimensions, maximumTriangles } = prepared;
  const voxelSize = dimensions.map((dimension) => dimension / resolution) as [
    number,
    number,
    number,
  ];
  for (let y = 0; y < resolution; y += 1) {
    for (let x = 0; x < resolution; x += 1) {
      if (occupied[volumeIndex(x, y, z, resolution)] === 0) continue;
      for (const face of faces) {
        const neighborX = x + face.neighbor[0];
        const neighborY = y + face.neighbor[1];
        const neighborZ = z + face.neighbor[2];
        const neighborOccupied =
          neighborX >= 0 &&
          neighborX < resolution &&
          neighborY >= 0 &&
          neighborY < resolution &&
          neighborZ >= 0 &&
          neighborZ < resolution &&
          occupied[volumeIndex(neighborX, neighborY, neighborZ, resolution)] !== 0;
        if (neighborOccupied) continue;
        if (surface.indices.length / 3 + 2 > maximumTriangles) {
          throw new RangeError(
            `Visual hull exceeds the ${maximumTriangles} triangle safety limit. Lower the resolution.`,
          );
        }
        const firstVertex = surface.positions.length / 3;
        for (const corner of face.corners) {
          surface.positions.push(
            -dimensions[0] / 2 + (x + corner[0]) * voxelSize[0],
            -dimensions[1] / 2 + (y + corner[1]) * voxelSize[1],
            -dimensions[2] / 2 + (z + corner[2]) * voxelSize[2],
          );
          surface.normals.push(...face.normal);
        }
        surface.indices.push(
          firstVertex,
          firstVertex + 1,
          firstVertex + 2,
          firstVertex,
          firstVertex + 2,
          firstVertex + 3,
        );
      }
    }
  }
}

function createResult(
  analysis: VisionAnalysis,
  prepared: PreparedHull,
  surface: SurfaceData,
  occupiedVoxelCount: number,
): VisualHullResult {
  const geometry = new Geometry()
    .setAttribute("position", new BufferAttribute(new Float32Array(surface.positions), 3))
    .setAttribute("normal", new BufferAttribute(new Float32Array(surface.normals), 3));
  const indexArray =
    surface.positions.length / 3 > 65_535
      ? new Uint32Array(surface.indices)
      : new Uint16Array(surface.indices);
  geometry.setIndex(indexArray);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return {
    geometry,
    color: averageColor(analysis.views),
    resolution: prepared.resolution,
    occupiedVoxelCount,
    triangleCount: surface.indices.length / 3,
    dimensions: prepared.dimensions,
    depthViewCount: analysis.views.filter((view) => view.depth !== undefined).length,
    poseViewCount: analysis.views.filter((view) => view.cameraPose !== undefined).length,
  };
}

function inferDimensions(views: readonly VisionViewAnalysis[]): readonly [number, number, number] {
  const frontRatios = views
    .filter((view) => view.view === "front" || view.view === "back")
    .map((view) => view.boundingBox.width / view.boundingBox.height);
  const sideRatios = views
    .filter((view) => view.view === "left" || view.view === "right")
    .map((view) => view.boundingBox.width / view.boundingBox.height);
  const topRatios = views
    .filter((view) => view.view === "top" || view.view === "bottom")
    .map((view) => view.boundingBox.width / view.boundingBox.height);
  let x = clampRatio(average(frontRatios, 1));
  const y = 1;
  let z = clampRatio(average(sideRatios, 1));
  if (topRatios.length > 0) {
    const topRatio = clampRatio(average(topRatios, 1));
    if (frontRatios.length === 0 && sideRatios.length > 0) x = z * topRatio;
    else if (sideRatios.length === 0) z = x / topRatio;
    else z = (z + x / topRatio) / 2;
  }
  const largest = Math.max(x, y, z);
  return [(x / largest) * 2, (y / largest) * 2, (z / largest) * 2];
}

function countOccupied(occupied: Uint8Array): number {
  return occupied.reduce((sum, value) => sum + value, 0);
}

function assertOccupied(occupiedVoxelCount: number): void {
  if (occupiedVoxelCount === 0) {
    throw new Error(
      "The supplied silhouettes, depth or camera poses do not overlap in 3D. Check calibration and view assignments.",
    );
  }
}

function emitVoxelProgress(
  options: VisualHullOptions,
  phase: VisualHullProgress["phase"],
  progress: number,
): void {
  options.onVoxelProgress?.({ phase, progress });
}

function yieldToHost(): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, 0));
}

function average(values: readonly number[], fallback: number): number {
  return values.length === 0
    ? fallback
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampRatio(value: number): number {
  return Math.min(4, Math.max(0.15, value));
}

function averageColor(views: readonly VisionViewAnalysis[]): VisionColor {
  const totalWeight = views.reduce((sum, view) => sum + view.confidence, 0) || 1;
  const component = (index: number): number =>
    views.reduce((sum, view) => sum + (view.foregroundColor[index] ?? 0) * view.confidence, 0) /
    totalWeight;
  return [component(0), component(1), component(2), component(3)];
}

function subtract(a: VectorTuple, b: VectorTuple): VectorTuple {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: VectorTuple, b: VectorTuple): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: VectorTuple, b: VectorTuple): VectorTuple {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(value: VectorTuple): VectorTuple {
  const magnitude = Math.hypot(value[0], value[1], value[2]);
  if (magnitude < 1e-12) return [0, 0, 0];
  return [value[0] / magnitude, value[1] / magnitude, value[2] / magnitude];
}

function volumeIndex(x: number, y: number, z: number, resolution: number): number {
  return x + resolution * (y + resolution * z);
}
