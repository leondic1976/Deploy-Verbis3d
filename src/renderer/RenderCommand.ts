import type { Mesh } from "../core/index.js";

/** Immutable per-frame draw request. */
export interface RenderCommand {
  readonly mesh: Mesh;
  readonly renderOrder: number;
}
