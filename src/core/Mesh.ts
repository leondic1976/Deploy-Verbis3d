import type { Geometry } from "../geometry/index.js";
import type { Material } from "../materials/index.js";
import { Object3D } from "./Object3D.js";

/** Renderable scene node pairing geometry with material. */
export class Mesh extends Object3D {
  override readonly type = "Mesh";

  constructor(
    public geometry: Geometry,
    public material: Material,
  ) {
    super();
  }

  override clone(recursive = true): Mesh {
    const copy = new Mesh(this.geometry, this.material);
    copy.name = this.name;
    copy.position.copy(this.position);
    copy.quaternion.copy(this.quaternion);
    copy.scale.copy(this.scale);
    copy.visible = this.visible;
    copy.enabled = this.enabled;
    copy.userData = structuredClone(this.userData);
    if (recursive) for (const child of this.children) copy.add(child.clone(true));
    return copy;
  }

  override dispose(): void {
    if (this.disposed) return;
    this.geometry.dispose();
    this.material.dispose();
    super.dispose();
  }
}
