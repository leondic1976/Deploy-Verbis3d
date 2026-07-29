import { describe, expect, it } from "vitest";
import {
  Box3,
  Color,
  Euler,
  Frustum,
  Matrix3,
  Matrix4,
  Plane,
  Quaternion,
  Ray,
  Sphere,
  Vector2,
  Vector3,
  Vector4,
} from "../../src/index.js";

describe("math core", () => {
  it("supports vector arithmetic, cross products and zero normalization", () => {
    expect(new Vector2(1, 2).add(new Vector2(2, 3))).toEqual(new Vector2(3, 5));
    expect(new Vector3(1, 2, 3).add(new Vector3(3, 2, 1)).equals(new Vector3(4, 4, 4))).toBe(true);
    expect(Vector3.cross(Vector3.RIGHT, Vector3.UP).equals(new Vector3(0, 0, 1))).toBe(true);
    expect(new Vector3().normalize().equals(Vector3.ZERO)).toBe(true);
    expect(new Vector4(3, 0, 4, 0).normalize().length()).toBeCloseTo(1);
    expect(() => new Vector2(1, 1).divideScalar(0)).toThrow(RangeError);
  });

  it("rotates and interpolates quaternions", () => {
    const rotation = new Quaternion().setFromAxisAngle(Vector3.UP, Math.PI / 2);
    const result = rotation.rotateVector(new Vector3(1, 0, 0));
    expect(result.x).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(-1);
    const halfway = new Quaternion().slerp(rotation, 0.5);
    expect(halfway.rotateVector(new Vector3(1, 0, 0)).z).toBeCloseTo(-Math.SQRT1_2);
    expect(new Quaternion().setFromEuler(new Euler(0, Math.PI / 2, 0)).equals(rotation)).toBe(true);
    expect(new Euler().setFromQuaternion(rotation).y).toBeCloseTo(Math.PI / 2);
    expect(new Euler(1, 1, 1).setFromQuaternion(new Quaternion(0, 0, 0, 0))).toEqual(new Euler());
    expect(() => new Quaternion(0, 0, 0, 0).invert()).toThrow(RangeError);
  });

  it("multiplies, inverts, transposes, composes and decomposes matrices", () => {
    const position = new Vector3(10, 2, -3);
    const rotation = new Quaternion().setFromAxisAngle(Vector3.UP, 0.4);
    const scale = new Vector3(2, 3, 4);
    const matrix = new Matrix4().compose(position, rotation, scale);
    const identity = matrix.clone().multiply(matrix.clone().invert());
    expect(identity.elements[0]).toBeCloseTo(1);
    expect(identity.elements[15]).toBeCloseTo(1);
    const outPosition = new Vector3();
    const outRotation = new Quaternion();
    const outScale = new Vector3();
    matrix.decompose(outPosition, outRotation, outScale);
    expect(outPosition.equals(position, 1e-6)).toBe(true);
    expect(outScale.equals(scale, 1e-6)).toBe(true);
    expect(
      outRotation
        .rotateVector(Vector3.FORWARD)
        .equals(rotation.rotateVector(Vector3.FORWARD), 1e-6),
    ).toBe(true);
    expect(new Matrix4().makeTranslation(2, 0, 0).transformPoint(new Vector3(1, 0, 0)).x).toBe(3);
    expect(() => new Matrix4().makeScale(0, 0, 0).invert()).toThrow(RangeError);
    expect(new Matrix3().transpose().determinant()).toBe(1);
  });

  it("builds perspective, orthographic and look-at matrices", () => {
    const perspective = new Matrix4().makePerspective(Math.PI / 3, 16 / 9, 0.1, 100);
    expect(perspective.elements[11]).toBe(-1);
    expect(() => new Matrix4().makePerspective(Math.PI / 3, 0, 0.1, 100)).toThrow(RangeError);
    expect(new Matrix4().makeOrthographic(-1, 1, 1, -1, 0.1, 10).elements[15]).toBe(1);
    const view = new Matrix4().lookAt(new Vector3(0, 0, 5), Vector3.ZERO, Vector3.UP);
    expect(view.transformPoint(new Vector3(0, 0, 5)).equals(Vector3.ZERO)).toBe(true);
  });

  it("tests geometric bounds, rays, planes and frusta", () => {
    const box = new Box3().setFromPoints([new Vector3(-1, -1, -1), new Vector3(1, 1, 1)]);
    expect(box.containsPoint(Vector3.ZERO)).toBe(true);
    const sphere = box.getBoundingSphere();
    expect(sphere.containsPoint(new Vector3(1, 0, 0))).toBe(true);
    expect(sphere.intersectsSphere(new Sphere(new Vector3(3, 0, 0), 2))).toBe(true);
    expect(
      new Ray(new Vector3(0, 0, 5), new Vector3(0, 0, -1)).intersectsSphere(Vector3.ZERO, 1),
    ).toBe(true);
    expect(
      new Plane()
        .setFromNormalAndPoint(Vector3.UP, Vector3.ZERO)
        .distanceToPoint(new Vector3(0, 2, 0)),
    ).toBe(2);
    const projection = new Matrix4().makePerspective(Math.PI / 2, 1, 0.1, 10);
    const view = new Matrix4().lookAt(new Vector3(0, 0, 3), Vector3.ZERO, Vector3.UP);
    const frustum = new Frustum().setFromProjectionMatrix(projection.multiply(view));
    expect(frustum.containsPoint(Vector3.ZERO)).toBe(true);
    expect(frustum.containsPoint(new Vector3(100, 0, 0))).toBe(false);
  });

  it("handles colors and output object reuse", () => {
    expect(new Color().setHex(0x336699).toArray()).toEqual([0x33 / 255, 0x66 / 255, 0x99 / 255, 1]);
    const output = new Vector3();
    expect(new Matrix4().makeScale(2, 2, 2).transformDirection(Vector3.RIGHT, output)).toBe(output);
  });
});
