import {
  BasicMaterial,
  BoxGeometry,
  Mesh,
  NaturalLanguageController,
  RuleBasedProvider,
  Scene,
} from "../../src/index.js";

const scene = new Scene();
const cube = new Mesh(new BoxGeometry(), new BasicMaterial());
cube.name = "cube";
scene.add(cube);
const controller = new NaturalLanguageController(scene, {
  provider: new RuleBasedProvider(),
});
await controller.execute("큐브를 오른쪽으로 2 이동");
