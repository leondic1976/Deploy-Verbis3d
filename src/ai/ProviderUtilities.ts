import type { EngineCommand } from "../commands/index.js";

export function parseProviderJSON(content: string): EngineCommand[] {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const value: unknown = JSON.parse(fenced?.[1] ?? content);
  if (Array.isArray(value)) return value as EngineCommand[];
  if (typeof value === "object" && value !== null && "commands" in value) {
    const commands = value.commands;
    if (Array.isArray(commands)) return commands as EngineCommand[];
  }
  return [value as EngineCommand];
}

export function systemPrompt(): string {
  return [
    "Return JSON only.",
    "Output an array of Verbis3D commands.",
    "Every command must contain version '1.0', command, target when needed, and parameters.",
    "Allowed commands: createObject, deleteObject, selectObject, moveObject, rotateObject, scaleObject, setColor, setVisible, animateObject, groupObjects, duplicateObject.",
    "Never output code, scripts, comments, markdown, or extra fields intended for execution.",
  ].join(" ");
}
