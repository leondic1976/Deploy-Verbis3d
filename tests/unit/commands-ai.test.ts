import { describe, expect, it } from "vitest";
import {
  BoxGeometry,
  BasicMaterial,
  CommandBus,
  CommandValidator,
  Mesh,
  MockAIProvider,
  NaturalLanguageController,
  RuleBasedProvider,
  Scene,
} from "../../src/index.js";

describe("command and natural-language layers", () => {
  it("rejects malformed, unsupported and out-of-range commands", () => {
    const validator = new CommandValidator();
    expect(validator.validate({}).valid).toBe(false);
    expect(validator.validate({ version: "1.0", command: "eval", parameters: {} }).valid).toBe(
      false,
    );
    expect(
      validator.validate({
        version: "1.0",
        command: "moveObject",
        target: { name: "cube" },
        parameters: { x: 100_000 },
      }).valid,
    ).toBe(false);
  });

  it("executes, dry-runs, audits and protects structured commands", () => {
    const scene = new Scene();
    const cube = new Mesh(new BoxGeometry(), new BasicMaterial());
    cube.name = "cube";
    scene.add(cube);
    const bus = new CommandBus(scene);
    const move = {
      version: "1.0",
      command: "moveObject",
      target: { name: "cube" },
      parameters: { x: 2, y: 0, z: 0 },
    } as const;
    expect(bus.execute(move, { dryRun: true }).success).toBe(true);
    expect(cube.position.x).toBe(0);
    expect(bus.execute(move).success).toBe(true);
    expect(cube.position.x).toBe(2);
    expect(bus.execute({ ...move, command: "deleteObject", parameters: {} }).error?.code).toBe(
      "PERMISSION_DENIED",
    );
    expect(bus.history.entries).toHaveLength(3);
  });

  it("stops on ambiguous names and supports object creation", () => {
    const scene = new Scene();
    for (let index = 0; index < 2; index += 1) {
      const cube = new Mesh(new BoxGeometry(), new BasicMaterial());
      cube.name = "cube";
      scene.add(cube);
    }
    const bus = new CommandBus(scene);
    expect(
      bus.execute({
        version: "1.0",
        command: "setVisible",
        target: { name: "cube" },
        parameters: { visible: false },
      }).error?.code,
    ).toBe("AMBIGUOUS_TARGET");
    expect(
      bus.execute({
        version: "1.0",
        command: "createObject",
        parameters: { shape: "sphere", name: "ball" },
      }).success,
    ).toBe(true);
  });

  it("parses offline Korean commands and validates provider output", async () => {
    const scene = new Scene();
    const cube = new Mesh(new BoxGeometry(), new BasicMaterial());
    cube.name = "cube";
    scene.add(cube);
    const naturalLanguage = new NaturalLanguageController(scene, {
      provider: new RuleBasedProvider(),
    });
    const results = await naturalLanguage.execute("큐브를 오른쪽으로 2 이동하고 45도 회전");
    expect(results.every((result) => result.success)).toBe(true);
    expect(cube.position.x).toBe(2);
    expect(cube.quaternion.y).not.toBe(0);

    const unsafe = new NaturalLanguageController(scene, {
      provider: new MockAIProvider([
        {
          version: "1.0",
          command: "moveObject",
          target: { name: "cube" },
          parameters: { x: 100_000 },
        },
      ]),
    });
    expect((await unsafe.execute("ignored"))[0]?.error?.code).toBe("OUT_OF_RANGE");
  });
});
