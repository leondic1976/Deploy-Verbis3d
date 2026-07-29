import type { EngineCommand } from "../commands/index.js";
import type { AICommandContext, AIProvider } from "./AIProvider.js";

/** Offline Korean/English parser for a deliberately small, documented command grammar. */
export class RuleBasedProvider implements AIProvider {
  async parseCommand(input: string, context: AICommandContext): Promise<EngineCommand[]> {
    const normalized = input.trim().toLowerCase();
    if (!normalized) throw new Error("Natural-language input cannot be empty.");
    const target = this.target(normalized, context);
    const commands: EngineCommand[] = [];
    const amount = this.number(normalized, 1);

    if (this.includes(normalized, ["오른쪽", "right"]))
      commands.push(this.move(target, amount, 0, 0));
    else if (this.includes(normalized, ["왼쪽", "left"]))
      commands.push(this.move(target, -amount, 0, 0));
    else if (this.includes(normalized, ["위로", "up"]))
      commands.push(this.move(target, 0, amount, 0));
    else if (this.includes(normalized, ["아래로", "down"]))
      commands.push(this.move(target, 0, -amount, 0));
    else if (this.includes(normalized, ["앞으로", "forward"]))
      commands.push(this.move(target, 0, 0, -amount, "local"));
    else if (this.includes(normalized, ["뒤로", "backward"]))
      commands.push(this.move(target, 0, 0, amount, "local"));

    if (this.includes(normalized, ["회전", "rotate"])) {
      commands.push({
        version: "1.0",
        command: "rotateObject",
        target: { name: target },
        parameters: { y: this.number(normalized, 45), unit: "degrees" },
      });
    }
    if (this.includes(normalized, ["두 배", "2배", "double"])) {
      commands.push({
        version: "1.0",
        command: "scaleObject",
        target: { name: target },
        parameters: { x: 2, y: 2, z: 2 },
      });
    }
    if (this.includes(normalized, ["숨겨", "숨기", "hide"])) {
      commands.push({
        version: "1.0",
        command: "setVisible",
        target: { name: target },
        parameters: { visible: false },
      });
    } else if (this.includes(normalized, ["보여", "show"])) {
      commands.push({
        version: "1.0",
        command: "setVisible",
        target: { name: target },
        parameters: { visible: true },
      });
    }
    if (commands.length === 0) {
      throw new Error("The offline rule provider could not map this input to an allowed command.");
    }
    return Promise.resolve(commands);
  }

  private move(
    target: string,
    x: number,
    y: number,
    z: number,
    space: "local" | "world" = "world",
  ): EngineCommand {
    return {
      version: "1.0",
      command: "moveObject",
      target: { name: target },
      parameters: { x, y, z, space },
    };
  }

  private target(input: string, context: AICommandContext): string {
    const known = ["cube", "car", "sphere", "큐브", "자동차", "구"];
    const match = known.find((name) => input.includes(name));
    if (match === "큐브") return "cube";
    if (match === "자동차") return "car";
    if (match === "구") return "sphere";
    if (match) return match;
    if (context.selectedObjectName) return context.selectedObjectName;
    throw new Error("The command does not identify a target object.");
  }

  private number(input: string, fallback: number): number {
    const match = input.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : fallback;
  }

  private includes(input: string, terms: readonly string[]): boolean {
    return terms.some((term) => input.includes(term));
  }
}
