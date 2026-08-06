import { describe, expect, it } from "vitest";
import {
  MockVisionProvider,
  JSONSceneLoader,
  OllamaVisionProvider,
  OpenAICompatibleVisionProvider,
  PhotoReconstructionPipeline,
  RuleBasedVisionProvider,
  SilhouetteDepthEnhancer,
  VertexColorMaterial,
  VisionProviderRegistry,
  Scene,
  validateReconstructionMeshData,
  validateVisionAnalysis,
  validateVisionPhotos,
  type VisionAIProvider,
  type VisionAnalysis,
  type VisionPhoto,
} from "../../src/index.js";

describe("photo reconstruction", () => {
  it("segments contrasting multi-view photos and builds indexed 3D geometry", async () => {
    const photos = samplePhotos();
    const progress: string[] = [];
    const result = await new PhotoReconstructionPipeline(new RuleBasedVisionProvider()).reconstruct(
      photos,
      {
        name: "photo-person",
        resolution: 12,
        onProgress: (event) => progress.push(event.stage),
      },
    );

    expect(result.mesh.name).toBe("photo-person");
    expect(result.analysis.label).toBe("person-like object");
    expect(result.stats.method).toBe("visual-hull");
    expect(result.stats.triangleCount).toBeGreaterThan(12);
    expect(result.mesh.geometry.getAttribute("normal")?.count).toBe(
      result.mesh.geometry.vertexCount,
    );
    expect(result.mesh.geometry.boundingBox?.isEmpty()).toBe(false);
    expect(result.mesh.userData["photoReconstruction"]).toMatchObject({
      providerId: "offline-silhouette",
      sourcePhotoCount: 2,
      resolution: 12,
    });
    expect(progress[0]).toBe("validating");
    expect(progress).toContain("analyzing");
    expect(progress).toContain("reconstructing");
    expect(progress.at(-1)).toBe("complete");
  });

  it("rejects insufficient or parallel capture directions before provider work", () => {
    const front = createPhoto("front", "front", 0.35, 0.65);
    expect(() => validateVisionPhotos([front])).toThrow(/2\.\.12/);
    expect(() => validateVisionPhotos([front, createPhoto("back", "back", 0.35, 0.65)])).toThrow(
      /perpendicular/,
    );
    expect(() => validateVisionPhotos([front, { ...front }])).toThrow(/Duplicate/);
  });

  it("keeps application-owned vision provider registries isolated", () => {
    const first = new VisionProviderRegistry().register(new RuleBasedVisionProvider());
    const second = new VisionProviderRegistry();
    expect(first.require("offline-silhouette").name).toBe("Offline silhouette");
    expect(second.has("offline-silhouette")).toBe(false);
    expect(() => first.register(new RuleBasedVisionProvider())).toThrow(/already registered/);
    expect(first.unregister("offline-silhouette")).toBe(true);
  });

  it("sends base64 images to Ollama and validates its polygon response", async () => {
    let requestBody = "";
    const provider = new OllamaVisionProvider({
      model: "vision-model",
      fetch: (_input, init) => {
        requestBody = typeof init?.body === "string" ? init.body : "";
        return Promise.resolve(
          new Response(
            JSON.stringify({ message: { content: JSON.stringify(remoteAnalysisJSON()) } }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      },
    });
    const analysis = await provider.analyze(samplePhotos());
    expect(analysis.label).toBe("sample object");
    expect(analysis.views[0]?.mask.data.some((value) => value !== 0)).toBe(true);
    expect(requestBody).toContain('"images":["AA==","AA=="]');
    expect(requestBody).toContain('"format":"json"');
  });

  it("uses compatible multimodal image content without persisting credentials", async () => {
    let authorization = "";
    let requestBody = "";
    const provider = new OpenAICompatibleVisionProvider({
      baseUrl: "https://vision.example/v1",
      model: "multi-view-model",
      apiKey: "memory-only",
      fetch: (_input, init) => {
        authorization = new Headers(init?.headers).get("authorization") ?? "";
        requestBody = typeof init?.body === "string" ? init.body : "";
        return Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [{ message: { content: JSON.stringify(remoteAnalysisJSON()) } }],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      },
    });
    expect((await provider.analyze(samplePhotos())).views).toHaveLength(2);
    expect(authorization).toBe("Bearer memory-only");
    expect(requestBody).toContain('"type":"image_url"');
    expect(requestBody).not.toContain("memory-only");
  });

  it("accepts direct mesh generation only after geometry validation", async () => {
    const analysis = createMockAnalysis();
    const provider: VisionAIProvider = {
      id: "mesh-ai",
      name: "Mesh AI",
      capabilities: new Set(["recognition", "segmentation", "mesh-generation"]),
      analyze: () => Promise.resolve(analysis),
      generateMesh: () =>
        Promise.resolve({
          positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
          indices: new Uint16Array([0, 1, 2]),
          color: [0.2, 0.6, 0.9, 1],
        }),
    };
    const result = await new PhotoReconstructionPipeline(provider).reconstruct(samplePhotos());
    expect(result.stats).toMatchObject({
      method: "provider-mesh",
      triangleCount: 1,
      meshGeneratorId: "mesh-ai",
    });
    expect(result.mesh.geometry.getAttribute("normal")?.count).toBe(3);
    expect(() =>
      validateReconstructionMeshData({
        positions: new Float32Array([0, 0, 0, Number.NaN, 0, 0, 0, 1, 0]),
        indices: new Uint16Array([0, 1, 2]),
      }),
    ).toThrow(/finite/);
  });

  it("combines one recognition AI with an independent specialized mesh generator", async () => {
    const meshGenerator = {
      id: "separate-mesh-model",
      name: "Separate mesh model",
      generateMesh: () =>
        Promise.resolve({
          positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
          indices: new Uint16Array([0, 1, 2]),
        }),
    };
    const result = await new PhotoReconstructionPipeline(
      new MockVisionProvider(() => createMockAnalysis()),
    ).reconstruct(samplePhotos(), { meshGenerator });
    expect(result.stats).toMatchObject({
      method: "provider-mesh",
      meshGeneratorId: "separate-mesh-model",
    });
  });

  it("uses deterministic mock analysis without network access", async () => {
    const provider = new MockVisionProvider(() => createMockAnalysis());
    const result = await new PhotoReconstructionPipeline(provider).reconstruct(samplePhotos(), {
      resolution: 8,
      objectHint: "custom scan",
    });
    expect(result.providerId).toBe("mock-vision");
    expect(result.stats.occupiedVoxelCount).toBeGreaterThan(0);
  });

  it("composes depth enhancement and projects source colors onto the generated mesh", async () => {
    const photos = samplePhotos();
    const baseline = await new PhotoReconstructionPipeline(
      new RuleBasedVisionProvider(),
    ).reconstruct(photos, { resolution: 10 });
    const enhanced = await new PhotoReconstructionPipeline(
      new RuleBasedVisionProvider(),
    ).reconstruct(photos, {
      resolution: 10,
      enhancers: [new SilhouetteDepthEnhancer()],
      projectColors: true,
    });

    expect(enhanced.stats.enhancerIds).toEqual(["silhouette-depth"]);
    expect(enhanced.stats.depthViewCount).toBe(2);
    expect(enhanced.stats.colorSource).toBe("photo-projected");
    expect(enhanced.stats.projectedVertexCount).toBeGreaterThan(0);
    expect(enhanced.stats.occupiedVoxelCount).toBeLessThan(baseline.stats.occupiedVoxelCount ?? 0);
    expect(enhanced.mesh.material).toBeInstanceOf(VertexColorMaterial);
    const color = enhanced.mesh.geometry.getAttribute<Uint8Array>("color");
    expect(color?.normalized).toBe(true);
    expect(color?.count).toBe(enhanced.mesh.geometry.vertexCount);
    expect(enhanced.analysis.warnings.join(" ")).toMatch(/silhouette-derived/);
  });

  it("uses calibrated provider camera poses during carving", async () => {
    const analysis = createMockAnalysis();
    const posed: VisionAnalysis = {
      ...analysis,
      views: [
        {
          ...analysis.views[0]!,
          cameraPose: {
            position: [0, 0, 4],
            target: [0, 0, 0],
            up: [0, 1, 0],
            verticalFovRadians: Math.PI / 3,
            near: 0.1,
            far: 10,
            confidence: 0.8,
          },
        },
        analysis.views[1]!,
      ],
    };
    const result = await new PhotoReconstructionPipeline(
      new MockVisionProvider(() => posed),
    ).reconstruct(samplePhotos(), { resolution: 8 });
    expect(result.stats.poseViewCount).toBe(1);
    expect(result.stats.triangleCount).toBeGreaterThan(0);
    const invalid: VisionAnalysis = {
      ...posed,
      views: [
        {
          ...posed.views[0]!,
          cameraPose: {
            ...posed.views[0]!.cameraPose!,
            up: [0, 0, -1],
          },
        },
        posed.views[1]!,
      ],
    };
    expect(() => validateVisionAnalysis(invalid, samplePhotos())).toThrow(/parallel/);
  });

  it("cancels asynchronous voxel carving through AbortSignal", async () => {
    const controller = new AbortController();
    const pending = new PhotoReconstructionPipeline(
      new MockVisionProvider(() => createMockAnalysis()),
    ).reconstruct(samplePhotos(), {
      resolution: 48,
      yieldEverySlices: 1,
      signal: controller.signal,
    });
    globalThis.setTimeout(() => controller.abort(), 0);
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects duplicate enhancer identities before repeated AI work", async () => {
    const enhancer = new SilhouetteDepthEnhancer();
    await expect(
      new PhotoReconstructionPipeline(
        new MockVisionProvider(() => createMockAnalysis()),
      ).reconstruct(samplePhotos(), { enhancers: [enhancer, enhancer] }),
    ).rejects.toThrow(/configured more than once/);
  });

  it("round-trips reconstructed buffer geometry through validated scene JSON", async () => {
    const result = await new PhotoReconstructionPipeline(new RuleBasedVisionProvider()).reconstruct(
      samplePhotos(),
      {
        resolution: 8,
        name: "scan",
        enhancers: [new SilhouetteDepthEnhancer()],
        projectColors: true,
      },
    );
    const scene = new Scene();
    scene.add(result.mesh);
    const loader = new JSONSceneLoader();
    const restored = loader.parse(loader.serialize(scene));
    const mesh = restored.getObjectByName("scan");
    expect(mesh?.type).toBe("Mesh");
    expect((mesh as typeof result.mesh).geometry.vertexCount).toBe(
      result.mesh.geometry.vertexCount,
    );
    expect((mesh as typeof result.mesh).geometry.getAttribute("color")?.count).toBe(
      result.mesh.geometry.vertexCount,
    );
    expect((mesh as typeof result.mesh).material).toBeInstanceOf(VertexColorMaterial);
    expect(mesh?.userData["photoReconstruction"]).toMatchObject({ method: "visual-hull" });
  });
});

function samplePhotos(): VisionPhoto[] {
  return [
    createPhoto("front-photo", "front", 0.36, 0.64),
    createPhoto("left-photo", "left", 0.42, 0.58),
  ];
}

function createPhoto(
  id: string,
  view: "front" | "back" | "left" | "right",
  minimumX: number,
  maximumX: number,
): VisionPhoto {
  const width = 48;
  const height = 64;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const foreground =
        x / width >= minimumX && x / width <= maximumX && y / height >= 0.08 && y / height <= 0.92;
      const offset = (y * width + x) * 4;
      pixels[offset] = foreground ? 35 : 245;
      pixels[offset + 1] = foreground ? 140 : 245;
      pixels[offset + 2] = foreground ? 210 : 245;
      pixels[offset + 3] = 255;
    }
  }
  return {
    id,
    view,
    width,
    height,
    pixels,
    dataUrl: "data:image/png;base64,AA==",
    fileName: `${id}.png`,
  };
}

function createMockAnalysis(): VisionAnalysis {
  const mask = new Uint8Array(16 * 16).fill(255);
  return {
    label: "mock scan",
    confidence: 0.9,
    warnings: [],
    views: [
      {
        photoId: "front-photo",
        view: "front",
        confidence: 0.9,
        boundingBox: { x: 0.2, y: 0.1, width: 0.6, height: 0.8 },
        foregroundColor: [0.2, 0.6, 0.9, 1],
        mask: { width: 16, height: 16, data: mask },
      },
      {
        photoId: "left-photo",
        view: "left",
        confidence: 0.85,
        boundingBox: { x: 0.3, y: 0.1, width: 0.4, height: 0.8 },
        foregroundColor: [0.25, 0.58, 0.86, 1],
        mask: { width: 16, height: 16, data: mask.slice() },
      },
    ],
  };
}

function remoteAnalysisJSON(): Record<string, unknown> {
  const silhouette = [
    [0.25, 0.1],
    [0.75, 0.1],
    [0.8, 0.5],
    [0.7, 0.9],
    [0.3, 0.9],
    [0.2, 0.5],
  ];
  return {
    label: "sample object",
    confidence: 0.88,
    warnings: [],
    views: [
      {
        photoId: "front-photo",
        confidence: 0.9,
        foregroundColor: [0.2, 0.6, 0.85, 1],
        silhouette,
      },
      {
        photoId: "left-photo",
        confidence: 0.86,
        foregroundColor: [0.22, 0.58, 0.82, 1],
        silhouette,
      },
    ],
  };
}
