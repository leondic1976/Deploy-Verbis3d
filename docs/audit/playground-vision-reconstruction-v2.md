# Playground and vision reconstruction audit

Audit date: 2026-08-06

## Scope

This change reviews and extends the existing Playground, AI adapters, Geometry boundary, JSON scene
format, examples and browser tests. Existing scene editing, command validation and WebGL2 rendering
remain in place.

## Classification

| Classification | Items                                                          | Reason                                                           |
| -------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- |
| Keep           | WebGL2 renderer, scene editor, command dock, object inspector  | Existing tested workflows remain useful                          |
| Modify         | Playground navigation and responsive layout                    | Make the first task and photo workflow explicit                  |
| Extend         | AI provider boundary, Geometry serialization, examples and E2E | Support validated multi-photo reconstruction                     |
| Reconstruct    | None                                                           | No existing subsystem required replacement                       |
| Delete         | None                                                           | No unrelated user files were removed                             |
| Hold           | NeRF, Gaussian splatting, photogrammetry, skeletal retopology  | Not honestly deliverable as a small browser-native alpha backend |

## Design evidence

- The first control asks users to choose Scene editor or Photos → 3D.
- Photo mode exposes only capture, recognition and build steps while preserving the live viewport.
- Empty, ready, processing, success, validation-error and remote-provider states are persistent and
  keyboard accessible.
- Desktop and mobile layouts use explicit grid transitions and do not require fixed content heights.
- API keys remain in tab memory and are not written to browser storage.
- Core validation precedes provider work and GPU-facing allocation.

## Verification

Local verification completed on 2026-08-06:

- Prettier, ESLint and all TypeScript project checks passed.
- Vitest passed 55 tests across 10 files.
- Coverage passed the configured thresholds: 74.28% statements, 62.92% branches, 77.58%
  functions and 77.34% lines. The reconstruction module reached 84.05% statements and 85.62%
  lines.
- Package build, TypeDoc generation, site build and all 11,280 static site-reference checks passed.
- Playwright passed 15 Chromium tests, including the real offline demo reconstruction, provider
  privacy controls and a 390 px responsive viewport.
- Additional 1440 px and 390 px screenshots showed no horizontal overflow. Both generated 3,588
  triangles from two synthetic source views, with no console or page errors.

CI, pull-request and deployment results must be recorded only after the corresponding remote jobs
complete.
