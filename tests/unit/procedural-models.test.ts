import { describe, expect, it } from "vitest";
import type { BasicMaterial } from "../../src/index.js";
import {
  CommandBus,
  JSONSceneLoader,
  Mesh,
  ModelFactory,
  type ModelTemplate,
  NaturalLanguageController,
  ProceduralModel,
  RuleBasedProvider,
  Scene,
  createBuiltinModelFactory,
  createPrimitiveModel,
  createProceduralCar,
  createProceduralFace,
  createProceduralPerson,
  createProceduralTree,
} from "../../src/index.js";

describe("procedural compound models", () => {
  it("builds a uniquely named, root-transformable car hierarchy", () => {
    const car = createProceduralCar({ name: "roadster" });
    expect(car.children).toHaveLength(22);
    expect(new Set(car.children.map((part) => part.name)).size).toBe(22);
    expect(car.userData).toMatchObject({
      compoundModel: true,
      template: "car",
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
    expect(restoredFace).toBeInstanceOf(ProceduralModel);
    expect((restoredFace as ProceduralModel).getPart("mouth")).toBeInstanceOf(Mesh);
    expect(restoredFace?.userData["template"]).toBe("face");
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

  it("creates a full-body person with semantic, recolorable parts", () => {
    const person = createProceduralPerson({
      name: "guide",
      shirtColor: [0.2, 0.6, 0.9, 1],
    });
    expect(person).toBeInstanceOf(ProceduralModel);
    expect(person.children).toHaveLength(21);
    expect(person.getPart("head")).toBeInstanceOf(Mesh);
    expect(person.getPart("left-hand")).toBeInstanceOf(Mesh);
    expect(person.getPart("right-shoe")).toBeInstanceOf(Mesh);
    expect(person.getPartsByRole("primary")).toHaveLength(8);

    expect(person.setRoleColor("primary", [0.9, 0.2, 0.15, 1])).toBe(8);
    const torso = person.getPart("torso") as Mesh;
    expect((torso.material as BasicMaterial).color.r).toBeCloseTo(0.9);
  });

  it("provides isolated built-in factories and independently disposable clones", () => {
    const factory = createBuiltinModelFactory();
    expect(factory.list().map(({ id }) => id)).toEqual(["car", "face", "person", "tree"]);
    const tree = factory.create("tree", {
      name: "oak",
      colors: { foliage: [0.08, 0.42, 0.16, 1] },
    });
    const clone = tree.clone();
    clone.name = "oak-copy";
    clone.setRoleColor("primary", [0.7, 0.2, 0.1, 1]);

    const originalCrown = tree.getPart("crown-center") as Mesh;
    const cloneCrown = clone.getPart("crown-center") as Mesh;
    expect(cloneCrown.geometry).not.toBe(originalCrown.geometry);
    expect(cloneCrown.material).not.toBe(originalCrown.material);
    expect((originalCrown.material as BasicMaterial).color.r).toBeCloseTo(0.08);
    clone.dispose();
    expect(originalCrown.geometry.disposed).toBe(false);
  });

  it("validates custom templates and exposes them through the command bus", () => {
    const markerTemplate: ModelTemplate = {
      id: "marker",
      description: "Two-part location marker.",
      create: (options = {}) =>
        createPrimitiveModel("marker", options.name ?? "marker", [
          {
            id: "stem",
            primitive: "box",
            color: [0.25, 0.25, 0.3, 1],
            position: [0, 0.5, 0],
            scale: [0.15, 1, 0.15],
          },
          {
            id: "beacon",
            primitive: "sphere",
            color: [1, 0.35, 0.1, 1],
            position: [0, 1.2, 0],
            scale: [0.5, 0.5, 0.5],
            colorRole: "primary",
          },
        ]),
    };
    const factory = new ModelFactory().register(markerTemplate);
    const scene = new Scene();
    const result = new CommandBus(scene, { modelFactory: factory }).execute({
      version: "1.0",
      command: "createObject",
      parameters: { shape: "marker", name: "target-marker" },
    });
    expect(result.success).toBe(true);
    expect(scene.getObjectByName("target-marker-beacon")).toBeInstanceOf(Mesh);
    expect(() => factory.register(markerTemplate)).toThrow(/already registered/);
    expect(() => factory.create("missing")).toThrow(/Available templates: marker/);
  });

  it("rejects malformed model definitions before allocating a usable hierarchy", () => {
    expect(() =>
      createPrimitiveModel("invalid-template", "invalid", [
        {
          id: "part",
          primitive: "box",
          color: [1, 1, 1, 1],
          position: [0, 0, 0],
          scale: [1, 1, 1],
        },
        {
          id: "part",
          primitive: "sphere",
          color: [1, 1, 1, 1],
          position: [0, 1, 0],
          scale: [1, 1, 1],
        },
      ]),
    ).toThrow(/duplicate part/);
    expect(() => createProceduralTree({ foliageColor: [1.2, 0.5, 0.2, 1] })).toThrow(RangeError);
  });

  it("creates people and trees from Korean offline commands", async () => {
    const scene = new Scene();
    const controller = new NaturalLanguageController(scene, {
      provider: new RuleBasedProvider(),
      commandBus: new CommandBus(scene),
    });
    const results = await controller.execute("사람을 만들고 오른쪽으로 2 이동");
    expect(results.every(({ success }) => success)).toBe(true);
    expect(scene.getObjectByName("person-head")).toBeInstanceOf(Mesh);

    const treeResults = await controller.execute("나무를 만들어");
    expect(treeResults.every(({ success }) => success)).toBe(true);
    expect(scene.getObjectByName("tree-crown-top")).toBeInstanceOf(Mesh);
  });
});
