import { Mesh } from "../core/Mesh.js";
import { Object3D } from "../core/Object3D.js";
import type { Scene } from "../core/Scene.js";
import { BoxGeometry, PlaneGeometry, SphereGeometry } from "../geometry/index.js";
import { BasicMaterial } from "../materials/index.js";
import { createBuiltinModelFactory } from "../models/index.js";
import type { ModelFactory } from "../models/index.js";
import type { EngineCommand } from "./Command.js";
import type { CommandResult } from "./CommandResult.js";

export interface CommandExecutionContext {
  readonly scene: Scene;
  readonly allowDelete: boolean;
  selectedObject: Object3D | null;
}

/** Applies validated commands exclusively through public scene/object APIs. */
export class CommandHandler {
  constructor(public readonly modelFactory: ModelFactory = createBuiltinModelFactory()) {}

  execute(command: EngineCommand, context: CommandExecutionContext, dryRun = false): CommandResult {
    try {
      if (command.command === "createObject") return this.create(command, context, dryRun);
      const target = this.resolve(command, context.scene);
      if (!(target instanceof Object3D)) return { ...target, dryRun };
      if (dryRun)
        return { success: true, command: command.command, dryRun: true, targetId: target.id };
      switch (command.command) {
        case "deleteObject":
          if (!context.allowDelete)
            return this.error(command, "PERMISSION_DENIED", "Object deletion is disabled.");
          target.dispose();
          break;
        case "selectObject":
          context.selectedObject = target;
          break;
        case "moveObject":
          this.move(target, command.parameters);
          break;
        case "rotateObject":
          this.rotate(target, command.parameters);
          break;
        case "scaleObject":
          target.scale.set(
            this.number(command.parameters, "x", target.scale.x),
            this.number(command.parameters, "y", target.scale.y),
            this.number(command.parameters, "z", target.scale.z),
          );
          break;
        case "setColor":
          this.color(target, command.parameters);
          break;
        case "setVisible":
          target.visible = this.boolean(command.parameters, "visible");
          break;
        case "animateObject":
          target.userData["animation"] = structuredClone(command.parameters);
          break;
        case "groupObjects":
          this.group(target, command, context.scene);
          break;
        case "duplicateObject": {
          const duplicate = target.clone(true);
          const sourceName = target.name;
          const duplicateName = this.string(
            command.parameters,
            "name",
            `${sourceName || target.type} copy`,
          );
          duplicate.name = duplicateName;
          if (sourceName) {
            duplicate.traverse((object) => {
              if (object !== duplicate && object.name.startsWith(`${sourceName}-`)) {
                object.name = `${duplicateName}${object.name.slice(sourceName.length)}`;
              }
            });
          }
          (target.parent ?? context.scene).add(duplicate);
          return { success: true, command: command.command, dryRun: false, targetId: duplicate.id };
        }
        default:
          return this.error(command, "UNSUPPORTED_COMMAND", "Unsupported command.");
      }
      return { success: true, command: command.command, dryRun: false, targetId: target.id };
    } catch (error) {
      return this.error(
        command,
        "EXECUTION_FAILED",
        error instanceof Error ? error.message : "Unknown command execution failure.",
      );
    }
  }

  private create(
    command: EngineCommand,
    context: CommandExecutionContext,
    dryRun: boolean,
  ): CommandResult {
    if (dryRun) return { success: true, command: command.command, dryRun: true };
    const shape = this.string(command.parameters, "shape", "box");
    const name = this.string(command.parameters, "name", shape);
    const geometry =
      shape === "sphere"
        ? new SphereGeometry()
        : shape === "plane"
          ? new PlaneGeometry()
          : shape === "box"
            ? new BoxGeometry()
            : null;
    const object = geometry
      ? new Mesh(geometry, new BasicMaterial())
      : this.modelFactory.has(shape)
        ? this.modelFactory.create(shape, { name })
        : null;
    if (!object) return this.error(command, "INVALID_SCHEMA", `Unknown shape '${shape}'.`);
    object.name = name;
    context.scene.add(object);
    return { success: true, command: command.command, dryRun: false, targetId: object.id };
  }

