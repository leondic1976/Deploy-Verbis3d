# ADR 0004: Validate AI commands

Status: accepted

Provider output is parsed as JSON data, checked against an allowlist and bounded schema, then
executed by a command bus. Generated source execution is prohibited. This adds predictable failure
codes and makes dry-run/history possible.
