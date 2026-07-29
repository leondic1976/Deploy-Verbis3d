import {
  CommandBus,
  NaturalLanguageController,
  RuleBasedProvider,
  Scene,
} from "../../src/index.js";

const scene = new Scene();
const commandBus = new CommandBus(scene, { allowDelete: true });
const controller = new NaturalLanguageController(scene, {
  provider: new RuleBasedProvider(),
  commandBus,
});

// One sentence becomes createObject, moveObject, animateObject and setColor commands.
const results = await controller.execute("빨간 구를 만들어 오른쪽으로 2 이동하고 천천히 회전시켜");
if (results.some((result) => !result.success)) {
  throw new Error("A generated command failed validation.");
}
