# Math system

- Matrices are column-major and directly uploadable to WebGL uniforms.
- Angles are radians internally; `PerspectiveCamera.fov` is the documented degree-based exception.
- Normalizing a zero vector returns the zero vector.
- Normalizing a zero quaternion returns identity.
- Inverting a singular matrix or zero quaternion throws `RangeError`.
- `EPSILON` is `1e-8` for default approximate comparisons.
- Methods mutate `this`; transform methods accept optional output objects where reuse matters.

Covered primitives: Vector2/3/4, Euler, Quaternion, Matrix3/4, Color, Box3, Sphere, Ray, Plane and
Frustum.
