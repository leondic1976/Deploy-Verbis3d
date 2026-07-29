import { KeyframeTrack } from "./KeyframeTrack.js";

/** Linearly interpolated scalar track. */
export class NumberKeyframeTrack extends KeyframeTrack<number> {
  constructor(path: string, times: readonly number[], values: readonly number[]) {
    super(path, times, values);
    if (times.length !== values.length)
      throw new RangeError("Scalar track values must match times.");
  }

  sample(time: number): number {
    if (this.times.length === 1) return this.values[0]!;
    const { index, alpha } = this.interval(time);
    const a = this.values[index]!;
    const b = this.values[Math.min(index + 1, this.values.length - 1)]!;
    return a + (b - a) * alpha;
  }
}
