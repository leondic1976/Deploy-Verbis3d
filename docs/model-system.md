# Procedural model system

The model module builds reusable scene hierarchies from Verbis3D primitives. It is engine-native:
every part is an ordinary `Mesh`, and every returned model is an `Object3D`-compatible
`ProceduralModel`. No completed 3D engine or generated script is involved.

## Built-in catalog

| Template | Parts | Intended use                                           |
| -------- | ----: | ------------------------------------------------------ |
| `car`    |    22 | Body panels, windows, lights, bumpers, wheels and hubs |
| `person` |    21 | Full body, clothing, face, arms, hands, legs and shoes |
| `face`   |    18 | Bust, facial features, eyebrows and hair               |
| `tree`   |     7 | Trunk, branches and foliage clusters                   |

These are stylized learning and prototyping assets, not high-density production meshes. They use
unlit colors and box/sphere primitives so their hierarchy stays inspectable.

## Direct factories

```ts
import { createProceduralCar, createProceduralPerson } from "@verbis3d/core";

const car = createProceduralCar({
  name: "delivery-car",
  bodyColor: [0.08, 0.56, 0.92, 1],
});
const person = createProceduralPerson({
  name: "driver",
  shirtColor: [0.94, 0.3, 0.12, 1],
});

scene.add(car, person);
person.getPart("left-upper-arm")?.rotateZ(-0.4);
person.setRoleColor("primary", [0.12, 0.68, 0.42, 1]);
```

Part IDs are stable within a template. Scene names are prefixed with the root name, while
`getPart()` avoids coupling application logic to that prefix. `getPartsByRole()` and
`setRoleColor()` support editor selection and batch styling.

## Application-owned registry

`ModelFactory` has no mutable global singleton. Each application, test or plugin explicitly owns
its template catalog.

```ts
const models = createBuiltinModelFactory();
const person = models.create("person", {
  name: "guide",
  colors: { shirt: [0.12, 0.58, 0.82, 1] },
});
```

Register a custom data-only template with the same engine path:

```ts
const marker: ModelTemplate = {
  id: "marker",
  description: "Two-part location marker.",
  create: (options = {}) =>
    createPrimitiveModel("marker", options.name ?? "marker", [
      {
        id: "stem",
        primitive: "box",
        color: [0.2, 0.22, 0.25, 1],
        position: [0, 0.5, 0],
        scale: [0.12, 1, 0.12],
      },
      {
        id: "beacon",
        primitive: "sphere",
        color: [1, 0.3, 0.1, 1],
        position: [0, 1.2, 0],
        scale: [0.5, 0.5, 0.5],
        colorRole: "primary",
      },
    ]),
};

models.register(marker);
```

Template IDs must use lowercase letters, digits and hyphens. Part IDs must be unique, transforms
must be finite, scale components must be positive, and color components must stay in the 0..1
range. Invalid data is rejected before a usable hierarchy is returned.

## Commands and serialization

Pass a factory to `CommandBus` when custom templates should be available to validated commands:

```ts
const commands = new CommandBus(scene, { modelFactory: models });
commands.execute({
  version: "1.0",
  command: "createObject",
  parameters: { shape: "marker", name: "checkpoint" },
});
```

Built-in car, person, face and tree shapes are available by default. The offline rule provider can
map Korean or English creation phrases to these same commands. JSON scene round-trips restore the
`ProceduralModel` root, metadata and stable part lookup without evaluating code.

## Lifecycle and performance

Every built-in part owns its primitive geometry and `BasicMaterial`. `clone()` creates independent
primitive resources so disposing or recoloring a copy does not mutate its source. Applications
must dispose models removed permanently from a scene. Large crowds should eventually use shared
geometry, instancing and skeletal animation; those optimizations are outside this alpha model
module.
