import { Box3, Vector3 } from "../math/index.js";
import type { Sphere } from "../math/index.js";
import type { AttributeArray, BufferAttribute } from "./BufferAttribute.js";
import { IndexBuffer } from "./IndexBuffer.js";

/** CPU-side mesh geometry and its derived bounding volumes. */
export class Geometry {
  readonly attributes = new Map<string, BufferAttribute<AttributeArray>>();
  index: IndexBuffer | null = null;
  boundingBox: Box3 | null = null;
  boundingSphere: Sphere | null = null;
  uploaded = false;
  disposed = false;

  setAttribute<TArray extends AttributeArray>(
    name: string,
    attribute: BufferAttribute<TArray>,
  ): this {
    this.assertUsable();
    this.attributes.set(name, attribute);
    this.uploaded = false;
    return this;
  }

  getAttribute<TArray extends AttributeArray = Float32Array>(
    name: string,
  ): BufferAttribute<TArray> | undefined {
    return this.attributes.get(name) as BufferAttribute<TArray> | undefined;
  }

  setIndex(index: IndexBuffer | Uint16Array | Uint32Array | readonly number[]): this {
    this.assertUsable();
    if (index instanceof IndexBuffer) this.index = index;
    else if (index instanceof Uint16Array || index instanceof Uint32Array) {
      this.index = new IndexBuffer(index);
    } else {
      const values = Array.from(index);
      const maximum = values.length === 0 ? 0 : Math.max(...values);
      this.index = new IndexBuffer(
        maximum > 65_535 ? new Uint32Array(values) : new Uint16Array(values),
      );
    }
    this.uploaded = false;
    return this;
  }

  get vertexCount(): number {
    return this.getAttribute("position")?.count ?? 0;
  }

  computeBoundingBox(): Box3 {
    const positions = this.requirePositions();
    const box = new Box3();
    for (let index = 0; index < positions.array.length; index += positions.itemSize) {
      box.expandByPoint(
        new Vector3(
          positions.array[index] ?? 0,
          positions.array[index + 1] ?? 0,
          positions.array[index + 2] ?? 0,
        ),
      );
    }
    this.boundingBox = box;
    return box;
  }

  computeBoundingSphere(): Sphere {
    const box = this.boundingBox ?? this.computeBoundingBox();
    this.boundingSphere = box.getBoundingSphere();
    return this.boundingSphere;
  }

  markUploaded(): void {
    this.uploaded = true;
    for (const attribute of this.attributes.values()) attribute.needsUpload = false;
    if (this.index) this.index.needsUpload = false;
  }

  dispose(): void {
    if (this.disposed) return;
    for (const attribute of this.attributes.values()) attribute.dispose();
    this.index?.dispose();
    this.attributes.clear();
    this.index = null;
    this.uploaded = false;
    this.disposed = true;
  }

  private requirePositions(): BufferAttribute<AttributeArray> {
    const positions = this.getAttribute("position");
    if (!positions || positions.itemSize < 3) {
      throw new Error("Geometry requires a position attribute with at least three components.");
    }
    return positions;
  }

  private assertUsable(): void {
    if (this.disposed) throw new Error("Geometry has been disposed.");
  }
}
