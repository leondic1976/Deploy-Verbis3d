import type { Object3D } from "../core/Object3D.js";
import type { Scene } from "../core/Scene.js";
import type { EngineCommand } from "./Command.js";
import { CommandHandler } from "./CommandHandler.js";
import { CommandHistory } from "./CommandHistory.js";
import type { CommandResult } from "./CommandResult.js";
import { CommandValidator } from "./CommandValidator.js";

export interface CommandBusOptions {
  allowDelete?: boolean;
  validator?: CommandValidator;
  history?: CommandHistory;
}

/** Validates, executes and audits structured engine commands. */
export class CommandBus {
  readonly validator: CommandValidator;
  readonly history: CommandHistory;
  readonly handler = new CommandHandler();
  selectedObject: Object3D | null = null;
  allowDelete: boolean;

  constructor(
    public readonly scene: Scene,
    options: CommandBusOptions = {},
  ) {
    this.validator = options.validator ?? new CommandValidator();
    this.history = options.history ?? new CommandHistory();
    this.allowDelete = options.allowDelete ?? false;
  }

  execute(input: unknown, options: { dryRun?: boolean } = {}): CommandResult {
    const validation = this.validator.validate(input);
    if (!validation.valid) return validation.result;
    const result = this.handler.execute(
      validation.command,
      {
        scene: this.scene,
        allowDelete: this.allowDelete,
        selectedObject: this.selectedObject,
      },
      options.dryRun ?? false,
    );
    if (result.success && validation.command.command === "selectObject" && !options.dryRun) {
      const target = validation.command.target;
      this.selectedObject =
        target?.id !== undefined
          ? (this.scene.getObjectById(target.id) ?? null)
          : (this.scene.getObjectByName(target?.name ?? "") ?? null);
    }
    this.history.add(validation.command, result);
    return result;
  }

  executeMany(
    commands: readonly EngineCommand[],
    options: { dryRun?: boolean } = {},
  ): CommandResult[] {
    return commands.map((command) => this.execute(command, options));
  }
}
