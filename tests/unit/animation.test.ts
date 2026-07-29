import { describe, expect, it } from "vitest";
import {
  AnimationClip,
  AnimationMixer,
  NumberKeyframeTrack,
  Object3D,
  QuaternionKeyframeTrack,
  Quaternion,
  Vector3,
  VectorKeyframeTrack,
} from "../../src/index.js";

describe("animation", () => {
  it("interpolates scalar, vector and quaternion tracks", () => {
    expect(new NumberKeyframeTrack("userData.opacity", [0, 1], [0, 10]).sample(0.25)).toBe(2.5);
    expect(
      new VectorKeyframeTrack("position", [0, 1], [0, 0, 0, 2, 0, 0])
        .sample(0.5)
        .equals(new Vector3(1, 0, 0)),
    ).toBe(true);
    const end = new Quaternion().setFromAxisAngle(Vector3.UP, Math.PI);
    const sampled = new QuaternionKeyframeTrack(
      "quaternion",
      [0, 1],
      [0, 0, 0, 1, end.x, end.y, end.z, end.w],
    ).sample(0.5);
    expect(sampled.rotateVector(Vector3.FORWARD).x).toBeCloseTo(-1);
  });

  it("plays, loops, pauses, seeks and stops actions", () => {
    const object = new Object3D();
    const clip = new AnimationClip("move", [
      new VectorKeyframeTrack("position", [0, 1], [0, 0, 0, 2, 0, 0]),
    ]);
    const mixer = new AnimationMixer(object);
    const action = mixer.clipAction(clip).play();
    mixer.update(0.5);
    expect(object.position.x).toBe(1);
    action.pause();
    mixer.update(0.2);
    expect(object.position.x).toBe(1);
    action.seek(1);
    expect(object.position.x).toBe(2);
    action.stop();
    expect(action.time).toBe(0);
  });
});
