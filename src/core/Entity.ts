import { Object3D } from "./Object3D.js";

/** General-purpose scene node intended to own components. */
export class Entity extends Object3D {
  override readonly type = "Entity";
}
