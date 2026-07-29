/** Immutable GLSL ES shader source. */
export class Shader {
  constructor(
    public readonly stage: "vertex" | "fragment",
    public readonly source: string,
  ) {
    if (!source.includes("#version 300 es")) {
      throw new Error("Verbis3D WebGL2 shaders must declare '#version 300 es'.");
    }
  }
}
