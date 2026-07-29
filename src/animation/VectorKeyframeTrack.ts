import { Vector3 } from "../math/index.js";
import { KeyframeTrack } from "./KeyframeTrack.js";

/** Linearly interpolated Vector3 track stored as packed XYZ values. */
export class VectorKeyframeTrack extends KeyframeTrack<Vector3> {
  constructor(path: string, times: readonly number[], values: readonly number[]) {
    super(path, times, values);
    if (values.length !== times.length * 3)
      throw new RangeError("Vector track requires XYZ per time.");
  }

  sample(time: number): Vector3 {
    if (this.times.length === 1) return new Vector3(...this.read(0));
    const { index, alpha } = this.interval(time);
    return new Vector3(...this.read(index)).lerp(
      new Vector3(...this.read(Math.min(index + 1, this.times.length - 1))),
      alpha,
    );
  }

  private read(index: number): [number, number, number] {
    return [this.values[index * 3]!, this.values[index * 3 + 1]!, this.values[index * 3 + 2]!];
  }
}
