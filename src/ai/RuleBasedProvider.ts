import type { EngineCommand } from "../commands/index.js";
import type { AICommandContext, AIProvider } from "./AIProvider.js";

type PrimitiveShape = "box" | "sphere" | "plane";

interface CreationPlan {
  readonly shape: PrimitiveShape;
  readonly names: readonly string[];
}

const SHAPE_ALIASES: Readonly<Record<PrimitiveShape, readonly string[]>> = {
  box: ["큐브", "상자", "박스", "cube", "box"],
  sphere: ["구체", "공", "구", "sphere", "ball"],
  plane: ["평면", "바닥", "plane", "floor"],
};

const COLOR_ALIASES: ReadonlyArray<
  readonly [readonly string[], readonly [number, number, number, number]]
> = [
  [
    ["빨간", "빨강", "red"],
    [0.95, 0.2, 0.2, 1],
  ],
  [
    ["주황", "orange"],
    [1, 0.48, 0.12, 1],
  ],
  [
    ["노란", "노랑", "yellow"],
    [1, 0.82, 0.16, 1],
  ],
  [
    ["초록", "녹색", "green"],
    [0.2, 0.78, 0.38, 1],
  ],
  [
    ["청록", "teal"],
    [0.12, 0.78, 0.7, 1],
  ],
  [
    ["파란", "파랑", "blue"],
    [0.15, 0.48, 1, 1],
  ],
  [
    ["보라", "purple"],
    [0.62, 0.3, 0.95, 1],
  ],
  [
    ["분홍", "pink"],
    [1, 0.38, 0.66, 1],
  ],
  [
    ["흰색", "하얀", "white"],
    [1, 1, 1, 1],
  ],
  [
    ["검정", "검은", "black"],
    [0.03, 0.04, 0.05, 1],
  ],
];

/**
 * Deterministic Korean/English parser for safe offline scene creation and manipulation.
 *
 * It emits data-only engine commands. The command bus remains responsible for schema,
 * permission, range and target validation.
 */
