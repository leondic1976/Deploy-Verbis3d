import { BasicMaterial, BoxGeometry, Mesh, Scene } from "../../src/index.js";

const scene = new Scene();
const glassLike = new BasicMaterial({
  color: [0.25, 0.8, 1, 0.45],
  transparent: true,
  depthTest: true,
  depthWrite: false,
  side: "double",
});
const panel = new Mesh(new BoxGeometry(2, 1, 0.1), glassLike);
panel.name = "transparent-panel";
scene.add(panel);

// Runtime material edits are synchronized to uColor before each draw.
glassLike.color.set(1, 0.35, 0.2, 0.6);
