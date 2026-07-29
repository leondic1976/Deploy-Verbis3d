import type { Engine, VerbisPlugin } from "../../src/index.js";

export class DiagnosticsPlugin implements VerbisPlugin {
  readonly name = "diagnostics";
  readonly version = "1.0.0";
  private unsubscribe: (() => void) | null = null;

  install(engine: Engine): void {
    this.unsubscribe = engine.onRender((_deltaTime, elapsedTime) => {
      console.debug(`Rendered at ${elapsedTime.toFixed(2)} s`);
    });
  }

  uninstall(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}

// In an application:
// engine.installPlugin(new DiagnosticsPlugin());
// engine.uninstallPlugin("diagnostics");
