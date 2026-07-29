import { Matrix4, Quaternion, Vector3 } from "../math/index.js";
import { EventDispatcher, type EngineEvent } from "./EventDispatcher.js";
import type { Lifecycle } from "./Lifecycle.js";
import { Transform } from "./Transform.js";
import { createUUID } from "./UUID.js";

let nextObjectId = 1;

export interface Object3DEvent extends EngineEvent {
  readonly target: Object3D;
  readonly child?: Object3D;
}

/** Base scene-graph node with hierarchy-safe parenting and cached transforms. */
export class Object3D extends EventDispatcher<Object3DEvent> implements Lifecycle {
  readonly id = nextObjectId++;
  readonly uuid = createUUID();
  name = "";
  readonly type: string = "Object3D";
  parent: Object3D | null = null;
  readonly children: Object3D[] = [];
  readonly transform = new Transform(() => this.invalidateDescendants());
  readonly position = this.transform.position;
  readonly rotation = this.transform.rotation;
  readonly quaternion = this.transform.quaternion;
  readonly scale = this.transform.scale;
  readonly matrix = this.transform.matrix;
  readonly worldMatrix = this.transform.worldMatrix;
  visible = true;
  enabled = true;
  userData: Record<string, unknown> = {};
  readonly components: ComponentLike[] = [];
  disposed = false;

  add(...objects: Object3D[]): this {
    this.assertUsable();
    for (const child of objects) {
      if (child === this || child.isAncestorOf(this)) {
        throw new Error("Scene graph cycles are not allowed.");
      }
      if (child.parent === this) continue;
      child.parent?.remove(child);
      child.parent = this;
      child.markWorldDirtyRecursive();
      this.children.push(child);
      this.dispatchEvent({ type: "childadded", target: this, child });
    }
    return this;
  }

  remove(...objects: Object3D[]): this {
    for (const child of objects) {
      const index = this.children.indexOf(child);
      if (index < 0) continue;
      this.children.splice(index, 1);
      child.parent = null;
      child.markWorldDirtyRecursive();
      this.dispatchEvent({ type: "childremoved", target: this, child });
    }
    return this;
  }

  clear(): this {
    return this.remove(...this.children);
  }

  traverse(visitor: (object: Object3D) => void): void {
    visitor(this);
    for (const child of [...this.children]) child.traverse(visitor);
  }

  traverseVisible(visitor: (object: Object3D) => void): void {
    if (!this.visible || !this.enabled) return;
    visitor(this);
    for (const child of [...this.children]) child.traverseVisible(visitor);
  }

  getObjectById(id: number): Object3D | undefined {
    if (this.id === id) return this;
    for (const child of this.children) {
      const match = child.getObjectById(id);
      if (match) return match;
    }
    return undefined;
  }

  getObjectByName(name: string): Object3D | undefined {
    if (this.name === name) return this;
    for (const child of this.children) {
      const match = child.getObjectByName(name);
      if (match) return match;
    }
    return undefined;
  }

  getObjectsByName(name: string): Object3D[] {
    const matches: Object3D[] = [];
    this.traverse((object) => {
      if (object.name === name) matches.push(object);
    });
    return matches;
  }

  updateMatrix(): this {
    this.transform.updateLocalMatrix();
    return this;
  }

  updateWorldMatrix(updateParents = false, updateChildren = true): this {
    if (updateParents) this.parent?.updateWorldMatrix(true, false);
    const localChanged = this.transform.updateLocalMatrix();
    if (localChanged || this.transform.worldDirty) {
      if (this.parent) this.worldMatrix.multiplyMatrices(this.parent.worldMatrix, this.matrix);
      else this.worldMatrix.copy(this.matrix);
      this.transform.worldDirty = false;
      this.transform.childrenDirty = false;
      for (const child of this.children) child.transform.markWorldDirty();
    }
    if (updateChildren) {
      for (const child of this.children) child.updateWorldMatrix(false, true);
    }
    return this;
  }

  translateOnAxis(axis: Readonly<Vector3>, distance: number): this {
    const direction = this.quaternion.rotateVector(axis).multiplyScalar(distance);
    this.position.add(direction);
    return this;
  }

  translateX(distance: number): this {
    return this.translateOnAxis(Vector3.RIGHT, distance);
  }

  translateY(distance: number): this {
    return this.translateOnAxis(Vector3.UP, distance);
  }

  translateZ(distance: number): this {
    return this.translateOnAxis(new Vector3(0, 0, 1), distance);
  }

  rotateOnAxis(axis: Readonly<Vector3>, radians: number): this {
    this.quaternion.multiply(new Quaternion().setFromAxisAngle(axis, radians)).normalize();
    return this;
  }

  rotateX(radians: number): this {
    return this.rotateOnAxis(Vector3.RIGHT, radians);
  }

  rotateY(radians: number): this {
    return this.rotateOnAxis(Vector3.UP, radians);
  }

  rotateZ(radians: number): this {
    return this.rotateOnAxis(new Vector3(0, 0, 1), radians);
  }

  lookAt(target: Readonly<Vector3>, up: Readonly<Vector3> = Vector3.UP): this {
    this.updateWorldMatrix(true, false);
    const worldPosition = new Vector3(
      this.worldMatrix.elements[12],
      this.worldMatrix.elements[13],
      this.worldMatrix.elements[14],
    );
    const world = new Matrix4().lookAt(worldPosition, target, up).invert();
    const worldRotation = new Quaternion();
    world.decompose(new Vector3(), worldRotation, new Vector3());
    if (this.parent) {
      const parentRotation = new Quaternion();
      this.parent.worldMatrix.decompose(new Vector3(), parentRotation, new Vector3());
      worldRotation.premultiply(parentRotation.invert());
    }
    this.quaternion.copy(worldRotation);
    return this;
  }

  addComponent(component: ComponentLike): this {
    if (this.components.includes(component)) return this;
    this.components.push(component);
    component.attach(this);
    return this;
  }

  removeComponent(component: ComponentLike): this {
    const index = this.components.indexOf(component);
    if (index >= 0) {
      this.components.splice(index, 1);
      component.detach();
    }
    return this;
  }

  clone(recursive = true): Object3D {
    const copy = new Object3D();
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

  dispose(): void {
    if (this.disposed) return;
    this.dispatchEvent({ type: "dispose", target: this });
    this.parent?.remove(this);
    for (const component of [...this.components]) {
      this.removeComponent(component);
      component.dispose?.();
    }
    for (const child of [...this.children]) child.dispose();
    this.clear();
    this.removeAllEventListeners();
    this.disposed = true;
  }

  protected assertUsable(): void {
    if (this.disposed) throw new Error(`${this.type} has been disposed.`);
  }

  private isAncestorOf(object: Object3D): boolean {
    let parent = object.parent;
    while (parent) {
      if (parent === this) return true;
      parent = parent.parent;
    }
    return false;
  }

  private invalidateDescendants(): void {
    for (const child of this.children) child.markWorldDirtyRecursive();
  }

  private markWorldDirtyRecursive(): void {
    this.transform.markWorldDirty();
    for (const child of this.children) child.markWorldDirtyRecursive();
  }
}

export interface ComponentLike {
  attach(object: Object3D): void;
  detach(): void;
  update?(deltaTime: number): void;
  dispose?(): void;
}
