import {
  BasicMaterial,
  BoxGeometry,
  Engine,
  Mesh,
  NaturalLanguageController,
  PerspectiveCamera,
  RuleBasedProvider,
  Scene,
  WebGL2Renderer,
} from "../../src/index.ts";

const canvas = document.querySelector("#playground-canvas");
const result = document.querySelector("#command-result");
const form = document.querySelector("#command-form");
const reset = document.querySelector("#reset-scene");
const inputs = {
  px: document.querySelector("#position-x"),
  py: document.querySelector("#position-y"),
  pz: document.querySelector("#position-z"),
  rx: document.querySelector("#rotation-x"),
  ry: document.querySelector("#rotation-y"),
  rz: document.querySelector("#rotation-z"),
  sx: document.querySelector("#scale-x"),
  sy: document.querySelector("#scale-y"),
  sz: document.querySelector("#scale-z"),
  color: document.querySelector("#object-color"),
};

if (canvas instanceof HTMLCanvasElement) {
  try {
    const renderer = new WebGL2Renderer({ canvas, antialias: true });
    const scene = new Scene();
    const camera = new PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 1, 5);
    camera.lookAt({ x: 0, y: 0, z: 0 });
    const material = new BasicMaterial({ color: [0.2, 0.7, 1, 1] });
    const cube = new Mesh(new BoxGeometry(), material);
    cube.name = "cube";
    scene.add(cube);
    const engine = new Engine({ renderer, scene, camera });
    const naturalLanguage = new NaturalLanguageController(scene, {
      provider: new RuleBasedProvider(),
    });

    const updateInputs = () => {
      inputs.px.value = cube.position.x.toFixed(2);
      inputs.py.value = cube.position.y.toFixed(2);
      inputs.pz.value = cube.position.z.toFixed(2);
      inputs.rx.value = ((cube.rotation.x * 180) / Math.PI).toFixed(0);
      inputs.ry.value = ((cube.rotation.y * 180) / Math.PI).toFixed(0);
      inputs.rz.value = ((cube.rotation.z * 180) / Math.PI).toFixed(0);
      inputs.sx.value = cube.scale.x.toFixed(2);
      inputs.sy.value = cube.scale.y.toFixed(2);
      inputs.sz.value = cube.scale.z.toFixed(2);
    };

    const readNumber = (input, fallback) => {
      const value = Number(input.value);
      return Number.isFinite(value) ? value : fallback;
    };

    for (const input of Object.values(inputs)) {
      input?.addEventListener("input", () => {
        cube.position.set(
          readNumber(inputs.px, cube.position.x),
          readNumber(inputs.py, cube.position.y),
          readNumber(inputs.pz, cube.position.z),
        );
        cube.rotation.set(
          (readNumber(inputs.rx, 0) * Math.PI) / 180,
          (readNumber(inputs.ry, 0) * Math.PI) / 180,
          (readNumber(inputs.rz, 0) * Math.PI) / 180,
        );
        cube.scale.set(
          Math.max(0.01, readNumber(inputs.sx, 1)),
          Math.max(0.01, readNumber(inputs.sy, 1)),
          Math.max(0.01, readNumber(inputs.sz, 1)),
        );
        if (inputs.color.value)
          material.color.setHex(Number.parseInt(inputs.color.value.slice(1), 16));
      });
    }

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const field = document.querySelector("#natural-command");
      if (!(field instanceof HTMLInputElement)) return;
      result.dataset.state = "";
      result.textContent = "Validating command…";
      try {
        const commandResults = await naturalLanguage.execute(field.value);
        const failure = commandResults.find((item) => !item.success);
        if (failure) throw new Error(`${failure.error.code}: ${failure.error.message}`);
        updateInputs();
        result.dataset.state = "success";
        result.textContent = `${commandResults.length} command(s) validated and applied.`;
      } catch (error) {
        result.dataset.state = "error";
        result.textContent = error instanceof Error ? error.message : "Command failed.";
      }
    });

    reset?.addEventListener("click", () => {
      cube.position.set(0, 0, 0);
      cube.rotation.set(0, 0, 0);
      cube.scale.set(1, 1, 1);
      cube.visible = true;
      material.color.set(0.2, 0.7, 1, 1);
      inputs.color.value = "#33b3ff";
      updateInputs();
      result.dataset.state = "success";
      result.textContent = "Scene reset.";
    });

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      renderer.setSize(bounds.width, bounds.height, false);
      camera.resize(bounds.width, bounds.height);
    };
    new ResizeObserver(resize).observe(canvas);
    resize();
    updateInputs();
    engine.start();
    canvas.dataset.webglReady = "true";
    requestAnimationFrame(() => {
      canvas.dataset.drawCalls = String(renderer.drawCalls);
    });
  } catch (error) {
    canvas.dataset.webglReady = "false";
    result.dataset.state = "error";
    result.textContent = error instanceof Error ? error.message : "WebGL2 initialization failed.";
  }
}
