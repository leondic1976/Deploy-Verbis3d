import { ModelFactory, type ModelCreateOptions, type ModelTemplate } from "./ModelFactory.js";
import {
  createPrimitiveModel,
  type ModelColor,
  type ModelPartDefinition,
  type ProceduralModel,
} from "./ProceduralModel.js";

/** Options for the editable procedural car model. */
export interface ProceduralCarOptions {
  /** Root name and prefix used for every child part. */
  readonly name?: string;
  /** RGBA color used by the body panels. */
  readonly bodyColor?: ModelColor;
}

/** Options for the editable full-body person model. */
export interface ProceduralPersonOptions {
  /** Root name and prefix used for every child part. */
  readonly name?: string;
  /** RGBA color used by the head, neck, ears and hands. */
  readonly skinColor?: ModelColor;
  /** RGBA color used by the upper-body clothing. */
  readonly shirtColor?: ModelColor;
  /** RGBA color used by the lower-body clothing. */
  readonly pantsColor?: ModelColor;
  /** RGBA color used by the hair. */
  readonly hairColor?: ModelColor;
}

/** Options for the editable procedural face bust. */
export interface ProceduralFaceOptions {
  /** Root name and prefix used for every child part. */
  readonly name?: string;
  /** RGBA color used by the skin parts. */
  readonly skinColor?: ModelColor;
  /** RGBA color used by the hair and eyebrows. */
  readonly hairColor?: ModelColor;
}

/** Options for the editable procedural tree model. */
export interface ProceduralTreeOptions {
  /** Root name and prefix used for every child part. */
  readonly name?: string;
  /** RGBA color used by trunk and branches. */
  readonly barkColor?: ModelColor;
  /** RGBA color used by the foliage canopy. */
  readonly foliageColor?: ModelColor;
}

const CAR_TEMPLATE: ModelTemplate = {
  id: "car",
  description: "Stylized 22-part road car with editable panels, windows, lights and wheels.",
  create: createCarFromOptions,
};

const PERSON_TEMPLATE: ModelTemplate = {
  id: "person",
  description: "Stylized full-body person with individually selectable body and clothing parts.",
  create: createPersonFromOptions,
};

const FACE_TEMPLATE: ModelTemplate = {
  id: "face",
  description: "Stylized face bust with editable facial features and hair.",
  create: createFaceFromOptions,
};

const TREE_TEMPLATE: ModelTemplate = {
  id: "tree",
  description: "Stylized tree with editable trunk, branches and foliage clusters.",
  create: createTreeFromOptions,
};

/** Built-in template catalog. Register these in an application-owned `ModelFactory`. */
export const BUILTIN_MODEL_TEMPLATES: readonly ModelTemplate[] = Object.freeze([
  CAR_TEMPLATE,
  PERSON_TEMPLATE,
  FACE_TEMPLATE,
  TREE_TEMPLATE,
]);

/** Creates an isolated model factory preloaded with all engine-provided templates. */
export function createBuiltinModelFactory(): ModelFactory {
  const factory = new ModelFactory();
  for (const template of BUILTIN_MODEL_TEMPLATES) factory.register(template);
  return factory;
}

/** Creates a stylized car from editable Verbis3D scene nodes. */
export function createProceduralCar(options: ProceduralCarOptions = {}): ProceduralModel {
  return createCarFromOptions({
    ...(options.name === undefined ? {} : { name: options.name }),
    ...(options.bodyColor === undefined ? {} : { colors: { body: options.bodyColor } }),
  });
}

/** Creates a full-body person from independently editable primitive parts. */
export function createProceduralPerson(options: ProceduralPersonOptions = {}): ProceduralModel {
  const colors: Record<string, ModelColor> = {};
  if (options.skinColor) colors["skin"] = options.skinColor;
  if (options.shirtColor) colors["shirt"] = options.shirtColor;
  if (options.pantsColor) colors["pants"] = options.pantsColor;
  if (options.hairColor) colors["hair"] = options.hairColor;
  return createPersonFromOptions({
    ...(options.name === undefined ? {} : { name: options.name }),
    ...(Object.keys(colors).length === 0 ? {} : { colors }),
  });
}

