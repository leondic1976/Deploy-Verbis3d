import { Color } from "../math/index.js";
import { Material, type MaterialOptions } from "./Material.js";
import { Uniform } from "./Uniform.js";

export const VERTEX_COLOR_VERTEX_SHADER = `#version 300 es
precision highp float;
in vec3 aPosition;
in vec4 aColor;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
out vec4 vColor;
void main() {
  vColor = aColor;
  gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
}`;

export const VERTEX_COLOR_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec4 vColor;
uniform vec4 uTint;
out vec4 outColor;
void main() {
  outColor = vColor * uTint;
}`;

export interface VertexColorMaterialOptions extends MaterialOptions {
  tint?: Color | readonly [number, number, number, number];
}

/** Unlit material that renders normalized per-vertex RGBA colors with an optional tint. */
export class VertexColorMaterial extends Material {
  readonly tint: Color;

  constructor(options: VertexColorMaterialOptions = {}) {
    super(VERTEX_COLOR_VERTEX_SHADER, VERTEX_COLOR_FRAGMENT_SHADER, options);
    this.tint =
      options.tint instanceof Color
        ? options.tint.clone()
        : new Color(...(options.tint ?? [1, 1, 1, 1]));
    this.setUniform(new Uniform("uTint", this.tint.toArray()));
  }

  syncUniforms(): void {
    const uniform = this.uniforms.get("uTint");
    if (uniform) uniform.value = this.tint.toArray();
  }
}
