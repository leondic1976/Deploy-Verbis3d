import { EPSILON } from "./Vector3.js";
import type { Quaternion } from "./Quaternion.js";

/** XYZ Euler rotation in radians. */
export class Euler {
  private changeListener: (() => void) | undefined;

  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}

  onChange(listener: (() => void) | undefined): this {
    this.changeListener = listener;
    return this;
  }

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.changeListener?.();
    return this;
  }

  copy(value: Readonly<Euler>): this {
    return this.set(value.x, value.y, value.z);
  }

  /** Updates XYZ Euler angles from a normalized or non-normalized quaternion. */
  setFromQuaternion(quaternion: Readonly<Quaternion>): this {
    const length = Math.hypot(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    if (length <= EPSILON) return this.set(0, 0, 0);
    const x = quaternion.x / length;
    const y = quaternion.y / length;
    const z = quaternion.z / length;
    const w = quaternion.w / length;
    const pitchSine = Math.min(1, Math.max(-1, 2 * (w * y - z * x)));
    return this.set(
      Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)),
      Math.asin(pitchSine),
      Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)),
    );
  }

  clone(): Euler {
    return new Euler(this.x, this.y, this.z);
  }

  equals(value: Readonly<Euler>, epsilon = EPSILON): boolean {
    return (
      Math.abs(this.x - value.x) <= epsilon &&
      Math.abs(this.y - value.y) <= epsilon &&
      Math.abs(this.z - value.z) <= epsilon
    );
  }
}
