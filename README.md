# Verbis3D

Verbis3D is an experimental, AI-native web 3D engine implemented directly in TypeScript and
WebGL2. It is not a Three.js wrapper and does not use another complete 3D engine internally.

The public API and release process are currently at `0.4.0-alpha.1`. APIs may change before a
stable release.

## Current development stage

| Area                 | Status          | Evidence                                                                   |
| -------------------- | --------------- | -------------------------------------------------------------------------- |
| Math core            | Implemented     | Vector, quaternion, matrix, bounds, ray, plane and frustum tests           |
| Scene graph          | Implemented     | Cycle-safe hierarchy, transforms, traversal and lifecycle tests            |
| Cameras              | Implemented     | Perspective/orthographic matrices and frustum tests                        |
| Geometry/material    | Implemented     | Primitive/custom buffers, vertex color, bounds and compound-model tests    |
| Model library        | Implemented MVP | Isolated template registry; editable car, person, face and tree models     |
| WebGL2 renderer      | Alpha           | Functional shader/buffer/VAO/indexed draw path; browser-tested cube        |
| Engine loop          | Implemented     | Fixed/update/render phases, pause/resume and duplicate-start guard         |
| Animation            | Alpha           | Transform and deterministic shape-property tracks; no skeletal animation   |
| Mesh deformation     | Alpha           | Bend, twist, taper, stretch and wave with normals, bounds and GPU refresh  |
| Commands             | Implemented MVP | Validation, dry-run, history, permission and ambiguity handling            |
| Natural language     | Implemented MVP | Selection-aware offline rules plus Ollama and compatible API adapters      |
| Photo reconstruction | Alpha           | Composable vision AI, depth/pose carving, photo color and mesh AI adapters |
| Assets/plugins       | Foundation      | JSON scene round-trip, texture load boundary and plugin lifecycle          |
| Playground           | Implemented     | Picking, camera control, transforms, compound models, JSON and providers   |
| Learning examples    | Implemented     | 22 filterable, CI-typechecked TypeScript sources with source viewer        |
| Korean docs          | Implemented     | Guided setup, modeling, Playground, natural-language and provider guides   |
| Documentation site   | Implemented     | English/Korean guides, generated API, live demos and checked local links   |

Planned but not implemented: glTF, skeletal animation, physically based materials, shadows,
physics, production texture/material pipelines and a WebGPU backend.

## Core characteristics

- Column-major, WebGL-compatible math written for Verbis3D
- Dirty-state scene transforms and cycle-safe parent/child relationships
- Backend-neutral renderer contract with a WebGL2 implementation
- GLSL ES 3.00 solid-color material and indexed primitive rendering
- Fixed-step and variable-step engine callbacks
- Keyframe animation foundation with quaternion slerp
- Drift-free mesh deformation with a captured base shape and dynamic WebGL2 buffer reuse
- Structured command bus shared by code and natural-language integrations
- No `eval`, `new Function`, or generated-script execution
- JSON scene serialization and explicit plugin lifecycle
- Extensible model factories and editable car, person, face and tree hierarchies built from
  engine-native geometry
- Validated multi-photo input, composable AI stages, depth/pose carving and photo color projection
- Automated guard against completed third-party 3D engine dependencies and imports

## Install

The source release can be built and packed locally:

```bash
npm ci
npm run build
npm pack
```

The package name is reserved as `@verbis3d/core`; this repository workflow does not publish it
to npm yet.

## Quick start

```ts
import {
  BasicMaterial,
  BoxGeometry,
  Engine,
  Mesh,
  PerspectiveCamera,
  Scene,
  WebGL2Renderer,
} from "@verbis3d/core";

const canvas = document.querySelector("canvas");
if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Canvas is required.");

const renderer = new WebGL2Renderer({ canvas });
const scene = new Scene();
const camera = new PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
camera.position.set(0, 1.5, 5);

const cube = new Mesh(new BoxGeometry(), new BasicMaterial({ color: [0.2, 0.7, 1, 1] }));
cube.name = "cube";
scene.add(cube);

const engine = new Engine({ renderer, scene, camera });
engine.onUpdate((deltaTime) => cube.rotateY(deltaTime));
engine.start();
```

## Procedural object library

Use typed helpers for common models or an application-owned registry for built-in and custom
templates:

```ts
import { createBuiltinModelFactory, createProceduralPerson } from "@verbis3d/core";

const person = createProceduralPerson({
  name: "driver",
  shirtColor: [0.95, 0.3, 0.12, 1],
});
person.getPart("left-upper-arm")?.rotateZ(-0.4);
scene.add(person);

const models = createBuiltinModelFactory();
scene.add(models.create("car", { name: "delivery-car" }));
scene.add(models.create("tree", { name: "street-tree" }));
```

`ModelFactory` also accepts custom `ModelTemplate` definitions built with `createPrimitiveModel`.
Registered templates can be exposed to validated `createObject` commands by passing the factory to
`CommandBus`. See the [model system guide](docs/model-system.md) and the complete
[model-factory example](examples/model-factory/index.ts).

## Object movement and shape deformation

Transforms and deformation deliberately use different APIs. A transform moves the complete object;
the deformation controller changes its local vertices and then rebuilds normals, bounds and GPU
upload state:

