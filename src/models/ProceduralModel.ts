import { Mesh, Object3D } from "../core/index.js";
import { BoxGeometry, PlaneGeometry, SphereGeometry } from "../geometry/index.js";
import { BasicMaterial } from "../materials/index.js";

/** Linear RGBA tuple used by model templates and material overrides. */
export type ModelColor = readonly [number, number, number, number];

/** Primitive geometry types supported by the data-only model builder. */
export type ModelPrimitive = "box" | "plane" | "sphere";

/** Serializable definition of one independently editable model part. */
export interface ModelPartDefinition {
  /** Stable identifier local to the model, such as `front-left-wheel`. */
  readonly id: string;
  /** Engine-native primitive used to render the part. */
  readonly primitive: ModelPrimitive;
  /** Linear RGBA material color. */
  readonly color: ModelColor;
  /** Local position relative to the model root. */
  readonly position: readonly [number, number, number];
  /** Local scale. Every component must be greater than zero. */
  readonly scale: readonly [number, number, number];
  /** Optional local Euler rotation in radians. */
  readonly rotation?: readonly [number, number, number];
  /** Semantic grouping used for selection and batch recoloring. */
  readonly colorRole?: string;
}

/**
 * Root scene node for an engine-native procedural model.
 *
 * Model parts remain ordinary `Mesh` nodes, so renderers, commands, animation and
 * serialization do not require a separate execution path.
 */
export class ProceduralModel extends Object3D {
  override readonly type = "ProceduralModel";

  /** Creates an empty model root. Prefer `createPrimitiveModel` for validated construction. */
  constructor(
    public readonly templateId: string,
    name: string,
  ) {
    super();
    this.name = name;
    this.refreshMetadata();
  }

  /** Returns stable IDs for all registered descendant parts. */
  get partNames(): readonly string[] {
    const names: string[] = [];
    this.traverse((object) => {
      const partName = object.userData["modelPart"];
      if (typeof partName === "string") names.push(partName);
    });
    return names;
  }

  /** Finds a model part by its template-local ID. */
  getPart(partName: string): Object3D | undefined {
    let match: Object3D | undefined;
    this.traverse((object) => {
      if (!match && object.userData["modelPart"] === partName) match = object;
    });
    return match;
  }

  /** Returns all parts assigned to a semantic color role. */
  getPartsByRole(role: string): readonly Object3D[] {
    const matches: Object3D[] = [];
    this.traverse((object) => {
      if (object.userData["colorRole"] === role) matches.push(object);
    });
    return matches;
  }

  /**
   * Recolors every `BasicMaterial` part in a role and returns the affected count.
   *
   * @throws RangeError when a color component is outside the normalized 0..1 range.
   */
  setRoleColor(role: string, color: ModelColor): number {
    assertColor(color, `Role '${role}'`);
    let changed = 0;
    for (const object of this.getPartsByRole(role)) {
      if (!(object instanceof Mesh) || !(object.material instanceof BasicMaterial)) continue;
      object.material.color.set(...color);
      object.material.syncUniforms();
      changed += 1;
    }
    return changed;
  }

  /** Creates an independently disposable copy of engine-native primitive parts. */
  override clone(recursive = true): ProceduralModel {
    const copy = new ProceduralModel(this.templateId, this.name);
    copyTransform(this, copy);
    if (recursive) {
      for (const child of this.children) copy.add(cloneModelNode(child));
    }
    copy.refreshMetadata();
    return copy;
  }

  /** Updates public metadata after a builder or loader adds parts. */
  refreshMetadata(): this {
    this.userData = {
      ...this.userData,
      compoundModel: true,
      template: this.templateId,
      partCount: this.partNames.length,
    };
    return this;
  }
}

/**
 * Builds a model hierarchy from validated, data-only primitive definitions.
 *
 * @throws Error for duplicate/empty part IDs and RangeError for invalid transforms or colors.
 */
