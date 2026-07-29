# Verbis3D

Verbis3D is an experimental, AI-native web 3D engine implemented directly in TypeScript and
WebGL2. It is not a Three.js wrapper and does not use another complete 3D engine internally.

The public API and release process are currently at `0.1.0-alpha.1`. APIs may change before a
stable release.

## Current development stage

| Area               | Status          | Evidence                                                                   |
| ------------------ | --------------- | -------------------------------------------------------------------------- |
| Math core          | Implemented     | Vector, quaternion, matrix, bounds, ray, plane and frustum tests           |
| Scene graph        | Implemented     | Cycle-safe hierarchy, transforms, traversal and lifecycle tests            |
| Cameras            | Implemented     | Perspective/orthographic matrices and frustum tests                        |
| Geometry/material  | Implemented     | Box, plane, sphere, bounds and basic unlit material tests                  |
| WebGL2 renderer    | Alpha           | Functional shader/buffer/VAO/indexed draw path; browser-tested cube        |
| Engine loop        | Implemented     | Fixed/update/render phases, pause/resume and duplicate-start guard         |
| Animation          | Foundation      | Scalar/vector/quaternion tracks and action playback; no skeletal animation |
| Commands           | Implemented MVP | Validation, dry-run, history, permission and ambiguity handling            |
| Natural language   | Implemented MVP | Korean/English create, transform, color, visibility, duplicate and motion  |
| Assets/plugins     | Foundation      | JSON scene round-trip, texture load boundary and plugin lifecycle          |
| Playground         | Implemented     | Beginner-to-expert scene lab, undo/redo, commands, JSON and diagnostics    |
| Learning examples  | Implemented     | 16 filterable, CI-typechecked TypeScript sources with source viewer        |
| Documentation site | Implemented     | Static guides, generated API reference, live demos and checked local links |

Planned but not implemented: glTF, skeletal animation, physically based materials, shadows,
physics, production texture/material pipelines and a WebGPU backend.

## Core characteristics

- Column-major, WebGL-compatible math written for Verbis3D
- Dirty-state scene transforms and cycle-safe parent/child relationships
- Backend-neutral renderer contract with a WebGL2 implementation
- GLSL ES 3.00 solid-color material and indexed primitive rendering
- Fixed-step and variable-step engine callbacks
- Keyframe animation foundation with quaternion slerp
- Structured command bus shared by code and natural-language integrations
- No `eval`, `new Function`, or generated-script execution
- JSON scene serialization and explicit plugin lifecycle

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

## Natural-language commands

The offline provider does not need a remote service:

```ts
const naturalLanguage = engine.useNaturalLanguage({
  provider: new RuleBasedProvider(),
});

await naturalLanguage.execute("빨간 구를 만들어 오른쪽으로 2 이동하고 천천히 회전시켜");
```

Provider output is treated as untrusted data. Every command passes schema, target, range and
permission checks before public engine APIs are called.

The progressive [Scene Lab](https://leondic1976.github.io/Deploy-Verbis3d/playground.html) exposes
beginner direct edits, scene building, motion/camera controls, structured commands and safe scene
JSON without requiring an external AI service.

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
- [Playground guide](docs/playground.md)
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
