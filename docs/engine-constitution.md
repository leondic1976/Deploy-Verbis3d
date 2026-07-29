# Engine constitution

## Definition and values

Verbis3D is an independent web 3D engine library. Readability, explicit ownership, deterministic
behavior, safe extension and verifiable output take priority over feature count.

## Core constraints

1. No complete third-party 3D engine may implement the core.
2. Public behavior is object-centered and framework-neutral.
3. Math, scene, rendering, animation, commands, AI, assets and plugins retain explicit module
   boundaries.
4. Public exports need documentation, errors and tests proportional to their risk.
5. Errors must preserve actionable context; empty catches and ignored GPU failures are forbidden.
6. GPU resources, animation frames and listeners need explicit cleanup.
7. Hot paths should support output reuse and avoid hidden global state.
8. AI responses are untrusted data. Only allowed, validated commands may execute.
9. Breaking architectural changes require an ADR and migration impact statement.

## Testing policy

Math and scene behavior require deterministic unit tests. Cross-module paths require integration
tests. Browser output is checked through WebGL2 initialization, draw calls, canvas sizing,
interaction and console errors rather than unstable pixel snapshots.

## Performance policy

Transforms use dirty state, render work uses per-frame lists, device pixel ratio is bounded, and
GPU creation/deletion is owned by the backend. New allocations in per-object per-frame paths
require justification.
