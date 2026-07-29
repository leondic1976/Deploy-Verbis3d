import { describe, expect, it } from "vitest";
import type { BasicMaterial } from "../../src/index.js";
import {
  CommandBus,
  JSONSceneLoader,
  Mesh,
  NaturalLanguageController,
  RuleBasedProvider,
  Scene,
  createProceduralCar,
  createProceduralFace,
} from "../../src/index.js";

describe("procedural compound models", () => {
  it("builds a uniquely named, root-transformable car hierarchy", () => {
    const car = createProceduralCar({ name: "roadster" });
    expect(car.children).toHaveLength(22);
    expect(new Set(car.children.map((part) => part.name)).size).toBe(22);
    expect(car.userData).toMatchObject({
      compoundModel: true,
      template: "procedural-car",
      partCount: 22,
    });

    const body = car.getObjectByName("roadster-body");
    expect(body).toBeInstanceOf(Mesh);
    car.position.set(3, 0, -2);
    car.rotateY(Math.PI / 2);
    car.scale.set(2, 2, 2);
    car.updateWorldMatrix(false, true);
    expect(body?.worldMatrix.elements[12]).toBeCloseTo(3);
    expect(body?.worldMatrix.elements[14]).not.toBeCloseTo(0);
  });

  it("builds selectable facial parts and round-trips the complete hierarchy", () => {
    const scene = new Scene();
    const face = createProceduralFace({ name: "portrait" });
    face.position.set(1, -1.35, 0);
    scene.add(face);
    expect(face.children).toHaveLength(18);
    expect(face.getObjectByName("portrait-left-pupil")).toBeInstanceOf(Mesh);
    expect(face.getObjectByName("portrait-mouth")).toBeInstanceOf(Mesh);

    const loader = new JSONSceneLoader();
    const restored = loader.parse(loader.serialize(scene));
    const restoredFace = restored.getObjectByName("portrait");
    expect(restoredFace?.children).toHaveLength(18);
    expect(restoredFace?.position.x).toBe(1);
    expect(restoredFace?.userData["template"]).toBe("procedural-face");
  });

  it("creates, transforms and selectively recolors a car from Korean language", async () => {
    const scene = new Scene();
    const controller = new NaturalLanguageController(scene, {
      provider: new RuleBasedProvider(),
      commandBus: new CommandBus(scene),
    });
    const results = await controller.execute(
      "빨간 자동차를 만들어 오른쪽으로 2 이동하고 30도 회전",
    );
    expect(results).toHaveLength(4);
    expect(results.every((result) => result.success)).toBe(true);

    const car = scene.getObjectByName("car");
    const body = scene.getObjectByName("car-body");
    const window = scene.getObjectByName("car-left-window");
    expect(car?.position.x).toBe(2);
    expect(car?.quaternion.y).not.toBe(0);
    expect(((body as Mesh).material as BasicMaterial).color.r).toBeCloseTo(0.95);
    expect(((window as Mesh).material as BasicMaterial).color.r).toBeCloseTo(0.13);
  });

  it("creates and scales a face through the same validated command path", async () => {
    const scene = new Scene();
    const commands = await new RuleBasedProvider().parseCommand("사람 얼굴을 만들어 두 배로 키워", {
      scene,
    });
    expect(commands.map((command) => command.command)).toEqual(["createObject", "scaleObject"]);
    expect(new CommandBus(scene).executeMany(commands).every((result) => result.success)).toBe(
      true,
    );
    expect(scene.getObjectByName("face")?.scale.toArray()).toEqual([2, 2, 2]);
    expect(scene.getObjectByName("face-head")).toBeInstanceOf(Mesh);
  });

  it("duplicates compound roots with a new unique part-name prefix", () => {
    const scene = new Scene();
    scene.add(createProceduralCar({ name: "car" }));
    const result = new CommandBus(scene).execute({
      version: "1.0",
      command: "duplicateObject",
      target: { name: "car" },
      parameters: { name: "car-copy" },
    });
    expect(result.success).toBe(true);
    expect(scene.getObjectByName("car-copy")?.children).toHaveLength(22);
    expect(scene.getObjectsByName("car-copy-body")).toHaveLength(1);
    expect(scene.getObjectsByName("car-body")).toHaveLength(1);
  });
});
