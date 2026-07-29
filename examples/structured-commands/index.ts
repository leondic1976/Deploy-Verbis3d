import { BasicMaterial, BoxGeometry, CommandBus, Mesh, Scene } from "../../src/index.js";

const scene = new Scene();
const cube = new Mesh(new BoxGeometry(), new BasicMaterial());
cube.name = "cube";
scene.add(cube);
const commands = new CommandBus(scene);

const move = {
  version: "1.0",
  command: "moveObject",
  target: { name: "cube" },
  parameters: { x: 2, y: 1, z: 0, space: "world" },
} as const;

// Dry-run validates the same schema without mutating the scene.
console.log(commands.execute(move, { dryRun: true }));
console.log(commands.execute(move));
console.log(commands.history.entries);
