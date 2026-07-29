import {
  BasicMaterial,
  BoxGeometry,
  Engine,
  Mesh,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGL2Renderer,
} from "../../src/index.js";

// 1. Bind Verbis3D directly to a WebGL2 canvas.
const canvas = document.querySelector("canvas");
if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The example requires a canvas.");
const renderer = new WebGL2Renderer({ canvas });

// 2. Assemble the public scene API.
const scene = new Scene();
const camera = new PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
camera.position.set(0, 1.5, 5);
camera.lookAt(new Vector3(0, 0, 0));
const cube = new Mesh(new BoxGeometry(), new BasicMaterial({ color: [0.2, 0.7, 1, 1] }));
cube.name = "cube";
scene.add(cube);

// 3. Connect behavior to the frame loop and handle the initial viewport size.
const engine = new Engine({ renderer, scene, camera });
engine.onUpdate((deltaTime) => cube.rotateY(deltaTime));
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
engine.start();
