import { AnimationClip, AnimationMixer, Object3D, VectorKeyframeTrack } from "../../src/index.js";

const cube = new Object3D();
const clip = new AnimationClip("move", [
  new VectorKeyframeTrack("position", [0, 1], [0, 0, 0, 2, 0, 0]),
]);
const mixer = new AnimationMixer(cube);
mixer.clipAction(clip).play();
mixer.update(0.5);
