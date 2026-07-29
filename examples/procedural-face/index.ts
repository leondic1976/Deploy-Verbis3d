import { BasicMaterial, Mesh, Scene, createProceduralFace } from "../../src/index.js";

// This stylized bust is intentionally made from primitives. Expand its root in
// the Playground outliner to study the 18 independently editable scene nodes.
const scene = new Scene();
const face = createProceduralFace({
  name: "study-face",
  skinColor: [0.82, 0.52, 0.36, 1],
  hairColor: [0.04, 0.03, 0.025, 1],
});
scene.add(face);

// Root transforms preserve the relationship between every facial part.
face.position.set(0, -1.35, 0);
face.rotateY(-Math.PI / 12);
face.scale.set(1.1, 1.1, 1.1);

// Editing a child creates a simple expression without rebuilding the mesh.
const mouth = face.getObjectByName("study-face-mouth");
if (mouth) mouth.scale.set(0.68, 0.14, 0.08);

const leftEyebrow = face.getObjectByName("study-face-left-eyebrow");
const rightEyebrow = face.getObjectByName("study-face-right-eyebrow");
leftEyebrow?.rotateZ(-0.16);
rightEyebrow?.rotateZ(0.16);

const pupils = [
  face.getObjectByName("study-face-left-pupil"),
  face.getObjectByName("study-face-right-pupil"),
];
for (const pupil of pupils) {
  if (pupil instanceof Mesh && pupil.material instanceof BasicMaterial) {
    pupil.material.color.set(0.08, 0.42, 0.34, 1);
  }
}

export { face, scene };
