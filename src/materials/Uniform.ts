export type UniformValue = number | readonly number[] | Float32Array | WebGLTexture | null;

/** Named shader uniform value. */
export class Uniform<TValue extends UniformValue = UniformValue> {
  constructor(
    public readonly name: string,
    public value: TValue,
  ) {}
}
