import { CommandBus, CommandValidator, Scene } from "../../src/index.js";

const scene = new Scene();
const validator = new CommandValidator(10, 5, 360);
const commands = new CommandBus(scene, { validator, allowDelete: false });

const untrustedProviderOutput: unknown = {
  version: "1.0",
  command: "moveObject",
  target: { name: "cube" },
  parameters: { x: 100_000, y: 0, z: 0 },
};

// Rejected as OUT_OF_RANGE before any engine API is called.
const result = commands.execute(untrustedProviderOutput);
console.assert(!result.success && result.error?.code === "OUT_OF_RANGE");
