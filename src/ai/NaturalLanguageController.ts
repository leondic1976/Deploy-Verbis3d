import { CommandBus, type CommandResult } from "../commands/index.js";
import type { Scene } from "../core/Scene.js";
import type { AIProvider } from "./AIProvider.js";

export interface NaturalLanguageOptions {
  provider: AIProvider;
  commandBus?: CommandBus;
}

/** Parses natural language, then validates every structured command before execution. */
export class NaturalLanguageController {
  readonly commandBus: CommandBus;

  constructor(
    private readonly scene: Scene,
    private readonly options: NaturalLanguageOptions,
  ) {
    this.commandBus = options.commandBus ?? new CommandBus(scene);
  }

  async execute(input: string, options: { dryRun?: boolean } = {}): Promise<CommandResult[]> {
    const commands = await this.options.provider.parseCommand(input, {
      scene: this.scene,
      ...(this.commandBus.selectedObject?.name
        ? { selectedObjectName: this.commandBus.selectedObject.name }
        : {}),
    });
    return this.commandBus.executeMany(commands, options);
  }
}
