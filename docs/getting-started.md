# Getting started

## Requirements

- Node.js 20 or newer
- A browser with WebGL2 enabled
- A canvas with non-zero CSS dimensions

## Build from source

```bash
git clone https://github.com/leondic1976/Deploy-Verbis3d.git
cd Deploy-Verbis3d
npm ci
npm run build
```

## Rotating cube

Create a renderer, scene, camera, indexed box and basic material as shown in the README. Call
`renderer.setSize(width, height)` and `camera.resize(width, height)` after layout changes. Register
rotation in `engine.onUpdate()` and call `engine.start()` only after the scene is ready.

`Engine.start()` is idempotent. Call `engine.dispose()` when the canvas is permanently removed so
animation frames and GPU resources are released.

## Error handling

`WebGL2Renderer` throws if it cannot acquire WebGL2. Surface that message near the canvas. Shader
compile and link failures include the browser-provided diagnostic log.
