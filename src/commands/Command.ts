export const COMMAND_NAMES = [
  "createObject",
  "deleteObject",
  "selectObject",
  "moveObject",
  "rotateObject",
  "scaleObject",
  "deformObject",
  "resetDeformation",
  "setColor",
  "setVisible",
  "animateObject",
  "groupObjects",
  "duplicateObject",
] as const;

export type CommandName = (typeof COMMAND_NAMES)[number];

export interface CommandTarget {
  name?: string;
  id?: number;
}

/** The only executable representation accepted by the command layer. */
export interface EngineCommand {
  version: "1.0";
  command: CommandName;
  target?: CommandTarget;
  parameters: Record<string, unknown>;
}
