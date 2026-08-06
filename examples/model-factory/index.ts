import {
  ModelFactory,
  Scene,
  createBuiltinModelFactory,
  createPrimitiveModel,
  type ModelTemplate,
} from "../../src/index.js";

// Built-ins are copied into an application-owned registry; no mutable global catalog is used.
const models = createBuiltinModelFactory();

const robotTemplate: ModelTemplate = {
  id: "robot",
  description: "Small custom robot assembled from engine-native primitives.",
  create: (options = {}) =>
    createPrimitiveModel("robot", options.name ?? "robot", [
      {
        id: "body",
        primitive: "box",
        color: options.colors?.["shell"] ?? [0.18, 0.62, 0.82, 1],
        position: [0, 1.1, 0],
        scale: [1.2, 1.3, 0.7],
        colorRole: "primary",
      },
      {
        id: "head",
        primitive: "sphere",
        color: [0.72, 0.82, 0.88, 1],
        position: [0, 2.05, 0],
        scale: [0.85, 0.7, 0.7],
        colorRole: "trim",
      },
      {
        id: "sensor",
        primitive: "sphere",
        color: [1, 0.24, 0.12, 1],
        position: [0, 2.08, 0.37],
        scale: [0.16, 0.16, 0.08],
        colorRole: "detail",
      },
    ]),
};

models.register(robotTemplate);

const scene = new Scene();
const car = models.create("car", { name: "delivery-car" });
const person = models.create("person", { name: "operator" });
const tree = models.create("tree", { name: "street-tree" });
const robot = models.create("robot", {
  name: "helper",
  colors: { shell: [0.96, 0.46, 0.12, 1] },
});
car.position.x = -4;
person.position.x = -1.4;
robot.position.x = 1.4;
tree.position.x = 4;
scene.add(car, person, robot, tree);

// A separate registry can intentionally expose a smaller, permission-scoped catalog.
const restrictedModels = new ModelFactory().register(robotTemplate);

export { models, restrictedModels, robot, scene };
