# Multi-photo 3D reconstruction

Verbis3D `0.2.0-alpha.1` can build an engine-native triangle mesh from multiple photographs of one
object. The core separates image input, AI recognition and segmentation, reconstruction, schema
validation and GPU-facing geometry. Provider text or generated code is never executed.

## What the alpha does

The included offline provider estimates the background from image borders, segments a contrasting
foreground and classifies broad aspect-ratio shapes. `VisualHullReconstructor` projects every
validated silhouette into a voxel volume and retains their intersection. Exposed voxel faces become
an indexed `Geometry` with positions, normals, bounds and a `BasicMaterial` color estimated from the
photos.

This is a real geometric reconstruction, but it is not photogrammetry, NeRF, Gaussian splatting or a
production retopology system. Concavities that never affect a silhouette cannot be recovered. A
plain background and correctly assigned front/side/top directions materially improve results.

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
  type VisionPhoto,
} from "@verbis3d/core";

const photos: VisionPhoto[] = [frontPhoto, leftPhoto];
const pipeline = new PhotoReconstructionPipeline(new RuleBasedVisionProvider());
const result = await pipeline.reconstruct(photos, {
  name: "captured-chair",
  resolution: 24,
  segmentationThreshold: 46,
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

A specialized service can advertise `mesh-generation` and implement `generateMesh`. The pipeline
validates finite positions, triangle indices, optional normals, bounds and resource quotas before
creating `Geometry`. When this method is absent, the pipeline uses the visual-hull backend.

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

## Performance and safety

- Visual-hull resolution is limited to 8–48 samples per axis and grows cubically.
- Generated surfaces have an explicit triangle limit.
- Provider masks, confidence, colors, depth arrays and photo IDs are checked against source data.
- Provider mesh arrays reject non-finite values, invalid indices and excessive resources.
- Scene JSON validates reconstructed buffer arrays before allocating engine objects.
- The library does not call `eval`, `new Function` or execute AI-generated scripts.
