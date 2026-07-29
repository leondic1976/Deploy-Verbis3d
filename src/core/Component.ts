import type { Lifecycle } from "./Lifecycle.js";
import type { Object3D } from "./Object3D.js";

/** Reusable behavior attached to an Entity. */
export abstract class Component implements Lifecycle {
  entity: Object3D | null = null;
  enabled = true;
  disposed = false;

  attach(entity: Object3D): void {
    if (this.disposed) throw new Error("A disposed component cannot be attached.");
    if (this.entity && this.entity !== entity) throw new Error("Component is already attached.");
    this.entity = entity;
    this.onAttach();
  }

  detach(): void {
    if (!this.entity) return;
    this.onDetach();
    this.entity = null;
  }

  update(): void {}

  dispose(): void {
    if (this.disposed) return;
    this.detach();
    this.disposed = true;
  }

  protected onAttach(): void {}

  protected onDetach(): void {}
}
