# Changelog

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
