import { Quaternion } from "./Quaternion.js";
import { Vector3 } from "./Vector3.js";

/** Column-major 4x4 matrix compatible with WebGL uniforms. */
export class Matrix4 {
  readonly elements: Float32Array;

  constructor() {
    this.elements = new Float32Array(16);
    this.identity();
  }

  identity(): this {
    const e = this.elements;
    e.fill(0);
    e[0] = 1;
    e[5] = 1;
    e[10] = 1;
    e[15] = 1;
    return this;
  }

  copy(value: Readonly<Matrix4>): this {
    this.elements.set(value.elements);
    return this;
  }

  clone(): Matrix4 {
    return new Matrix4().copy(this);
  }

  multiply(value: Readonly<Matrix4>): this {
    return this.multiplyMatrices(this, value);
  }

  premultiply(value: Readonly<Matrix4>): this {
    return this.multiplyMatrices(value, this);
  }

  multiplyMatrices(a: Readonly<Matrix4>, b: Readonly<Matrix4>): this {
    const ae = a.elements;
    const be = b.elements;
    const te = this.elements;
    const result = new Float32Array(16);

    for (let column = 0; column < 4; column += 1) {
      for (let row = 0; row < 4; row += 1) {
        result[column * 4 + row] =
          ae[row]! * be[column * 4]! +
          ae[4 + row]! * be[column * 4 + 1]! +
          ae[8 + row]! * be[column * 4 + 2]! +
          ae[12 + row]! * be[column * 4 + 3]!;
      }
    }

    te.set(result);
    return this;
  }

  makeTranslation(x: number, y: number, z: number): this {
    this.identity();
    this.elements[12] = x;
    this.elements[13] = y;
    this.elements[14] = z;
    return this;
  }

  makeScale(x: number, y: number, z: number): this {
    this.identity();
    this.elements[0] = x;
    this.elements[5] = y;
    this.elements[10] = z;
    return this;
  }

  compose(
    position: Readonly<Vector3>,
    rotation: Readonly<Quaternion>,
    scale: Readonly<Vector3>,
  ): this {
    const x = rotation.x;
    const y = rotation.y;
    const z = rotation.z;
    const w = rotation.w;
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;
    const e = this.elements;

    e[0] = (1 - (yy + zz)) * scale.x;
    e[1] = (xy + wz) * scale.x;
    e[2] = (xz - wy) * scale.x;
    e[3] = 0;

    e[4] = (xy - wz) * scale.y;
    e[5] = (1 - (xx + zz)) * scale.y;
    e[6] = (yz + wx) * scale.y;
    e[7] = 0;

    e[8] = (xz + wy) * scale.z;
    e[9] = (yz - wx) * scale.z;
    e[10] = (1 - (xx + yy)) * scale.z;
    e[11] = 0;

    e[12] = position.x;
    e[13] = position.y;
    e[14] = position.z;
    e[15] = 1;
    return this;
  }

  makePerspective(
    fieldOfViewRadians: number,
    aspect: number,
    near: number,
    far: number,
  ): this {
    if (aspect <= 0 || near <= 0 || far <= near) {
      throw new RangeError("Perspective parameters must satisfy aspect > 0 and 0 < near < far.");
    }

    const f = 1 / Math.tan(fieldOfViewRadians / 2);
    const rangeInverse = 1 / (near - far);
    const e = this.elements;
    e.fill(0);
    e[0] = f / aspect;
    e[5] = f;
    e[10] = (far + near) * rangeInverse;
    e[11] = -1;
    e[14] = 2 * far * near * rangeInverse;
    return this;
  }

  transformPoint(point: Readonly<Vector3>, out = new Vector3()): Vector3 {
    const e = this.elements;
    const x = point.x;
    const y = point.y;
    const z = point.z;
    const w = e[3]! * x + e[7]! * y + e[11]! * z + e[15]!;
    const inverseW = w === 0 ? 1 : 1 / w;

    return out.set(
      (e[0]! * x + e[4]! * y + e[8]! * z + e[12]!) * inverseW,
      (e[1]! * x + e[5]! * y + e[9]! * z + e[13]!) * inverseW,
      (e[2]! * x + e[6]! * y + e[10]! * z + e[14]!) * inverseW,
    );
  }

  toFloat32Array(): Float32Array {
    return this.elements;
  }
}
