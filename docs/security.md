# Security

See the repository [security policy](../SECURITY.md).

AI provider responses are untrusted. The parser accepts JSON data only; the runtime command
validator and permission layer run before mutation. `eval`, `new Function` and generated-script
execution are not used.

External provider API keys are caller-owned and are never embedded in the static site. The
offline Playground uses only `RuleBasedProvider` for commands and `RuleBasedVisionProvider` for
photo segmentation.

Photo inputs are validated for count, dimensions, decoded RGBA length, total pixels and data-URL
size before provider work. Vision analysis is validated for source-photo correspondence, mask
dimensions, normalized bounds, confidence, colors, optional depth and calibrated camera pose.
Camera direction vectors, field of view, near/far ranges and confidence are bounded. Direct provider meshes are
limited and checked for finite positions, valid indices and complete triangles before `Geometry`
allocation. Reconstructed buffer geometry, normalized vertex colors and material selection are
validated again when scene JSON is imported.

`VisionAnalysisEnhancer` stages are validated independently. Applications that compose multiple
remote models must disclose every endpoint because the same photograph may leave the browser more
than once. One `AbortSignal` propagates through providers, enhancers, mesh generation and the
asynchronous engine fallback.

Offline vision never uploads photographs. Ollama and compatible vision modes send selected image
data to the endpoint explicitly entered by the user. Static browser deployments must not contain
long-lived production secrets; use a controlled proxy and disclose provider retention policy.
