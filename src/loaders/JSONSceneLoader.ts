import { Mesh } from "../core/Mesh.js";
import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { BoxGeometry, PlaneGeometry, SphereGeometry } from "../geometry/index.js";
import { BasicMaterial } from "../materials/index.js";
import { ProceduralModel } from "../models/index.js";
import { Asset } from "./Asset.js";
import { Loader } from "./Loader.js";

export interface SerializedObject {
  readonly type: string;
  readonly name: string;
  readonly position: readonly [number, number, number];
  readonly quaternion: readonly [number, number, number, number];
  readonly scale: readonly [number, number, number];
  readonly visible: boolean;
  readonly enabled: boolean;
  readonly userData: Record<string, unknown>;
  readonly geometry?: "box" | "plane" | "sphere";
  readonly color?: readonly [number, number, number, number];
  readonly children: readonly SerializedObject[];
}

export interface SerializedScene {
  readonly version: "1.0";
  readonly background: readonly [number, number, number, number];
  readonly root: SerializedObject;
}

/** Safe JSON scene serializer; it accepts data only and never evaluates scripts. */
export class JSONSceneLoader extends Loader<Scene> {
  override async load(url: string): Promise<Asset<Scene>> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Scene load failed (${response.status}) for ${url}.`);
    return new Asset(url, this.parse(await response.json()));
  }

  stringify(scene: Scene, space = 2): string {
    return JSON.stringify(this.serialize(scene), null, space);
  }

  serialize(scene: Scene): SerializedScene {
    return {
      version: "1.0",
      background: scene.background.toArray(),
      root: this.serializeObject(scene),
    };
  }

  parse(value: unknown): Scene {
    if (!this.isRecord(value) || value["version"] !== "1.0" || !this.isRecord(value["root"])) {
      throw new Error("Invalid Verbis3D scene JSON.");
    }
    const scene = new Scene();
    const background = value["background"];
    if (this.numberArray(background, 4)) {
      const [red = 0, green = 0, blue = 0, alpha = 1] = background;
      scene.background.set(red, green, blue, alpha);
    }
    const root = value["root"];
    const children = root["children"];
    if (!Array.isArray(children)) throw new Error("Scene root children must be an array.");
    for (const child of children) scene.add(this.parseObject(child));
    return scene;
  }

  private serializeObject(object: Object3D): SerializedObject {
    const serialized: SerializedObject = {
      type: object.type,
      name: object.name,
      position: [object.position.x, object.position.y, object.position.z],
      quaternion: [
        object.quaternion.x,
        object.quaternion.y,
        object.quaternion.z,
        object.quaternion.w,
      ],
      scale: [object.scale.x, object.scale.y, object.scale.z],
      visible: object.visible,
      enabled: object.enabled,
      userData: structuredClone(object.userData),
      children: object.children.map((child) => this.serializeObject(child)),
    };
    if (object instanceof Mesh) {
      const geometry =
        object.geometry instanceof BoxGeometry
          ? "box"
          : object.geometry instanceof PlaneGeometry
            ? "plane"
            : object.geometry instanceof SphereGeometry
              ? "sphere"
              : undefined;
      if (geometry) (serialized as { geometry?: string }).geometry = geometry;
      if (object.material instanceof BasicMaterial) {
        (serialized as { color?: readonly number[] }).color = object.material.color.toArray();
      }
    }
    return serialized;
  }

  private parseObject(value: unknown): Object3D {
    if (!this.isRecord(value)) throw new Error("Scene object must be an object.");
    const geometryName = value["geometry"];
    const geometry =
      geometryName === "box"
        ? new BoxGeometry()
        : geometryName === "plane"
          ? new PlaneGeometry()
          : geometryName === "sphere"
            ? new SphereGeometry()
            : null;
    const rawColor = value["color"];
    const color: [number, number, number, number] = this.numberArray(rawColor, 4)
      ? [rawColor[0]!, rawColor[1]!, rawColor[2]!, rawColor[3]!]
      : [1, 1, 1, 1];
    const name = typeof value["name"] === "string" ? value["name"] : "";
    const rawUserData = value["userData"];
    const userData = this.isRecord(rawUserData) ? structuredClone(rawUserData) : {};
    const template = userData["template"];
    const object = geometry
      ? new Mesh(geometry, new BasicMaterial({ color }))
      : value["type"] === "ProceduralModel" && typeof template === "string"
        ? new ProceduralModel(template, name)
        : new Object3D();
    object.name = name;
    const position = value["position"];
    if (this.numberArray(position, 3))
      object.position.set(position[0]!, position[1]!, position[2]!);
    const quaternion = value["quaternion"];
    if (this.numberArray(quaternion, 4)) {
      object.quaternion.set(quaternion[0]!, quaternion[1]!, quaternion[2]!, quaternion[3]!);
    }
    const scale = value["scale"];
    if (this.numberArray(scale, 3)) object.scale.set(scale[0]!, scale[1]!, scale[2]!);
    object.visible = typeof value["visible"] === "boolean" ? value["visible"] : true;
    object.enabled = typeof value["enabled"] === "boolean" ? value["enabled"] : true;
    object.userData = userData;
    if (!Array.isArray(value["children"]))
      throw new Error("Scene object children must be an array.");
    for (const child of value["children"]) object.add(this.parseObject(child));
    if (object instanceof ProceduralModel) object.refreshMetadata();
    return object;
  }

  private numberArray<TLength extends number>(
    value: unknown,
    length: TLength,
  ): value is number[] & { length: TLength } {
    return (
      Array.isArray(value) &&
      value.length === length &&
      value.every((item) => typeof item === "number")
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
