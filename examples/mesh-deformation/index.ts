import {
  AnimationClip,
  AnimationMixer,
  BasicMaterial,
  Mesh,
  NumberKeyframeTrack,
  SphereGeometry,
} from "../../src/index.js";

const sculpture = new Mesh(
  new SphereGeometry(1, 32, 18),
  new BasicMaterial({ color: [0.15, 0.78, 0.66, 1] }),
);
sculpture.name = "sculpture";

// Transform values move the complete object. Deformation values edit its local vertices.
sculpture.position.set(1.5, 0, -2);
sculpture.deformation.configure({
  axis: "y",
  stretch: 1.8,
  bend: Math.PI * 0.45,
  taper: 0.55,
  waveAmplitude: 0.08,
  waveFrequency: 2,
});

// Numeric deformation accessors use the same keyframe path binding as transforms.
const clip = new AnimationClip("shape-cycle", [
  new NumberKeyframeTrack("deformation.twist", [0, 1.5, 3], [-Math.PI, Math.PI, -Math.PI]),
  new NumberKeyframeTrack("position.x", [0, 1.5, 3], [1.5, 2.5, 1.5]),
]);
const mixer = new AnimationMixer(sculpture);
const action = mixer.clipAction(clip).play();

// Call mixer.update(deltaTime) from Engine.onUpdate. Reset restores the captured base shape.
export { action, clip, mixer, sculpture };
