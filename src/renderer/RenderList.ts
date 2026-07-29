import { Mesh } from "../core/Mesh.js";
import type { Scene } from "../core/Scene.js";
import type { RenderCommand } from "./RenderCommand.js";

/** Collects visible meshes and produces a stable opaque-before-transparent order. */
export class RenderList {
  readonly commands: RenderCommand[] = [];

  build(scene: Scene): this {
    this.commands.length = 0;
    let renderOrder = 0;
    scene.traverseVisible((object) => {
      if (object instanceof Mesh && !object.geometry.disposed && !object.material.disposed) {
        this.commands.push({ mesh: object, renderOrder: renderOrder++ });
      }
    });
    this.commands.sort((a, b) => {
      if (a.mesh.material.transparent !== b.mesh.material.transparent) {
        return a.mesh.material.transparent ? 1 : -1;
      }
      return a.renderOrder - b.renderOrder;
    });
    return this;
  }
}
