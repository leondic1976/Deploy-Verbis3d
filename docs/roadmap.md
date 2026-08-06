# Roadmap

## 0.1.0-alpha.1

Direct math, scene graph, cameras, primitive geometry, basic material, WebGL2 renderer, engine
loop, animation/command foundations, offline natural language, JSON scenes, plugins, tests and
documentation site.

## Playground and learning update

- progressive Beginner, Builder, Advanced and Expert workspaces;
- multi-object hierarchy, material, camera and procedural-motion controls;
- viewport bounding-box picking, orbit/pan/zoom and selection framing;
- reversible scene edits and safe JSON round-trip;
- Korean/English natural-language object creation and chained operation recipes;
- selection-aware offline/Ollama/compatible-provider command routing;
- structured command preview and dry-run;
- editable 22-part car, 21-part person, 18-part face and 7-part tree hierarchies;
- move/rotate/stretch, car and face learning presets;
- 21 filterable, typechecked learning sources;
- detailed Korean setup, modeling, Playground and provider guides.

## 0.2.0-alpha.1 photo reconstruction

- validated 2–12 photo input and cardinal camera directions;
- private offline foreground segmentation;
- visual-hull indexed `Geometry` generation;
- Mock, Ollama vision and OpenAI-compatible vision adapters;
- custom segmentation, depth, pose and direct-mesh provider capability boundary;
- guided desktop/mobile Photos → 3D Playground workflow;
- validated reconstructed buffer-geometry scene JSON round-trip.

## 0.3.0-alpha.1 reconstruction quality

- composable recognition, depth and camera-pose AI stages;
- independent specialized mesh generators;
- validated calibrated perspective camera poses;
- depth-aware, cancellable asynchronous visual-hull carving;
- deterministic local silhouette-depth refinement;
- source-photo vertex-color projection and WebGL2 material;
- color-aware scene JSON round-trip;
- Playground depth/color controls, progress diagnostics and cancellation.

## Next

- strengthen GPU cache invalidation and context restoration;
- replace application-level snapshot undo with reversible core commands;
- add triangle-precise picking and translation/rotation/scale gizmos;
- add an optional server-side provider proxy and secret-management deployment guide;
- connect `animateObject` directly to reusable AnimationClip construction;
- add downloadable/importable scene files and larger scene persistence;
- add more engine-native procedural templates, shared geometry/instancing and mesh-editing utilities;
- add sampled textures and richer material state;
- extend render sorting, culling and performance instrumentation;
- implement a documented glTF subset;
- add bundled calibrated arbitrary-camera pose estimation models;
- add UV texture-atlas projection, photogrammetry and neural reconstruction backends;
- add retopology, watertight smoothing and export formats for reconstructed meshes;
- add texture, lighting and material foundations before presenting high-detail imported models;
- expand animation blending and eventually skeletal animation;
- introduce WebGPU only after renderer contracts prove stable.

Planned work is not part of the current release.
