import { COMMAND_NAMES, type EngineCommand } from "./Command.js";
import type { CommandResult } from "./CommandResult.js";

export interface ValidationSuccess {
  readonly valid: true;
  readonly command: EngineCommand;
}

export interface ValidationFailure {
  readonly valid: false;
  readonly result: CommandResult;
}

/** Runtime validator that rejects unknown, malformed and unsafe commands before dispatch. */
export class CommandValidator {
  constructor(
    public maxTranslation = 10_000,
    public maxScale = 1_000,
    public maxRotationDegrees = 36_000,
  ) {}

  validate(input: unknown): ValidationSuccess | ValidationFailure {
    if (
      !this.isRecord(input) ||
      input["version"] !== "1.0" ||
      typeof input["command"] !== "string"
    ) {
      const command =
        this.isRecord(input) && typeof input["command"] === "string" ? input["command"] : "unknown";
      return this.failure(
        command,
        "INVALID_SCHEMA",
        "Command requires version '1.0' and a command name.",
      );
    }
    if (!COMMAND_NAMES.includes(input["command"] as (typeof COMMAND_NAMES)[number])) {
      return this.failure(
        input["command"],
        "UNSUPPORTED_COMMAND",
        `Unsupported command '${input["command"]}'.`,
      );
    }
    if (!this.isRecord(input["parameters"])) {
      return this.failure(
        input["command"],
        "INVALID_SCHEMA",
        "Command parameters must be an object.",
      );
    }
    if (input["target"] !== undefined && !this.validTarget(input["target"])) {
      return this.failure(
        input["command"],
        "INVALID_SCHEMA",
        "Target requires exactly one string name or numeric id.",
      );
    }
    const command = input as unknown as EngineCommand;
    const numeric = ["x", "y", "z"] as const;
    for (const key of numeric) {
      const value = command.parameters[key];
      if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) {
        return this.failure(
          command.command,
          "INVALID_SCHEMA",
          `Parameter '${key}' must be finite.`,
        );
      }
    }
    const limit =
      command.command === "scaleObject"
        ? this.maxScale
        : command.command === "rotateObject"
          ? this.maxRotationDegrees
          : this.maxTranslation;
    for (const key of numeric) {
      const value = command.parameters[key];
      if (typeof value === "number" && Math.abs(value) > limit) {
        return this.failure(
          command.command,
          "OUT_OF_RANGE",
          `Parameter '${key}' exceeds ${limit}.`,
        );
      }
      if (command.command === "scaleObject" && typeof value === "number" && value <= 0) {
        return this.failure(command.command, "OUT_OF_RANGE", "Scale values must be positive.");
      }
    }
    return { valid: true, command };
  }

  private validTarget(value: unknown): boolean {
    if (!this.isRecord(value)) return false;
    const hasName = typeof value["name"] === "string" && value["name"].length > 0;
    const hasId = typeof value["id"] === "number" && Number.isInteger(value["id"]);
    return hasName !== hasId;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private failure(
    command: string,
    code: NonNullable<CommandResult["error"]>["code"],
    message: string,
  ): ValidationFailure {
    return {
      valid: false,
      result: { success: false, command, dryRun: false, error: { code, message } },
    };
  }
}
