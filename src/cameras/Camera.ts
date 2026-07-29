import { Frustum, Matrix4 } from "../math/index.js";
import { Object3D } from "../core/Object3D.js";

/** Base camera with cached view, projection and frustum matrices. */
export abstract class Camera extends Object3D {
  override readonly type: string = "Camera";
  readonly projectionMatrix = new Matrix4();
  readonly viewMatrix = new Matrix4();
  readonly viewProjectionMatrix = new Matrix4();
  readonly frustum = new Frustum();

  constructor(
    public near: number,
    public far: number,
    public zoom = 1,
  ) {
    super();
  }

  abstract updateProjectionMatrix(): this;

  updateCameraMatrices(): this {
    this.updateWorldMatrix(true, false);
    this.viewMatrix.copy(this.worldMatrix).invert();
    this.viewProjectionMatrix.multiplyMatrices(this.projectionMatrix, this.viewMatrix);
    this.frustum.setFromProjectionMatrix(this.viewProjectionMatrix);
    return this;
  }
}
