# Multi-photo 3D reconstruction

Verbis3D `0.4.0-alpha.1` can build an engine-native triangle mesh from multiple photographs of one
object. The core separates image input, AI recognition and segmentation, ordered depth/pose
enhancement, reconstruction, color projection, schema validation and GPU-facing geometry. Provider
text or generated code is never executed.

## What the alpha does

The included offline provider estimates the background from image borders, segments a contrasting
foreground and classifies broad aspect-ratio shapes. `VisualHullReconstructor` projects every
validated silhouette into a voxel volume and retains their intersection. Exposed voxel faces become
an indexed `Geometry` with positions, normals, bounds and a `BasicMaterial` color estimated from the
photos.

The v3 pipeline can also use normalized depth maps and calibrated perspective camera poses supplied
by specialized providers. Its asynchronous visual hull yields between slice batches and observes an
`AbortSignal`. Optional photo projection creates normalized RGBA vertex colors rendered by
`VertexColorMaterial`.

This is a real geometric reconstruction, but it is not photogrammetry, NeRF, Gaussian splatting or a
production retopology system. Concavities that never affect a silhouette cannot be recovered. The
included local depth enhancer estimates relief from silhouette edges; it is not measured metric
depth. Vertex colors are not a UV texture atlas. A plain background and correctly assigned
front/side/top directions materially improve results.

## Capture checklist

1. Photograph one stationary object with the whole object visible.
2. Add at least two perpendicular views, normally front and left or right.
3. Keep camera height, distance and framing similar.
4. Prefer soft light and a plain background that contrasts with the object.
5. Avoid reflections, hard cast shadows and moving articulated parts.
6. Assign the actual camera direction to each photo before reconstruction.

The core accepts 2–12 images, enforces per-image dimensions, total decoded pixels and data-URL size,
and rejects capture sets that do not constrain at least two volume axes.

## Offline example

```ts
import {
  PhotoReconstructionPipeline,
  RuleBasedVisionProvider,
  Scene,
  SilhouetteDepthEnhancer,
  type VisionPhoto,
} from "@verbis3d/core";

const photos: VisionPhoto[] = [frontPhoto, leftPhoto];
const pipeline = new PhotoReconstructionPipeline(new RuleBasedVisionProvider());
const controller = new AbortController();
const result = await pipeline.reconstruct(photos, {
  name: "captured-chair",
  resolution: 24,
  segmentationThreshold: 46,
  enhancers: [new SilhouetteDepthEnhancer()],
  projectColors: true,
  signal: controller.signal,
});

const scene = new Scene();
scene.add(result.mesh);
```

`VisionPhoto.pixels` contains decoded RGBA bytes used by the offline provider. Remote providers use
the image `dataUrl`. Browser applications can obtain both through a temporary 2D canvas; the
Playground is a complete reference implementation.

## AI provider choices

| Provider                         | Runs where          | Included capability                        | Appropriate use                                      |
| -------------------------------- | ------------------- | ------------------------------------------ | ---------------------------------------------------- |
| `RuleBasedVisionProvider`        | Browser             | Recognition, segmentation                  | Private controlled captures and deterministic tests  |
| `MockVisionProvider`             | Test/application    | Application-supplied                       | CI and integration tests                             |
| `OllamaVisionProvider`           | Local Ollama        | Multimodal recognition, polygon silhouette | Local vision models with browser CORS enabled        |
| `OpenAICompatibleVisionProvider` | Configured endpoint | Multimodal recognition, polygon silhouette | Compatible hosted or self-hosted APIs                |
| Custom `VisionAIProvider`        | Application-defined | Any declared capability                    | Dedicated segmentation, depth, pose or mesh services |

## Combining several AI systems

Recognition is the starting stage, not a requirement that one model perform every task. Ordered
enhancers receive the preceding validated analysis and return a complete replacement analysis:

