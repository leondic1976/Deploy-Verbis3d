import {
  BasicMaterial,
  Mesh,
  Scene,
  createProceduralPerson,
  type ProceduralModel,
} from "../../src/index.js";

const scene = new Scene();
const person = createProceduralPerson({
  name: "guide",
  skinColor: [0.72, 0.46, 0.31, 1],
  shirtColor: [0.12, 0.58, 0.82, 1],
  pantsColor: [0.08, 0.13, 0.24, 1],
});
scene.add(person);

// Stable part IDs are independent of the root name used in the scene outliner.
const leftArm = person.getPart("left-upper-arm");
const rightArm = person.getPart("right-upper-arm");
leftArm?.rotateZ(-0.45);
rightArm?.rotateZ(0.2);

// Semantic roles let an editor recolor related meshes without touching skin or hair.
person.setRoleColor("primary", [0.9, 0.22, 0.14, 1]);

const head = person.getPart("head");
if (head instanceof Mesh && head.material instanceof BasicMaterial) {
  head.material.color.set(0.78, 0.52, 0.36, 1);
}

export function wave(model: ProceduralModel, elapsedTime: number): void {
  const arm = model.getPart("left-upper-arm");
  if (arm) arm.rotation.z = -0.55 + Math.sin(elapsedTime * 3) * 0.25;
}

export { person, scene };
