import type { EngineCommand } from "../commands/index.js";
import type { AICommandContext, AIProvider } from "./AIProvider.js";

/** Deterministic provider for tests and offline examples. */
export class MockAIProvider implements AIProvider {
  constructor(private readonly response: readonly EngineCommand[]) {}

  async parseCommand(_input: string, _context: AICommandContext): Promise<EngineCommand[]> {
    return Promise.resolve(this.response.map((command) => structuredClone(command)));
  }
}
