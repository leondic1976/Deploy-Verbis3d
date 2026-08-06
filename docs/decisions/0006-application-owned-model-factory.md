# ADR 0006: Use application-owned procedural model factories

Status: accepted

The reusable object library uses explicit `ModelFactory` instances instead of a mutable global
template registry. Built-in car, person, face and tree templates can be loaded into any factory,
and applications or plugins can register additional data-only templates.

This keeps tests and multiple engine instances isolated, makes command permissions configurable,
and avoids hidden registration order. Models remain ordinary scene hierarchies so rendering,
commands, animation and JSON serialization reuse established engine paths.

Built-in templates use boxes and spheres to remain inspectable and independently disposable. This
decision does not claim production character generation: glTF, skinning, high-density mesh
generation, PBR materials and instancing remain separate future capabilities.
