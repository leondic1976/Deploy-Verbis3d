# Learning examples

The Examples site exposes 20 complete TypeScript sources. `tsconfig.examples.json` checks them in
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
12. Editable procedural face
13. Editable full-body person
14. Scene JSON round-trip
15. Asset cache and plugin lifecycle
16. Natural-language creation and scene recipes
17. Command safety and custom provider adapters

Use the level and topic filters to narrow the catalog. The source viewer supports copying the
complete file and links to the matching repository directory. Examples that have an interactive
equivalent link directly into the appropriate Scene Lab level and may prefill a natural-language
recipe.

The examples deliberately use only Verbis3D and browser APIs. They do not introduce a complete
third-party 3D engine.
