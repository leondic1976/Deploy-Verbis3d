# Compound model and Korean documentation update

Audit date: 2026-07-30

## Scope completed

- Added public procedural car and face factories using only Verbis3D scene, geometry and material
  APIs.
- Added root-level move/rotate/scale and individually selectable model parts.
- Added aggregate child bounds for compound selection markers and camera framing.
- Extended validated `createObject` and offline Korean/English rules with `car` and `face`.
- Applied whole-model colors only to primary-role parts.
- Added transform, car and face Playground presets and natural-language shortcuts.
- Added two complete, typechecked learning sources.
- Added Korean setup, scene/modeling, Playground and natural-language/provider guides.
- Added a deployable Korean guide page and site navigation entry.
- Added lint and unit-test safeguards against completed third-party 3D engines.

## Deliberate boundaries

The procedural models demonstrate hierarchy, transformation, selection and serialization. They are
not high-density production assets. glTF, skeletal animation, lighting/PBR, textures and
triangle-precise editing remain documented roadmap work.

## Verification

Verified from an `npm ci` clean install on 2026-07-30:

- formatting, lint, engine/test/example type checks and package build passed;
- 42 unit/integration tests passed across nine files;
- coverage reached 70.55% statements, 60.09% branches, 71.66% functions and 73.94% lines;
- TypeDoc and the seven-entry production site build passed without warnings;
- 8,930 generated-site local references resolved without missing files;
- 12 Chromium E2E scenarios passed, including compound-model creation/part selection, root
  transforms, natural-language face creation, Korean documentation and mobile overflow;
- manual Chrome rendering showed the 22-part car at 23 draw calls and the 18-part face at 19 draw
  calls, both with WebGL2 ready;
- manual 390 px checks measured 375 px document width for the Korean guide and Playground;
- `npm audit` reported zero vulnerabilities.

CI, pull-request merge and production Pages evidence is added through the publication workflow.
