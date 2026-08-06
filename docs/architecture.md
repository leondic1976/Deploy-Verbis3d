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

## Procedural model flow

```mermaid
flowchart LR
  A[Application / Plugin] --> B[ModelFactory]
  B --> C[Validated ModelTemplate]
  C --> D[ProceduralModel]
  D --> E[Object3D + Mesh Parts]
  E --> F[Scene / Commands / Animation]
  F --> G[Renderer]
```

Factories are application-owned rather than global. Built-in and custom models therefore share
the normal scene graph while catalog contents and command exposure remain explicit.

## Photo reconstruction flow

```mermaid
flowchart LR
  A[2–12 Photos] --> B[Input and Resource Validation]
  B --> C[Recognition / Segmentation AI]
  C --> D[Validate Complete Analysis]
  D --> E[Depth / Pose Enhancer Chain]
  E --> F[Validate After Every Enhancer]
  F --> G{Independent Mesh AI?}
  G -->|Yes| H[Validate Triangle Mesh]
  G -->|No| I[Async Depth / Pose Visual Hull]
  H --> J[Optional Photo Color Projection]
  I --> J
  J --> K[Geometry + Validated Material]
  K --> L[Mesh / Scene / WebGL2 Renderer]
```

The provider registry is application-owned and may contain offline, Ollama, compatible or
domain-specific services. `VisionAnalysisEnhancer[]` allows separate segmentation, depth and
camera-pose models to contribute without trusting one monolithic response. `VisionMeshGenerator`
can be supplied independently of the recognition provider. All routes converge on the same
resource and data validation boundary, and asynchronous voxel work observes `AbortSignal`.

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
math → core → cameras/geometry/materials → models/reconstruction/renderer, with
commands/AI/assets/plugins consuming public object behavior. Type-only imports prevent lifecycle
contracts from introducing runtime cycles.

## Independent core boundary

The package has no runtime dependency on a completed 3D engine. ESLint rejects imports from
Three.js, Babylon.js, PlayCanvas, A-Frame and Cesium, and a unit test checks both runtime
dependencies and TypeScript source imports. Procedural models are composed from Verbis3D
`Object3D`, `Mesh`, `BoxGeometry`, `SphereGeometry` and `BasicMaterial`; they do not wrap an
external scene or renderer.