  private resolve(command: EngineCommand, scene: Scene): Object3D | CommandResult {
    if (!command.target)
      return this.error(command, "INVALID_SCHEMA", "This command requires a target.");
    if (command.target.id !== undefined) {
      const target = scene.getObjectById(command.target.id);
      return (
        target ??
        this.error(command, "TARGET_NOT_FOUND", `Object id ${command.target.id} was not found.`)
      );
    }
    const name = command.target.name!;
    const targets = scene.getObjectsByName(name);
    if (targets.length === 0)
      return this.error(command, "TARGET_NOT_FOUND", `Object '${name}' was not found.`);
    if (targets.length > 1)
      return this.error(command, "AMBIGUOUS_TARGET", `Object name '${name}' is ambiguous.`);
    return targets[0]!;
  }

  private move(target: Object3D, parameters: Record<string, unknown>): void {
    const x = this.number(parameters, "x", 0);
    const y = this.number(parameters, "y", 0);
    const z = this.number(parameters, "z", 0);
    if (parameters["space"] === "local") {
      target.translateX(x).translateY(y).translateZ(z);
    } else target.position.set(target.position.x + x, target.position.y + y, target.position.z + z);
  }

  private rotate(target: Object3D, parameters: Record<string, unknown>): void {
    const factor = parameters["unit"] === "radians" ? 1 : Math.PI / 180;
    target
      .rotateX(this.number(parameters, "x", 0) * factor)
      .rotateY(this.number(parameters, "y", 0) * factor)
      .rotateZ(this.number(parameters, "z", 0) * factor);
  }

  private color(target: Object3D, parameters: Record<string, unknown>): void {
    const meshes: Mesh[] = [];
    target.traverse((object) => {
      if (object instanceof Mesh && object.material instanceof BasicMaterial) meshes.push(object);
    });
    if (meshes.length === 0) {
      throw new Error("Target does not use a color material.");
    }
    const value = parameters["color"];
    if (
      !Array.isArray(value) ||
      (value.length !== 3 && value.length !== 4) ||
      !value.every((item) => typeof item === "number")
    ) {
      throw new Error("Color must be an RGB or RGBA numeric array.");
    }
    const primaryMeshes = meshes.filter((mesh) => mesh.userData["colorRole"] === "primary");
    for (const mesh of primaryMeshes.length > 0 ? primaryMeshes : meshes) {
      (mesh.material as BasicMaterial).color.set(value[0]!, value[1]!, value[2]!, value[3] ?? 1);
    }
  }

  private group(target: Object3D, command: EngineCommand, scene: Scene): void {
    const names = command.parameters["names"];
    if (!Array.isArray(names) || !names.every((name) => typeof name === "string")) {
      throw new Error("groupObjects requires a string names array.");
    }
    const group = new Object3D();
    group.name = this.string(command.parameters, "name", "Group");
    scene.add(group);
    group.add(target);
    for (const name of names) {
      const candidate = scene.getObjectByName(name);
      if (candidate && candidate !== group && candidate !== target) group.add(candidate);
    }
  }

  private number(parameters: Record<string, unknown>, key: string, fallback: number): number {
    const value = parameters[key];
    return typeof value === "number" ? value : fallback;
  }

  private boolean(parameters: Record<string, unknown>, key: string): boolean {
    const value = parameters[key];
    if (typeof value !== "boolean") throw new Error(`Parameter '${key}' must be boolean.`);
    return value;
  }

  private string(parameters: Record<string, unknown>, key: string, fallback: string): string {
    const value = parameters[key];
    if (value === undefined) return fallback;
    if (typeof value !== "string") throw new Error(`Parameter '${key}' must be a string.`);
    return value;
  }

  private error(
    command: EngineCommand,
    code: NonNullable<CommandResult["error"]>["code"],
    message: string,
  ): CommandResult {
    return { success: false, command: command.command, dryRun: false, error: { code, message } };
  }
}
