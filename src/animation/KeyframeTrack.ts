/** Base keyframe sequence with strictly increasing sample times. */
export abstract class KeyframeTrack<TValue> {
  constructor(
    public readonly path: string,
    public readonly times: readonly number[],
    public readonly values: readonly number[],
  ) {
    if (!path) throw new Error("Animation track path is required.");
    if (times.length === 0) throw new RangeError("Animation tracks require at least one keyframe.");
    for (let index = 1; index < times.length; index += 1) {
      if (times[index]! <= times[index - 1]!) {
        throw new RangeError("Animation keyframe times must be strictly increasing.");
      }
    }
  }

  abstract sample(time: number): TValue;

  protected interval(time: number): { index: number; alpha: number } {
    if (time <= this.times[0]!) return { index: 0, alpha: 0 };
    const last = this.times.length - 1;
    if (time >= this.times[last]!) return { index: Math.max(0, last - 1), alpha: 1 };
    for (let index = 0; index < last; index += 1) {
      const start = this.times[index]!;
      const end = this.times[index + 1]!;
      if (time <= end) return { index, alpha: (time - start) / (end - start) };
    }
    return { index: Math.max(0, last - 1), alpha: 1 };
  }
}
