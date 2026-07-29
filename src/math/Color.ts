import { EPSILON } from "./Vector3.js";

/** Linear RGBA color with values normally in the 0..1 range. */
export class Color {
  constructor(
    public r = 1,
    public g = 1,
    public b = 1,
    public a = 1,
  ) {}

  set(r: number, g: number, b: number, a = this.a): this {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
    return this;
  }

  setHex(hex: number): this {
    return this.set(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
  }

  copy(value: Readonly<Color>): this {
    return this.set(value.r, value.g, value.b, value.a);
  }

  clone(): Color {
    return new Color(this.r, this.g, this.b, this.a);
  }

  toArray(): [number, number, number, number] {
    return [this.r, this.g, this.b, this.a];
  }

  equals(value: Readonly<Color>, epsilon = EPSILON): boolean {
    return (
      Math.abs(this.r - value.r) <= epsilon &&
      Math.abs(this.g - value.g) <= epsilon &&
      Math.abs(this.b - value.b) <= epsilon &&
      Math.abs(this.a - value.a) <= epsilon
    );
  }
}
