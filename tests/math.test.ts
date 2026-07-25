import { describe, expect, it } from "vitest";
import { Matrix4, Quaternion, Vector3 } from "../src/index.js";

describe("Vector3", () => {
  it("adds and normalizes vectors", () => {
    const vector = new Vector3(1, 2, 3).add(new Vector3(3, 2, 1));
    expect(vector.equals(new Vector3(4, 4, 4))).toBe(true);
    expect(new Vector3(3, 0, 4).normalize().length()).toBeCloseTo(1);
  });

  it("calculates a cross product", () => {
    const result = Vector3.cross(Vector3.RIGHT, Vector3.UP);
    expect(result.equals(new Vector3(0, 0, 1))).toBe(true);
  });
});

describe("Quaternion", () => {
  it("rotates a vector around an axis", () => {
    const rotation = new Quaternion().setFromAxisAngle(Vector3.UP, Math.PI / 2);
    const result = rotation.rotateVector(new Vector3(1, 0, 0));
    expect(result.x).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(-1);
  });
});

describe("Matrix4", () => {
  it("composes translation, rotation and scale", () => {
    const matrix = new Matrix4().compose(
      new Vector3(10, 0, 0),
      new Quaternion(),
      new Vector3(2, 2, 2),
    );
    const result = matrix.transformPoint(new Vector3(1, 0, 0));
    expect(result.equals(new Vector3(12, 0, 0))).toBe(true);
  });

  it("rejects invalid perspective parameters", () => {
    expect(() => new Matrix4().makePerspective(Math.PI / 3, 0, 0.1, 100)).toThrow(RangeError);
  });
});
