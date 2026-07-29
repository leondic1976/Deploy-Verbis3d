import { describe, expect, it } from "vitest";
import {
  BoxGeometry,
  BasicMaterial,
  CommandBus,
  CommandValidator,
  Mesh,
  MockAIProvider,
  NaturalLanguageController,
  OllamaProvider,
  OpenAICompatibleProvider,
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
    const creation = bus.execute({
      version: "1.0",
      command: "createObject",
      parameters: { shape: "sphere", name: "ball" },
    });
    expect(creation.success).toBe(true);
    expect(bus.selectedObject?.name).toBe("ball");
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

  it("creates and operates an animated colored object from one sentence", async () => {
    const scene = new Scene();
    const commandBus = new CommandBus(scene, { allowDelete: true });
    const naturalLanguage = new NaturalLanguageController(scene, {
      provider: new RuleBasedProvider(),
      commandBus,
    });

    const results = await naturalLanguage.execute(
      "빨간 구를 만들어 오른쪽으로 2 이동하고 천천히 회전시켜",
    );
    expect(results).toHaveLength(4);
    expect(results.every((result) => result.success)).toBe(true);
    const sphere = scene.getObjectByName("sphere");
    expect(sphere).toBeInstanceOf(Mesh);
    expect(sphere?.position.x).toBe(2);
    expect(sphere?.userData["animation"]).toMatchObject({
      property: "rotation.y",
      loop: true,
    });
    expect((sphere as Mesh).material).toBeInstanceOf(BasicMaterial);
    expect(((sphere as Mesh).material as BasicMaterial).color.r).toBeCloseTo(0.95);
  });

  it("creates multiple uniquely named objects and arranges them", async () => {
    const scene = new Scene();
    const provider = new RuleBasedProvider();
    const commands = await provider.parseCommand("파란 큐브 3개를 만들어", { scene });
    expect(commands.filter((command) => command.command === "createObject")).toHaveLength(3);
    expect(commands.filter((command) => command.command === "moveObject")).toHaveLength(3);
    expect(commands.filter((command) => command.command === "setColor")).toHaveLength(3);

    const results = new CommandBus(scene).executeMany(commands);
    expect(results.every((result) => result.success)).toBe(true);
    expect(scene.getObjectByName("cube-1")?.position.x).toBe(-1.5);
    expect(scene.getObjectByName("cube-2")?.position.x).toBe(0);
    expect(scene.getObjectByName("cube-3")?.position.x).toBe(1.5);
  });

  it("maps naming, scale, visibility and lifecycle language to allowlisted commands", async () => {
    const scene = new Scene();
    const cube = new Mesh(new BoxGeometry(), new BasicMaterial());
    cube.name = "cube";
    scene.add(cube);
    const provider = new RuleBasedProvider();

    const create = await provider.parseCommand(
      "이름이 hero인 파란 상자를 만들어 위로 2 이동하고 두 배로 키워",
      { scene },
    );
    expect(create.map((command) => command.command)).toEqual([
      "createObject",
      "moveObject",
      "scaleObject",
      "setColor",
    ]);
    expect(
      new CommandBus(scene, { allowDelete: true })
        .executeMany(create)
        .every((result) => result.success),
    ).toBe(true);
    expect(scene.getObjectByName("hero")?.position.y).toBe(2);
    expect(scene.getObjectByName("hero")?.scale.x).toBe(2);

    const lifecycle = await provider.parseCommand("cube를 숨기고 복제해", { scene });
    expect(lifecycle.map((command) => command.command)).toEqual(["setVisible", "duplicateObject"]);
    expect(await provider.parseCommand("cube를 선택", { scene })).toMatchObject([
      { command: "selectObject", target: { name: "cube" } },
    ]);
    expect(await provider.parseCommand("구를 선택해", { scene })).toMatchObject([
      { command: "selectObject", target: { name: "sphere" } },
    ]);
    expect(await provider.parseCommand("cube를 삭제", { scene })).toMatchObject([
      { command: "deleteObject", target: { name: "cube" } },
    ]);
    await expect(provider.parseCommand("무언가 만들어", { scene })).rejects.toThrow(/shape/);
  });

  it("uses the selected generated object when language names its generic shape", async () => {
    const scene = new Scene();
    const first = new Mesh(new BoxGeometry(), new BasicMaterial());
    first.name = "cube";
    const selected = new Mesh(new BoxGeometry(), new BasicMaterial());
    selected.name = "cube-2";
    scene.add(first, selected);
    const commands = await new RuleBasedProvider().parseCommand("큐브를 오른쪽으로 1 이동", {
      scene,
      selectedObjectName: "cube-2",
    });
    expect(commands[0]?.target).toEqual({ name: "cube-2" });
  });

  it("passes selected scene context to Ollama without executing provider text", async () => {
    const scene = new Scene();
    const cube = new Mesh(new BoxGeometry(), new BasicMaterial());
    cube.name = "selected-cube";
    scene.add(cube);
    let requestBody = "";
    const provider = new OllamaProvider({
      model: "qwen3:8b",
      fetch: (_input, init) => {
        requestBody = typeof init?.body === "string" ? init.body : "";
        return Promise.resolve(
          new Response(
            JSON.stringify({
              message: {
                content: JSON.stringify([
                  {
                    version: "1.0",
                    command: "selectObject",
                    target: { name: "selected-cube" },
                    parameters: {},
                  },
                ]),
              },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      },
    });
    const commands = await provider.parseCommand("선택한 객체", {
      scene,
      selectedObjectName: "selected-cube",
    });
    expect(commands[0]?.command).toBe("selectObject");
    expect(requestBody).toContain('\\"selectedObjectName\\":\\"selected-cube\\"');
    expect(requestBody).toContain('\\"name\\":\\"selected-cube\\"');
  });

  it("sends an API key only as a compatible-provider authorization header", async () => {
    const scene = new Scene();
    let authorization = "";
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://provider.example/v1",
      model: "safe-command-model",
      apiKey: "memory-only-key",
      fetch: (_input, init) => {
        authorization = new Headers(init?.headers).get("authorization") ?? "";
        return Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      version: "1.0",
                      command: "createObject",
                      parameters: { shape: "box", name: "box" },
                    }),
                  },
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      },
    });
    expect((await provider.parseCommand("상자를 만들어", { scene }))[0]?.command).toBe(
      "createObject",
    );
    expect(authorization).toBe("Bearer memory-only-key");
  });
});
