# Mesh deformation core v4 audit

Audit date: 2026-08-06

## Starting point

The repository was clean on `main` at merge commit `1b36fd7`. `Object3D` exposed dirty-tracked
translation, quaternion rotation and scale. Geometry stored typed attributes and bounds, while the
renderer uploaded static buffers. Commands covered movement, rotation and scale. Animation could
bind scalar tracks, but there was no geometry-deformation property to bind.

## Classification

| Classification | Items                                                                          | Decision                                                   |
| -------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Keep           | Transform, scene graph, command bus, animation tracks                          | These are the stable object-motion path                    |
| Extend         | Geometry, Mesh, WebGL buffer manager, validator, handler, animation binding    | Connect shape changes without bypassing public APIs        |
| Add            | Mesh deformation state/controller, deformation example and Playground controls | Provide deterministic bend, twist, taper, stretch and wave |
| Delete         | None                                                                           | Existing transform and rendering APIs remain supported     |
| Hold           | Skeletal skinning, soft-body physics, GPU compute deformation                  | They need separate data and performance designs            |

## Safety and correctness rules

- Never apply AI-generated code; only validated deformation parameters reach the controller.
- Reject non-finite values, invalid axes and parameters outside documented limits.
- Re-evaluate from immutable base positions instead of mutating the previous result.
- Recompute vertex normals and bounding volumes after every shape change.
- Mark geometry revisions so WebGL2 never renders stale vertex buffers.
- Serialize changed primitive vertices as bounded data-only buffer geometry.

## Verification

Local verification on 2026-08-06 produced these results:

| Check                      | Result                                                                          |
| -------------------------- | ------------------------------------------------------------------------------- |
| TypeScript                 | `npm run typecheck` passed                                                      |
| ESLint                     | `npm run lint` passed                                                           |
| Unit and integration tests | 67/67 passed across 11 files                                                    |
| Coverage                   | 77.69% statements, 66.85% branches, 80.09% functions, 80.54% lines              |
| Library build              | `npm run build` passed                                                          |
| API documentation          | TypeDoc generated `site/api/` without warnings                                  |
| Site build                 | Vite generated `site-dist/`                                                     |
| Site references            | 12,350 local references checked; no broken files                                |
| Browser E2E                | 17/17 Chromium tests passed, including live deformation and GPU revision checks |
| Dependency audit           | `npm audit` found 0 vulnerabilities                                             |
| Package contents           | 463 files, 156.3 kB packed and 744.2 kB unpacked                                |

Manual browser review covered the deformation Playground at a 1707 × 898 desktop viewport and the
Playground, English guide and Korean guide at a 390 × 844 mobile viewport. The selected deforming
mesh rendered through WebGL2, the document width stayed within the viewport, and the browser console
reported no warnings or errors.

The user-facing documentation is paired as `docs/user-guide.md` and `docs/ko/user-guide.md`. Both
manuals follow the same installation, first-scene, transform, deformation, animation, command,
natural-language, Playground and troubleshooting sequence. The static English and Korean site pages
link the corresponding hands-on workflows.

Remote CI, pull-request merge and deployed Pages verification are recorded only after those
external steps actually complete.
