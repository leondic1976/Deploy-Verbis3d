# Security

See the repository [security policy](../SECURITY.md).

AI provider responses are untrusted. The parser accepts JSON data only; the runtime command
validator and permission layer run before mutation. `eval`, `new Function` and generated-script
execution are not used.

External provider API keys are caller-owned and are never embedded in the static site. The
offline Playground uses only `RuleBasedProvider`.
