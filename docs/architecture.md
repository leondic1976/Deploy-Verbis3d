# Architecture

## Engine layers

```mermaid
flowchart TD
  A[Application] --> B[Public API]
  B --> C[Engine]
  C --> D[Scene Graph]
  D --> E[Renderer Abstraction]
  E --> F[WebGL2 Backend]
  F --> G[GPU]
```

The scene graph owns object state. The renderer consumes a scene and camera but does not control
application lifecycle. WebGL2-specific resources remain behind the renderer contract so a future
WebGPU backend can implement the same high-level operation.

## AI command flow

```mermaid
flowchart LR
  A[Natural Language] --> B[AI Provider Adapter]
  B --> C[Structured Command]
  C --> D[Schema and Range Validation]
  D --> E[Command Bus]
  E --> F[Engine Public API]
  F --> G[Scene / Object / Renderer]
```

No provider response bypasses validation. The engine never executes generated source code.

## Frame loop

```mermaid
sequenceDiagram
  participant RAF as requestAnimationFrame
  participant Engine
  participant Fixed as fixedUpdate
  participant Update as update
  participant Renderer
  RAF->>Engine: timestamp
  Engine->>Engine: clamp delta / accumulate
  loop up to 8 fixed steps
    Engine->>Fixed: fixedDeltaTime
  end
  Engine->>Update: deltaTime
  Engine->>Renderer: render(scene, camera)
  Engine->>RAF: request next frame
```

## Package direction

The alpha is a single package with folders as module boundaries. Imports generally point inward:
math → core → cameras/geometry/materials → renderer, with commands/AI/assets/plugins consuming
public object behavior. Type-only imports prevent lifecycle contracts from introducing runtime
cycles.

## Independent core boundary

The package has no runtime dependency on a completed 3D engine. ESLint rejects imports from
Three.js, Babylon.js, PlayCanvas, A-Frame and Cesium, and a unit test checks both runtime
dependencies and TypeScript source imports. Procedural models are composed from Verbis3D
`Object3D`, `Mesh`, `BoxGeometry`, `SphereGeometry` and `BasicMaterial`; they do not wrap an
external scene or renderer.
