import type { Box3 } from "./Box3.js";
import type { Matrix4 } from "./Matrix4.js";
import { Plane } from "./Plane.js";
import type { Sphere } from "./Sphere.js";
import { Vector3 } from "./Vector3.js";

/** Six clipping planes extracted from a view-projection matrix. */
export class Frustum {
  readonly planes = Array.from({ length: 6 }, () => new Plane());

  setFromProjectionMatrix(matrix: Readonly<Matrix4>): this {
    const m = matrix.elements;
    this.planes[0]!.normal.set(m[3]! - m[0]!, m[7]! - m[4]!, m[11]! - m[8]!);
    this.planes[0]!.constant = m[15]! - m[12]!;
    this.planes[1]!.normal.set(m[3]! + m[0]!, m[7]! + m[4]!, m[11]! + m[8]!);
    this.planes[1]!.constant = m[15]! + m[12]!;
    this.planes[2]!.normal.set(m[3]! + m[1]!, m[7]! + m[5]!, m[11]! + m[9]!);
    this.planes[2]!.constant = m[15]! + m[13]!;
    this.planes[3]!.normal.set(m[3]! - m[1]!, m[7]! - m[5]!, m[11]! - m[9]!);
    this.planes[3]!.constant = m[15]! - m[13]!;
    this.planes[4]!.normal.set(m[3]! - m[2]!, m[7]! - m[6]!, m[11]! - m[10]!);
    this.planes[4]!.constant = m[15]! - m[14]!;
    this.planes[5]!.normal.set(m[3]! + m[2]!, m[7]! + m[6]!, m[11]! + m[10]!);
    this.planes[5]!.constant = m[15]! + m[14]!;
    for (const plane of this.planes) plane.normalize();
    return this;
  }

  containsPoint(point: Readonly<Vector3>): boolean {
    return this.planes.every((plane) => plane.distanceToPoint(point) >= 0);
  }

  intersectsSphere(sphere: Readonly<Sphere>): boolean {
    return this.planes.every((plane) => plane.distanceToPoint(sphere.center) >= -sphere.radius);
  }

  intersectsBox(box: Readonly<Box3>): boolean {
    return this.planes.every((plane) => {
      const point = new Vector3(
        plane.normal.x >= 0 ? box.max.x : box.min.x,
        plane.normal.y >= 0 ? box.max.y : box.min.y,
        plane.normal.z >= 0 ? box.max.z : box.min.z,
      );
      return plane.distanceToPoint(point) >= 0;
    });
  }
}
