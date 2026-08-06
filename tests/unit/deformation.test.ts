import { describe, expect, it, vi } from "vitest";
import {
  AnimationClip,
  AnimationMixer,
  BasicMaterial,
  BoxGeometry,
  BufferAttribute,
  CommandBus,
  CommandValidator,
  Geometry,
  JSONSceneLoader,
  Mesh,
  NumberKeyframeTrack,
  RuleBasedProvider,
  Scene,
  SphereGeometry,
  WebGLBufferManager,
  WebGLResourceTracker,
} from "../../src/index.js";

const positionsOf = (mesh: Mesh): number[] =>
  Array.from(mesh.geometry.getAttribute<Float32Array>("position")!.array);

describe("mesh deformation", () => {
  it("evaluates a repeatable modifier stack and restores the exact base", () => {
    const mesh = new Mesh(new SphereGeometry(1, 16, 8), new BasicMaterial());
    const original = positionsOf(mesh);
    const version = mesh.geometry.version;

    mesh.deformation.configure({
      axis: "y",
      stretch: 1.8,
      bend: Math.PI * 0.65,
      twist: Math.PI,
      taper: 0.7,
      waveAmplitude: 0.12,
      waveFrequency: 2,
    });

    const first = positionsOf(mesh);
    expect(first).not.toEqual(original);
    expect(mesh.isDeformed).toBe(true);
    expect(mesh.geometry.modified).toBe(true);
    expect(mesh.geometry.version).toBeGreaterThan(version);
    expect(mesh.geometry.uploaded).toBe(false);
    expect(mesh.geometry.boundingBox).not.toBeNull();
    expect(mesh.geometry.boundingSphere?.radius).toBeGreaterThan(1);
    expect(
      Array.from(mesh.geometry.getAttribute<Float32Array>("normal")!.array).every(Number.isFinite),
    ).toBe(true);

    mesh.deformation.apply();
    expect(positionsOf(mesh)).toEqual(first);
    mesh.resetDeformation();
    expect(positionsOf(mesh)).toEqual(original);
    expect(mesh.isDeformed).toBe(false);
  });

  it("validates controller parameters and detects changed topology", () => {
    const mesh = new Mesh(new BoxGeometry(), new BasicMaterial());
    expect(() => mesh.deformation.configure({ axis: "q" as "x" })).toThrow(/axis/);
    expect(() => mesh.deformation.configure({ stretch: 0 })).toThrow(/stretch/);
    expect(() => mesh.deformation.configure({ taper: 2 })).toThrow(/taper/);
    mesh.geometry.setAttribute("position", new BufferAttribute(new Float32Array(9), 3));
    expect(() => mesh.deformation.apply()).toThrow(/topology/);
  });

  it("animates shape properties through the regular keyframe binding path", () => {
    const mesh = new Mesh(new SphereGeometry(1, 12, 6), new BasicMaterial());
    const original = positionsOf(mesh);
    const clip = new AnimationClip("twist", [
      new NumberKeyframeTrack("deformation.twist", [0, 1], [0, Math.PI]),
    ]);
    const mixer = new AnimationMixer(mesh);
    mixer.clipAction(clip).play();
    mixer.update(0.5);
    expect(mesh.deformation.twist).toBeCloseTo(Math.PI / 2);
    expect(positionsOf(mesh)).not.toEqual(original);
  });

  it("executes bounded structured deformation and reset commands", () => {
    const scene = new Scene();
    const mesh = new Mesh(new SphereGeometry(1, 12, 6), new BasicMaterial());
    mesh.name = "shape";
    scene.add(mesh);
    const bus = new CommandBus(scene);
    const result = bus.execute({
      version: "1.0",
      command: "deformObject",
      target: { name: "shape" },
      parameters: { axis: "y", bend: 90, twist: 180, taper: 0.5, unit: "degrees" },
    });
    expect(result.success).toBe(true);
    expect(mesh.deformation.bend).toBeCloseTo(Math.PI / 2);
    expect(mesh.deformation.twist).toBeCloseTo(Math.PI);
    expect(
      bus.execute({
        version: "1.0",
        command: "resetDeformation",
        target: { name: "shape" },
        parameters: {},
      }).success,
    ).toBe(true);
    expect(mesh.isDeformed).toBe(false);

    const validator = new CommandValidator();
    expect(
      validator.validate({
        version: "1.0",
        command: "deformObject",
        target: { name: "shape" },
        parameters: { axis: "invalid", bend: 10 },
      }).valid,
    ).toBe(false);
    expect(
      validator.validate({
        version: "1.0",
        command: "deformObject",
        target: { name: "shape" },
        parameters: { twist: 99_999, unit: "degrees" },
      }).valid,
    ).toBe(false);
  });

  it("maps Korean and English shape language to allowlisted commands", async () => {
    const scene = new Scene();
    const mesh = new Mesh(new SphereGeometry(1, 12, 6), new BasicMaterial());
    mesh.name = "cube";
    scene.add(mesh);
    const provider = new RuleBasedProvider();
    const commands = await provider.parseCommand("큐브를 90도 휘어 비틀어", { scene });
    expect(commands).toMatchObject([
      {
        command: "deformObject",
        target: { name: "cube" },
        parameters: { axis: "y", bend: 90, twist: 90, unit: "degrees" },
      },
    ]);
    expect(new CommandBus(scene).executeMany(commands).every((result) => result.success)).toBe(
      true,
    );
    expect(mesh.isDeformed).toBe(true);
    expect(await provider.parseCommand("cube의 원래 모양으로 초기화", { scene })).toMatchObject([
      { command: "resetDeformation", target: { name: "cube" } },
    ]);
  });

  it("serializes changed primitives as baked independent buffer geometry", () => {
    const scene = new Scene();
    const mesh = new Mesh(new BoxGeometry(), new BasicMaterial());
    mesh.name = "bent-box";
    mesh.deformation.configure({ bend: Math.PI / 2, taper: 0.4 });
    const expected = positionsOf(mesh);
    scene.add(mesh);

    const loader = new JSONSceneLoader();
    const restored = loader.parse(JSON.parse(loader.stringify(scene))).getObjectByName("bent-box");
    expect(restored).toBeInstanceOf(Mesh);
    expect((restored as Mesh).geometry).toBeInstanceOf(Geometry);
    expect((restored as Mesh).geometry).not.toBeInstanceOf(BoxGeometry);
    expect(positionsOf(restored as Mesh)).toEqual(expected);

    const clone = mesh.geometry.clone();
    const clonePosition = clone.getAttribute<Float32Array>("position")!;
    const sourcePosition = mesh.geometry.getAttribute<Float32Array>("position")!;
    clonePosition.array[0] = (clonePosition.array[0] ?? 0) + 10;
    expect(clonePosition.array[0]).not.toBe(sourcePosition.array[0]);
  });

  it("refreshes dynamic GPU buffers and rebuilds a VAO only when its layout changes", () => {
    const activeAttributes = new Map([
      ["aPosition", 0],
      ["aNormal", 1],
    ]);
    let resourceId = 0;
    const createVertexArray = vi.fn(() => ({ id: ++resourceId }));
    const bufferData = vi.fn();
    const deleteVertexArray = vi.fn();
    const gl = {
      ARRAY_BUFFER: 1,
      ELEMENT_ARRAY_BUFFER: 2,
      DYNAMIC_DRAW: 3,
      STATIC_DRAW: 4,
      FLOAT: 5,
      UNSIGNED_BYTE: 6,
      UNSIGNED_SHORT: 7,
      UNSIGNED_INT: 8,
      createVertexArray,
      bindVertexArray: vi.fn(),
      createBuffer: vi.fn(() => ({ id: ++resourceId })),
      bindBuffer: vi.fn(),
      bufferData,
      getAttribLocation: vi.fn(
        (_program: WebGLProgram, name: string) => activeAttributes.get(name) ?? -1,
      ),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      deleteBuffer: vi.fn(),
      deleteVertexArray,
    } as unknown as WebGL2RenderingContext;
    const resources = new WebGLResourceTracker(gl);
    const buffers = new WebGLBufferManager(gl, resources);
    const program = { name: "deformation-test" } as unknown as WebGLProgram;
    const mesh = new Mesh(new SphereGeometry(1, 12, 6), new BasicMaterial());

    const initial = buffers.get(mesh.geometry, program);
    const initialUploadCount = bufferData.mock.calls.length;
    mesh.deformation.configure({ bend: Math.PI / 2, twist: Math.PI });
    const refreshed = buffers.get(mesh.geometry, program);

    expect(refreshed.vertexArray).toBe(initial.vertexArray);
    expect(createVertexArray).toHaveBeenCalledTimes(1);
    expect(bufferData.mock.calls.length).toBeGreaterThan(initialUploadCount);

    activeAttributes.set("aUv", 2);
    mesh.geometry.markUpdated(["uv"]);
    const rebuilt = buffers.get(mesh.geometry, program);
    expect(rebuilt.vertexArray).not.toBe(initial.vertexArray);
    expect(createVertexArray).toHaveBeenCalledTimes(2);
    expect(deleteVertexArray).toHaveBeenCalledWith(initial.vertexArray);
  });
});