/** Creates a stylized face bust from editable Verbis3D scene nodes. */
export function createProceduralFace(options: ProceduralFaceOptions = {}): ProceduralModel {
  const colors: Record<string, ModelColor> = {};
  if (options.skinColor) colors["skin"] = options.skinColor;
  if (options.hairColor) colors["hair"] = options.hairColor;
  return createFaceFromOptions({
    ...(options.name === undefined ? {} : { name: options.name }),
    ...(Object.keys(colors).length === 0 ? {} : { colors }),
  });
}

/** Creates a stylized tree from independently editable trunk and canopy parts. */
export function createProceduralTree(options: ProceduralTreeOptions = {}): ProceduralModel {
  const colors: Record<string, ModelColor> = {};
  if (options.barkColor) colors["bark"] = options.barkColor;
  if (options.foliageColor) colors["foliage"] = options.foliageColor;
  return createTreeFromOptions({
    ...(options.name === undefined ? {} : { name: options.name }),
    ...(Object.keys(colors).length === 0 ? {} : { colors }),
  });
}

function createCarFromOptions(options: ModelCreateOptions = {}): ProceduralModel {
  const body = color(options, "body", [0.12, 0.48, 0.92, 1]);
  const dark: ModelColor = [0.035, 0.055, 0.075, 1];
  const glass: ModelColor = [0.13, 0.27, 0.38, 1];
  const chrome: ModelColor = [0.68, 0.75, 0.8, 1];
  const parts: ModelPartDefinition[] = [
    box("body", body, [0, 0.78, 0], [3.3, 0.68, 1.4], "primary"),
    box("cabin", body, [-0.25, 1.38, 0], [1.55, 0.62, 1.22], "primary"),
    box("hood", body, [1.18, 1.08, 0], [0.82, 0.22, 1.25], "primary"),
    box("rear-deck", body, [-1.25, 1.06, 0], [0.62, 0.2, 1.22], "primary"),
    box("left-window", glass, [-0.25, 1.48, 0.625], [1.18, 0.38, 0.035], "glass"),
    box("right-window", glass, [-0.25, 1.48, -0.625], [1.18, 0.38, 0.035], "glass"),
    box("windshield", glass, [0.545, 1.47, 0], [0.04, 0.38, 1.05], "glass"),
    box("rear-window", glass, [-1.045, 1.47, 0], [0.04, 0.38, 1.05], "glass"),
    ...wheelParts(dark, chrome),
    box("headlight-left", [1, 0.86, 0.42, 1], [1.67, 0.82, 0.43], [0.05, 0.2, 0.28]),
    box("headlight-right", [1, 0.86, 0.42, 1], [1.67, 0.82, -0.43], [0.05, 0.2, 0.28]),
    box("tail-light-left", [0.95, 0.08, 0.06, 1], [-1.67, 0.82, 0.43], [0.05, 0.2, 0.25]),
    box("tail-light-right", [0.95, 0.08, 0.06, 1], [-1.67, 0.82, -0.43], [0.05, 0.2, 0.25]),
    box("front-bumper", chrome, [1.73, 0.54, 0], [0.08, 0.16, 1.08], "trim"),
    box("rear-bumper", chrome, [-1.73, 0.54, 0], [0.08, 0.16, 1.08], "trim"),
  ];
  return createPrimitiveModel("car", options.name ?? "car", parts);
}

