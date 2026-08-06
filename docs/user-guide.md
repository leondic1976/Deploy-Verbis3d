# Verbis3D user manual

This manual is the shortest supported route from a blank page to an interactive object that can
move, change shape and respond to validated commands. It describes the checked-in
`0.4.0-alpha.1` source release. The package is not claimed to be published to npm.

[한국어 사용자 설명서](ko/user-guide.md)

## Choose how you want to work

| Goal                      | Recommended entry point                                               |
| ------------------------- | --------------------------------------------------------------------- |
| Try features without code | Open the [Playground](../site/playground.html) and choose **Builder** |
| Learn object movement     | Load **Move · rotate · scale lab**                                    |
| Learn shape editing       | Load **Bend · twist · reshape lab**                                   |
| Build an application      | Use the TypeScript public API                                         |
| Connect an AI model       | Return structured commands through an `AIProvider`                    |

The Playground works as a static site. Its default `RuleBasedProvider` does not need an API key or
an external server.

## 1. Install and run

Requirements are Node.js 20 or newer and a browser with WebGL2 enabled.

```bash
git clone https://github.com/leondic1976/Deploy-Verbis3d.git
cd Deploy-Verbis3d
npm ci
npm run typecheck
npm run test
npm run site:dev
```

Open the local URL printed by Vite. To test the library from another local project before an npm
release, run `npm run build`, then `npm pack`, and install the generated archive there.

## 2. Create the canvas and first scene

Give the canvas a real CSS size; a zero-sized canvas cannot render.

```html
<canvas id="stage" aria-label="Interactive 3D scene"></canvas>
<style>
  #stage {
    width: 100%;
    height: 32rem;
    display: block;
  }
</style>
```

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

const canvas = document.querySelector("#stage");
if (!(canvas instanceof HTMLCanvasElement)) throw new Error("#stage canvas was not found.");

const renderer = new WebGL2Renderer({ canvas, maxDevicePixelRatio: 2 });
const scene = new Scene();
scene.background.set(0.025, 0.045, 0.065, 1);

const camera = new PerspectiveCamera(60, 1, 0.1, 100);
camera.position.set(0, 1.5, 5);
camera.lookAt({ x: 0, y: 0, z: 0 });

const cube = new Mesh(new BoxGeometry(), new BasicMaterial({ color: [0.2, 0.7, 1, 1] }));
cube.name = "cube";
scene.add(cube);

const engine = new Engine({ renderer, scene, camera });
engine.onUpdate((deltaTime) => cube.rotateY(deltaTime));
engine.start();
```

On resize, call both `renderer.setSize(width, height, false)` and
`camera.resize(width, height)`. Disconnect your resize observer and call `engine.dispose()` when
the view is permanently removed.

## 3. Move an object or change its shape

These operations solve different problems:

| Operation                 | Changes                  | Use it for                                     |
| ------------------------- | ------------------------ | ---------------------------------------------- |
| `position`                | Object origin            | Moving the whole object                        |
| `rotation` / `quaternion` | Object orientation       | Turning the whole object                       |
| `scale`                   | Object coordinate system | Uniform or per-axis object size                |
| `mesh.deformation`        | Local vertex positions   | Bending, twisting and reshaping the silhouette |

```ts
cube.position.set(2, 1, -3);
cube.rotation.set(0, Math.PI / 4, 0);
cube.scale.set(1, 1.5, 1);
```

Internal angles use radians. Changes to a parent affect its descendants; changes to a child part
stay relative to that parent.

For visible curvature, prefer a subdivided geometry such as `SphereGeometry`:

```ts
import { BasicMaterial, Mesh, SphereGeometry } from "@verbis3d/core";

const sculpture = new Mesh(
  new SphereGeometry(1, 32, 18),
  new BasicMaterial({ color: [0.15, 0.78, 0.66, 1] }),
);
sculpture.name = "sculpture";
scene.add(sculpture);

