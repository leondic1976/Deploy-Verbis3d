import { Mesh, Object3D } from "../core/index.js";
import { BoxGeometry, SphereGeometry } from "../geometry/index.js";
import { BasicMaterial } from "../materials/index.js";

/** Linear RGBA tuple used by procedural-model options. */
export type ProceduralColor = readonly [number, number, number, number];
type PartGeometry = "box" | "sphere";

interface PartDefinition {
  readonly name: string;
  readonly geometry: PartGeometry;
  readonly color: ProceduralColor;
  readonly position: readonly [number, number, number];
  readonly scale: readonly [number, number, number];
  readonly rotation?: readonly [number, number, number];
  readonly colorRole?: "primary" | "detail";
}

/** Options for the editable procedural car model. */
export interface ProceduralCarOptions {
  /** Root name and prefix used for every child part. */
  readonly name?: string;
  /** RGBA color used by the body panels. */
  readonly bodyColor?: ProceduralColor;
}

/** Options for the editable procedural face bust. */
export interface ProceduralFaceOptions {
  /** Root name and prefix used for every child part. */
  readonly name?: string;
  /** RGBA color used by the skin parts. */
  readonly skinColor?: ProceduralColor;
  /** RGBA color used by the hair and eyebrows. */
  readonly hairColor?: ProceduralColor;
}

/**
 * Creates a stylized car from editable Verbis3D scene nodes.
 *
 * The returned root moves, rotates and scales the whole model. Every named child
 * remains independently selectable. This is a learning model, not an automotive
 * CAD asset.
 */
export function createProceduralCar(options: ProceduralCarOptions = {}): Object3D {
  const name = options.name ?? "car";
  const bodyColor = options.bodyColor ?? [0.12, 0.48, 0.92, 1];
  const dark: ProceduralColor = [0.035, 0.055, 0.075, 1];
  const glass: ProceduralColor = [0.13, 0.27, 0.38, 1];
  const chrome: ProceduralColor = [0.68, 0.75, 0.8, 1];
  const headlight: ProceduralColor = [1, 0.86, 0.42, 1];
  const tailLight: ProceduralColor = [0.95, 0.08, 0.06, 1];
  const parts: readonly PartDefinition[] = [
    {
      name: "body",
      geometry: "box",
      color: bodyColor,
      position: [0, 0.78, 0],
      scale: [3.3, 0.68, 1.4],
      colorRole: "primary",
    },
    {
      name: "cabin",
      geometry: "box",
      color: bodyColor,
      position: [-0.25, 1.38, 0],
      scale: [1.55, 0.62, 1.22],
      colorRole: "primary",
    },
    {
      name: "hood",
      geometry: "box",
      color: bodyColor,
      position: [1.18, 1.08, 0],
      scale: [0.82, 0.22, 1.25],
      colorRole: "primary",
    },
    {
      name: "rear-deck",
      geometry: "box",
      color: bodyColor,
      position: [-1.25, 1.06, 0],
      scale: [0.62, 0.2, 1.22],
      colorRole: "primary",
    },
    {
      name: "left-window",
      geometry: "box",
      color: glass,
      position: [-0.25, 1.48, 0.625],
      scale: [1.18, 0.38, 0.035],
      colorRole: "detail",
    },
    {
      name: "right-window",
      geometry: "box",
      color: glass,
      position: [-0.25, 1.48, -0.625],
      scale: [1.18, 0.38, 0.035],
      colorRole: "detail",
    },
    {
      name: "windshield",
      geometry: "box",
      color: glass,
      position: [0.545, 1.47, 0],
      scale: [0.04, 0.38, 1.05],
      colorRole: "detail",
    },
    {
      name: "rear-window",
      geometry: "box",
      color: glass,
      position: [-1.045, 1.47, 0],
      scale: [0.04, 0.38, 1.05],
      colorRole: "detail",
    },
    ...wheelParts(dark, chrome),
    {
      name: "headlight-left",
      geometry: "box",
      color: headlight,
      position: [1.67, 0.82, 0.43],
      scale: [0.05, 0.2, 0.28],
      colorRole: "detail",
    },
    {
      name: "headlight-right",
      geometry: "box",
      color: headlight,
      position: [1.67, 0.82, -0.43],
      scale: [0.05, 0.2, 0.28],
      colorRole: "detail",
    },
    {
      name: "tail-light-left",
      geometry: "box",
      color: tailLight,
      position: [-1.67, 0.82, 0.43],
      scale: [0.05, 0.2, 0.25],
      colorRole: "detail",
    },
    {
      name: "tail-light-right",
      geometry: "box",
      color: tailLight,
      position: [-1.67, 0.82, -0.43],
      scale: [0.05, 0.2, 0.25],
      colorRole: "detail",
    },
    {
      name: "front-bumper",
      geometry: "box",
      color: chrome,
      position: [1.73, 0.54, 0],
      scale: [0.08, 0.16, 1.08],
      colorRole: "detail",
    },
    {
      name: "rear-bumper",
      geometry: "box",
      color: chrome,
      position: [-1.73, 0.54, 0],
      scale: [0.08, 0.16, 1.08],
      colorRole: "detail",
    },
  ];
  return createModelRoot(name, "procedural-car", parts);
}

/**
 * Creates a stylized face bust from editable Verbis3D scene nodes.
 *
 * The result demonstrates hierarchical modeling and deliberately uses primitives
 * so learners can select the eyes, pupils, nose, mouth, hair and bust separately.
 */
