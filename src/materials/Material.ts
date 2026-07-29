import { createUUID } from "../core/UUID.js";
import { Shader } from "./Shader.js";
import { ShaderProgram } from "./ShaderProgram.js";
import type { Uniform, UniformValue } from "./Uniform.js";

export interface MaterialOptions {
  transparent?: boolean;
  depthTest?: boolean;
  depthWrite?: boolean;
  side?: "front" | "back" | "double";
}

/** Render material containing GLSL sources, uniforms and fixed-function state. */
export class Material {
  readonly uuid = createUUID();
  readonly uniforms = new Map<string, Uniform<UniformValue>>();
  readonly shaderProgram: ShaderProgram;
  transparent: boolean;
  depthTest: boolean;
  depthWrite: boolean;
  side: "front" | "back" | "double";
  disposed = false;

  constructor(vertexSource: string, fragmentSource: string, options: MaterialOptions = {}) {
    this.shaderProgram = new ShaderProgram(
      new Shader("vertex", vertexSource),
      new Shader("fragment", fragmentSource),
    );
    this.transparent = options.transparent ?? false;
    this.depthTest = options.depthTest ?? true;
    this.depthWrite = options.depthWrite ?? true;
    this.side = options.side ?? "front";
  }

  setUniform(uniform: Uniform<UniformValue>): this {
    this.uniforms.set(uniform.name, uniform);
    return this;
  }

  dispose(): void {
    this.uniforms.clear();
    this.disposed = true;
  }
}
