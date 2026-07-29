import { Quaternion } from "./Quaternion.js";
import { EPSILON, Vector3 } from "./Vector3.js";

/** Column-major 4x4 matrix compatible with WebGL uniforms. */
export class Matrix4 {
  readonly elements = new Float32Array(16);

  constructor() {
    this.identity();
  }

  set(...values: readonly number[]): this {
    if (values.length !== 16) throw new RangeError("Matrix4.set requires 16 values.");
    this.elements.set(values);
    return this;
  }

  identity(): this {
    return this.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
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
    this.elements.set(result);
    return this;
  }

  determinant(): number {
    const m = this.elements;
    const n11 = m[0]!;
    const n12 = m[4]!;
    const n13 = m[8]!;
    const n14 = m[12]!;
    const n21 = m[1]!;
    const n22 = m[5]!;
    const n23 = m[9]!;
    const n24 = m[13]!;
    const n31 = m[2]!;
    const n32 = m[6]!;
    const n33 = m[10]!;
    const n34 = m[14]!;
    const n41 = m[3]!;
    const n42 = m[7]!;
    const n43 = m[11]!;
    const n44 = m[15]!;
    return (
      n41 *
        (+n14 * n23 * n32 -
          n13 * n24 * n32 -
          n14 * n22 * n33 +
          n12 * n24 * n33 +
          n13 * n22 * n34 -
          n12 * n23 * n34) +
      n42 *
        (+n11 * n23 * n34 -
          n11 * n24 * n33 +
          n14 * n21 * n33 -
          n13 * n21 * n34 +
          n13 * n24 * n31 -
          n14 * n23 * n31) +
      n43 *
        (+n11 * n24 * n32 -
          n11 * n22 * n34 -
          n14 * n21 * n32 +
          n12 * n21 * n34 +
          n14 * n22 * n31 -
          n12 * n24 * n31) +
      n44 *
        (-n13 * n22 * n31 -
          n11 * n23 * n32 +
          n11 * n22 * n33 +
          n13 * n21 * n32 -
          n12 * n21 * n33 +
          n12 * n23 * n31)
    );
  }

  invert(): this {
    const a = this.elements;
    const out = new Float32Array(16);
    const b00 = a[0]! * a[5]! - a[1]! * a[4]!;
    const b01 = a[0]! * a[6]! - a[2]! * a[4]!;
    const b02 = a[0]! * a[7]! - a[3]! * a[4]!;
    const b03 = a[1]! * a[6]! - a[2]! * a[5]!;
    const b04 = a[1]! * a[7]! - a[3]! * a[5]!;
    const b05 = a[2]! * a[7]! - a[3]! * a[6]!;
    const b06 = a[8]! * a[13]! - a[9]! * a[12]!;
    const b07 = a[8]! * a[14]! - a[10]! * a[12]!;
    const b08 = a[8]! * a[15]! - a[11]! * a[12]!;
    const b09 = a[9]! * a[14]! - a[10]! * a[13]!;
    const b10 = a[9]! * a[15]! - a[11]! * a[13]!;
    const b11 = a[10]! * a[15]! - a[11]! * a[14]!;
    const determinant = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (Math.abs(determinant) <= EPSILON) throw new RangeError("Matrix4 is singular.");
    const inverse = 1 / determinant;
    out[0] = (a[5]! * b11 - a[6]! * b10 + a[7]! * b09) * inverse;
    out[1] = (a[2]! * b10 - a[1]! * b11 - a[3]! * b09) * inverse;
    out[2] = (a[13]! * b05 - a[14]! * b04 + a[15]! * b03) * inverse;
    out[3] = (a[10]! * b04 - a[9]! * b05 - a[11]! * b03) * inverse;
    out[4] = (a[6]! * b08 - a[4]! * b11 - a[7]! * b07) * inverse;
    out[5] = (a[0]! * b11 - a[2]! * b08 + a[3]! * b07) * inverse;
    out[6] = (a[14]! * b02 - a[12]! * b05 - a[15]! * b01) * inverse;
    out[7] = (a[8]! * b05 - a[10]! * b02 + a[11]! * b01) * inverse;
    out[8] = (a[4]! * b10 - a[5]! * b08 + a[7]! * b06) * inverse;
    out[9] = (a[1]! * b08 - a[0]! * b10 - a[3]! * b06) * inverse;
    out[10] = (a[12]! * b04 - a[13]! * b02 + a[15]! * b00) * inverse;
    out[11] = (a[9]! * b02 - a[8]! * b04 - a[11]! * b00) * inverse;
    out[12] = (a[5]! * b07 - a[4]! * b09 - a[6]! * b06) * inverse;
    out[13] = (a[0]! * b09 - a[1]! * b07 + a[2]! * b06) * inverse;
    out[14] = (a[13]! * b01 - a[12]! * b03 - a[14]! * b00) * inverse;
    out[15] = (a[8]! * b03 - a[9]! * b01 + a[10]! * b00) * inverse;
    this.elements.set(out);
    return this;
  }

