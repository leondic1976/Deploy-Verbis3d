import type { Camera } from "../cameras/index.js";
import type { Mesh, Scene } from "../core/index.js";
import { BasicMaterial } from "../materials/index.js";
import { WebGLBufferManager } from "./WebGLBufferManager.js";
import { WebGLContext } from "./WebGLContext.js";
import { WebGLProgramManager } from "./WebGLProgramManager.js";
import { WebGLResourceTracker } from "./WebGLResourceTracker.js";
import { WebGLState } from "./WebGLState.js";
import { RenderList } from "./RenderList.js";
import type { Renderer } from "./Renderer.js";

export interface WebGL2RendererOptions extends WebGLContextAttributes {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  devicePixelRatio?: number;
  maxDevicePixelRatio?: number;
}

/** Functional WebGL2 backend supporting indexed and non-indexed mesh draws. */
export class WebGL2Renderer implements Renderer {
  readonly context: WebGLContext;
  readonly gl: WebGL2RenderingContext;
  drawCalls = 0;
  disposed = false;
  private readonly resources: WebGLResourceTracker;
  private readonly buffers: WebGLBufferManager;
  private readonly programs: WebGLProgramManager;
  private readonly state: WebGLState;
  private readonly renderList = new RenderList();
  private readonly pixelRatio: number;

  constructor(options: WebGL2RendererOptions) {
    const { canvas, devicePixelRatio, maxDevicePixelRatio = 2, ...attributes } = options;
    this.context = new WebGLContext(canvas, {
      antialias: attributes.antialias ?? true,
      alpha: attributes.alpha ?? false,
      ...attributes,
    });
    this.gl = this.context.gl;
    this.pixelRatio = Math.min(
      devicePixelRatio ?? (typeof window === "undefined" ? 1 : window.devicePixelRatio),
      maxDevicePixelRatio,
    );
    this.resources = new WebGLResourceTracker(this.gl);
    this.buffers = new WebGLBufferManager(this.gl, this.resources);
    this.programs = new WebGLProgramManager(this.gl, this.resources);
    this.state = new WebGLState(this.gl);
    this.state.reset();
  }

  setSize(width: number, height: number, updateStyle = true): void {
    if (width <= 0 || height <= 0) throw new RangeError("Renderer size must be positive.");
    const canvas = this.context.canvas;
    canvas.width = Math.max(1, Math.floor(width * this.pixelRatio));
    canvas.height = Math.max(1, Math.floor(height * this.pixelRatio));
    if (
      updateStyle &&
      typeof HTMLCanvasElement !== "undefined" &&
      canvas instanceof HTMLCanvasElement
    ) {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    this.gl.viewport(0, 0, canvas.width, canvas.height);
  }

  render(scene: Scene, camera: Camera): void {
    if (this.disposed) throw new Error("WebGL2Renderer has been disposed.");
    if (this.context.lost) return;
    scene.updateWorldMatrix(false, true);
    camera.updateCameraMatrices();
    const background = scene.background;
    this.gl.clearColor(background.r, background.g, background.b, background.a);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.drawCalls = 0;
    for (const command of this.renderList.build(scene).commands) {
      this.draw(command.mesh, camera);
    }
    this.gl.bindVertexArray(null);
  }

  dispose(): void {
    if (this.disposed) return;
    this.resources.dispose();
    this.context.dispose();
    this.disposed = true;
  }

  private draw(mesh: Mesh, camera: Camera): void {
    if (mesh.material instanceof BasicMaterial) mesh.material.syncUniforms();
    const program = this.programs.get(mesh.material);
    const binding = this.buffers.get(mesh.geometry, program);
    this.state.apply(mesh.material);
    this.gl.useProgram(program);
    this.setMatrix(program, "uModelMatrix", mesh.worldMatrix.elements);
    this.setMatrix(program, "uViewMatrix", camera.viewMatrix.elements);
    this.setMatrix(program, "uProjectionMatrix", camera.projectionMatrix.elements);
    for (const uniform of mesh.material.uniforms.values()) {
      const location = this.gl.getUniformLocation(program, uniform.name);
      if (!location) continue;
      const value = uniform.value;
      if (typeof value === "number") this.gl.uniform1f(location, value);
      else if (value instanceof Float32Array || Array.isArray(value)) {
        if (value.length === 4) this.gl.uniform4fv(location, value);
        else if (value.length === 3) this.gl.uniform3fv(location, value);
        else if (value.length === 2) this.gl.uniform2fv(location, value);
      }
    }
    this.gl.bindVertexArray(binding.vertexArray);
    if (binding.indexed) {
      this.gl.drawElements(this.gl.TRIANGLES, binding.count, binding.indexType, 0);
    } else {
      this.gl.drawArrays(this.gl.TRIANGLES, 0, binding.count);
    }
    this.drawCalls += 1;
  }

  private setMatrix(program: WebGLProgram, name: string, value: Float32Array): void {
    const location = this.gl.getUniformLocation(program, name);
    if (location) this.gl.uniformMatrix4fv(location, false, value);
  }
}
