import { EPSILON } from "./Vector3.js";

/** XYZ Euler rotation in radians. */
export class Euler {
  private changeListener: (() => void) | undefined;

  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}

  onChange(listener: (() => void) | undefined): this {
    this.changeListener = listener;
    return this;
  }

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.changeListener?.();
    return this;
  }

  copy(value: Readonly<Euler>): this {
    return this.set(value.x, value.y, value.z);
  }

  clone(): Euler {
    return new Euler(this.x, this.y, this.z);
  }

  equals(value: Readonly<Euler>, epsilon = EPSILON): boolean {
    return (
      Math.abs(this.x - value.x) <= epsilon &&
      Math.abs(this.y - value.y) <= epsilon &&
      Math.abs(this.z - value.z) <= epsilon
    );
  }
}
