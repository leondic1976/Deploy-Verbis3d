import { Camera } from "./Camera.js";

/** Perspective camera. Field of view is expressed in degrees at the public API. */
export class PerspectiveCamera extends Camera {
  override readonly type = "PerspectiveCamera";

  constructor(
    public fov = 60,
    public aspect = 1,
    near = 0.1,
    far = 2000,
    zoom = 1,
  ) {
    super(near, far, zoom);
    this.updateProjectionMatrix();
  }

  updateProjectionMatrix(): this {
    if (this.zoom <= 0) throw new RangeError("Camera zoom must be positive.");
    this.projectionMatrix.makePerspective(
      (this.fov * Math.PI) / 180 / this.zoom,
      this.aspect,
      this.near,
      this.far,
    );
    return this;
  }

  resize(width: number, height: number): this {
    if (width <= 0 || height <= 0) throw new RangeError("Camera size must be positive.");
    this.aspect = width / height;
    return this.updateProjectionMatrix();
  }
}
