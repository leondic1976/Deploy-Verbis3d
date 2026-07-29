import {
  AnimationClip,
  AnimationMixer,
  Object3D,
  Quaternion,
  QuaternionKeyframeTrack,
  Vector3,
  VectorKeyframeTrack,
} from "../../src/index.js";

const cube = new Object3D();
const halfTurn = new Quaternion().setFromAxisAngle(Vector3.UP, Math.PI);
const clip = new AnimationClip("move-and-turn", [
  new VectorKeyframeTrack("position", [0, 1, 2], [0, 0, 0, 2, 1, 0, 0, 0, 0]),
  new QuaternionKeyframeTrack(
    "quaternion",
    [0, 2],
    [0, 0, 0, 1, halfTurn.x, halfTurn.y, halfTurn.z, halfTurn.w],
  ),
]);
const mixer = new AnimationMixer(cube);
const action = mixer.clipAction(clip).play();

// Advance from an Engine.onUpdate callback in a rendered application.
mixer.update(0.5);
action.pause().seek(1.25).play();
