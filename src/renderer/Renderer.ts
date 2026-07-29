import type { Camera } from "../cameras/index.js";
import type { Scene } from "../core/index.js";
import type { Lifecycle } from "../core/index.js";

/** Backend-neutral renderer contract. */
export interface Renderer extends Lifecycle {
  readonly drawCalls: number;
  setSize(width: number, height: number, updateStyle?: boolean): void;
  render(scene: Scene, camera: Camera): void;
}
