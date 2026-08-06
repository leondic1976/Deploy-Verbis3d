# Object model core follow-up audit

Audit date: 2026-08-06

Starting branch: `main` at `12dc392`

Working branch: `agent/object-model-core`

## Observed state

- The worktree was clean and synchronized with `origin/main`.
- The engine, renderer, command system, documentation site and CI configuration were already
  present.
- Procedural content existed as two utility functions: a 22-part car and an 18-part face.
- There was no public model class, template registry, custom-template contract, full-body person
  or general object catalog.
- Commands used hard-coded car/face branches, and JSON restored compound roots as plain
  `Object3D` instances.

## Classification

| Classification | Items                                                                           | Decision                                                              |
| -------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Keep           | Existing car/face geometry, public wrapper names, Playground hierarchy workflow | Preserve behavior and examples                                        |
| Modify         | Procedural utility module, command creation, JSON restoration, site catalog     | Route through the model core                                          |
| Reorganize     | Public procedural APIs                                                          | Move implementation to `src/models` and keep compatibility re-exports |
| Add            | ModelFactory, ProceduralModel, person/tree templates, custom-template sample    | Provide an extensible library boundary                                |
| Delete         | None                                                                            | Existing implementation was migrated, not discarded                   |
| Defer          | glTF, skinning, PBR, instancing, generative high-density meshes                 | Keep claims aligned with implemented alpha scope                      |

## Design evidence

The selected boundary keeps model definitions as validated data and uses only Verbis3D
`Object3D`, `Mesh`, primitive geometry and `BasicMaterial`. It therefore preserves the independent
engine requirement and lets commands, serialization and rendering use one public API path.

## Verification

Verified from a clean `npm ci` install on 2026-08-06:

- formatting, lint, source/test/example type checks and package build passed;
- 47 unit/integration tests passed across nine files;
- coverage reached 71.47% statements, 61.20% branches, 74.51% functions and 75.01% lines;
- TypeDoc, the production site build and 9,791 generated-site references passed;
- all 12 Chromium E2E scenarios passed, including person creation and mobile model controls;
- manual browser checks rendered the four-model gallery at 69 draw calls with WebGL2 ready;
- Korean person creation produced a validated command and selected the new model;
- a 390 × 844 viewport measured 375px document width with no horizontal overflow;
- browser console warning/error logs were empty; and
- `npm audit fix` updated the vulnerable transitive `brace-expansion` package, after which
  `npm audit` reported zero vulnerabilities.
