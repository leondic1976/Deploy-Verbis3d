import type { Matrix4 } from "./Matrix4.js";
import type { Quaternion } from "./Quaternion.js";

export const EPSILON = 1e-8;

/** Mutable three-dimensional vector optimized for allocation-sensitive engine paths. */
export class Vector3 {
  static readonly ZERO = Object.freeze(new Vector3(0, 0, 0));
  static readonly ONE = Object.freeze(new Vector3(1, 1, 1));
  static readonly UP = Object.freeze(new Vector3(0, 1, 0));
  static readonly RIGHT = Object.freeze(new Vector3(1, 0, 0));
  static readonly FORWARD = Object.freeze(new Vector3(0, 0, -1));

  private changeListener: (() => void) | undefined;

  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}

  /** Registers an internal mutation observer used by transforms. */
  onChange(listener: (() => void) | undefined): this {
    this.changeListener = listener;
    return this;
  }

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this.changed();
  }

  copy(value: Readonly<Vector3>): this {
    return this.set(value.x, value.y, value.z);
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  add(value: Readonly<Vector3>): this {
    return this.set(this.x + value.x, this.y + value.y, this.z + value.z);
  }

  subtract(value: Readonly<Vector3>): this {
    return this.set(this.x - value.x, this.y - value.y, this.z - value.z);
  }

  multiply(value: Readonly<Vector3>): this {
    return this.set(this.x * value.x, this.y * value.y, this.z * value.z);
  }

  multiplyScalar(scalar: number): this {
    return this.set(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  divideScalar(scalar: number): this {
    if (Math.abs(scalar) <= EPSILON) {
      throw new RangeError("Vector3 cannot be divided by zero.");
    }
    return this.multiplyScalar(1 / scalar);
  }

  dot(value: Readonly<Vector3>): number {
    return this.x * value.x + this.y * value.y + this.z * value.z;
  }

  cross(value: Readonly<Vector3>): this {
    return this.set(
      this.y * value.z - this.z * value.y,
      this.z * value.x - this.x * value.z,
      this.x * value.y - this.y * value.x,
    );
  }

  lengthSquared(): number {
    return this.dot(this);
  }

  length(): number {
    return Math.sqrt(this.lengthSquared());
  }

  normalize(): this {
    const magnitude = this.length();
    return magnitude <= EPSILON ? this.set(0, 0, 0) : this.divideScalar(magnitude);
  }

  distanceTo(value: Readonly<Vector3>): number {
    return Math.sqrt(this.distanceToSquared(value));
  }

  distanceToSquared(value: Readonly<Vector3>): number {
    const dx = this.x - value.x;
    const dy = this.y - value.y;
    const dz = this.z - value.z;
    return dx * dx + dy * dy + dz * dz;
  }

  lerp(target: Readonly<Vector3>, alpha: number): this {
    return this.set(
      this.x + (target.x - this.x) * alpha,
      this.y + (target.y - this.y) * alpha,
      this.z + (target.z - this.z) * alpha,
    );
  }

  applyMatrix4(matrix: Readonly<Matrix4>): this {
    matrix.transformPoint(this, this);
    return this;
  }

  applyQuaternion(quaternion: Readonly<Quaternion>): this {
    quaternion.rotateVector(this, this);
    return this;
  }

  equals(value: Readonly<Vector3>, epsilon = EPSILON): boolean {
    return (
      Math.abs(this.x - value.x) <= epsilon &&
      Math.abs(this.y - value.y) <= epsilon &&
      Math.abs(this.z - value.z) <= epsilon
    );
  }

  toArray(target: Float32Array | number[] = [], offset = 0): Float32Array | number[] {
    target[offset] = this.x;
    target[offset + 1] = this.y;
    target[offset + 2] = this.z;
    return target;
  }

  fromArray(source: ArrayLike<number>, offset = 0): this {
    return this.set(source[offset] ?? 0, source[offset + 1] ?? 0, source[offset + 2] ?? 0);
  }

  static add(a: Readonly<Vector3>, b: Readonly<Vector3>, out = new Vector3()): Vector3 {
    return out.set(a.x + b.x, a.y + b.y, a.z + b.z);
  }

  static subtract(a: Readonly<Vector3>, b: Readonly<Vector3>, out = new Vector3()): Vector3 {
    return out.set(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  static cross(a: Readonly<Vector3>, b: Readonly<Vector3>, out = new Vector3()): Vector3 {
    return out.set(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
  }

  private changed(): this {
    this.changeListener?.();
    return this;
  }
}
