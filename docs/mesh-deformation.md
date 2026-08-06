# Mesh deformation

Verbis3D `0.4.0-alpha.1` separates two kinds of change:

- an `Object3D` transform moves, rotates or scales the complete object in its parent space;
- `Mesh.deformation` changes local vertex positions and therefore changes the object's shape.

## Direct API

```ts
import { BasicMaterial, Mesh, SphereGeometry } from "@verbis3d/core";

const sculpture = new Mesh(
  new SphereGeometry(1, 32, 18),
  new BasicMaterial({ color: [0.15, 0.78, 0.66, 1] }),
);

sculpture.position.set(2, 0, -3); // object transform
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

Every update starts from the controller's captured base positions. Re-applying the same state
therefore produces the same vertices and does not accumulate drift. `resetDeformation()` restores
that base shape. `captureBase()` deliberately makes the current pose the next editing baseline.

## Modifier meaning

| Property        | Meaning                              | Safe range             |
| --------------- | ------------------------------------ | ---------------------- |
| `axis`          | Longitudinal local axis              | `x`, `y` or `z`        |
| `stretch`       | Length multiplier along the axis     | `0.05..20`             |
| `bend`          | Total arc angle in radians           | up to four turns       |
| `twist`         | End-to-end axial rotation in radians | up to eight turns      |
| `taper`         | Linear cross-section change          | magnitude below `1.95` |
| `waveAmplitude` | Local sideways displacement          | up to 10,000 units     |
| `waveFrequency` | Cycles along the base length         | `0..128`               |
| `wavePhase`     | Wave phase in radians                | finite and bounded     |

The order is stretch, bend, twist, taper and wave. After evaluation, the engine reconstructs vertex
normals, recomputes the bounding box and sphere, increments the geometry revision and refreshes the
existing WebGL2 buffers.

## Structured commands

```json
{
  "version": "1.0",
  "command": "deformObject",
  "target": { "name": "sculpture" },
  "parameters": {
    "axis": "y",
    "bend": 55,
    "twist": 120,
    "taper": 0.45,
    "unit": "degrees"
  }
}
```

`CommandValidator` rejects invalid axes, non-finite values and unsafe ranges before
`CommandHandler` reaches the mesh. `resetDeformation` restores the base through the same allowlisted
command bus. The offline rule provider recognizes requests such as `큐브를 90도 휘어 비틀어`.

## Shape animation

```ts
const clip = new AnimationClip("shape-cycle", [
  new NumberKeyframeTrack("deformation.twist", [0, 1.5, 3], [-Math.PI, Math.PI, -Math.PI]),
  new NumberKeyframeTrack("position.x", [0, 1.5, 3], [1, 2, 1]),
]);

new AnimationMixer(sculpture).clipAction(clip).play();
```

Numeric deformation properties are accessors, so the regular animation binding path invokes a full
validated shape update. Transform and deformation tracks can coexist in one clip.

## Performance and persistence

The current backend is deterministic CPU deformation intended for interactive tools and moderate
meshes. It reuses GPU buffer objects but still recalculates affected vertices and normals. Avoid
per-frame CPU deformation of many high-resolution meshes. Worker, shader and WebGPU compute
backends remain future extensions.

Scene JSON preserves the visible result as validated buffer geometry. This alpha does not yet retain
the original base-position snapshot and live modifier stack after a JSON round-trip; the loaded
baked pose becomes the next deformation baseline.
