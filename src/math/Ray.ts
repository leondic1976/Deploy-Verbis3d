import { EPSILON, Vector3 } from "./Vector3.js";

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
}