  transpose(): this {
    const e = this.elements;
    [e[1], e[4]] = [e[4]!, e[1]!];
    [e[2], e[8]] = [e[8]!, e[2]!];
    [e[3], e[12]] = [e[12]!, e[3]!];
    [e[6], e[9]] = [e[9]!, e[6]!];
    [e[7], e[13]] = [e[13]!, e[7]!];
    [e[11], e[14]] = [e[14]!, e[11]!];
    return this;
  }

  compose(
    position: Readonly<Vector3>,
    rotation: Readonly<Quaternion>,
    scale: Readonly<Vector3>,
  ): this {
    const x2 = rotation.x + rotation.x;
    const y2 = rotation.y + rotation.y;
    const z2 = rotation.z + rotation.z;
    const xx = rotation.x * x2;
    const xy = rotation.x * y2;
    const xz = rotation.x * z2;
    const yy = rotation.y * y2;
    const yz = rotation.y * z2;
    const zz = rotation.z * z2;
    const wx = rotation.w * x2;
    const wy = rotation.w * y2;
    const wz = rotation.w * z2;
    return this.set(
      (1 - (yy + zz)) * scale.x,
      (xy + wz) * scale.x,
      (xz - wy) * scale.x,
      0,
      (xy - wz) * scale.y,
      (1 - (xx + zz)) * scale.y,
      (yz + wx) * scale.y,
      0,
      (xz + wy) * scale.z,
      (yz - wx) * scale.z,
      (1 - (xx + yy)) * scale.z,
      0,
      position.x,
      position.y,
      position.z,
      1,
    );
  }

  decompose(position: Vector3, rotation: Quaternion, scale: Vector3): this {
    const e = this.elements;
    let sx = Math.hypot(e[0]!, e[1]!, e[2]!);
    const sy = Math.hypot(e[4]!, e[5]!, e[6]!);
    const sz = Math.hypot(e[8]!, e[9]!, e[10]!);
    if (this.determinant() < 0) sx = -sx;
    if (Math.abs(sx * sy * sz) <= EPSILON) throw new RangeError("Cannot decompose zero scale.");
    position.set(e[12]!, e[13]!, e[14]!);
    scale.set(sx, sy, sz);
    const m = this.clone();
    m.elements[0]! /= sx;
    m.elements[1]! /= sx;
    m.elements[2]! /= sx;
    m.elements[4]! /= sy;
    m.elements[5]! /= sy;
    m.elements[6]! /= sy;
    m.elements[8]! /= sz;
    m.elements[9]! /= sz;
    m.elements[10]! /= sz;
    rotation.copy(Matrix4.quaternionFromRotationMatrix(m));
    return this;
  }

  makeTranslation(x: number, y: number, z: number): this {
    return this.identity().setPosition(x, y, z);
  }

  makeScale(x: number, y: number, z: number): this {
    return this.set(x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1);
  }

  makeRotation(axis: Readonly<Vector3>, radians: number): this {
    return this.makeRotationFromQuaternion(new Quaternion().setFromAxisAngle(axis, radians));
  }

  makeRotationFromQuaternion(rotation: Readonly<Quaternion>): this {
    return this.compose(Vector3.ZERO, rotation, Vector3.ONE);
  }

  makePerspective(fieldOfViewRadians: number, aspect: number, near: number, far: number): this {
    if (
      fieldOfViewRadians <= 0 ||
      fieldOfViewRadians >= Math.PI ||
      aspect <= 0 ||
      near <= 0 ||
      far <= near
    ) {
      throw new RangeError(
        "Perspective parameters require 0 < fov < PI, aspect > 0 and 0 < near < far.",
      );
    }
    const f = 1 / Math.tan(fieldOfViewRadians / 2);
    const rangeInverse = 1 / (near - far);
    return this.set(
      f / aspect,
      0,
      0,
      0,
      0,
      f,
      0,
      0,
      0,
      0,
      (far + near) * rangeInverse,
      -1,
      0,
      0,
      2 * far * near * rangeInverse,
      0,
    );
  }

