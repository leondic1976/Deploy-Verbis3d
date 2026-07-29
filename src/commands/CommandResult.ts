export type CommandErrorCode =
  | "INVALID_SCHEMA"
  | "TARGET_NOT_FOUND"
  | "AMBIGUOUS_TARGET"
  | "UNSUPPORTED_COMMAND"
  | "OUT_OF_RANGE"
  | "PERMISSION_DENIED"
  | "EXECUTION_FAILED";

export interface CommandResult {
  readonly success: boolean;
  readonly command: string;
  readonly dryRun: boolean;
  readonly targetId?: number;
  readonly error?: {
    readonly code: CommandErrorCode;
    readonly message: string;
  };
}
