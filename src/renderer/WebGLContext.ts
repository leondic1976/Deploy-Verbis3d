export interface WebGLContextOptions extends WebGLContextAttributes {
  canvas: HTMLCanvasElement | OffscreenCanvas;
}

/** Owns WebGL2 context acquisition and context-loss state. */
export class WebGLContext {
  readonly gl: WebGL2RenderingContext;
  lost = false;

  constructor(
    public readonly canvas: HTMLCanvasElement | OffscreenCanvas,
    attributes: WebGLContextAttributes = {},
  ) {
    const context = canvas.getContext("webgl2", attributes);
    if (!context) {
      throw new Error(
        "WebGL2 is unavailable. Use a current browser with hardware acceleration enabled.",
      );
    }
    this.gl = context;
    if (typeof HTMLCanvasElement !== "undefined" && canvas instanceof HTMLCanvasElement) {
      canvas.addEventListener("webglcontextlost", this.handleLost);
      canvas.addEventListener("webglcontextrestored", this.handleRestored);
    }
  }

  dispose(): void {
    if (typeof HTMLCanvasElement !== "undefined" && this.canvas instanceof HTMLCanvasElement) {
      this.canvas.removeEventListener("webglcontextlost", this.handleLost);
      this.canvas.removeEventListener("webglcontextrestored", this.handleRestored);
    }
  }

  private readonly handleLost = (event: Event): void => {
    event.preventDefault();
    this.lost = true;
  };

  private readonly handleRestored = (): void => {
    this.lost = false;
  };
}
