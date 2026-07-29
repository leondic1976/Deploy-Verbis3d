import type { Shader } from "./Shader.js";

/** WebGL program resource with readable compile/link diagnostics. */
export class ShaderProgram {
  program: WebGLProgram | null = null;

  constructor(
    public readonly vertexShader: Shader,
    public readonly fragmentShader: Shader,
  ) {}

  compile(gl: WebGL2RenderingContext): WebGLProgram {
    if (this.program) return this.program;
    const vertex = this.compileStage(gl, gl.VERTEX_SHADER, this.vertexShader);
    const fragment = this.compileStage(gl, gl.FRAGMENT_SHADER, this.fragmentShader);
    const program = gl.createProgram();
    if (!program) throw new Error("WebGL could not allocate a shader program.");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? "No linker log was provided.";
      gl.deleteProgram(program);
      throw new Error(`WebGL program link failed:\n${log}`);
    }
    this.program = program;
    return program;
  }

  dispose(gl: WebGL2RenderingContext): void {
    if (this.program) gl.deleteProgram(this.program);
    this.program = null;
  }

  private compileStage(gl: WebGL2RenderingContext, type: number, shader: Shader): WebGLShader {
    const resource = gl.createShader(type);
    if (!resource) throw new Error(`WebGL could not allocate the ${shader.stage} shader.`);
    gl.shaderSource(resource, shader.source);
    gl.compileShader(resource);
    if (!gl.getShaderParameter(resource, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(resource) ?? "No compiler log was provided.";
      gl.deleteShader(resource);
      throw new Error(`${shader.stage} shader compilation failed:\n${log}`);
    }
    return resource;
  }
}
