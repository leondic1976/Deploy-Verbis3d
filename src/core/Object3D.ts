import { Matrix4, Quaternion, Vector3 } from "../math/index.js";

let nextObjectId = 1;

export class Object3D {
  readonly id = nextObjectId++;
  name = "";
  readonly position = new Vector3();
  readonly rotation = new Quaternion();
  readonly scale = new Vector3(1, 1, 1);
  readonly localMatrix = new Matrix4();
  readonly worldMatrix = new Matrix4();
  parent: Object3D | null = null;
  readonly children: Object3D[] = [];
  visible = true;
  enabled = true;
  userData: Record<string, unknown> = {};

  add(child: Object3D): this {
    if (child === this) throw new Error("An object cannot be its own child.");
    if (child.parent) child.parent.remove(child);
    child.parent = this;
    this.children.push(child);
    return this;
  }

  remove(child: Object3D): this {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
      child.parent = null;
    }
    return this;
  }

  updateLocalMatrix(): this {
    this.localMatrix.compose(this.position, this.rotation, this.scale);
    return this;
  }

  updateWorldMatrix(parentWorld?: Readonly<Matrix4>): this {
    this.updateLocalMatrix();
    if (parentWorld) this.worldMatrix.multiplyMatrices(parentWorld, this.localMatrix);
    else this.worldMatrix.copy(this.localMatrix);
    for (const child of this.children) child.updateWorldMatrix(this.worldMatrix);
    return this;
  }

  traverse(visitor: (object: Object3D) => void): void {
    visitor(this);
    for (const child of this.children) child.traverse(visitor);
  }

  findByName(name: string): Object3D | undefined {
    if (this.name === name) return this;
    for (const child of this.children) {
      const found = child.findByName(name);
      if (found) return found;
    }
    return undefined;
  }
}
