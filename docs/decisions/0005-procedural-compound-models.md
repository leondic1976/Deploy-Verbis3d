# ADR 0005: Build learning models as procedural scene hierarchies

Status: accepted

The first car and face examples are composed from Verbis3D `Object3D`, `Mesh`, box/sphere geometry
and basic materials. Each model returns one transformable root and uniquely prefixed child names.

This keeps the examples inspectable, selectable, serializable and operable through the same command
bus as primitives without introducing a completed engine or an incomplete glTF claim. Parts carry
primary/detail color roles so a whole-model color command preserves windows, wheels, eyes and hair.

The models are intentionally stylized learning assets. High-detail production assets remain
dependent on later texture, lighting, material, glTF and animation work.
