import type { Matrix4 } from "./Matrix4.js";
import { EPSILON } from "./Vector3.js";

/** Mutable four-dimensional vector. */
export class Vector4 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
    public w = 0,
  ) {}

  set(x: number, y: number, z: number, w: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  copy(value: Readonly<Vector4>): this {
    return this.set(value.x, value.y, value.z, value.w);
  }

  clone(): Vector4 {
    return new Vector4(this.x, this.y, this.z, this.w);
  }

  add(value: Readonly<Vector4>): this {
    return this.set(this.x + value.x, this.y + value.y, this.z + value.z, this.w + value.w);
  }

  subtract(value: Readonly<Vector4>): this {
    return this.set(this.x - value.x, this.y - value.y, this.z - value.z, this.w - value.w);
  }

  multiplyScalar(scalar: number): this {
    return this.set(this.x * scalar, this.y * scalar, this.z * scalar, this.w * scalar);
  }

  divideScalar(scalar: number): this {
    if (Math.abs(scalar) <= EPSILON) throw new RangeError("Vector4 cannot be divided by zero.");
    return this.multiplyScalar(1 / scalar);
  }

  dot(value: Readonly<Vector4>): number {
    return this.x * value.x + this.y * value.y + this.z * value.z + this.w * value.w;
  }

  lengthSquared(): number {
    return this.dot(this);
  }

  length(): number {
    return Math.sqrt(this.lengthSquared());
  }

  normalize(): this {
    const magnitude = this.length();
    return magnitude <= EPSILON ? this.set(0, 0, 0, 0) : this.divideScalar(magnitude);
  }

  lerp(target: Readonly<Vector4>, alpha: number): this {
    return this.set(
      this.x + (target.x - this.x) * alpha,
      this.y + (target.y - this.y) * alpha,
      this.z + (target.z - this.z) * alpha,
      this.w + (target.w - this.w) * alpha,
    );
  }

  applyMatrix4(matrix: Readonly<Matrix4>): this {
    const e = matrix.elements;
    const { x, y, z, w } = this;
    return this.set(
      e[0]! * x + e[4]! * y + e[8]! * z + e[12]! * w,
      e[1]! * x + e[5]! * y + e[9]! * z + e[13]! * w,
      e[2]! * x + e[6]! * y + e[10]! * z + e[14]! * w,
      e[3]! * x + e[7]! * y + e[11]! * z + e[15]! * w,
    );
  }

  equals(value: Readonly<Vector4>, epsilon = EPSILON): boolean {
    return (
      Math.abs(this.x - value.x) <= epsilon &&
      Math.abs(this.y - value.y) <= epsilon &&
      Math.abs(this.z - value.z) <= epsilon &&
      Math.abs(this.w - value.w) <= epsilon
    );
  }
}