export class RuleBasedProvider implements AIProvider {
  async parseCommand(input: string, context: AICommandContext): Promise<EngineCommand[]> {
    const normalized = input.trim().toLowerCase();
    if (!normalized) throw new Error("Natural-language input cannot be empty.");

    const commands: EngineCommand[] = [];
    const creation = this.creation(normalized, context);
    if (creation) {
      for (const name of creation.names) {
        commands.push({
          version: "1.0",
          command: "createObject",
          parameters: { shape: creation.shape, name },
        });
      }
      if (creation.names.length > 1) {
        const center = (creation.names.length - 1) / 2;
        creation.names.forEach((name, index) => {
          commands.push(this.move(name, (index - center) * 1.5, 0, 0));
        });
      }
    }

    const targets = creation?.names ?? [this.target(normalized, context)];
    const movement = this.movement(normalized);
    if (movement) {
      for (const target of targets) {
        commands.push(this.move(target, movement.x, movement.y, movement.z, movement.space));
      }
    }

    if (this.includes(normalized, ["회전", "rotate", "spin"])) {
      const continuous = this.includes(normalized, [
        "계속",
        "천천히",
        "빠르게",
        "애니메이션",
        "반복",
        "continuously",
        "animate",
        "spinning",
      ]);
      for (const target of targets) {
        if (continuous) {
          const speed = this.includes(normalized, ["천천히", "slow"]) ? 0.5 : 1.5;
          commands.push({
            version: "1.0",
            command: "animateObject",
            target: { name: target },
            parameters: {
              property: "rotation.y",
              from: 0,
              to: 360,
              duration: 2 / speed,
              loop: true,
            },
          });
        } else {
          commands.push({
            version: "1.0",
            command: "rotateObject",
            target: { name: target },
            parameters: {
              y: this.numberAround(normalized, ["회전", "rotate", "spin"], 45),
              unit: "degrees",
            },
          });
        }
      }
    }

    const scale = this.scale(normalized);
    if (scale !== null) {
      for (const target of targets) {
        commands.push({
          version: "1.0",
          command: "scaleObject",
          target: { name: target },
          parameters: { x: scale, y: scale, z: scale },
        });
      }
    }

    const color = this.color(normalized);
    if (color) {
      for (const target of targets) {
        commands.push({
          version: "1.0",
          command: "setColor",
          target: { name: target },
          parameters: { color: [...color] },
        });
      }
    }

    if (this.includes(normalized, ["숨겨", "숨기", "hide"])) {
      for (const target of targets) {
        commands.push({
          version: "1.0",
          command: "setVisible",
          target: { name: target },
          parameters: { visible: false },
        });
      }
    } else if (this.includes(normalized, ["보여", "표시", "show"])) {
      for (const target of targets) {
        commands.push({
          version: "1.0",
          command: "setVisible",
          target: { name: target },
          parameters: { visible: true },
        });
      }
    }

    if (this.includes(normalized, ["복제", "복사", "duplicate", "copy"])) {
      for (const target of targets) {
        commands.push({
          version: "1.0",
          command: "duplicateObject",
          target: { name: target },
          parameters: { name: this.uniqueName(`${target}-copy`, context, []) },
        });
      }
    }

    if (this.includes(normalized, ["삭제", "지워", "delete", "remove"])) {
      for (const target of targets) {
        commands.push({
          version: "1.0",
          command: "deleteObject",
          target: { name: target },
          parameters: {},
        });
      }
    } else if (this.includes(normalized, ["선택", "select"])) {
      commands.push({
        version: "1.0",
        command: "selectObject",
        target: { name: targets[0]! },
        parameters: {},
      });
    }

    if (commands.length === 0) {
      throw new Error(
        "The offline rule provider could not map this input to an allowed scene command.",
      );
    }
    return Promise.resolve(commands);
  }

  private creation(input: string, context: AICommandContext): CreationPlan | null {
    if (!this.includes(input, ["만들", "생성", "추가", "create", "add", "spawn"])) return null;
    const shape = this.shape(input);
    if (!shape) {
      throw new Error("Object creation requires a box, sphere or plane shape.");
    }
    const count = this.creationCount(input);
    const explicitName = this.explicitName(input);
    const baseName = explicitName ?? (shape === "box" ? "cube" : shape);
    const reserved: string[] = [];
    const names = Array.from({ length: count }, (_, index) => {
      const candidate = count === 1 ? baseName : `${baseName}-${index + 1}`;
      const name = this.uniqueName(candidate, context, reserved);
      reserved.push(name);
      return name;
    });
    return { shape, names };
  }

  private shape(input: string): PrimitiveShape | null {
    for (const [shape, aliases] of Object.entries(SHAPE_ALIASES) as Array<
      [PrimitiveShape, readonly string[]]
    >) {
      if (this.includes(input, aliases)) return shape;
    }
    return null;
  }

  private creationCount(input: string): number {
    const korean = input.match(/(\d+)\s*(?:개|개의)/);
    const english = input.match(/(?:create|add|spawn)\s+(\d+)/);
    const raw = Number(korean?.[1] ?? english?.[1] ?? 1);
    return Math.min(Math.max(Math.trunc(raw), 1), 10);
  }

