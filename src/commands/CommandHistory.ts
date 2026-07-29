import type { EngineCommand } from "./Command.js";
import type { CommandResult } from "./CommandResult.js";

export interface CommandHistoryEntry {
  readonly command: EngineCommand;
  readonly result: CommandResult;
  readonly timestamp: number;
}

/** Bounded append-only execution audit trail. */
export class CommandHistory {
  readonly entries: CommandHistoryEntry[] = [];

  constructor(public readonly capacity = 500) {}

  add(command: EngineCommand, result: CommandResult): void {
    this.entries.push({ command: structuredClone(command), result, timestamp: Date.now() });
    if (this.entries.length > this.capacity)
      this.entries.splice(0, this.entries.length - this.capacity);
  }

  clear(): void {
    this.entries.length = 0;
  }
}
