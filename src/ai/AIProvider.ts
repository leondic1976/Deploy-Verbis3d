import type { EngineCommand } from "../commands/index.js";
import type { Scene } from "../core/index.js";

export interface AICommandContext {
  readonly scene: Scene;
  readonly selectedObjectName?: string;
}

/** Adapter boundary between natural language services and structured commands. */
export interface AIProvider {
  parseCommand(input: string, context: AICommandContext): Promise<EngineCommand[]>;
}
