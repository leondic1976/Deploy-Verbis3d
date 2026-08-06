# Testing

The suite is divided into unit, integration, rendering-pipeline and browser tests.

```bash
npm run typecheck
npm run test
npm run test:coverage
npm run site:check
npm run test:e2e
```

Unit tests cover math, transforms, hierarchy, cameras, primitives, materials, animation,
validation, natural-language creation, compound-model hierarchy/round-trip and offline rules.
Integration tests cover engine scheduling, plugin lifecycle, serialization, asset caching and
scene-to-render-list behavior. An independence test rejects completed third-party 3D engine runtime
dependencies and source imports.

The Chromium E2E suite checks navigation, WebGL2 initialization, draw readiness, responsive
layout, all four Playground levels, undo/redo, structured command dry-runs, natural-language scene
creation, procedural car/person/face/tree editing, selected-object context, mocked Ollama transport, viewport
picking, orbit/zoom, the Korean guide, example source viewer and console errors. It avoids pixel
snapshots because virtual GPU output varies.

`npm run typecheck` includes `tsconfig.examples.json`, so every source shown in the learning
library is checked against the current public API.

`site:check` walks every generated HTML page, including TypeDoc output, and fails when a local
link or asset points outside `site-dist/` or does not exist.
