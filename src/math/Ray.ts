import { EPSILON, Vector3 } from "./Vector3.js";
import type { Box3 } from "./Box3.js";

/** Infinite ray with normalized direction. */
export class Ray {
  constructor(
    public origin = new Vector3(),
    public direction = new Vector3(0, 0, -1),
  ) {}

  set(origin: Readonly<Vector3>, direction: Readonly<Vector3>): this {
    this.origin.copy(origin);
    this.direction.copy(direction).normalize();
    if (this.direction.lengthSquared() <= EPSILON) throw new RangeError("A ray needs a direction.");
    return this;
  }

  at(distance: number, out = new Vector3()): Vector3 {
    return out.copy(this.direction).multiplyScalar(distance).add(this.origin);
  }

  distanceToPoint(point: Readonly<Vector3>): number {
    const offset = Vector3.subtract(point, this.origin);
    const distance = offset.dot(this.direction);
    return distance < 0 ? this.origin.distanceTo(point) : this.at(distance).distanceTo(point);
  }

  intersectsSphere(center: Readonly<Vector3>, radius: number): boolean {
    return this.distanceToPoint(center) <= radius;
  }

  /**
   * Returns the nearest forward intersection with an axis-aligned box.
   *
   * The slab calculation accepts zero-thickness boxes, which is useful for
   * picking planar geometry. `null` is returned when the box is behind or
   * outside the ray.
   */
  intersectBox(box: Readonly<Box3>, out = new Vector3()): Vector3 | null {
    let minimumDistance = Number.NEGATIVE_INFINITY;
    let maximumDistance = Number.POSITIVE_INFINITY;

    for (const axis of ["x", "y", "z"] as const) {
      const origin = this.origin[axis];
      const direction = this.direction[axis];
      const minimum = box.min[axis];
      const maximum = box.max[axis];
      if (Math.abs(direction) <= EPSILON) {
        if (origin < minimum || origin > maximum) return null;
        continue;
      }
      let near = (minimum - origin) / direction;
      let far = (maximum - origin) / direction;
      if (near > far) [near, far] = [far, near];
      minimumDistance = Math.max(minimumDistance, near);
      maximumDistance = Math.min(maximumDistance, far);
      if (minimumDistance > maximumDistance) return null;
    }

    if (maximumDistance < 0) return null;
    return this.at(minimumDistance >= 0 ? minimumDistance : maximumDistance, out);
  }

  /** Tests whether this ray intersects an axis-aligned box in front of its origin. */
  intersectsBox(box: Readonly<Box3>): boolean {
    return this.intersectBox(box) !== null;
  }
}
