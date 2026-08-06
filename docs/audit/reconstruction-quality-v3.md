# Reconstruction quality v3 audit

Audit date: 2026-08-06

## Starting point

The `0.2.0-alpha.1` implementation already validated multi-photo input and provider output, offered
offline/Ollama/compatible adapters, generated cardinal visual hulls and exposed a task-focused
Playground. Capability names for depth and camera pose existed, but no composition layer or engine
fallback consumed pose data. Depth validation existed but the visual hull ignored depth. Local
voxel work was synchronous, source photos produced one average material color, and reconstructed
scene JSON did not retain vertex colors.

## Classification

| Classification | Items                                                                             | Decision                                                                |
| -------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Keep           | Photo validation, provider registry, remote restricted JSON, visual-hull fallback | These boundaries were already safe and tested                           |
| Extend         | Analysis types, pipeline, visual hull, materials, JSON scenes, Playground         | Connect depth, pose, cancellation and color without breaking v2 callers |
| Add            | Enhancer and mesh-generator contracts, local depth, color projector               | Allow different AI systems to specialize by stage                       |
| Delete         | None                                                                              | Existing public reconstruction APIs remain supported                    |
| Hold           | UV atlas, photogrammetry, NeRF, Gaussian splatting, retopology                    | These require dedicated backends and quality benchmarks                 |

## UX decisions

- Keep the existing three-step photo workflow; add quality choices where users already choose
  resolution instead of adding another navigation mode.
- Default to local silhouette depth and projected photo colors because both remain offline and are
  immediately visible in the preview.
- Show depth-view coverage and photo-color coverage in the persistent result summary.
- Expose Cancel only while work is running, disable controls that would invalidate in-flight input,
  and guarantee that cancellation does not mutate the scene.
- Describe silhouette depth as a shape approximation and vertex colors as distinct from UV
  textures.

## Safety decisions

- Validate the complete analysis after every enhancer, not just after the first provider.
- Validate camera vectors, field of view, clip planes and confidence before projection.
- Pass one `AbortSignal` through providers, enhancers, mesh generation and engine-native voxel work.
- Keep independent mesh AI output under the existing finite-array, index and resource quotas.
- Preserve vertex colors through JSON only with explicit storage, normalization and component
  bounds.

## Verification

Local verification on 2026-08-06 produced the following results:

| Check                | Result                                                                |
| -------------------- | --------------------------------------------------------------------- |
| Prettier             | `npm run format:check` passed                                         |
| ESLint               | `npm run lint` passed                                                 |
| TypeScript           | `npm run typecheck` passed across source, tests and examples          |
| Unit and integration | 10 files and 60 tests passed                                          |
| Coverage             | 74.96% statements, 65.08% branches, 79.31% functions and 77.86% lines |
| Library build        | `npm run build` passed                                                |
| API reference        | `npm run docs:api` passed                                             |
| Static site          | `npm run site:build` passed                                           |
| Link audit           | 12,004 local references checked with no missing files                 |
| Browser E2E          | 16 Chromium tests passed, including cancellation and mobile overflow  |
| Package              | `npm pack --dry-run` produced 451 files at 144.9 kB compressed        |
| Dependency audit     | `npm audit --audit-level=moderate` reported 0 vulnerabilities         |

Manual browser verification used the two bundled demo views. The Playground created a 3,368
triangle mesh, reported depth refinement for 2/2 views, camera pose for 0/2 views, 84% photo-color
coverage and two validated AI stages. Desktop and 390-pixel mobile screenshots showed no horizontal
overflow. Remote photogrammetry, NeRF, Gaussian splatting and production-quality topology remain
explicitly outside this alpha.

CI, pull request, merge and Pages deployment results are recorded after the branch is published.
