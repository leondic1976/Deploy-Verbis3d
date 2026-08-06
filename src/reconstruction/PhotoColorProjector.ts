import { BufferAttribute, type Geometry } from "../geometry/index.js";
import type {
  VisionAnalysis,
  VisionCameraPose,
  VisionColor,
  VisionPhoto,
  VisionViewAnalysis,
} from "./VisionTypes.js";

export interface PhotoColorProjectionResult {
  readonly projectedVertexCount: number;
  readonly fallbackVertexCount: number;
}

interface Projection {
  readonly u: number;
  readonly v: number;
  readonly fullFrame: boolean;
}

type VectorTuple = readonly [number, number, number];

/** Projects decoded source-photo colors onto Geometry as a normalized RGBA vertex attribute. */
export class PhotoColorProjector {
  project(
    geometry: Geometry,
    photos: readonly VisionPhoto[],
    analysis: VisionAnalysis,
    fallbackColor: VisionColor,
  ): PhotoColorProjectionResult {
    const positions = geometry.getAttribute("position");
    if (!positions || positions.itemSize < 3) {
      throw new Error("Photo color projection requires three-component positions.");
    }
    const normals = geometry.getAttribute("normal");
    const boundingBox = geometry.boundingBox ?? geometry.computeBoundingBox();
    const photoById = new Map(photos.map((photo) => [photo.id, photo]));
    const availableViews = analysis.views.filter((view) => photoById.get(view.photoId)?.pixels);
    const colors = new Uint8Array(positions.count * 4);
    let projectedVertexCount = 0;

    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      const positionOffset = vertex * positions.itemSize;
      const point: VectorTuple = [
        positions.array[positionOffset] ?? 0,
        positions.array[positionOffset + 1] ?? 0,
        positions.array[positionOffset + 2] ?? 0,
      ];
      const normal: VectorTuple = normals
        ? [
            normals.array[vertex * normals.itemSize] ?? 0,
            normals.array[vertex * normals.itemSize + 1] ?? 0,
            normals.array[vertex * normals.itemSize + 2] ?? 0,
          ]
        : [0, 0, 1];
      const normalized: VectorTuple = [
        normalizeAxis(point[0], boundingBox.min.x, boundingBox.max.x),
        normalizeAxis(point[1], boundingBox.min.y, boundingBox.max.y),
        normalizeAxis(point[2], boundingBox.min.z, boundingBox.max.z),
      ];
      const candidates = [...availableViews].sort(
        (a, b) => viewScore(b, point, normal) - viewScore(a, point, normal),
      );
      const sampled = candidates
        .map((view) => sampleViewColor(view, photoById.get(view.photoId), normalized, point))
        .find((color): color is readonly [number, number, number, number] => color !== null);
      const color = sampled ?? normalizedColorToBytes(fallbackColor);
      if (sampled) projectedVertexCount += 1;
      const colorOffset = vertex * 4;
      colors[colorOffset] = color[0];
      colors[colorOffset + 1] = color[1];
      colors[colorOffset + 2] = color[2];
      colors[colorOffset + 3] = color[3];
    }

    geometry.setAttribute("color", new BufferAttribute(colors, 4, true));
    return {
      projectedVertexCount,
      fallbackVertexCount: positions.count - projectedVertexCount,
    };
  }
}

function sampleViewColor(
  view: VisionViewAnalysis,
  photo: VisionPhoto | undefined,
  normalized: VectorTuple,
  point: VectorTuple,
): readonly [number, number, number, number] | null {
  if (!photo?.pixels) return null;
  const projection = view.cameraPose
    ? projectPose(view.cameraPose, point, view.mask.width / view.mask.height)
    : projectCardinal(view, normalized);
  if (!projection || projection.u < 0 || projection.u > 1 || projection.v < 0 || projection.v > 1) {
    return null;
  }
  const imageU = projection.fullFrame
    ? projection.u
    : view.boundingBox.x + projection.u * view.boundingBox.width;
  const imageV = projection.fullFrame
    ? projection.v
    : view.boundingBox.y + projection.v * view.boundingBox.height;
  const maskX = Math.min(view.mask.width - 1, Math.max(0, Math.floor(imageU * view.mask.width)));
  const maskY = Math.min(view.mask.height - 1, Math.max(0, Math.floor(imageV * view.mask.height)));
  if (view.mask.data[maskY * view.mask.width + maskX] === 0) return null;
  const photoX = Math.min(photo.width - 1, Math.max(0, Math.floor(imageU * photo.width)));
  const photoY = Math.min(photo.height - 1, Math.max(0, Math.floor(imageV * photo.height)));
  const offset = (photoY * photo.width + photoX) * 4;
  return [
    photo.pixels[offset] ?? 0,
    photo.pixels[offset + 1] ?? 0,
    photo.pixels[offset + 2] ?? 0,
    photo.pixels[offset + 3] ?? 255,
  ];
}

function projectCardinal(view: VisionViewAnalysis, point: VectorTuple): Projection {
  const [x, y, z] = point;
  switch (view.view) {
    case "back":
      return { u: 1 - x, v: 1 - y, fullFrame: false };
    case "left":
      return { u: z, v: 1 - y, fullFrame: false };
    case "right":
      return { u: 1 - z, v: 1 - y, fullFrame: false };
    case "top":
      return { u: x, v: z, fullFrame: false };
    case "bottom":
      return { u: x, v: 1 - z, fullFrame: false };
    case "front":
      return { u: x, v: 1 - y, fullFrame: false };
  }
}

function projectPose(
  pose: VisionCameraPose,
  point: VectorTuple,
  aspect: number,
): Projection | null {
  const forward = normalize(subtract(pose.target, pose.position));
  const right = normalize(cross(forward, pose.up));
  const cameraUp = normalize(cross(right, forward));
  const relative = subtract(point, pose.position);
  const cameraX = dot(relative, right);
  const cameraY = dot(relative, cameraUp);
  const cameraZ = dot(relative, forward);
  if (cameraZ <= pose.near || cameraZ >= pose.far) return null;
  const tangent = Math.tan(pose.verticalFovRadians / 2);
  return {
    u: 0.5 + cameraX / (2 * cameraZ * tangent * aspect),
    v: 0.5 - cameraY / (2 * cameraZ * tangent),
    fullFrame: true,
  };
}

function viewScore(view: VisionViewAnalysis, point: VectorTuple, normal: VectorTuple): number {
  const towardCamera = view.cameraPose
    ? normalize(subtract(view.cameraPose.position, point))
    : cardinalSurfaceNormal(view.view);
  return dot(normalize(normal), towardCamera) * view.confidence;
}

function cardinalSurfaceNormal(view: VisionViewAnalysis["view"]): VectorTuple {
  switch (view) {
    case "back":
      return [0, 0, -1];
    case "left":
      return [-1, 0, 0];
    case "right":
      return [1, 0, 0];
    case "top":
      return [0, 1, 0];
    case "bottom":
      return [0, -1, 0];
    case "front":
      return [0, 0, 1];
  }
}

function normalizedColorToBytes(color: VisionColor): readonly [number, number, number, number] {
  return [
    Math.round(color[0] * 255),
    Math.round(color[1] * 255),
    Math.round(color[2] * 255),
    Math.round(color[3] * 255),
  ];
}

function normalizeAxis(value: number, minimum: number, maximum: number): number {
  const extent = maximum - minimum;
  return extent <= 1e-12 ? 0.5 : (value - minimum) / extent;
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
