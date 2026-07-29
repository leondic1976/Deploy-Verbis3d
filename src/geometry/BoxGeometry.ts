import { BufferAttribute } from "./BufferAttribute.js";
import { Geometry } from "./Geometry.js";

/** Indexed box geometry with separate face normals and UVs. */
export class BoxGeometry extends Geometry {
  constructor(width = 1, height = 1, depth = 1) {
    super();
    if (width <= 0 || height <= 0 || depth <= 0) {
      throw new RangeError("Box dimensions must be positive.");
    }
    const x = width / 2;
    const y = height / 2;
    const z = depth / 2;
    const positions = [
      x,
      -y,
      z,
      x,
      -y,
      -z,
      x,
      y,
      -z,
      x,
      y,
      z,
      -x,
      -y,
      -z,
      -x,
      -y,
      z,
      -x,
      y,
      z,
      -x,
      y,
      -z,
      -x,
      y,
      z,
      x,
      y,
      z,
      x,
      y,
      -z,
      -x,
      y,
      -z,
      -x,
      -y,
      -z,
      x,
      -y,
      -z,
      x,
      -y,
      z,
      -x,
      -y,
      z,
      -x,
      -y,
      z,
      x,
      -y,
      z,
      x,
      y,
      z,
      -x,
      y,
      z,
      x,
      -y,
      -z,
      -x,
      -y,
      -z,
      -x,
      y,
      -z,
      x,
      y,
      -z,
    ];
    const normals = [
      1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0,
      0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
      0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    ];
    const uvs = Array.from({ length: 6 }, () => [0, 0, 1, 0, 1, 1, 0, 1]).flat();
    const indices = Array.from({ length: 6 }, (_, face) => {
      const start = face * 4;
      return [start, start + 1, start + 2, start, start + 2, start + 3];
    }).flat();
    this.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    this.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
    this.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    this.setIndex(indices);
    this.computeBoundingBox();
    this.computeBoundingSphere();
  }
}
