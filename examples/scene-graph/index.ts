import { Object3D, Scene } from "../../src/index.js";

const scene = new Scene();
const group = new Object3D();
group.name = "group";
const child = new Object3D();
child.name = "child";
scene.add(group);
group.add(child);
group.position.set(2, 0, 0);
child.position.set(1, 0, 0);
scene.updateWorldMatrix();
