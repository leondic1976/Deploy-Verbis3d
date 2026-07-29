import { Quaternion } from "../math/index.js";
import { KeyframeTrack } from "./KeyframeTrack.js";

/** Spherical quaternion interpolation track stored as packed XYZW values. */
export class QuaternionKeyframeTrack extends KeyframeTrack<Quaternion> {
  constructor(path: string, times: readonly number[], values: readonly number[]) {
    super(path, times, values);
    if (values.length !== times.length * 4)
      throw new RangeError("Quaternion track requires XYZW per time.");
  }

  sample(time: number): Quaternion {
    if (this.times.length === 1) return new Quaternion(...this.read(0));
    const { index, alpha } = this.interval(time);
    return new Quaternion(...this.read(index)).slerp(
      new Quaternion(...this.read(Math.min(index + 1, this.times.length - 1))),
      alpha,
    );
  }

  private read(index: number): [number, number, number, number] {
    return [
      this.values[index * 4]!,
      this.values[index * 4 + 1]!,
      this.values[index * 4 + 2]!,
      this.values[index * 4 + 3]!,
    ];
  }
}
