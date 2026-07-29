import { Color } from "../math/index.js";
import { Object3D } from "./Object3D.js";

/** Root scene node and clear-color owner. */
export class Scene extends Object3D {
  override readonly type = "Scene";
  readonly background = new Color(0.025, 0.035, 0.075, 1);

  constructor() {
    super();
    this.name = "Scene";
  }
}
