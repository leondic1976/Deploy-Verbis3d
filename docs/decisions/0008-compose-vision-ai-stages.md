# ADR 0008: Compose validated vision AI stages

- Status: accepted
- Date: 2026-08-06

## Context

Segmentation, object recognition, depth estimation, camera calibration and mesh generation have
different model strengths, deployment costs and privacy characteristics. Requiring one provider to
perform every task makes model replacement difficult and encourages oversized, weakly validated
responses.

## Decision

Keep `VisionAIProvider` as the complete recognition/segmentation starting point. Add ordered
`VisionAnalysisEnhancer` stages for depth and camera pose, and an independent
`VisionMeshGenerator` boundary for specialized geometry models. Validate the complete analysis
after every enhancer and validate mesh arrays immediately before engine geometry allocation.

The engine-native fallback consumes masks, normalized depth and calibrated poses in a cancellable
visual-hull backend. Photo color projection is a separate deterministic post-process and produces a
normalized vertex attribute rendered by `VertexColorMaterial`.

## Consequences

- Applications can combine private local segmentation with hosted depth or mesh models.
- A failed or malformed stage is isolated before downstream allocation.
- Provider ordering is explicit and application-owned; there is no global AI registry state.
- More stages can increase latency and may send photos to multiple services, so applications must
  disclose each endpoint and support cancellation.
- Silhouette-derived depth and vertex colors improve previews but do not claim metric geometry or a
  UV texture atlas.
