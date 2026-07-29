/** Human-readable schema metadata used by AI provider prompts and documentation. */
export const COMMAND_SCHEMA = Object.freeze({
  version: "1.0",
  required: ["version", "command", "parameters"],
  target: { oneOf: ["name", "id"] },
  additionalCodeExecution: false,
});
