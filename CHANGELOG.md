# Changelog

## Unreleased

## 0.3.0-alpha.1 - 2026-08-06

### Added

- Composable `VisionAnalysisEnhancer` stages so segmentation, depth and camera-pose models can be
  supplied by different local or remote AI systems
- Independent `VisionMeshGenerator` support for combining one recognition AI with another mesh AI
- Validated calibrated camera poses and depth-aware voxel carving
- Cancellable asynchronous visual-hull reconstruction that yields between bounded slice batches
- Local `SilhouetteDepthEnhancer` for deterministic rounded depth previews
- Source-photo vertex-color projection and `VertexColorMaterial`
- Validated vertex-color geometry and material JSON round-trip
- Playground depth/color controls, live carving progress, cancellation and result diagnostics

## 0.2.0-alpha.1 - 2026-08-06

### Added

- Provider-neutral multi-photo reconstruction core with validated photo, mask and mesh schemas
- Offline foreground segmentation and cardinal-view visual-hull mesh generation
- `VisionAIProvider`, `VisionProviderRegistry`, Mock, Ollama vision and OpenAI-compatible vision
  adapters, plus optional direct AI mesh generation
- Safe buffer-geometry JSON round-trip for reconstructed meshes
- A task-oriented Playground switch between scene editing and a three-step Photos → 3D workflow
- Drag/drop image input, camera-direction assignment, private/offline mode, replaceable AI settings,
  progress, error and result states
- Multi-photo reconstruction example, tests and capture/provider documentation
- Application-owned `ModelFactory`, validated `ModelTemplate` contract and `ProceduralModel` part
  APIs
- Built-in 21-part person and 7-part tree alongside migrated car and face templates
- Custom model registry and full-body person learning examples plus a four-model Scene Lab gallery
- Command-bus model-factory injection and procedural-model type restoration from scene JSON
- Progressive Beginner, Builder, Advanced and Expert Playground workspaces
- Natural-language scene creation, multi-object recipes and structured command previews
- Scene hierarchy editing, undo/redo, motion controls, diagnostics and safe JSON round-trip
- Viewport object picking, selection marker, orbit/pan/zoom, camera presets and framing
- Playground provider settings for offline rules, Ollama and OpenAI-compatible endpoints
- Selection-aware provider context without persistent browser credential storage
- Twenty-one filterable and CI-typechecked learning examples with complete source viewing
- Engine-native 22-part car and 18-part face factories with individually editable children
- Move/rotate/stretch, procedural car and procedural face Playground presets
- Detailed Korean setup, modeling, Playground and natural-language/provider documentation
- Automated dependency/import checks that preserve the independent core boundary

### Changed

- Expanded the offline Korean/English rule provider across creation, transforms, appearance,
  visibility, duplication, deletion and motion
- Synchronized command selection after successful object operations and cleared deleted selections
- Bound browser-native fetch correctly in remote provider adapters
- Kept Euler and quaternion rotation views synchronized after command-driven changes
- Framed compound selections from aggregate child bounds and applied group colors by part role

## 0.1.0-alpha.1

### Added

- Direct math core, scene graph, cameras and engine loop
- Box/plane/sphere geometry and basic WebGL2 solid-color rendering
- Animation track/action foundation
- Validated command bus and offline natural-language rules
- Ollama and compatible provider adapter boundaries
- JSON scene serialization, texture-loader boundary and plugin lifecycle
- Unit, integration, coverage and browser tests
- Documentation site, live cube and offline Playground
- CI, Pages and release workflows

### Known limitations

No glTF, skeletal animation, lighting/PBR, shadows, physics or WebGPU backend. GPU context
restoration marks state but does not rebuild all cached resources.
