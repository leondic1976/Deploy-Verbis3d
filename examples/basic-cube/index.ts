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
if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The example requires a canvas.");
const renderer = new WebGL2Renderer({ canvas });
const scene = new Scene();
const camera = new PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
camera.position.set(0, 1.5, 5);
const cube = new Mesh(new BoxGeometry(), new BasicMaterial({ color: [0.2, 0.7, 1, 1] }));
scene.add(cube);
const engine = new Engine({ renderer, scene, camera });
engine.onUpdate((deltaTime) => cube.rotateY(deltaTime));
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
engine.start();
