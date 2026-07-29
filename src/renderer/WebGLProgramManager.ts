import type { Material } from "../materials/index.js";
import type { WebGLResourceTracker } from "./WebGLResourceTracker.js";

/** Lazily compiles and caches material programs. */
export class WebGLProgramManager {
  private readonly programs = new WeakMap<Material, WebGLProgram>();

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly resources: WebGLResourceTracker,
  ) {}

  get(material: Material): WebGLProgram {
    const cached = this.programs.get(material);
    if (cached) return cached;
    const program = this.resources.trackProgram(material.shaderProgram.compile(this.gl));
    this.programs.set(material, program);
    return program;
  }
}
