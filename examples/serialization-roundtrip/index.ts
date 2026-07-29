import { BasicMaterial, BoxGeometry, JSONSceneLoader, Mesh, Scene } from "../../src/index.js";

const source = new Scene();
source.background.set(0.02, 0.05, 0.08, 1);
const cube = new Mesh(new BoxGeometry(), new BasicMaterial({ color: [0.2, 0.8, 0.6, 1] }));
cube.name = "saved-cube";
cube.position.set(2, 1, -3);
cube.userData["author"] = "Verbis3D learner";
source.add(cube);

const loader = new JSONSceneLoader();
const json = loader.stringify(source);
const restored = loader.parse(JSON.parse(json));

console.log(restored.getObjectByName("saved-cube")?.position);
