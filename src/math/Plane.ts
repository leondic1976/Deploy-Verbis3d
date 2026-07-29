import { EPSILON, Vector3 } from "./Vector3.js";

/** Plane represented by normal.dot(point) + constant = 0. */
export class Plane {
  constructor(
    public normal = new Vector3(1, 0, 0),
    public constant = 0,
  ) {}

  set(normal: Readonly<Vector3>, constant: number): this {
    this.normal.copy(normal);
    this.constant = constant;
    return this;
  }

  setFromNormalAndPoint(normal: Readonly<Vector3>, point: Readonly<Vector3>): this {
    this.normal.copy(normal).normalize();
    this.constant = -this.normal.dot(point);
    return this;
  }

  normalize(): this {
    const length = this.normal.length();
    if (length <= EPSILON) throw new RangeError("A plane requires a non-zero normal.");
    this.normal.divideScalar(length);
    this.constant /= length;
    return this;
  }

  distanceToPoint(point: Readonly<Vector3>): number {
    return this.normal.dot(point) + this.constant;
  }

  projectPoint(point: Readonly<Vector3>, out = new Vector3()): Vector3 {
    return out.copy(this.normal).multiplyScalar(-this.distanceToPoint(point)).add(point);
  }

  clone(): Plane {
    return new Plane(this.normal.clone(), this.constant);
  }
}
