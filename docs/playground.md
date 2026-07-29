# Progressive Playground

The Scene Lab is a static, offline workspace built on the actual Verbis3D public API. Features are
revealed progressively so a first-time learner and an engine developer can use the same scene.

## Levels

| Level    | Primary job                         | Available tools                                                         |
| -------- | ----------------------------------- | ----------------------------------------------------------------------- |
| Beginner | Understand selection and transforms | guided tasks, Inspector, safe natural language                          |
| Builder  | Assemble a scene                    | primitives, hierarchy, rename, duplicate, delete, material state        |
| Advanced | Direct behavior                     | procedural motion, timeline preview, camera views, environment, presets |
| Expert   | Inspect engine data                 | structured command dry-run, CommandResult, scene JSON, diagnostics      |

Changing level does not replace the scene. It only reveals additional controls, so learners can
move forward or return to a simpler view without losing work.

## Natural-language-first workflow

Try these in order:

```text
빨간 구를 만들어 오른쪽으로 2 이동
파란 큐브 3개를 만들어
sphere를 두 배로 키우고 계속 회전시켜
cube hide
```

The Playground shows the resulting `EngineCommand[]` next to the input. A dry-run validates the
same data without mutating the scene. Applied changes are stored in a bounded scene-snapshot undo
stack.

## Advanced controls

- Scene hierarchy search, visibility and safe reparenting
- Box, sphere, plane and non-rendering group nodes
- Position, Euler rotation and scale editing
- RGBA material opacity, side, depth-test and depth-write state
- Spin, bob and orbit metadata with a timeline preview
- Perspective/front/top camera views and selection framing
- Background and field-of-view controls
- Four scene presets, including a 25-object draw-call exercise
- Versioned JSON export/import

## Current boundaries

Object selection is performed in the hierarchy; viewport ray picking and transform gizmos require
a picking subsystem that is not yet part of the engine. Procedural Playground motion is stored as
data in `userData`; the next animation update should translate `animateObject` into reusable
`AnimationClip` instances. The update backlog is tracked in
[playground-learning-update.md](audit/playground-learning-update.md).
