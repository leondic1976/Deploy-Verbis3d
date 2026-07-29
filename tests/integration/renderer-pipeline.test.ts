import { describe, expect, it } from "vitest";
import {
  BasicMaterial,
  BoxGeometry,
  Mesh,
  PerspectiveCamera,
  RenderList,
  Scene,
  WebGLContext,
} from "../../src/index.js";

describe("render pipeline integration", () => {
  it("collects only visible renderable meshes", () => {
    const scene = new Scene();
    const visible = new Mesh(new BoxGeometry(), new BasicMaterial());
    const hidden = new Mesh(new BoxGeometry(), new BasicMaterial());
    hidden.visible = false;
    scene.add(visible, hidden);
    expect(new RenderList().build(scene).commands.map((command) => command.mesh)).toEqual([
      visible,
    ]);
  });

  it("fails clearly when WebGL2 context creation is unavailable", () => {
    const canvas = {
      getContext: () => null,
      width: 1,
      height: 1,
    } as unknown as OffscreenCanvas;
    expect(() => new WebGLContext(canvas)).toThrow(/WebGL2 is unavailable/);
  });

  it("connects scene, camera and mesh matrices before backend submission", () => {
    const scene = new Scene();
    const mesh = new Mesh(new BoxGeometry(), new BasicMaterial());
    mesh.position.set(2, 0, 0);
    scene.add(mesh);
    scene.updateWorldMatrix();
    const camera = new PerspectiveCamera();
    camera.position.set(0, 0, 5);
    camera.updateCameraMatrices();
    expect(mesh.worldMatrix.elements[12]).toBe(2);
    expect(camera.viewMatrix.elements[14]).toBe(-5);
  });
});
