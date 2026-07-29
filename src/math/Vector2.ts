import { EPSILON } from "./Vector3.js";

/** Mutable two-dimensional vector. */
export class Vector2 {
  constructor(
    public x = 0,
    public y = 0,
  ) {}

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(value: Readonly<Vector2>): this {
    return this.set(value.x, value.y);
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  add(value: Readonly<Vector2>): this {
    return this.set(this.x + value.x, this.y + value.y);
  }

  subtract(value: Readonly<Vector2>): this {
    return this.set(this.x - value.x, this.y - value.y);
  }

  multiplyScalar(scalar: number): this {
    return this.set(this.x * scalar, this.y * scalar);
  }

  divideScalar(scalar: number): this {
    if (Math.abs(scalar) <= EPSILON) throw new RangeError("Vector2 cannot be divided by zero.");
    return this.multiplyScalar(1 / scalar);
  }

  dot(value: Readonly<Vector2>): number {
    return this.x * value.x + this.y * value.y;
  }

  lengthSquared(): number {
    return this.dot(this);
  }

  length(): number {
    return Math.sqrt(this.lengthSquared());
  }

  normalize(): this {
    const magnitude = this.length();
    return magnitude <= EPSILON ? this.set(0, 0) : this.divideScalar(magnitude);
  }

  distanceTo(value: Readonly<Vector2>): number {
    return Math.hypot(this.x - value.x, this.y - value.y);
  }

  lerp(target: Readonly<Vector2>, alpha: number): this {
    return this.set(this.x + (target.x - this.x) * alpha, this.y + (target.y - this.y) * alpha);
  }

  equals(value: Readonly<Vector2>, epsilon = EPSILON): boolean {
    return Math.abs(this.x - value.x) <= epsilon && Math.abs(this.y - value.y) <= epsilon;
  }
}
