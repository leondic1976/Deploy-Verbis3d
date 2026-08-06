import { describe, expect, it } from "vitest";
import {
  BasicMaterial,
  BoxGeometry,
  BufferAttribute,
  Geometry,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Shader,
  SphereGeometry,
  Vector3,
  VertexColorMaterial,
} from "../../src/index.js";

describe("camera, geometry and material", () => {
  it("updates perspective view/projection/frustum state", () => {
    const camera = new PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(Vector3.ZERO);
    camera.resize(1920, 1080).updateCameraMatrices();
    expect(camera.aspect).toBeCloseTo(16 / 9);
    expect(camera.viewMatrix.transformPoint(new Vector3(0, 0, 5)).length()).toBeCloseTo(0);
    expect(camera.frustum.containsPoint(Vector3.ZERO)).toBe(true);
  });

  it("updates orthographic bounds", () => {
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.resize(200, 100);
    expect(camera.right - camera.left).toBe(4);
    expect(() => camera.resize(0, 1)).toThrow(RangeError);
  });

  it("creates indexed primitive geometry and bounds", () => {
    const box = new BoxGeometry(2, 4, 6);
    expect(box.vertexCount).toBe(24);
    expect(box.index?.count).toBe(36);
    expect(box.boundingBox?.getSize().equals(new Vector3(2, 4, 6))).toBe(true);
    expect(new PlaneGeometry().index?.count).toBe(6);
    expect(new SphereGeometry(1, 8, 4).vertexCount).toBe(45);
  });

  it("validates attributes, computes custom bounds and disposes", () => {
    expect(() => new BufferAttribute(new Float32Array(4), 3)).toThrow(RangeError);
    const geometry = new Geometry().setAttribute(
      "position",
      new BufferAttribute(new Float32Array([-1, 0, 0, 2, 0, 0]), 3),
    );
    expect(geometry.computeBoundingBox().max.x).toBe(2);
    geometry.markUploaded();
    expect(geometry.uploaded).toBe(true);
    geometry.dispose();
    expect(geometry.disposed).toBe(true);
  });

  it("stores material state and enforces WebGL2 shaders", () => {
    const material = new BasicMaterial({ color: [0.2, 0.4, 0.6, 0.8], transparent: true });
    expect(material.color.a).toBe(0.8);
    expect(material.transparent).toBe(true);
    material.syncUniforms();
    expect(material.uniforms.get("uColor")?.value).toEqual([0.2, 0.4, 0.6, 0.8]);
    const vertexMaterial = new VertexColorMaterial({ tint: [0.8, 0.7, 0.6, 1] });
    vertexMaterial.syncUniforms();
    expect(vertexMaterial.uniforms.get("uTint")?.value).toEqual([0.8, 0.7, 0.6, 1]);
    expect(vertexMaterial.shaderProgram.vertexShader.source).toContain("in vec4 aColor");
    expect(() => new Shader("vertex", "void main() {}")).toThrow(/version/);
  });
});
