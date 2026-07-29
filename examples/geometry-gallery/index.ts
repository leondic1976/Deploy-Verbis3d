import {
  BasicMaterial,
  BoxGeometry,
  Mesh,
  PlaneGeometry,
  Scene,
  SphereGeometry,
} from "../../src/index.js";

const scene = new Scene();
const entries = [
  new Mesh(new BoxGeometry(), new BasicMaterial({ color: [0.2, 0.7, 1, 1] })),
  new Mesh(new SphereGeometry(0.5, 32, 20), new BasicMaterial({ color: [1, 0.4, 0.2, 1] })),
  new Mesh(new PlaneGeometry(3, 3), new BasicMaterial({ color: [0.2, 0.8, 0.5, 1] })),
];

entries.forEach((mesh, index) => {
  mesh.name = `primitive-${index + 1}`;
  mesh.position.set((index - 1) * 2, 0, 0);
  mesh.geometry.computeBoundingBox();
  mesh.geometry.computeBoundingSphere();
  scene.add(mesh);
});

console.table(
  entries.map((mesh) => ({
    name: mesh.name,
    vertices: mesh.geometry.vertexCount,
    indices: mesh.geometry.index?.count ?? 0,
  })),
);
