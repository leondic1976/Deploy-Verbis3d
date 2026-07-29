import type { AnimationMixer } from "./AnimationMixer.js";

/** Coordinates multiple animation mixers on one clock. */
export class Timeline {
  readonly mixers = new Set<AnimationMixer>();
  time = 0;
  playing = true;

  add(mixer: AnimationMixer): this {
    this.mixers.add(mixer);
    return this;
  }

  remove(mixer: AnimationMixer): this {
    this.mixers.delete(mixer);
    return this;
  }

  update(deltaTime: number): void {
    if (!this.playing) return;
    this.time += deltaTime;
    for (const mixer of this.mixers) mixer.update(deltaTime);
  }
}
