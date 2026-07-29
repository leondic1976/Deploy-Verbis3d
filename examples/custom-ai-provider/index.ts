import type { AICommandContext, AIProvider, EngineCommand } from "../../src/index.js";
import {
  BasicMaterial,
  BoxGeometry,
  Mesh,
  NaturalLanguageController,
  Scene,
} from "../../src/index.js";

class DomainProvider implements AIProvider {
  parseCommand(input: string, context: AICommandContext): Promise<EngineCommand[]> {
    if (!input.toLowerCase().includes("launch")) {
      throw new Error("This provider only accepts the domain verb 'launch'.");
    }
    return Promise.resolve([
      {
        version: "1.0",
        command: "moveObject",
        target: { name: context.selectedObjectName ?? "rocket" },
        parameters: { x: 0, y: 5, z: 0, space: "world" },
      },
    ]);
  }
}

const scene = new Scene();
const rocket = new Mesh(new BoxGeometry(), new BasicMaterial());
rocket.name = "rocket";
scene.add(rocket);
const controller = new NaturalLanguageController(scene, {
  provider: new DomainProvider(),
});

await controller.execute("Launch the selected rocket.");
