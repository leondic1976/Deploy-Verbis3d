# Learning examples

The Examples site exposes 22 complete TypeScript sources. `tsconfig.examples.json` checks them in
CI so the catalog cannot silently drift away from public exports.

## Suggested order

1. Math transform pipeline
2. Scene graph hierarchy
3. First rendered cube
4. Geometry gallery
5. Material and render state
6. Camera frustum checks
7. Engine frame phases
8. Editable procedural car
9. Extensible model factory
10. Structured commands
11. Keyframe animation
12. Animated mesh deformation
13. Editable procedural face
14. Editable full-body person
15. Scene JSON round-trip
16. Asset cache and plugin lifecycle
17. Natural-language creation and scene recipes
18. Multi-photo 3D reconstruction
19. Command safety and custom provider adapters

Use the level and topic filters to narrow the catalog. The source viewer supports copying the
complete file and links to the matching repository directory. Examples that have an interactive
equivalent link directly into the appropriate Scene Lab level and may prefill a natural-language
recipe.

The examples deliberately use only Verbis3D and browser APIs. They do not introduce a complete
third-party 3D engine.

`photo-to-3d` demonstrates the provider-neutral reconstruction pipeline, local depth refinement,
photo vertex colors and cancellation. Pass any `VisionAIProvider` to use the offline baseline,
Ollama or a compatible endpoint; add ordered `VisionAnalysisEnhancer` stages and an independent
`VisionMeshGenerator` for application-specific depth, pose and geometry services.

`mesh-deformation` demonstrates the difference between Object3D transforms and vertex-level shape
changes, combines both in one animation clip and uses only public engine APIs.
