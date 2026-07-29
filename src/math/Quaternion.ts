import type { Euler } from "./Euler.js";
import { EPSILON, Vector3 } from "./Vector3.js";

/** Quaternion rotation represented as x, y, z, w. */
export class Quaternion {
  private changeListener: (() => void) | undefined;

  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
    public w = 1,
  ) {}

  onChange(listener: (() => void) | undefined): this {
    this.changeListener = listener;
    return this;
  }

  set(x: number, y: number, z: number, w: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this.changed();
  }

  identity(): this {
    return this.set(0, 0, 0, 1);
  }

  copy(value: Readonly<Quaternion>): this {
    return this.set(value.x, value.y, value.z, value.w);
  }

  clone(): Quaternion {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
  }

  normalize(): this {
    const length = Math.sqrt(this.lengthSquared());
    if (length <= EPSILON) return this.identity();
    const inverse = 1 / length;
    return this.set(this.x * inverse, this.y * inverse, this.z * inverse, this.w * inverse);
  }

  conjugate(): this {
    return this.set(-this.x, -this.y, -this.z, this.w);
  }

  invert(): this {
    const lengthSquared = this.lengthSquared();
    if (lengthSquared <= EPSILON) {
      throw new RangeError("A zero-length quaternion cannot be inverted.");
    }
    const inverse = 1 / lengthSquared;
    return this.set(-this.x * inverse, -this.y * inverse, -this.z * inverse, this.w * inverse);
  }

  multiply(value: Readonly<Quaternion>): this {
    return this.multiplyQuaternions(this, value);
  }

  premultiply(value: Readonly<Quaternion>): this {
    return this.multiplyQuaternions(value, this);
  }

  multiplyQuaternions(a: Readonly<Quaternion>, b: Readonly<Quaternion>): this {
    return this.set(
      a.x * b.w + a.w * b.x + a.y * b.z - a.z * b.y,
      a.y * b.w + a.w * b.y + a.z * b.x - a.x * b.z,
      a.z * b.w + a.w * b.z + a.x * b.y - a.y * b.x,
      a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    );
  }

  setFromAxisAngle(axis: Readonly<Vector3>, radians: number): this {
    const normalizedAxis = new Vector3(axis.x, axis.y, axis.z).normalize();
    if (normalizedAxis.lengthSquared() <= EPSILON) return this.identity();
    const half = radians * 0.5;
    const sine = Math.sin(half);
    return this.set(
      normalizedAxis.x * sine,
      normalizedAxis.y * sine,
      normalizedAxis.z * sine,
      Math.cos(half),
    );
  }

  setFromEuler(euler: Readonly<Euler>): this;
  setFromEuler(xRadians: number, yRadians: number, zRadians: number): this;
  setFromEuler(eulerOrX: Readonly<Euler> | number, yRadians?: number, zRadians?: number): this {
    const x = typeof eulerOrX === "number" ? eulerOrX : eulerOrX.x;
    const y = typeof eulerOrX === "number" ? (yRadians ?? 0) : eulerOrX.y;
    const z = typeof eulerOrX === "number" ? (zRadians ?? 0) : eulerOrX.z;
    const cx = Math.cos(x * 0.5);
    const sx = Math.sin(x * 0.5);
    const cy = Math.cos(y * 0.5);
    const sy = Math.sin(y * 0.5);
    const cz = Math.cos(z * 0.5);
    const sz = Math.sin(z * 0.5);
    return this.set(
      sx * cy * cz + cx * sy * sz,
      cx * sy * cz - sx * cy * sz,
      cx * cy * sz + sx * sy * cz,
      cx * cy * cz - sx * sy * sz,
    ).normalize();
  }

  slerp(target: Readonly<Quaternion>, alpha: number): this {
    if (alpha <= 0) return this;
    if (alpha >= 1) return this.copy(target);
    let cosine = this.x * target.x + this.y * target.y + this.z * target.z + this.w * target.w;
    const end = target instanceof Quaternion ? target.clone() : new Quaternion().copy(target);
    if (cosine < 0) {
      cosine = -cosine;
      end.set(-end.x, -end.y, -end.z, -end.w);
    }
    if (cosine > 0.9995) {
      return this.set(
        this.x + alpha * (end.x - this.x),
        this.y + alpha * (end.y - this.y),
        this.z + alpha * (end.z - this.z),
        this.w + alpha * (end.w - this.w),
      ).normalize();
    }
    const theta = Math.acos(Math.min(1, cosine));
    const sine = Math.sin(theta);
    const a = Math.sin((1 - alpha) * theta) / sine;
    const b = Math.sin(alpha * theta) / sine;
    return this.set(
      this.x * a + end.x * b,
      this.y * a + end.y * b,
      this.z * a + end.z * b,
      this.w * a + end.w * b,
    );
  }

  rotateVector(vector: Readonly<Vector3>, out = new Vector3()): Vector3 {
    const ix = this.w * vector.x + this.y * vector.z - this.z * vector.y;
    const iy = this.w * vector.y + this.z * vector.x - this.x * vector.z;
    const iz = this.w * vector.z + this.x * vector.y - this.y * vector.x;
    const iw = -this.x * vector.x - this.y * vector.y - this.z * vector.z;
    return out.set(
      ix * this.w + iw * -this.x + iy * -this.z - iz * -this.y,
      iy * this.w + iw * -this.y + iz * -this.x - ix * -this.z,
      iz * this.w + iw * -this.z + ix * -this.y - iy * -this.x,
    );
  }

  equals(value: Readonly<Quaternion>, epsilon = EPSILON): boolean {
    return (
      Math.abs(this.x - value.x) <= epsilon &&
      Math.abs(this.y - value.y) <= epsilon &&
      Math.abs(this.z - value.z) <= epsilon &&
      Math.abs(this.w - value.w) <= epsilon
    );
  }

  private changed(): this {
    this.changeListener?.();
    return this;
  }
}
