import { Object3D } from "./Object3D.js";

export class Scene extends Object3D {
  background: [number, number, number, number] = [0.04, 0.05, 0.08, 1];

  constructor() {
    super();
    this.name = "Scene";
  }
}
