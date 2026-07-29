import { Vector3 } from "./Vector3.js";

/** Bounding sphere. */
export class Sphere {
  constructor(
    public center = new Vector3(),
    public radius = -1,
  ) {}

  set(center: Readonly<Vector3>, radius: number): this {
    this.center.copy(center);
    this.radius = radius;
    return this;
  }

  containsPoint(point: Readonly<Vector3>): boolean {
    return point.distanceToSquared(this.center) <= this.radius * this.radius;
  }

  intersectsSphere(other: Readonly<Sphere>): boolean {
    const radius = this.radius + other.radius;
    return this.center.distanceToSquared(other.center) <= radius * radius;
  }

  clone(): Sphere {
    return new Sphere(this.center.clone(), this.radius);
  }
}
