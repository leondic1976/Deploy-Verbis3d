import { describe, expect, it, vi } from "vitest";
import {
  Asset,
  AssetManager,
  BasicMaterial,
  BoxGeometry,
  Engine,
  JSONSceneLoader,
  Loader,
  Mesh,
  PerspectiveCamera,
  Scene,
  type Renderer,
  type VerbisPlugin,
} from "../../src/index.js";

class FakeRenderer implements Renderer {
  drawCalls = 0;
  disposed = false;
  render = vi.fn(() => {
    this.drawCalls += 1;
  });
  setSize = vi.fn();
  dispose(): void {
    this.disposed = true;
  }
}

describe("engine, assets and plugins", () => {
  it("runs fixed/update/render phases without duplicate starts", () => {
    const renderer = new FakeRenderer();
    let frame: FrameRequestCallback | undefined;
    const engine = new Engine({
      renderer,
      scene: new Scene(),
      camera: new PerspectiveCamera(),
      requestFrame: (callback) => {
        frame = callback;
        return 7;
      },
      cancelFrame: vi.fn(),
    });
    const update = vi.fn();
    const fixed = vi.fn();
    engine.onUpdate(update);
    engine.onFixedUpdate(fixed);
    engine.start().start();
    expect(frame).toBeDefined();
    engine.step(1 / 30);
    expect(fixed).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledOnce();
    expect(renderer.render).toHaveBeenCalledOnce();
    engine.pause().resume().stop();
  });

  it("installs, queries, removes and isolates plugin failures", () => {
    const engine = new Engine({
      renderer: new FakeRenderer(),
      scene: new Scene(),
      camera: new PerspectiveCamera(),
    });
    const plugin: VerbisPlugin = {
      name: "test",
      version: "1.0.0",
      install: vi.fn(),
      uninstall: vi.fn(),
    };
    engine.installPlugin(plugin);
    expect(engine.getPlugin("test")).toBe(plugin);
    expect(() => engine.installPlugin(plugin)).toThrow(/already/);
    expect(engine.uninstallPlugin("test")).toBe(true);
    expect(() =>
      engine.installPlugin({
        name: "broken",
        version: "1",
        install: () => {
          throw new Error("broken");
        },
      }),
    ).toThrow(/failed/);
    engine.dispose();
  });

  it("round-trips JSON scenes without executing code", () => {
    const scene = new Scene();
    const cube = new Mesh(new BoxGeometry(), new BasicMaterial({ color: [0.1, 0.2, 0.3, 1] }));
    cube.name = "cube";
    cube.position.set(1, 2, 3);
    scene.add(cube);
    const loader = new JSONSceneLoader();
    const restored = loader.parse(JSON.parse(loader.stringify(scene)));
    const restoredCube = restored.getObjectByName("cube");
    expect(restoredCube?.position.x).toBe(1);
    expect(restoredCube).toBeInstanceOf(Mesh);
  });

  it("deduplicates asset loads and clears failed entries", async () => {
    class TextLoader extends Loader<string> {
      calls = 0;
      override async load(url: string): Promise<Asset<string>> {
        this.calls += 1;
        return Promise.resolve(new Asset(url, "ok"));
      }
    }
    const manager = new AssetManager();
    const loader = new TextLoader();
    const first = manager.load("/asset", loader);
    const second = manager.load("/asset", loader);
    expect(await first).toBe(await second);
    expect(loader.calls).toBe(1);
    expect(manager.has("/asset")).toBe(true);
    manager.clear();
    expect(manager.has("/asset")).toBe(false);
  });
});
