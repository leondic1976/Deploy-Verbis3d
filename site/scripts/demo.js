import {
  BasicMaterial,
  BoxGeometry,
  Engine,
  Mesh,
  PerspectiveCamera,
  Scene,
  WebGL2Renderer,
} from "../../src/index.ts";

const canvas = document.querySelector("#engine-demo");
const message = document.querySelector("#webgl-message");

if (canvas instanceof HTMLCanvasElement) {
  try {
    const renderer = new WebGL2Renderer({ canvas, antialias: true });
    const scene = new Scene();
    const camera = new PerspectiveCamera(52, 1, 0.1, 100);
    camera.position.set(0, 0.3, 4);
    const cube = new Mesh(
      new BoxGeometry(1.4, 1.4, 1.4),
      new BasicMaterial({ color: [0.18, 0.82, 0.68, 1] }),
    );
    cube.name = "cube";
    scene.add(cube);
    const engine = new Engine({ renderer, scene, camera });
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    engine.onUpdate((deltaTime) => {
      if (!reduceMotion) cube.rotateX(deltaTime * 0.35).rotateY(deltaTime * 0.7);
    });
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      renderer.setSize(bounds.width, bounds.height, false);
      camera.resize(bounds.width, bounds.height);
    };
    new ResizeObserver(resize).observe(canvas);
    resize();
    engine.start();
    canvas.dataset.webglReady = "true";
    requestAnimationFrame(() => {
      canvas.dataset.drawCalls = String(renderer.drawCalls);
    });
    if (message) message.textContent = "WebGL2 renderer active · 1 indexed draw call";
  } catch (error) {
    canvas.dataset.webglReady = "false";
    if (message) {
      message.textContent =
        error instanceof Error ? error.message : "WebGL2 could not be initialized.";
    }
  }
}
