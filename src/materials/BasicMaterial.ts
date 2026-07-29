import { Color } from "../math/index.js";
import { Material, type MaterialOptions } from "./Material.js";
import { Uniform } from "./Uniform.js";

export const BASIC_VERTEX_SHADER = `#version 300 es
precision highp float;
in vec3 aPosition;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
void main() {
  gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
}`;

export const BASIC_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform vec4 uColor;
out vec4 outColor;
void main() {
  outColor = uColor;
}`;

export interface BasicMaterialOptions extends MaterialOptions {
  color?: Color | readonly [number, number, number, number];
}

/** Unlit solid-color material. */
export class BasicMaterial extends Material {
  readonly color: Color;

  constructor(options: BasicMaterialOptions = {}) {
    super(BASIC_VERTEX_SHADER, BASIC_FRAGMENT_SHADER, options);
    this.color =
      options.color instanceof Color
        ? options.color.clone()
        : new Color(...(options.color ?? [1, 1, 1, 1]));
    this.setUniform(new Uniform("uColor", this.color.toArray()));
  }

  syncUniforms(): void {
    const uniform = this.uniforms.get("uColor");
    if (uniform) uniform.value = this.color.toArray();
  }
}
