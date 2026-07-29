import { EPSILON } from "./Vector3.js";

/** Column-major 3x3 matrix. */
export class Matrix3 {
  readonly elements = new Float32Array(9);

  constructor() {
    this.identity();
  }

  identity(): this {
    this.elements.set([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    return this;
  }

  copy(value: Readonly<Matrix3>): this {
    this.elements.set(value.elements);
    return this;
  }

  clone(): Matrix3 {
    return new Matrix3().copy(this);
  }

  multiply(value: Readonly<Matrix3>): this {
    const a = this.elements.slice();
    const b = value.elements;
    const result = this.elements;
    for (let column = 0; column < 3; column += 1) {
      for (let row = 0; row < 3; row += 1) {
        result[column * 3 + row] =
          a[row]! * b[column * 3]! +
          a[3 + row]! * b[column * 3 + 1]! +
          a[6 + row]! * b[column * 3 + 2]!;
      }
    }
    return this;
  }

  determinant(): number {
    const e = this.elements;
    return (
      e[0]! * (e[4]! * e[8]! - e[7]! * e[5]!) -
      e[3]! * (e[1]! * e[8]! - e[7]! * e[2]!) +
      e[6]! * (e[1]! * e[5]! - e[4]! * e[2]!)
    );
  }

  invert(): this {
    const e = this.elements;
    const determinant = this.determinant();
    if (Math.abs(determinant) <= EPSILON) throw new RangeError("Matrix3 is singular.");
    const inverse = 1 / determinant;
    const result = new Float32Array([
      (e[4]! * e[8]! - e[5]! * e[7]!) * inverse,
      (e[2]! * e[7]! - e[1]! * e[8]!) * inverse,
      (e[1]! * e[5]! - e[2]! * e[4]!) * inverse,
      (e[5]! * e[6]! - e[3]! * e[8]!) * inverse,
      (e[0]! * e[8]! - e[2]! * e[6]!) * inverse,
      (e[2]! * e[3]! - e[0]! * e[5]!) * inverse,
      (e[3]! * e[7]! - e[4]! * e[6]!) * inverse,
      (e[1]! * e[6]! - e[0]! * e[7]!) * inverse,
      (e[0]! * e[4]! - e[1]! * e[3]!) * inverse,
    ]);
    this.elements.set(result);
    return this;
  }

  transpose(): this {
    const e = this.elements;
    [e[1], e[3]] = [e[3]!, e[1]!];
    [e[2], e[6]] = [e[6]!, e[2]!];
    [e[5], e[7]] = [e[7]!, e[5]!];
    return this;
  }
}
