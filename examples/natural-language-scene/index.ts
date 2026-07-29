import {
  CommandBus,
  NaturalLanguageController,
  RuleBasedProvider,
  Scene,
} from "../../src/index.js";

const scene = new Scene();
const controller = new NaturalLanguageController(scene, {
  provider: new RuleBasedProvider(),
  commandBus: new CommandBus(scene, { allowDelete: true }),
});

const recipe = [
  "파란 큐브 3개를 만들어",
  "이름이 sphere인 주황색 구를 만들어 위로 1 이동",
  "sphere를 두 배로 키우고 계속 회전시켜",
] as const;

for (const instruction of recipe) {
  const results = await controller.execute(instruction);
  console.log(instruction, results);
}
