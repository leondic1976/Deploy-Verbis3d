# Changelog

## Unreleased

### Added

- Progressive Beginner, Builder, Advanced and Expert Playground workspaces
- Natural-language scene creation, multi-object recipes and structured command previews
- Scene hierarchy editing, undo/redo, motion controls, diagnostics and safe JSON round-trip
- Viewport object picking, selection marker, orbit/pan/zoom, camera presets and framing
- Playground provider settings for offline rules, Ollama and OpenAI-compatible endpoints
- Selection-aware provider context without persistent browser credential storage
- Eighteen filterable and CI-typechecked learning examples with complete source viewing
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
