# Progressive Playground

The Scene Lab is a static, offline workspace built on the actual Verbis3D public API. Features are
revealed progressively so a first-time learner and an engine developer can use the same scene.

## Levels

| Level    | Primary job                         | Available tools                                                    |
| -------- | ----------------------------------- | ------------------------------------------------------------------ |
| Beginner | Understand selection and transforms | guided tasks, Inspector, safe natural language                     |
| Builder  | Assemble a scene                    | primitives, compound models, hierarchy, duplicate, material state  |
| Advanced | Direct behavior                     | procedural motion, timeline preview, camera controls, environment  |
| Expert   | Inspect engine data                 | structured command dry-run, CommandResult, scene JSON, diagnostics |

Changing level does not replace the scene. It only reveals additional controls, so learners can
move forward or return to a simpler view without losing work.

## Natural-language-first workflow

Try these in order:

```text
빨간 구를 만들어 오른쪽으로 2 이동
파란 큐브 3개를 만들어
파란 자동차를 만들어 오른쪽으로 2 이동하고 30도 회전
사람 얼굴을 만들어 두 배로 키워
sphere를 두 배로 키우고 계속 회전시켜
cube hide
```

The Playground shows the resulting `EngineCommand[]` next to the input. A dry-run validates the
same data without mutating the scene. Applied changes are stored in a bounded scene-snapshot undo
stack.

Selection-aware phrases resolve to the current viewport or hierarchy selection:

```text
선택한 객체를 위로 1 이동
이 객체를 45도 회전
선택한 큐브를 두 배로 키워
```

The provider panel offers three modes:

- **Offline rules**: deterministic Korean/English commands without a network or key.
- **Ollama**: configurable endpoint and model, defaulting to local Ollama and `qwen3:8b`.
- **OpenAI-compatible API**: configurable base endpoint, model and optional bearer key.

The connection test reports endpoint, CORS and server availability errors before a command is
submitted. API keys remain only in the current tab's JavaScript memory and are excluded from logs,
storage and scene JSON. Production deployments should keep long-lived keys in a server-side proxy.

## Advanced controls

- Viewport ray picking with a visible selected-object marker
- Pointer drag orbit, Shift/middle/right drag pan, wheel/pinch zoom and reset
- Scene hierarchy search, visibility and safe reparenting
- Box, sphere, plane, non-rendering groups, a 22-part car, a 21-part person, an 18-part face bust
  and a 7-part tree
- Position, Euler rotation and scale editing
- RGBA material opacity, side, depth-test and depth-write state
- Spin, bob and orbit metadata with a timeline preview
- Perspective/front/top camera views and selection framing
- Background and field-of-view controls
- Eight scene presets, including transform, four-model gallery, car, face and 25-object draw-call
  exercises
- Versioned JSON export/import

## Current boundaries

Viewport picking uses mesh bounding boxes rather than triangle-precise intersections, and transform
gizmos are not implemented. Compound roots use aggregate child bounds for selection framing.
Procedural Playground motion is stored as data in `userData`; the next
animation update should translate `animateObject` into reusable `AnimationClip` instances. Remote
provider calls are direct browser requests and therefore depend on provider CORS configuration.
The update backlog is tracked in
[playground-learning-update.md](audit/playground-learning-update.md).
