import {
  BasicMaterial,
  BoxGeometry,
  Engine,
  Mesh,
  PerspectiveCamera,
  Scene,
  WebGL2Renderer,
} from "../../src/index.js";

const canvas = document.querySelector("canvas");
if (!(canvas instanceof HTMLCanvasElement)) throw new Error("A canvas is required.");

const renderer = new WebGL2Renderer({ canvas });
const scene = new Scene();
const camera = new PerspectiveCamera(55, 1, 0.1, 100);
camera.position.set(0, 0, 5);
const cube = new Mesh(new BoxGeometry(), new BasicMaterial());
scene.add(cube);

const engine = new Engine({ renderer, scene, camera, fixedDeltaTime: 1 / 60 });
engine.onFixedUpdate((step) => {
  cube.userData["simulationTime"] = Number(cube.userData["simulationTime"] ?? 0) + step;
});
engine.onUpdate((deltaTime) => cube.rotateY(deltaTime));
engine.onRender((_deltaTime, elapsedTime) => {
  canvas.dataset.elapsed = elapsedTime.toFixed(2);
});
engine.start();
