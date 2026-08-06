# ADR 0007: Provider-neutral multi-view reconstruction

- Status: Accepted
- Date: 2026-08-06

## Context

Photo-to-3D quality depends on interchangeable capabilities: foreground segmentation, object
recognition, depth, camera pose and sometimes direct mesh generation. Binding the engine to one
hosted model would make offline use, privacy controls, deterministic testing and future providers
difficult. General vision language models also do not guarantee production-quality geometry.

## Decision

Use a provider-neutral `VisionAIProvider` boundary with declared capabilities and an
application-owned `VisionProviderRegistry`. Validate photos before provider calls and validate every
analysis or mesh response before engine allocation. Ship a deterministic offline segmentation
provider and cardinal-view visual-hull backend as the no-network baseline. Ship Ollama and
OpenAI-compatible multimodal adapters only at the provider boundary. Allow dedicated providers to
implement optional direct mesh generation.

The initial deterministic backend requires at least two perpendicular cardinal directions. Arbitrary
camera pose recovery, texture projection, neural radiance fields and photorealistic reconstruction
remain separate future backends.

## Consequences

- Applications can select local, hosted or domain-specific AI without changing scene or renderer
  code.
- Tests remain deterministic and do not require credentials.
- Controlled captures produce usable approximate volume without a server.
- AI responses cannot bypass quotas or become executable code.
- Users must assign capture directions for the baseline backend.
- Visual hulls cannot recover hidden concavities or photographic appearance.