```ts
const result = await new PhotoReconstructionPipeline(segmentationProvider).reconstruct(photos, {
  enhancers: [depthAI, cameraPoseAI],
  meshGenerator: specializedMeshAI,
  projectColors: true,
});
```

Each enhancer implements `VisionAnalysisEnhancer`. A mesh-only service implements
`VisionMeshGenerator`, so it does not need to pretend to recognize the object. The pipeline validates
photo correspondence, masks, normalized depth, camera vectors, field of view, clip planes and
confidence after every stage.

The included `SilhouetteDepthEnhancer` is deterministic and private. It derives a rounded depth
proxy from distance to the mask boundary and is useful for previews and tests. Replace it with a
domain depth model when calibrated depth matters.

## Camera pose convention

`VisionCameraPose` uses the normalized reconstruction coordinate system: the object is centered at
the origin and fits inside a two-unit cube. Providers return position, target, up, vertical field of
view in radians, near/far clip distances and confidence. The validator rejects zero directions,
parallel up/view vectors, invalid fields of view and unsafe ranges. When a pose is present, mask,
depth and color sampling use full-frame perspective projection rather than cardinal fitting.

Ollama and compatible adapters submit image messages and request a restricted JSON schema. The
response is parsed as data, rasterized and validated. General multimodal language models usually
produce coarser silhouettes than dedicated segmentation models.

## Swapping providers

```ts
import {
  OllamaVisionProvider,
  OpenAICompatibleVisionProvider,
  PhotoReconstructionPipeline,
  VisionProviderRegistry,
} from "@verbis3d/core";

const providers = new VisionProviderRegistry()
  .register(
    new OllamaVisionProvider({
      baseUrl: "http://127.0.0.1:11434",
      model: "qwen2.5vl:7b",
    }),
  )
  .register(
    new OpenAICompatibleVisionProvider({
      baseUrl: "https://provider.example/v1",
      model: "multimodal-model",
      apiKey: runtimeSecret,
    }),
  );

const pipeline = new PhotoReconstructionPipeline(providers.require("ollama-vision"));
```

Registries are application-owned. Importing the library creates no mutable global provider state.
Browser API keys should not be used for production secrets; place a controlled server-side proxy in
front of hosted providers.

## Full AI mesh providers

A specialized service can advertise `mesh-generation` and implement `generateMesh`, or be supplied
independently through `meshGenerator`. The pipeline validates finite positions, triangle indices,
optional normals, bounds and resource quotas before creating `Geometry`. When no generator is
selected, the pipeline uses the visual-hull backend.

```ts
const provider: VisionAIProvider = {
  id: "domain-mesh-ai",
  name: "Domain mesh AI",
  capabilities: new Set(["recognition", "segmentation", "mesh-generation"]),
  analyze: async () => validatedAnalysis,
  generateMesh: async () => ({ positions, normals, indices }),
};
```

Provider implementations should support cancellation, minimize retained image data and document
whether images leave the user's device.

## Cancellation and progress

Remote fetches receive the same `AbortSignal` as local reconstruction. The visual-hull fallback
checks it between z slices and uses a short host yield so browser Cancel controls can run. Stable
progress stages are `validating`, `analyzing`, `enhancing`, `reconstructing`, `projecting` and
`complete`. Cancellation rejects with `AbortError` and the Playground does not mutate the scene.

## Performance and safety

- Visual-hull resolution is limited to 8–48 samples per axis and grows cubically.
- Generated surfaces have an explicit triangle limit.
- Provider masks, confidence, colors, depth arrays and photo IDs are checked against source data.
- Calibrated camera vectors, field of view, clip range and confidence are bounded and validated.
- Provider mesh arrays reject non-finite values, invalid indices and excessive resources.
- Scene JSON validates reconstructed position, normal, index and vertex-color arrays before
  allocating engine objects.
- The library does not call `eval`, `new Function` or execute AI-generated scripts.
