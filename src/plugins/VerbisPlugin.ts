import type { Engine } from "../core/Engine.js";

/** Extension contract with explicit installation lifecycle. */
export interface VerbisPlugin {
  readonly name: string;
  readonly version: string;
  install(engine: Engine): void;
  uninstall?(engine: Engine): void;
}