  private explicitName(input: string): string | null {
    const ascii = input.match(/(?:이름(?:은|을|이)?|named|called)\s*["']?([a-z0-9_-]{1,32})["']?/i);
    if (ascii?.[1]) return ascii[1];
    const korean = input.match(
      /(?:이름(?:은|을|이)?)\s*["']?([가-힣]{1,32}?)(?:이라고|라고|인|으로|로)?["']?(?=\s|$)/,
    );
    return korean?.[1] ?? null;
  }

  private uniqueName(
    preferred: string,
    context: AICommandContext,
    reserved: readonly string[],
  ): string {
    let candidate = preferred;
    let suffix = 2;
    while (context.scene.getObjectsByName(candidate).length > 0 || reserved.includes(candidate)) {
      candidate = `${preferred}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private movement(
    input: string,
  ): { x: number; y: number; z: number; space: "local" | "world" } | null {
    let x = 0;
    let y = 0;
    let z = 0;
    let matched = false;
    const apply = (terms: readonly string[], axis: "x" | "y" | "z", sign: number): void => {
      const amount = this.amountAfter(input, terms);
      if (amount === null) return;
      matched = true;
      if (axis === "x") x += amount * sign;
      else if (axis === "y") y += amount * sign;
      else z += amount * sign;
    };
    apply(["오른쪽", "right"], "x", 1);
    apply(["왼쪽", "left"], "x", -1);
    apply(["위로", "up"], "y", 1);
    apply(["아래로", "down"], "y", -1);
    apply(["앞으로", "forward"], "z", -1);
    apply(["뒤로", "backward", "back"], "z", 1);
    return matched ? { x, y, z, space: "world" } : null;
  }

  private amountAfter(input: string, terms: readonly string[]): number | null {
    for (const term of terms) {
      const index = input.indexOf(term);
      if (index < 0) continue;
      const tail = input.slice(index + term.length, index + term.length + 18);
      const match = tail.match(/^[^\d-]{0,10}(-?\d+(?:\.\d+)?)/);
      return match ? Number(match[1]) : 1;
    }
    return null;
  }

  private numberAround(input: string, terms: readonly string[], fallback: number): number {
    for (const term of terms) {
      const index = input.indexOf(term);
      if (index < 0) continue;
      const after = input.slice(index + term.length, index + term.length + 16);
      const afterMatch = after.match(/-?\d+(?:\.\d+)?/);
      if (afterMatch) return Number(afterMatch[0]);
      const before = input.slice(Math.max(0, index - 16), index);
      const beforeMatches = [...before.matchAll(/-?\d+(?:\.\d+)?/g)];
      const beforeMatch = beforeMatches.at(-1);
      if (beforeMatch) return Number(beforeMatch[0]);
    }
    return fallback;
  }

  private scale(input: string): number | null {
    const korean = input.match(/(\d+(?:\.\d+)?)\s*배/);
    if (korean?.[1]) return Number(korean[1]);
    if (this.includes(input, ["두 배", "double"])) return 2;
    if (this.includes(input, ["절반", "half"])) return 0.5;
    if (this.includes(input, ["크기", "scale", "키워", "줄여"])) {
      return this.numberAround(input, ["크기", "scale", "키워", "줄여"], 1.5);
    }
    return null;
  }

  private color(input: string): readonly [number, number, number, number] | null {
    for (const [aliases, color] of COLOR_ALIASES) {
      if (this.includes(input, aliases)) return color;
    }
    return null;
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
    const sceneNames: string[] = [];
    context.scene.traverse((object) => {
      if (object !== context.scene && object.name) sceneNames.push(object.name);
    });
    const explicit = sceneNames
      .sort((left, right) => right.length - left.length)
      .find((name) => input.includes(name.toLowerCase()));
    if (explicit) return explicit;

    const aliases: ReadonlyArray<readonly [readonly string[], string]> = [
      [["큐브", "상자", "박스", "cube", "box"], "cube"],
      [["구체", "공", "구", "sphere", "ball"], "sphere"],
      [["평면", "바닥", "plane", "floor"], "plane"],
      [["자동차", "car"], "car"],
    ];
    for (const [terms, name] of aliases) {
      if (this.includes(input, terms)) return name;
    }
    if (context.selectedObjectName) return context.selectedObjectName;
    throw new Error("The command does not identify a target or selected object.");
  }

  private includes(input: string, terms: readonly string[]): boolean {
    return terms.some((term) => input.includes(term));
  }
}