sculpture.deformation.configure({
  axis: "y",
  stretch: 1.6,
  bend: Math.PI * 0.4,
  twist: Math.PI,
  taper: 0.45,
  waveAmplitude: 0.08,
  waveFrequency: 2,
});
```

The modifiers run in a fixed order: stretch, bend, twist, taper, then wave. Every update starts
from the captured base vertices, so repeated slider and animation updates do not accumulate drift.
Normals, bounds and the existing WebGL2 buffers are refreshed afterward.

- `sculpture.resetDeformation()` restores the captured base.
- `sculpture.deformation.captureBase()` deliberately makes the current shape the new base.
- `sculpture.deformation.snapshot()` returns the current data-only settings.

## 4. Animate movement and shape together

```ts
import { AnimationClip, AnimationMixer, NumberKeyframeTrack } from "@verbis3d/core";

const clip = new AnimationClip("move-and-twist", [
  new NumberKeyframeTrack("position.x", [0, 1.5, 3], [-1, 1, -1]),
  new NumberKeyframeTrack("deformation.twist", [0, 1.5, 3], [-Math.PI, Math.PI, -Math.PI]),
]);
const mixer = new AnimationMixer(sculpture);
mixer.clipAction(clip).play();
engine.onUpdate((deltaTime) => mixer.update(deltaTime));
```

Deformation values are validated accessors, so animation uses the same deterministic core as
direct edits.

## 5. Run safe structured commands

Commands are data, not executable scripts. Dry-run before execution when a user or AI generated
the input.

```ts
import { CommandBus } from "@verbis3d/core";

const commands = new CommandBus(scene);
const bend = {
  version: "1.0",
  command: "deformObject",
  target: { name: "sculpture" },
  parameters: { axis: "y", bend: 90, twist: 120, unit: "degrees" },
} as const;

const preview = commands.execute(bend, { dryRun: true });
if (!preview.success) throw new Error(`${preview.error?.code}: ${preview.error?.message}`);
const result = commands.execute(bend);
```

`CommandValidator` rejects unknown commands, ambiguous targets, invalid axes, non-finite numbers and
unsafe ranges. Deletion is disabled unless `new CommandBus(scene, { allowDelete: true })` is used.

## 6. Use natural language and replaceable AI providers

```ts
import { RuleBasedProvider } from "@verbis3d/core";

const naturalLanguage = engine.useNaturalLanguage({
  provider: new RuleBasedProvider(),
});

await naturalLanguage.execute("큐브를 오른쪽으로 2 이동");
await naturalLanguage.execute("sculpture를 90도 휘어 비틀어");
```

`RuleBasedProvider` is deterministic and offline. `OllamaProvider` and
`OpenAICompatibleProvider` can be substituted without coupling the engine to one vendor. Every
provider must return `EngineCommand[]`; provider text and generated JavaScript are never executed.
Keep remote API keys on a server proxy in production.

## 7. Playground walkthrough

1. Open `playground.html?level=advanced&preset=deformation-lab`.
2. Select **animated-sculpture** in the scene hierarchy.
3. Pause motion so individual edits are easier to inspect.
4. Change **Bend**, **Twist**, **Taper** and **Wave** under **Shape deformation**.
5. Use **Reset shape** to restore the base vertices.
6. Enter `animated-sculpture를 90도 휘어` and choose **Validate and run**.
7. Read the structured-command preview and the success or error result.

Keyboard focus, visible labels, mobile layout and reduced-motion preferences are supported. The
canvas also exposes a text alternative through its accessible label.

## 8. Troubleshooting

| Symptom                                 | Check                                                                |
| --------------------------------------- | -------------------------------------------------------------------- |
| `WebGL2 is required`                    | Enable hardware acceleration or use a browser/device with WebGL2     |
| Blank or tiny canvas                    | Give the canvas non-zero CSS width and height, then call `setSize`   |
| Bend looks angular                      | Use geometry with more segments; deformation moves existing vertices |
| Command says target not found           | Assign a unique `object.name` and use that exact name                |
| Command says ambiguous target           | Rename duplicate objects; the engine will not guess                  |
| Shape animation is expensive            | Reduce vertex count or update fewer CPU-deformed meshes              |
| Loaded JSON cannot restore the old base | Alpha JSON preserves the baked pose; recapture a base after load     |

## Current limits

This release provides deterministic CPU mesh deformation for moderate interactive meshes. It does
not yet provide skeletal skinning, soft-body physics, sculpt brushes, glTF deformation targets or
GPU/WebGPU compute deformation. See the [mesh deformation reference](mesh-deformation.md),
[complete example](../examples/mesh-deformation/index.ts) and [API overview](api/README.md).