function createPersonFromOptions(options: ModelCreateOptions = {}): ProceduralModel {
  const skin = color(options, "skin", [0.72, 0.46, 0.31, 1]);
  const shirt = color(options, "shirt", [0.12, 0.52, 0.78, 1]);
  const pants = color(options, "pants", [0.08, 0.13, 0.24, 1]);
  const hair = color(options, "hair", [0.075, 0.045, 0.035, 1]);
  const shoe: ModelColor = [0.035, 0.04, 0.055, 1];
  const eye: ModelColor = [0.07, 0.12, 0.15, 1];
  const parts: readonly ModelPartDefinition[] = [
    box("pelvis", pants, [0, 1.62, 0], [0.92, 0.42, 0.48], "primary"),
    box("torso", shirt, [0, 2.25, 0], [1.18, 1.05, 0.58], "primary"),
    box("neck", skin, [0, 2.9, 0], [0.34, 0.34, 0.34], "skin"),
    sphere("head", skin, [0, 3.42, 0], [0.92, 1.12, 0.88], "skin"),
    sphere("hair", hair, [0, 3.77, -0.02], [0.94, 0.62, 0.9], "hair"),
    sphere("left-ear", skin, [-0.5, 3.42, 0], [0.18, 0.3, 0.18], "skin"),
    sphere("right-ear", skin, [0.5, 3.42, 0], [0.18, 0.3, 0.18], "skin"),
    sphere("left-eye", eye, [-0.18, 3.5, 0.43], [0.12, 0.1, 0.07], "detail"),
    sphere("right-eye", eye, [0.18, 3.5, 0.43], [0.12, 0.1, 0.07], "detail"),
    box("left-upper-arm", shirt, [-0.76, 2.28, 0], [0.3, 0.86, 0.34], "primary", [0, 0, -0.12]),
    box("right-upper-arm", shirt, [0.76, 2.28, 0], [0.3, 0.86, 0.34], "primary", [0, 0, 0.12]),
    box("left-lower-arm", skin, [-0.84, 1.66, 0], [0.26, 0.64, 0.28], "skin", [0, 0, -0.08]),
    box("right-lower-arm", skin, [0.84, 1.66, 0], [0.26, 0.64, 0.28], "skin", [0, 0, 0.08]),
    sphere("left-hand", skin, [-0.88, 1.28, 0], [0.3, 0.34, 0.28], "skin"),
    sphere("right-hand", skin, [0.88, 1.28, 0], [0.3, 0.34, 0.28], "skin"),
    box("left-upper-leg", pants, [-0.27, 1.05, 0], [0.38, 0.78, 0.4], "primary"),
    box("right-upper-leg", pants, [0.27, 1.05, 0], [0.38, 0.78, 0.4], "primary"),
    box("left-lower-leg", pants, [-0.27, 0.46, 0], [0.32, 0.62, 0.34], "primary"),
    box("right-lower-leg", pants, [0.27, 0.46, 0], [0.32, 0.62, 0.34], "primary"),
    box("left-shoe", shoe, [-0.27, 0.12, 0.1], [0.4, 0.22, 0.62], "shoes"),
    box("right-shoe", shoe, [0.27, 0.12, 0.1], [0.4, 0.22, 0.62], "shoes"),
  ];
  return createPrimitiveModel("person", options.name ?? "person", parts);
}

function createFaceFromOptions(options: ModelCreateOptions = {}): ProceduralModel {
  const skin = color(options, "skin", [0.88, 0.58, 0.42, 1]);
  const hair = color(options, "hair", [0.075, 0.045, 0.035, 1]);
  const parts: ModelPartDefinition[] = [
    box("shoulders", [0.16, 0.3, 0.68, 1], [0, 0.22, 0], [2.15, 0.38, 0.82], "clothing"),
    box("neck", skin, [0, 0.74, 0], [0.55, 0.78, 0.5], "primary"),
    sphere("head", skin, [0, 2.02, 0], [1.78, 2.1, 1.48], "primary"),
    sphere("left-ear", skin, [-0.94, 2.03, 0], [0.34, 0.58, 0.3], "primary"),
    sphere("right-ear", skin, [0.94, 2.03, 0], [0.34, 0.58, 0.3], "primary"),
    sphere("left-eye", [0.96, 0.97, 1, 1], [-0.36, 2.26, 0.69], [0.34, 0.23, 0.16]),
    sphere("right-eye", [0.96, 0.97, 1, 1], [0.36, 2.26, 0.69], [0.34, 0.23, 0.16]),
    sphere("left-pupil", [0.09, 0.22, 0.28, 1], [-0.36, 2.26, 0.79], [0.13, 0.14, 0.07]),
    sphere("right-pupil", [0.09, 0.22, 0.28, 1], [0.36, 2.26, 0.79], [0.13, 0.14, 0.07]),
    sphere("nose", skin, [0, 1.98, 0.77], [0.22, 0.4, 0.3], "primary"),
    box("mouth", [0.72, 0.1, 0.16, 1], [0, 1.62, 0.69], [0.48, 0.09, 0.06]),
    box("left-eyebrow", hair, [-0.37, 2.53, 0.68], [0.42, 0.07, 0.06], "hair", [0, 0, -0.12]),
    box("right-eyebrow", hair, [0.37, 2.53, 0.68], [0.42, 0.07, 0.06], "hair", [0, 0, 0.12]),
    ...faceHairParts(hair),
  ];
  return createPrimitiveModel("face", options.name ?? "face", parts);
}

