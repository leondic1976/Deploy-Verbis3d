# API reference

Run `npm run docs:api` to generate the complete TypeDoc reference at `site/api/`.

Primary entry points:

- Math: vectors, matrices, quaternion, bounds and frustum
- Core: Engine, Scene, Object3D, Entity, Component and Mesh
- Rendering: Renderer and WebGL2Renderer
- Content: Geometry, primitives, Material, BasicMaterial and VertexColorMaterial
- Procedural content: `ProceduralModel`, isolated `ModelFactory` registries, custom templates and
  editable car/person/face/tree hierarchies
- Reconstruction: `PhotoReconstructionPipeline`, `VisualHullReconstructor`, photo color projection,
  cancellation, validated photo/mask/depth/pose schemas and application-owned provider registries
- Vision AI: offline, Mock, Ollama vision, OpenAI-compatible vision, ordered
  `VisionAnalysisEnhancer` stages and independent `VisionMeshGenerator` implementations
- Behavior: animation, commands, AI providers, loaders and plugins
