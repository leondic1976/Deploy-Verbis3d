# Playground and learning update audit

Audit scope: progressive Playground, natural-language creation and study examples.

## Completed in this update

| Area               | Previous state                        | Updated state                                                                              |
| ------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| Learning depth     | one cube and transform inputs         | four progressive work levels                                                               |
| Scene editing      | single fixed object                   | add, duplicate, delete, rename, parent and visibility                                      |
| Natural language   | transform existing named objects      | create, multi-create, move, rotate, scale, color, visibility, duplicate, delete and motion |
| Transparency       | final text result only                | generated command JSON, dry-run and CommandResult                                          |
| Animation learning | separate source only                  | motion metadata, timeline preview and play/pause                                           |
| Scene portability  | loader API only                       | interactive safe JSON round-trip                                                           |
| Examples           | four narrow files/cards               | 16 categorized, filterable, CI-typechecked sources                                         |
| Rotation state     | Euler did not follow quaternion edits | two-way Euler/quaternion synchronization                                                   |
| Browser coverage   | basic transform and one command       | all levels, undo/redo, creation recipe, source viewer and mobile overflow                  |

## Core updates recommended next

1. Introduce ray casting and object picking, then add translation/rotation/scale gizmos.
2. Make commands reversible in core so undo does not require whole-scene snapshots.
3. Translate `animateObject` parameters into `AnimationClip` and `AnimationAction`.
4. Add per-resource GPU deletion and cache invalidation when scene objects are removed.
5. Add texture sampling, lighting and PBR materials before promising production visual authoring.
6. Move large-scene parsing and serialization to a worker-compatible boundary.
7. Add downloadable files, drag-and-drop import and persistent local projects.
8. Expand provider grammar through a declarative intent registry rather than a growing parser class.

## Deliberately deferred

- viewport node editor;
- collaborative scene editing;
- glTF authoring and skeletal animation;
- physics simulation;
- WebGPU backend;
- arbitrary generated JavaScript execution, which remains prohibited.

These items are documented as future work and are not represented as implemented.

## Verification evidence

Verified from a clean `npm ci` installation on 2026-07-30:

- formatting, lint and engine/test/example TypeScript checks passed;
- 32 unit and integration tests passed across seven files;
- coverage reached 66% statements, 53.66% branches, 68.59% functions and 69.38% lines;
- engine, TypeDoc and production site builds passed;
- 8,748 generated-site local references resolved without missing files;
- seven Chromium E2E scenarios passed, including natural-language creation and mobile layout;
- manual Chrome checks confirmed WebGL2 rendering, four-command natural-language execution,
  expert dry-run output, complete example source display and zero page-level horizontal overflow;
- `npm audit` reported zero vulnerabilities.
