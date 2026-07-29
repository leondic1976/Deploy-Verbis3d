import type { Object3D } from "../core/index.js";
import type { AnimationClip } from "./AnimationClip.js";
import { AnimationAction } from "./AnimationAction.js";

/** Updates all actions bound to a scene root. */
export class AnimationMixer {
  private readonly actions = new Map<AnimationClip, AnimationAction>();
  timeScale = 1;

  constructor(public readonly root: Object3D) {}

  clipAction(clip: AnimationClip): AnimationAction {
    let action = this.actions.get(clip);
    if (!action) {
      action = new AnimationAction(clip, this.root);
      this.actions.set(clip, action);
    }
    return action;
  }

  update(deltaTime: number): void {
    for (const action of this.actions.values()) action.update(deltaTime * this.timeScale);
  }

  stopAllAction(): void {
    for (const action of this.actions.values()) action.stop();
  }
}