```ts
const sculpture = new Mesh(
  new SphereGeometry(1, 32, 18),
  new BasicMaterial({ color: [0.15, 0.78, 0.66, 1] }),
);

sculpture.position.set(2, 0, -3);
sculpture.deformation.configure({
  axis: "y",
  stretch: 1.8,
  bend: Math.PI * 0.45,
  twist: Math.PI,
  taper: 0.55,
  waveAmplitude: 0.08,
  waveFrequency: 2,
});
```

Every edit is evaluated from an immutable base-position snapshot, so repeated updates do not drift.
`deformObject` and `resetDeformation` expose the same path to validated commands, while
`NumberKeyframeTrack("deformation.twist", ...)` animates shape and transform properties together.
See the [mesh deformation guide](docs/mesh-deformation.md), the
[complete example](examples/mesh-deformation/index.ts), or load the Playground's **Bend · twist ·
reshape lab** preset.

## Multi-photo 3D reconstruction

The `0.3` alpha accepts decoded photographs from at least two perpendicular directions. One AI can
recognize and segment the object, independent enhancers can add depth or camera calibration, and an
optional specialized model can generate the final mesh. Without a mesh model, the engine builds a
depth-aware indexed visual hull. Every stage returns validated data rather than executable code.

```ts
const abortController = new AbortController();
const pipeline = new PhotoReconstructionPipeline(new RuleBasedVisionProvider());
const result = await pipeline.reconstruct([frontPhoto, leftPhoto], {
  name: "captured-object",
  resolution: 24,
  enhancers: [new SilhouetteDepthEnhancer()],
  projectColors: true,
  signal: abortController.signal,
});
scene.add(result.mesh);
```

The local depth pass is silhouette-derived rather than measured metric depth, and vertex colors are
a lightweight projection rather than a UV texture atlas. The result remains a geometric
approximation rather than a photorealistic NeRF or production retopology.
See the [photo reconstruction guide](docs/photo-reconstruction.md),
[complete example](examples/photo-to-3d/index.ts), or open the Playground's **Photos → 3D** mode.

## Natural-language commands

The offline provider does not need a remote service:

```ts
const naturalLanguage = engine.useNaturalLanguage({
  provider: new RuleBasedProvider(),
});

await naturalLanguage.execute("빨간 구를 만들어 오른쪽으로 2 이동하고 천천히 회전시켜");
await naturalLanguage.execute("파란 자동차를 만들어 오른쪽으로 2 이동하고 30도 회전");
await naturalLanguage.execute("큐브를 90도 휘어 비틀어");
```

In the Scene Lab, click an object in the viewport or hierarchy and use phrases such as
`선택한 객체를 위로 1 이동`. The selected object is included in provider context and remains selected
after successful create, select and transform commands.

The provider panel can switch between offline rules, a local Ollama endpoint and an
OpenAI-compatible endpoint. Ollama defaults to `http://127.0.0.1:11434` with model `qwen3:8b`.
Compatible endpoints accept a model and optional API key. Playground credentials are held only in
the current tab's JavaScript memory; they are not written to browser storage or scene JSON. A
server-side proxy is recommended for production credentials.

Provider output is treated as untrusted data. Every command passes schema, target, range and
permission checks before public engine APIs are called.

The progressive [Scene Lab](https://leondic1976.github.io/Deploy-Verbis3d/playground.html) exposes
beginner direct edits, canvas picking, orbit/pan/zoom camera controls, scene building,
motion controls, a guided Photos → 3D workflow, structured commands and safe scene JSON without
requiring an external AI service.

## Architecture

```text
Application → Public API → Engine / Scene Graph
                            ↓
                    Renderer interface
                            ↓
                       WebGL2 backend → GPU

Natural language → Provider adapter → Structured command
                 → Validator → Command bus → Public API
```

See [architecture](docs/architecture.md), [rendering pipeline](docs/rendering-pipeline.md) and
[AI command system](docs/ai-command-system.md).

## Browser support

The renderer requires WebGL2, ES modules and modern browser APIs. Current Chromium, Firefox and
Safari releases are the intended targets. The renderer throws a clear compatibility error when
WebGL2 context creation fails. Headless or virtualized GPU environments may expose WebGL2
differently from a hardware browser.

## Development and verification

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
npm run docs:api
npm run site:build
npm run site:check
npm run test:e2e
```

Run the site locally with `npm run site:dev`. Generated API documentation is written to
`site/api/`; the deployable site is written to `site-dist/`.

## Documentation and site

- [Getting started](docs/getting-started.md)
- [English user manual](docs/user-guide.md)
- [한국어 문서](docs/ko/README.md)
- [한국어 사용자 설명서](docs/ko/user-guide.md)
- [한국어 웹 가이드](https://leondic1976.github.io/Deploy-Verbis3d/guide-ko.html)
- [Playground guide](docs/playground.md)
- [Photo reconstruction](docs/photo-reconstruction.md)
- [Learning examples](docs/examples.md)
- [API overview](docs/api/README.md)
- [Testing](docs/testing.md)
- [Security](SECURITY.md)
- [Deployment](docs/deployment.md)
- Expected GitHub Pages URL:
  `https://leondic1976.github.io/Deploy-Verbis3d/`

## Roadmap and contributing

The [roadmap](docs/roadmap.md) distinguishes implemented work from planned features. Read
[CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change.

## License

MIT. See [LICENSE](LICENSE).