export function createPrimitiveModel(
  templateId: string,
  name: string,
  definitions: readonly ModelPartDefinition[],
): ProceduralModel {
  assertIdentifier(templateId, "Template ID");
  assertName(name, "Model name");
  if (definitions.length === 0) throw new Error("A procedural model requires at least one part.");

  const ids = new Set<string>();
  for (const definition of definitions) {
    assertName(definition.id, "Part ID");
    if (ids.has(definition.id)) {
      throw new Error(`Model template '${templateId}' has duplicate part '${definition.id}'.`);
    }
    ids.add(definition.id);
    if (!(["box", "plane", "sphere"] as const).includes(definition.primitive)) {
      throw new Error(`Part '${definition.id}' uses an unsupported primitive.`);
    }
    assertTuple(definition.position, false, `Part '${definition.id}' position`);
    assertTuple(definition.scale, true, `Part '${definition.id}' scale`);
    if (definition.rotation) {
      assertTuple(definition.rotation, false, `Part '${definition.id}' rotation`);
    }
    assertColor(definition.color, `Part '${definition.id}'`);
    if (definition.colorRole !== undefined) {
      assertName(definition.colorRole, `Part '${definition.id}' color role`);
    }
  }

  const model = new ProceduralModel(templateId, name);
  for (const definition of definitions) {
    const geometry =
      definition.primitive === "sphere"
        ? new SphereGeometry()
        : definition.primitive === "plane"
          ? new PlaneGeometry()
          : new BoxGeometry();
    const part = new Mesh(geometry, new BasicMaterial({ color: definition.color }));
    part.name = `${name}-${definition.id}`;
    part.position.set(...definition.position);
    part.scale.set(...definition.scale);
    if (definition.rotation) part.rotation.set(...definition.rotation);
    part.userData = {
      modelPart: definition.id,
      colorRole: definition.colorRole ?? "detail",
    };
    model.add(part);
  }
  return model.refreshMetadata();
}

function assertIdentifier(value: string, label: string): void {
  if (!/^[a-z][a-z0-9-]*$/.test(value)) {
    throw new Error(`${label} must use lowercase letters, digits and hyphens.`);
  }
}

function assertName(value: string, label: string): void {
  if (value.trim().length === 0 || value.length > 64) {
    throw new Error(`${label} must contain 1 to 64 characters.`);
  }
}

function assertTuple(
  value: readonly [number, number, number],
  positive: boolean,
  label: string,
): void {
  if (value.length !== 3 || !value.every((component) => Number.isFinite(component))) {
    throw new RangeError(`${label} must contain finite numbers.`);
  }
  if (positive && value.some((component) => component <= 0)) {
    throw new RangeError(`${label} components must be greater than zero.`);
  }
}

function assertColor(value: ModelColor, label: string): void {
  if (
    value.length !== 4 ||
    !value.every((component) => Number.isFinite(component) && component >= 0 && component <= 1)
  ) {
    throw new RangeError(`${label} color components must be finite values from 0 to 1.`);
  }
}

function copyTransform(source: Object3D, target: Object3D): void {
  target.position.copy(source.position);
  target.quaternion.copy(source.quaternion);
  target.scale.copy(source.scale);
  target.visible = source.visible;
  target.enabled = source.enabled;
  target.userData = structuredClone(source.userData);
}

function cloneModelNode(source: Object3D): Object3D {
  let copy: Object3D;
  if (source instanceof Mesh && source.material instanceof BasicMaterial) {
    const geometry =
      source.geometry instanceof SphereGeometry
        ? new SphereGeometry()
        : source.geometry instanceof PlaneGeometry
          ? new PlaneGeometry()
          : source.geometry instanceof BoxGeometry
            ? new BoxGeometry()
            : source.geometry;
    const material = new BasicMaterial({
      color: source.material.color.toArray(),
      transparent: source.material.transparent,
      depthTest: source.material.depthTest,
      depthWrite: source.material.depthWrite,
      side: source.material.side,
    });
    copy = new Mesh(geometry, material);
  } else {
    copy = new Object3D();
  }
  copy.name = source.name;
  copyTransform(source, copy);
  for (const child of source.children) copy.add(cloneModelNode(child));
  return copy;
}
