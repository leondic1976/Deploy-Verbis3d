import { MeshDeformer } from "../deformation/MeshDeformer.js";
import type { Geometry } from "../geometry/index.js";
import type { Material } from "../materials/index.js";
import { Object3D } from "./Object3D.js";

/** Renderable scene node pairing geometry with material. */
export class Mesh extends Object3D {
  override readonly type = "Mesh";
  private deformationController: MeshDeformer | null = null;

  constructor(
    public geometry: Geometry,
    public material: Material,
  ) {
    super();
  }

  /** Lazily creates the deterministic controller used for vertex-level shape changes. */
  get deformation(): MeshDeformer {
    if (!this.deformationController || this.deformationController.geometry !== this.geometry) {
      this.deformationController = new MeshDeformer(this.geometry);
    }
    return this.deformationController;
  }

  /** Reports whether a lazily created controller currently changes the base geometry. */
  get isDeformed(): boolean {
    return this.deformationController?.isActive() ?? false;
  }

  /** Restores the captured base shape when a deformation controller exists. */
  resetDeformation(): this {
    this.deformationController?.reset();
    return this;
  }

  override clone(recursive = true): Mesh {
    const copy = new Mesh(this.geometry.clone(), this.material);
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
