import {
  NaturalLanguageController,
  type NaturalLanguageOptions,
} from "../ai/NaturalLanguageController.js";
import type { Camera } from "../cameras/index.js";
import type { VerbisPlugin } from "../plugins/index.js";
import type { Renderer } from "../renderer/index.js";
import { Clock } from "./Clock.js";
import type { Scene } from "./Scene.js";

export interface EngineOptions {
  renderer: Renderer;
  scene: Scene;
  camera: Camera;
  fixedDeltaTime?: number;
  maxDeltaTime?: number;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (handle: number) => void;
}

export type FrameCallback = (deltaTime: number, elapsedTime: number) => void;

/** Coordinates lifecycle, fixed/update/render phases and plugins without owning application state. */
export class Engine {
  readonly renderer: Renderer;
  readonly scene: Scene;
  readonly camera: Camera;
  readonly clock: Clock;
  readonly fixedDeltaTime: number;
  running = false;
  paused = false;
  disposed = false;
  private accumulator = 0;
  private frameHandle: number | null = null;
  private readonly updateCallbacks = new Set<FrameCallback>();
  private readonly fixedCallbacks = new Set<FrameCallback>();
  private readonly renderCallbacks = new Set<FrameCallback>();
  private readonly plugins = new Map<string, VerbisPlugin>();
  private readonly requestFrame: (callback: FrameRequestCallback) => number;
  private readonly cancelFrame: (handle: number) => void;

  constructor(options: EngineOptions) {
    this.renderer = options.renderer;
    this.scene = options.scene;
    this.camera = options.camera;
    this.fixedDeltaTime = options.fixedDeltaTime ?? 1 / 60;
    this.clock = new Clock(options.maxDeltaTime ?? 0.1);
    this.requestFrame =
      options.requestFrame ??
      ((callback) => {
        if (typeof requestAnimationFrame === "undefined") {
          return setTimeout(() => callback(performance.now()), 16) as unknown as number;
        }
        return requestAnimationFrame(callback);
      });
    this.cancelFrame =
      options.cancelFrame ??
      ((handle) => {
        if (typeof cancelAnimationFrame === "undefined") clearTimeout(handle);
        else cancelAnimationFrame(handle);
      });
  }

  get deltaTime(): number {
    return this.clock.deltaTime;
  }

  get elapsedTime(): number {
    return this.clock.elapsedTime;
  }

  start(): this {
    this.assertUsable();
    if (this.running) return this;
    this.running = true;
    this.paused = false;
    this.clock.start();
    this.schedule();
    return this;
  }

  stop(): this {
    this.running = false;
    this.paused = false;
    this.clock.stop();
    this.accumulator = 0;
    if (this.frameHandle !== null) this.cancelFrame(this.frameHandle);
    this.frameHandle = null;
    return this;
  }

  pause(): this {
    if (!this.running || this.paused) return this;
    this.paused = true;
    this.clock.stop();
    return this;
  }

  resume(): this {
    if (!this.running || !this.paused) return this;
    this.paused = false;
    this.clock.start();
    return this;
  }

  onUpdate(callback: FrameCallback): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  onFixedUpdate(callback: FrameCallback): () => void {
    this.fixedCallbacks.add(callback);
    return () => this.fixedCallbacks.delete(callback);
  }

  onRender(callback: FrameCallback): () => void {
    this.renderCallbacks.add(callback);
    return () => this.renderCallbacks.delete(callback);
  }

  step(deltaTime: number): void {
    this.assertUsable();
    const clamped = Math.min(Math.max(deltaTime, 0), this.clock.maxDeltaTime);
    this.accumulator += clamped;
    let fixedSteps = 0;
    while (this.accumulator >= this.fixedDeltaTime && fixedSteps < 8) {
      for (const callback of this.fixedCallbacks) callback(this.fixedDeltaTime, this.elapsedTime);
      this.accumulator -= this.fixedDeltaTime;
      fixedSteps += 1;
    }
    for (const callback of this.updateCallbacks) callback(clamped, this.elapsedTime);
    this.scene.traverse((object) => {
      for (const component of object.components) {
        if (component.update) component.update(clamped);
      }
    });
    for (const callback of this.renderCallbacks) callback(clamped, this.elapsedTime);
    this.renderer.render(this.scene, this.camera);
  }

  useNaturalLanguage(options: NaturalLanguageOptions): NaturalLanguageController {
    return new NaturalLanguageController(this.scene, options);
  }

  installPlugin(plugin: VerbisPlugin): this {
    this.assertUsable();
    if (this.plugins.has(plugin.name))
      throw new Error(`Plugin '${plugin.name}' is already installed.`);
    try {
      plugin.install(this);
      this.plugins.set(plugin.name, plugin);
    } catch (error) {
      throw new Error(`Plugin '${plugin.name}' failed to install.`, { cause: error });
    }
    return this;
  }

  getPlugin(name: string): VerbisPlugin | undefined {
    return this.plugins.get(name);
  }

  uninstallPlugin(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;
    try {
      plugin.uninstall?.(this);
    } catch (error) {
      throw new Error(`Plugin '${name}' failed to uninstall.`, { cause: error });
    } finally {
      this.plugins.delete(name);
    }
    return true;
  }

  dispose(): void {
    if (this.disposed) return;
    this.stop();
    for (const name of [...this.plugins.keys()]) this.uninstallPlugin(name);
    this.renderer.dispose();
    this.updateCallbacks.clear();
    this.fixedCallbacks.clear();
    this.renderCallbacks.clear();
    this.disposed = true;
  }

  private schedule(): void {
    if (!this.running || this.frameHandle !== null) return;
    this.frameHandle = this.requestFrame(this.frame);
  }

  private readonly frame: FrameRequestCallback = (time): void => {
    this.frameHandle = null;
    if (!this.running) return;
    if (!this.paused) this.step(this.clock.tick(time));
    this.schedule();
  };

  private assertUsable(): void {
    if (this.disposed) throw new Error("Engine has been disposed.");
  }
}
