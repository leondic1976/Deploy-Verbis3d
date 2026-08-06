import { ProceduralModel } from "./ProceduralModel.js";
import type { ModelColor } from "./ProceduralModel.js";

/** Common options accepted by registry-driven model templates. */
export interface ModelCreateOptions {
  /** Root object name. Templates use their documented default when omitted. */
  readonly name?: string;
  /** Template-specific color slots such as `body`, `skin` or `foliage`. */
  readonly colors?: Readonly<Record<string, ModelColor>>;
}

/** Metadata and construction contract for an extensible procedural model template. */
export interface ModelTemplate {
  /** Stable lowercase registry identifier. */
  readonly id: string;
  /** Human-readable purpose shown by editors and documentation tools. */
  readonly description: string;
  /** Creates a new model without sharing disposable geometry or material instances. */
  create(options?: ModelCreateOptions): ProceduralModel;
}

/** Read-only model-template metadata safe to expose in editors. */
export interface ModelTemplateInfo {
  readonly id: string;
  readonly description: string;
}

/**
 * Application-owned registry for built-in and custom procedural model templates.
 *
 * The registry has no global singleton, so tests, plugins and multiple engines can use
 * isolated catalogs with deterministic lifecycle.
 */
export class ModelFactory {
  private readonly templates = new Map<string, ModelTemplate>();

  /** Registers a template. Duplicate IDs are rejected instead of silently replaced. */
  register(template: ModelTemplate): this {
    assertTemplate(template);
    if (this.templates.has(template.id)) {
      throw new Error(`Model template '${template.id}' is already registered.`);
    }
    this.templates.set(
      template.id,
      Object.freeze({
        id: template.id,
        description: template.description,
        create: (options?: ModelCreateOptions) => template.create(options),
      }),
    );
    return this;
  }

  /** Removes a template and reports whether it existed. Existing models are unaffected. */
  unregister(templateId: string): boolean {
    return this.templates.delete(templateId);
  }

  /** Reports whether the catalog contains a template ID. */
  has(templateId: string): boolean {
    return this.templates.has(templateId);
  }

  /** Returns stable metadata sorted by template ID for editor presentation. */
  list(): readonly ModelTemplateInfo[] {
    return [...this.templates.values()]
      .map(({ id, description }) => ({ id, description }))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  /**
   * Creates a fresh model from a registered template.
   *
   * @throws Error when the requested template is unavailable.
   */
  create(templateId: string, options: ModelCreateOptions = {}): ProceduralModel {
    const template = this.templates.get(templateId);
    if (!template) {
      const available = this.list()
        .map(({ id }) => id)
        .join(", ");
      throw new Error(
        `Unknown model template '${templateId}'. Available templates: ${available || "none"}.`,
      );
    }
    const model = template.create(options);
    if (!(model instanceof ProceduralModel)) {
      throw new TypeError(`Model template '${templateId}' did not return a ProceduralModel.`);
    }
    if (model.templateId !== templateId) {
      throw new Error(
        `Model template '${templateId}' returned mismatched template ID '${model.templateId}'.`,
      );
    }
    return model;
  }
}

function assertTemplate(template: ModelTemplate): void {
  if (!/^[a-z][a-z0-9-]*$/.test(template.id)) {
    throw new Error("Model template IDs must use lowercase letters, digits and hyphens.");
  }
  if (template.description.trim().length === 0) {
    throw new Error(`Model template '${template.id}' requires a description.`);
  }
  if (typeof template.create !== "function") {
    throw new TypeError(`Model template '${template.id}' requires a create function.`);
  }
}
