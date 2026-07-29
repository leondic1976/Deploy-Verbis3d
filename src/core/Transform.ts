import { Euler, Matrix4, Quaternion, Vector3 } from "../math/index.js";

/** Local transform and cached matrices with explicit dirty-state tracking. */
export class Transform {
  readonly position = new Vector3();
  readonly rotation = new Euler();
  readonly quaternion = new Quaternion();
  readonly scale = new Vector3(1, 1, 1);
  readonly matrix = new Matrix4();
  readonly worldMatrix = new Matrix4();
  localDirty = true;
  worldDirty = true;
  childrenDirty = true;
  private syncingRotation = false;

  constructor(private readonly dirtyListener?: () => void) {
    const mark = (): void => this.markLocalDirty();
    this.position.onChange(mark);
    this.scale.onChange(mark);
    this.quaternion.onChange(mark);
    this.rotation.onChange(() => {
      if (!this.syncingRotation) {
        this.syncingRotation = true;
        this.quaternion.setFromEuler(this.rotation);
        this.syncingRotation = false;
      }
      this.markLocalDirty();
    });
  }

  markLocalDirty(): void {
    this.localDirty = true;
    this.worldDirty = true;
    this.childrenDirty = true;
    this.dirtyListener?.();
  }

  markWorldDirty(): void {
    this.worldDirty = true;
    this.childrenDirty = true;
  }

  updateLocalMatrix(): boolean {
    if (!this.localDirty) return false;
    this.matrix.compose(this.position, this.quaternion, this.scale);
    this.localDirty = false;
    return true;
  }
}
