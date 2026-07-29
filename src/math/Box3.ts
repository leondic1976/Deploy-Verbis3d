import { Sphere } from "./Sphere.js";
import { Vector3 } from "./Vector3.js";

/** Axis-aligned bounding box. */
export class Box3 {
  constructor(
    public min = new Vector3(
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    ),
    public max = new Vector3(
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ),
  ) {}

  makeEmpty(): this {
    this.min.set(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    this.max.set(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    return this;
  }

  isEmpty(): boolean {
    return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
  }

  setFromPoints(points: readonly Readonly<Vector3>[]): this {
    this.makeEmpty();
    for (const point of points) this.expandByPoint(point);
    return this;
  }

  expandByPoint(point: Readonly<Vector3>): this {
    this.min.set(
      Math.min(this.min.x, point.x),
      Math.min(this.min.y, point.y),
      Math.min(this.min.z, point.z),
    );
    this.max.set(
      Math.max(this.max.x, point.x),
      Math.max(this.max.y, point.y),
      Math.max(this.max.z, point.z),
    );
    return this;
  }

  containsPoint(point: Readonly<Vector3>): boolean {
    return (
      point.x >= this.min.x &&
      point.x <= this.max.x &&
      point.y >= this.min.y &&
      point.y <= this.max.y &&
      point.z >= this.min.z &&
      point.z <= this.max.z
    );
  }

  intersectsBox(other: Readonly<Box3>): boolean {
    return !(
      other.max.x < this.min.x ||
      other.min.x > this.max.x ||
      other.max.y < this.min.y ||
      other.min.y > this.max.y ||
      other.max.z < this.min.z ||
      other.min.z > this.max.z
    );
  }

  getCenter(out = new Vector3()): Vector3 {
    return this.isEmpty() ? out.set(0, 0, 0) : out.copy(this.min).add(this.max).multiplyScalar(0.5);
  }

  getSize(out = new Vector3()): Vector3 {
    return this.isEmpty() ? out.set(0, 0, 0) : out.copy(this.max).subtract(this.min);
  }

  getBoundingSphere(out = new Sphere()): Sphere {
    const center = this.getCenter(out.center);
    out.radius = this.isEmpty() ? 0 : center.distanceTo(this.max);
    return out;
  }

  clone(): Box3 {
    return new Box3(this.min.clone(), this.max.clone());
  }
}
