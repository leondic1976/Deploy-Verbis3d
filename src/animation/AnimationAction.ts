import type { Object3D } from "../core/Object3D.js";
import { Quaternion, Vector3 } from "../math/index.js";
import type { AnimationClip } from "./AnimationClip.js";

/** Playback state and property binding for one clip. */
export class AnimationAction {
  time = 0;
  timeScale = 1;
  loop = true;
  playing = false;
  paused = false;
  repetitions = Number.POSITIVE_INFINITY;
  private completedLoops = 0;

  constructor(
    public readonly clip: AnimationClip,
    public readonly root: Object3D,
  ) {}

  play(): this {
    this.playing = true;
    this.paused = false;
    return this;
  }

  pause(): this {
    this.paused = true;
    return this;
  }

  stop(): this {
    this.playing = false;
    this.paused = false;
    this.time = 0;
    this.completedLoops = 0;
    return this;
  }

  reset(): this {
    this.time = 0;
    this.completedLoops = 0;
    return this;
  }

  seek(time: number): this {
    this.time = Math.min(Math.max(time, 0), this.clip.duration);
    this.apply();
    return this;
  }

  update(deltaTime: number): void {
    if (!this.playing || this.paused || this.clip.duration <= 0) return;
    this.time += deltaTime * this.timeScale;
    if (this.time >= this.clip.duration) {
      this.completedLoops += 1;
      if (this.loop && this.completedLoops < this.repetitions) this.time %= this.clip.duration;
      else {
        this.time = this.clip.duration;
        this.playing = false;
      }
    } else if (this.time < 0) {
      this.time = this.loop
        ? ((this.time % this.clip.duration) + this.clip.duration) % this.clip.duration
        : 0;
    }
    this.apply();
  }

  private apply(): void {
    for (const track of this.clip.tracks) {
      const binding = this.resolve(track.path);
      const value = track.sample(this.time);
      if (value instanceof Vector3 && binding.property instanceof Vector3)
        binding.property.copy(value);
      else if (value instanceof Quaternion && binding.property instanceof Quaternion)
        binding.property.copy(value);
      else if (typeof value === "number") binding.owner[binding.key] = value;
      else throw new Error(`Animation path '${track.path}' is incompatible with its track value.`);
    }
  }

  private resolve(path: string): {
    owner: Record<string, unknown>;
    key: string;
    property: unknown;
  } {
    const parts = path.split(".");
    let object: Object3D = this.root;
    if (
      parts.length > 1 &&
      parts[0] !== "position" &&
      parts[0] !== "scale" &&
      parts[0] !== "quaternion" &&
      parts[0] !== "rotation" &&
      parts[0] !== "deformation" &&
      parts[0] !== "userData"
    ) {
      const name = parts.shift()!;
      const found = this.root.getObjectByName(name);
      if (!found) throw new Error(`Animation target '${name}' was not found.`);
      object = found;
    }
    let owner: Record<string, unknown> = object as unknown as Record<string, unknown>;
    for (const segment of parts.slice(0, -1)) {
      const next = owner[segment];
      if (!next || typeof next !== "object")
        throw new Error(`Animation path '${path}' is invalid.`);
      owner = next as Record<string, unknown>;
    }
    const key = parts.at(-1);
    if (!key) throw new Error("Animation path is empty.");
    return { owner, key, property: owner[key] };
  }
}
