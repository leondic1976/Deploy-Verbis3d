import type { KeyframeTrack } from "./KeyframeTrack.js";

/** Named collection of keyframe tracks sharing a duration. */
export class AnimationClip {
  readonly duration: number;

  constructor(
    public readonly name: string,
    public readonly tracks: readonly KeyframeTrack<unknown>[],
    duration?: number,
  ) {
    const inferred = Math.max(0, ...tracks.map((track) => track.times.at(-1) ?? 0));
    this.duration = duration ?? inferred;
    if (this.duration < inferred)
      throw new RangeError("Clip duration cannot end before its tracks.");
  }
}
