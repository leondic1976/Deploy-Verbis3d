import type { Material } from "../materials/index.js";

/** Minimal fixed-function state cache for depth, culling and blending. */
export class WebGLState {
  constructor(private readonly gl: WebGL2RenderingContext) {}

  apply(material: Material): void {
    this.setCapability(this.gl.DEPTH_TEST, material.depthTest);
    this.gl.depthMask(material.depthWrite);
    this.setCapability(this.gl.BLEND, material.transparent);
    if (material.transparent) {
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }
    this.setCapability(this.gl.CULL_FACE, material.side !== "double");
    if (material.side !== "double") {
      this.gl.cullFace(material.side === "front" ? this.gl.BACK : this.gl.FRONT);
    }
  }

  reset(): void {
    this.gl.disable(this.gl.BLEND);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.depthMask(true);
    this.gl.cullFace(this.gl.BACK);
  }

  private setCapability(capability: number, enabled: boolean): void {
    if (enabled) this.gl.enable(capability);
    else this.gl.disable(capability);
  }
}
