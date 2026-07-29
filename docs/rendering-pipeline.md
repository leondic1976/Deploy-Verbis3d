# Rendering pipeline

```mermaid
flowchart LR
  S[Scene traversal] --> L[RenderList]
  L --> C[RenderCommand]
  C --> P[Program cache]
  C --> B[Buffer / VAO cache]
  P --> U[Matrix and material uniforms]
  B --> D[indexed / array draw]
  U --> D
```

`WebGL2Renderer` updates scene/camera matrices, clears with the scene background, collects visible
meshes, applies material state, binds a program and VAO, uploads matrices/uniforms, and issues a
triangle draw.

The current alpha supports solid-color geometry only. Texture sampling, multiple passes, lights,
shadows and advanced sorting are planned. Resource creation is tracked for deterministic renderer
disposal.
