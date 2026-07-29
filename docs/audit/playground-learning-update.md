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
| Viewport input     | hierarchy-only selection              | ray picking, selected marker, orbit, pan, wheel/pinch zoom and camera reset                |
| Provider targeting | generic names could miss selection    | selected-object aliases, exact scene context and command-bus selection synchronization     |
| Provider access    | adapters available only in code       | Playground mode, endpoint/model/key inputs, connection test and memory-only credentials    |

## Core updates recommended next

1. Add triangle-precise picking and translation/rotation/scale gizmos on top of bounding-box picks.
2. Make commands reversible in core so undo does not require whole-scene snapshots.
3. Translate `animateObject` parameters into `AnimationClip` and `AnimationAction`.
4. Add per-resource GPU deletion and cache invalidation when scene objects are removed.
5. Add texture sampling, lighting and PBR materials before promising production visual authoring.
6. Move large-scene parsing and serialization to a worker-compatible boundary.
7. Add downloadable files, drag-and-drop import and persistent local projects.
8. Expand provider grammar through a declarative intent registry rather than a growing parser class.
9. Add an optional server-side AI proxy so deployed sites never need long-lived browser keys.

## Deliberately deferred

- viewport node editor and transform gizmos;
- collaborative scene editing;
- glTF authoring and skeletal animation;
- physics simulation;
- WebGPU backend;
- arbitrary generated JavaScript execution, which remains prohibited.

These items are documented as future work and are not represented as implemented.

## Verification evidence

Verified from a clean `npm ci` installation on 2026-07-30:

- formatting, lint and engine/test/example TypeScript checks passed;
- 35 unit and integration tests passed across seven files;
- coverage reached 68.1% statements, 57.3% branches, 70.26% functions and 71.66% lines;
- engine, TypeDoc and production site builds passed;
- 8,764 generated-site local references resolved without missing files;
- nine Chromium E2E scenarios passed, including canvas picking, camera gestures, selected-object
  language, mocked Ollama transport, key non-persistence and mobile layout;
- manual Chrome checks confirmed three WebGL2 draw calls, desktop provider controls, selection
  marker placement, wrapped mobile actions and zero page-level horizontal overflow;
- `npm audit` reported zero vulnerabilities.
