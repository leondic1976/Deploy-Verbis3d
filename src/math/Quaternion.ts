import { Vector3 } from "./Vector3.js";

const EPSILON = 1e-8;

/** Quaternion rotation represented as x, y, z, w. */
export class Quaternion {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
    public w = 1,
  ) {}

  set(x: number, y: number, z: number, w: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
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
    if (length <= EPSILON) {
      return this.identity();
    }
    const inverse = 1 / length;
    return this.set(this.x * inverse, this.y * inverse, this.z * inverse, this.w * inverse);
  }

  conjugate(): this {
    this.x *= -1;
    this.y *= -1;
    this.z *= -1;
    return this;
  }

  invert(): this {
    const lengthSquared = this.lengthSquared();
    if (lengthSquared <= EPSILON) {
      throw new RangeError("A zero-length quaternion cannot be inverted.");
    }
    this.conjugate();
    const inverse = 1 / lengthSquared;
    return this.set(this.x * inverse, this.y * inverse, this.z * inverse, this.w * inverse);
  }

  multiply(value: Readonly<Quaternion>): this {
    const ax = this.x;
    const ay = this.y;
    const az = this.z;
    const aw = this.w;
    const bx = value.x;
    const by = value.y;
    const bz = value.z;
    const bw = value.w;

    return this.set(
      ax * bw + aw * bx + ay * bz - az * by,
      ay * bw + aw * by + az * bx - ax * bz,
      az * bw + aw * bz + ax * by - ay * bx,
      aw * bw - ax * bx - ay * by - az * bz,
    );
  }

  setFromAxisAngle(axis: Readonly<Vector3>, radians: number): this {
    const normalizedAxis = new Vector3(axis.x, axis.y, axis.z).normalize();
    const half = radians * 0.5;
    const sine = Math.sin(half);
    return this.set(
      normalizedAxis.x * sine,
      normalizedAxis.y * sine,
      normalizedAxis.z * sine,
      Math.cos(half),
    );
  }

  setFromEuler(xRadians: number, yRadians: number, zRadians: number): this {
    const cx = Math.cos(xRadians * 0.5);
    const sx = Math.sin(xRadians * 0.5);
    const cy = Math.cos(yRadians * 0.5);
    const sy = Math.sin(yRadians * 0.5);
    const cz = Math.cos(zRadians * 0.5);
    const sz = Math.sin(zRadians * 0.5);

    return this.set(
      sx * cy * cz + cx * sy * sz,
      cx * sy * cz - sx * cy * sz,
      cx * cy * sz + sx * sy * cz,
      cx * cy * cz - sx * sy * sz,
    ).normalize();
  }

  rotateVector(vector: Readonly<Vector3>, out = new Vector3()): Vector3 {
    const qx = this.x;
    const qy = this.y;
    const qz = this.z;
    const qw = this.w;
    const vx = vector.x;
    const vy = vector.y;
    const vz = vector.z;

    const ix = qw * vx + qy * vz - qz * vy;
    const iy = qw * vy + qz * vx - qx * vz;
    const iz = qw * vz + qx * vy - qy * vx;
    const iw = -qx * vx - qy * vy - qz * vz;

    return out.set(
      ix * qw + iw * -qx + iy * -qz - iz * -qy,
      iy * qw + iw * -qy + iz * -qx - ix * -qz,
      iz * qw + iw * -qz + ix * -qy - iy * -qx,
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
}
