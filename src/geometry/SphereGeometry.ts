import { BufferAttribute } from "./BufferAttribute.js";
import { Geometry } from "./Geometry.js";

/** UV sphere geometry. */
export class SphereGeometry extends Geometry {
  constructor(radius = 0.5, widthSegments = 24, heightSegments = 16) {
    super();
    if (radius <= 0 || widthSegments < 3 || heightSegments < 2) {
      throw new RangeError(
        "Sphere requires radius > 0, widthSegments >= 3 and heightSegments >= 2.",
      );
    }
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let y = 0; y <= heightSegments; y += 1) {
      const v = y / heightSegments;
      const phi = v * Math.PI;
      for (let x = 0; x <= widthSegments; x += 1) {
        const u = x / widthSegments;
        const theta = u * Math.PI * 2;
        const nx = -Math.cos(theta) * Math.sin(phi);
        const ny = Math.cos(phi);
        const nz = Math.sin(theta) * Math.sin(phi);
        positions.push(nx * radius, ny * radius, nz * radius);
        normals.push(nx, ny, nz);
        uvs.push(u, 1 - v);
      }
    }
    for (let y = 0; y < heightSegments; y += 1) {
      for (let x = 0; x < widthSegments; x += 1) {
        const a = y * (widthSegments + 1) + x;
        const b = a + widthSegments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    this.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    this.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
    this.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    this.setIndex(indices);
    this.computeBoundingBox();
    this.computeBoundingSphere();
  }
}
