import { Camera } from "./Camera.js";

/** Orthographic camera with zoom-aware clipping bounds. */
export class OrthographicCamera extends Camera {
  override readonly type = "OrthographicCamera";

  constructor(
    public left = -1,
    public right = 1,
    public top = 1,
    public bottom = -1,
    near = 0.1,
    far = 2000,
    zoom = 1,
  ) {
    super(near, far, zoom);
    this.updateProjectionMatrix();
  }

  updateProjectionMatrix(): this {
    if (this.zoom <= 0) throw new RangeError("Camera zoom must be positive.");
    const centerX = (this.left + this.right) / 2;
    const centerY = (this.top + this.bottom) / 2;
    const halfWidth = (this.right - this.left) / (2 * this.zoom);
    const halfHeight = (this.top - this.bottom) / (2 * this.zoom);
    this.projectionMatrix.makeOrthographic(
      centerX - halfWidth,
      centerX + halfWidth,
      centerY + halfHeight,
      centerY - halfHeight,
      this.near,
      this.far,
    );
    return this;
  }

  resize(width: number, height: number): this {
    if (width <= 0 || height <= 0) throw new RangeError("Camera size must be positive.");
    const verticalSize = this.top - this.bottom;
    const horizontalSize = verticalSize * (width / height);
    this.left = -horizontalSize / 2;
    this.right = horizontalSize / 2;
    return this.updateProjectionMatrix();
  }
}
