import { BufferAttribute, Geometry } from "../geometry/index.js";
import type { VisionAnalysis, VisionColor, VisionViewAnalysis } from "./VisionTypes.js";

export interface VisualHullOptions {
  /** Cubic sampling resolution. Higher values improve detail and increase CPU/GPU cost cubically. */
  readonly resolution?: number;
  /** Maximum triangle count accepted from the generated surface. */
  readonly maximumTriangles?: number;
}

export interface VisualHullResult {
  readonly geometry: Geometry;
  readonly color: VisionColor;
  readonly resolution: number;
  readonly occupiedVoxelCount: number;
  readonly triangleCount: number;
  readonly dimensions: readonly [number, number, number];
}

interface FaceDefinition {
  readonly neighbor: readonly [number, number, number];
  readonly normal: readonly [number, number, number];
  readonly corners: readonly (readonly [number, number, number])[];
}

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

/** Deterministic visual-hull reconstruction from validated cardinal-view silhouettes. */
export class VisualHullReconstructor {
  /** Carve and surface a bounded voxel volume from validated cardinal-view masks. */
  reconstruct(analysis: VisionAnalysis, options: VisualHullOptions = {}): VisualHullResult {
    const resolution = options.resolution ?? 20;
    if (!Number.isInteger(resolution) || resolution < 8 || resolution > 48) {
      throw new RangeError("Visual-hull resolution must be an integer in the 8..48 range.");
    }
    const maximumTriangles = options.maximumTriangles ?? 500_000;
    if (!Number.isInteger(maximumTriangles) || maximumTriangles < 12) {
      throw new RangeError("Visual-hull maximumTriangles must be an integer of at least 12.");
    }
    const dimensions = inferDimensions(analysis.views);
    const occupied = carveVolume(analysis.views, resolution);
    const occupiedVoxelCount = occupied.reduce((sum, value) => sum + value, 0);
    if (occupiedVoxelCount === 0) {
      throw new Error(
        "The supplied silhouettes do not overlap in 3D. Check view assignments and object framing.",
      );
    }
    const surface = buildSurface(occupied, resolution, dimensions, maximumTriangles);
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
      resolution,
      occupiedVoxelCount,
      triangleCount: surface.indices.length / 3,
      dimensions,
    };
  }
}

function carveVolume(views: readonly VisionViewAnalysis[], resolution: number): Uint8Array {
  const occupied = new Uint8Array(resolution * resolution * resolution);
  for (let z = 0; z < resolution; z += 1) {
    for (let y = 0; y < resolution; y += 1) {
      for (let x = 0; x < resolution; x += 1) {
        const normalizedX = (x + 0.5) / resolution;
        const normalizedY = (y + 0.5) / resolution;
        const normalizedZ = (z + 0.5) / resolution;
        const visible = views.every((view) =>
          sampleView(view, normalizedX, normalizedY, normalizedZ),
        );
        if (visible) occupied[volumeIndex(x, y, z, resolution)] = 1;
      }
    }
  }
  return occupied;
}

function sampleView(analysis: VisionViewAnalysis, x: number, y: number, z: number): boolean {
  let u = x;
  let v = 1 - y;
  switch (analysis.view) {
    case "back":
      u = 1 - x;
      break;
    case "left":
      u = z;
      break;
    case "right":
      u = 1 - z;
      break;
    case "top":
      u = x;
      v = z;
      break;
    case "bottom":
      u = x;
      v = 1 - z;
      break;
    case "front":
      break;
  }
  const { boundingBox, mask } = analysis;
  const pixelX = Math.min(
    mask.width - 1,
    Math.max(0, Math.floor((boundingBox.x + u * boundingBox.width) * mask.width)),
  );
  const pixelY = Math.min(
    mask.height - 1,
    Math.max(0, Math.floor((boundingBox.y + v * boundingBox.height) * mask.height)),
  );
  return mask.data[pixelY * mask.width + pixelX] !== 0;
}

function buildSurface(
  occupied: Uint8Array,
  resolution: number,
  dimensions: readonly [number, number, number],
  maximumTriangles: number,
): { positions: number[]; normals: number[]; indices: number[] } {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const voxelSize = dimensions.map((dimension) => dimension / resolution) as [
    number,
    number,
    number,
  ];

  for (let z = 0; z < resolution; z += 1) {
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
          if (indices.length / 3 + 2 > maximumTriangles) {
            throw new RangeError(
              `Visual hull exceeds the ${maximumTriangles} triangle safety limit. Lower the resolution.`,
            );
          }
          const firstVertex = positions.length / 3;
          for (const corner of face.corners) {
            positions.push(
              -dimensions[0] / 2 + (x + corner[0]) * voxelSize[0],
              -dimensions[1] / 2 + (y + corner[1]) * voxelSize[1],
              -dimensions[2] / 2 + (z + corner[2]) * voxelSize[2],
            );
            normals.push(...face.normal);
          }
          indices.push(
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
  return { positions, normals, indices };
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

function volumeIndex(x: number, y: number, z: number, resolution: number): number {
  return x + resolution * (y + resolution * z);
}