export function createProceduralFace(options: ProceduralFaceOptions = {}): Object3D {
  const name = options.name ?? "face";
  const skin = options.skinColor ?? [0.88, 0.58, 0.42, 1];
  const hair = options.hairColor ?? [0.075, 0.045, 0.035, 1];
  const eye: ProceduralColor = [0.96, 0.97, 1, 1];
  const iris: ProceduralColor = [0.09, 0.22, 0.28, 1];
  const mouth: ProceduralColor = [0.72, 0.1, 0.16, 1];
  const shirt: ProceduralColor = [0.16, 0.3, 0.68, 1];
  const parts: readonly PartDefinition[] = [
    {
      name: "shoulders",
      geometry: "box",
      color: shirt,
      position: [0, 0.22, 0],
      scale: [2.15, 0.38, 0.82],
      colorRole: "detail",
    },
    {
      name: "neck",
      geometry: "box",
      color: skin,
      position: [0, 0.74, 0],
      scale: [0.55, 0.78, 0.5],
      colorRole: "primary",
    },
    {
      name: "head",
      geometry: "sphere",
      color: skin,
      position: [0, 2.02, 0],
      scale: [1.78, 2.1, 1.48],
      colorRole: "primary",
    },
    {
      name: "left-ear",
      geometry: "sphere",
      color: skin,
      position: [-0.94, 2.03, 0],
      scale: [0.34, 0.58, 0.3],
      colorRole: "primary",
    },
    {
      name: "right-ear",
      geometry: "sphere",
      color: skin,
      position: [0.94, 2.03, 0],
      scale: [0.34, 0.58, 0.3],
      colorRole: "primary",
    },
    {
      name: "left-eye",
      geometry: "sphere",
      color: eye,
      position: [-0.36, 2.26, 0.69],
      scale: [0.34, 0.23, 0.16],
      colorRole: "detail",
    },
    {
      name: "right-eye",
      geometry: "sphere",
      color: eye,
      position: [0.36, 2.26, 0.69],
      scale: [0.34, 0.23, 0.16],
      colorRole: "detail",
    },
    {
      name: "left-pupil",
      geometry: "sphere",
      color: iris,
      position: [-0.36, 2.26, 0.79],
      scale: [0.13, 0.14, 0.07],
      colorRole: "detail",
    },
    {
      name: "right-pupil",
      geometry: "sphere",
      color: iris,
      position: [0.36, 2.26, 0.79],
      scale: [0.13, 0.14, 0.07],
      colorRole: "detail",
    },
    {
      name: "nose",
      geometry: "sphere",
      color: skin,
      position: [0, 1.98, 0.77],
      scale: [0.22, 0.4, 0.3],
      colorRole: "primary",
    },
    {
      name: "mouth",
      geometry: "box",
      color: mouth,
      position: [0, 1.62, 0.69],
      scale: [0.48, 0.09, 0.06],
      colorRole: "detail",
    },
    {
      name: "left-eyebrow",
      geometry: "box",
      color: hair,
      position: [-0.37, 2.53, 0.68],
      scale: [0.42, 0.07, 0.06],
      rotation: [0, 0, -0.12],
      colorRole: "detail",
    },
    {
      name: "right-eyebrow",
      geometry: "box",
      color: hair,
      position: [0.37, 2.53, 0.68],
      scale: [0.42, 0.07, 0.06],
      rotation: [0, 0, 0.12],
      colorRole: "detail",
    },
    ...hairParts(hair),
  ];
  return createModelRoot(name, "procedural-face", parts);
}

function createModelRoot(
  name: string,
  template: "procedural-car" | "procedural-face",
  definitions: readonly PartDefinition[],
): Object3D {
  const root = new Object3D();
  root.name = name;
  root.userData = {
    compoundModel: true,
    template,
    partCount: definitions.length,
  };
  for (const definition of definitions) {
    const geometry = definition.geometry === "sphere" ? new SphereGeometry() : new BoxGeometry();
    const part = new Mesh(geometry, new BasicMaterial({ color: definition.color }));
    part.name = `${name}-${definition.name}`;
    part.position.set(...definition.position);
    part.scale.set(...definition.scale);
    if (definition.rotation) part.rotation.set(...definition.rotation);
    part.userData = {
      modelPart: definition.name,
      colorRole: definition.colorRole ?? "detail",
    };
    root.add(part);
  }
  return root;
}

function wheelParts(dark: ProceduralColor, chrome: ProceduralColor): readonly PartDefinition[] {
  const positions: ReadonlyArray<readonly [string, number, number]> = [
    ["front-left", 1.15, 0.74],
    ["front-right", 1.15, -0.74],
    ["rear-left", -1.18, 0.74],
    ["rear-right", -1.18, -0.74],
  ];
  return positions.flatMap(([name, x, z]) => [
    {
      name: `${name}-wheel`,
      geometry: "sphere" as const,
      color: dark,
      position: [x, 0.44, z] as const,
      scale: [0.48, 0.48, 0.22] as const,
      colorRole: "detail" as const,
    },
    {
      name: `${name}-hub`,
      geometry: "sphere" as const,
      color: chrome,
      position: [x, 0.44, z + Math.sign(z) * 0.12] as const,
      scale: [0.19, 0.19, 0.12] as const,
      colorRole: "detail" as const,
    },
  ]);
}

function hairParts(color: ProceduralColor): readonly PartDefinition[] {
  return [
    [-0.64, 2.95, 0.08],
    [-0.32, 3.11, 0.15],
    [0, 3.16, 0.16],
    [0.32, 3.11, 0.15],
    [0.64, 2.95, 0.08],
  ].map(([x, y, z], index) => ({
    name: `hair-${index + 1}`,
    geometry: "sphere",
    color,
    position: [x!, y!, z!] as const,
    scale: [0.62, 0.48, 0.58] as const,
    colorRole: "detail",
  }));
}
