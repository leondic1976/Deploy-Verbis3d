# Initial repository audit

Audit date: 2026-07-30

Starting branch: `main` at `45daff3`

Working branch: `agent/complete-engine-mvp`

## Observed state

- `main` contained package/TypeScript configuration, three math primitives, one math test and a
  development-constitution document.
- The only untracked file was the user-provided `agents.md` project specification.
- `origin/agent/engine-mvp` contained two unmerged scene-graph commits.
- Pull request #1 had merged the math foundation; no Actions runs existed.
- README and the original constitution rendered with broken character encoding.
- No WebGL2 backend, camera, geometry/material, engine loop, command/AI, assets/plugins, site,
  workflows, lockfile or complete validation scripts existed.

## Classification

| Classification  | Items                                                      | Decision                                                               |
| --------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| Keep and extend | Vector3, Quaternion, Matrix4, strict TypeScript base       | Preserve semantics and add required operations/tests                   |
| Modify          | package metadata, public exports, tests                    | Bring scripts/version/API coverage to alpha scope                      |
| Reconstruct     | remote Object3D/Scene concepts, README, constitution       | Retain intent; add cycles, dirty state, lifecycle and valid UTF-8 docs |
| Delete          | broken duplicate constitution path, superseded single test | Replace with canonical docs and layered tests                          |
| Defer           | glTF, skeletal animation, PBR, WebGPU                      | Document as roadmap, not implementation                                |

The remote scene work was reviewed rather than cherry-picked because it always recomputed
matrices, did not reject ancestor cycles, lacked UUID/lifecycle/components and did not expose the
required API. Its valid parent/child and traversal concepts were incorporated in the reconstructed
core.
