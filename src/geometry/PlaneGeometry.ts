import { BufferAttribute } from "./BufferAttribute.js";
import { Geometry } from "./Geometry.js";

/** XY plane facing positive Z. */
export class PlaneGeometry extends Geometry {
  constructor(width = 1, height = 1) {
    super();
    if (width <= 0 || height <= 0) throw new RangeError("Plane dimensions must be positive.");
    const x = width / 2;
    const y = height / 2;
    this.setAttribute(
      "position",
      new BufferAttribute(new Float32Array([-x, -y, 0, x, -y, 0, x, y, 0, -x, y, 0]), 3),
    );
    this.setAttribute(
      "normal",
      new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 3),
    );
    this.setAttribute("uv", new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
    this.setIndex([0, 1, 2, 0, 2, 3]);
    this.computeBoundingBox();
    this.computeBoundingSphere();
  }
}