  makeOrthographic(
    left: number,
    right: number,
    top: number,
    bottom: number,
    near: number,
    far: number,
  ): this {
    if (right === left || top === bottom || far === near) {
      throw new RangeError("Orthographic bounds must describe a non-zero volume.");
    }
    const width = 1 / (right - left);
    const height = 1 / (top - bottom);
    const depth = 1 / (far - near);
    return this.set(
      2 * width,
      0,
      0,
      0,
      0,
      2 * height,
      0,
      0,
      0,
      0,
      -2 * depth,
      0,
      -(right + left) * width,
      -(top + bottom) * height,
      -(far + near) * depth,
      1,
    );
  }

  lookAt(eye: Readonly<Vector3>, target: Readonly<Vector3>, up: Readonly<Vector3>): this {
    const z = Vector3.subtract(eye, target).normalize();
    if (z.lengthSquared() <= EPSILON) z.z = 1;
    let x = Vector3.cross(up, z).normalize();
    if (x.lengthSquared() <= EPSILON) {
      z.x += 1e-4;
      z.normalize();
      x = Vector3.cross(up, z).normalize();
    }
    const y = Vector3.cross(z, x);
    return this.set(
      x.x,
      y.x,
      z.x,
      0,
      x.y,
      y.y,
      z.y,
      0,
      x.z,
      y.z,
      z.z,
      0,
      -x.dot(eye),
      -y.dot(eye),
      -z.dot(eye),
      1,
    );
  }

  setPosition(x: number, y: number, z: number): this {
    this.elements[12] = x;
    this.elements[13] = y;
    this.elements[14] = z;
    return this;
  }

  transformPoint(point: Readonly<Vector3>, out = new Vector3()): Vector3 {
    const e = this.elements;
    const w = e[3]! * point.x + e[7]! * point.y + e[11]! * point.z + e[15]!;
    const inverseW = Math.abs(w) <= EPSILON ? 1 : 1 / w;
    return out.set(
      (e[0]! * point.x + e[4]! * point.y + e[8]! * point.z + e[12]!) * inverseW,
      (e[1]! * point.x + e[5]! * point.y + e[9]! * point.z + e[13]!) * inverseW,
      (e[2]! * point.x + e[6]! * point.y + e[10]! * point.z + e[14]!) * inverseW,
    );
  }

  transformDirection(direction: Readonly<Vector3>, out = new Vector3()): Vector3 {
    const e = this.elements;
    return out
      .set(
        e[0]! * direction.x + e[4]! * direction.y + e[8]! * direction.z,
        e[1]! * direction.x + e[5]! * direction.y + e[9]! * direction.z,
        e[2]! * direction.x + e[6]! * direction.y + e[10]! * direction.z,
      )
      .normalize();
  }

  toFloat32Array(): Float32Array {
    return this.elements;
  }

  private static quaternionFromRotationMatrix(matrix: Readonly<Matrix4>): Quaternion {
    const e = matrix.elements;
    const trace = e[0]! + e[5]! + e[10]!;
    const q = new Quaternion();
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1);
      return q.set((e[6]! - e[9]!) * s, (e[8]! - e[2]!) * s, (e[1]! - e[4]!) * s, 0.25 / s);
    }
    if (e[0]! > e[5]! && e[0]! > e[10]!) {
      const s = 2 * Math.sqrt(1 + e[0]! - e[5]! - e[10]!);
      return q.set(0.25 * s, (e[4]! + e[1]!) / s, (e[8]! + e[2]!) / s, (e[6]! - e[9]!) / s);
    }
    if (e[5]! > e[10]!) {
      const s = 2 * Math.sqrt(1 + e[5]! - e[0]! - e[10]!);
      return q.set((e[4]! + e[1]!) / s, 0.25 * s, (e[9]! + e[6]!) / s, (e[8]! - e[2]!) / s);
    }
    const s = 2 * Math.sqrt(1 + e[10]! - e[0]! - e[5]!);
    return q.set((e[8]! + e[2]!) / s, (e[9]! + e[6]!) / s, 0.25 * s, (e[1]! - e[4]!) / s);
  }
}
