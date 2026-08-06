# ADR 0009: Use a deterministic CPU mesh-deformation stack

## Status

Accepted on 2026-08-06.

## Context

Verbis3D already separates object transforms from geometry data. Position, rotation and scale move
an object without changing its vertices, but the public API did not provide a safe way to bend,
twist, taper, stretch or wave a mesh. Editing a typed position array directly also left callers
responsible for normals, bounds and GPU upload state.

## Decision

Add a lazy `MeshDeformer` controller to `Mesh`. The controller captures an immutable base-position
snapshot and evaluates the complete modifier state from that snapshot on every change. It supports
an explicit deformation axis plus stretch, bend, twist, taper and wave parameters.

The evaluation order is fixed:

```text
base positions -> stretch -> bend -> twist -> taper -> wave
               -> vertex normals -> bounds -> GPU revision
```

Numeric properties are accessors, so `NumberKeyframeTrack` can animate paths such as
`deformation.twist`. Structured `deformObject` and `resetDeformation` commands use the same public
controller. The command validator applies finite-value and range limits before execution.

`Geometry` owns cloning, vertex-normal reconstruction, modification state and a monotonically
increasing GPU revision. The WebGL2 buffer manager reuses existing buffers when only vertex content
changes. Deformed primitive geometry is serialized as validated buffer data rather than being
mistaken for an untouched primitive.

## Consequences

- Repeated edits do not accumulate floating-point drift because every pose starts from the captured
  base positions.
- Transform animation and shape animation remain separate and can run together.
- CPU deformation is deterministic, testable without WebGL and suitable for moderate meshes.
- Very large or per-frame production meshes will eventually need a shader, compute or worker
  backend behind the same public state model.
- Scene JSON preserves the baked deformed mesh. This alpha does not yet serialize the original base
  snapshot and live modifier stack for later reset.