function createTreeFromOptions(options: ModelCreateOptions = {}): ProceduralModel {
  const bark = color(options, "bark", [0.28, 0.13, 0.055, 1]);
  const foliage = color(options, "foliage", [0.12, 0.5, 0.2, 1]);
  const parts: readonly ModelPartDefinition[] = [
    box("trunk", bark, [0, 1.05, 0], [0.52, 2.1, 0.52], "bark"),
    box("left-branch", bark, [-0.5, 1.75, 0], [0.22, 1.15, 0.22], "bark", [0, 0, 0.72]),
    box("right-branch", bark, [0.5, 1.8, 0], [0.22, 1.05, 0.22], "bark", [0, 0, -0.72]),
    sphere("crown-center", foliage, [0, 2.7, 0], [1.9, 1.65, 1.55], "primary"),
    sphere("crown-left", foliage, [-0.88, 2.45, 0.05], [1.35, 1.25, 1.25], "primary"),
    sphere("crown-right", foliage, [0.88, 2.48, 0], [1.35, 1.3, 1.25], "primary"),
    sphere("crown-top", foliage, [0, 3.42, -0.04], [1.35, 1.2, 1.2], "primary"),
  ];
  return createPrimitiveModel("tree", options.name ?? "tree", parts);
}

function color(options: ModelCreateOptions, slot: string, fallback: ModelColor): ModelColor {
  return options.colors?.[slot] ?? fallback;
}

function box(
  id: string,
  partColor: ModelColor,
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
  colorRole = "detail",
  rotation?: readonly [number, number, number],
): ModelPartDefinition {
  return {
    id,
    primitive: "box",
    color: partColor,
    position,
    scale,
    colorRole,
    ...(rotation === undefined ? {} : { rotation }),
  };
}

function sphere(
  id: string,
  partColor: ModelColor,
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
  colorRole = "detail",
): ModelPartDefinition {
  return { id, primitive: "sphere", color: partColor, position, scale, colorRole };
}

function wheelParts(dark: ModelColor, chrome: ModelColor): readonly ModelPartDefinition[] {
  const positions: ReadonlyArray<readonly [string, number, number]> = [
    ["front-left", 1.15, 0.74],
    ["front-right", 1.15, -0.74],
    ["rear-left", -1.18, 0.74],
    ["rear-right", -1.18, -0.74],
  ];
  return positions.flatMap(([name, x, z]) => [
    sphere(`${name}-wheel`, dark, [x, 0.44, z], [0.48, 0.48, 0.22], "wheels"),
    sphere(`${name}-hub`, chrome, [x, 0.44, z + Math.sign(z) * 0.12], [0.19, 0.19, 0.12], "trim"),
  ]);
}

function faceHairParts(hair: ModelColor): readonly ModelPartDefinition[] {
  const positions: ReadonlyArray<readonly [number, number, number]> = [
    [-0.64, 2.95, 0.08],
    [-0.32, 3.11, 0.15],
    [0, 3.16, 0.16],
    [0.32, 3.11, 0.15],
    [0.64, 2.95, 0.08],
  ];
  return positions.map((position, index) =>
    sphere(`hair-${index + 1}`, hair, position, [0.62, 0.48, 0.58], "hair"),
  );
}
