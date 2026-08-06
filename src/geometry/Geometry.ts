import { Box3, Vector3 } from "../math/index.js";
import type { Sphere } from "../math/index.js";
import { BufferAttribute, type AttributeArray } from "./BufferAttribute.js";
import { IndexBuffer } from "./IndexBuffer.js";

/** CPU-side mesh geometry and its derived bounding volumes. */
export class Geometry {
  readonly attributes = new Map<string, BufferAttribute<AttributeArray>>();
  index: IndexBuffer | null = null;
  boundingBox: Box3 | null = null;
  boundingSphere: Sphere | null = null;
  uploaded = false;
  disposed = false;
  modified = false;
  version = 0;

  setAttribute<TArray extends AttributeArray>(
    name: string,
    attribute: BufferAttribute<TArray>,
  ): this {
    this.assertUsable();
    this.attributes.set(name, attribute);
    this.uploaded = false;
    this.version += 1;
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
    this.version += 1;
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

  /** Rebuilds smooth vertex normals from the current triangle positions and indices. */
  computeVertexNormals(): BufferAttribute<Float32Array> {
    this.assertUsable();
    const positions = this.requirePositions();
    const positionArray = positions.array;
    let normals = this.getAttribute<Float32Array>("normal");
    if (
      !normals ||
      !(normals.array instanceof Float32Array) ||
      normals.itemSize !== 3 ||
      normals.array.length !== positions.count * 3
    ) {
      normals = new BufferAttribute(new Float32Array(positions.count * 3), 3);
      this.setAttribute("normal", normals);
    } else {
      normals.array.fill(0);
    }
    const normalArray = normals.array;

    const accumulateTriangle = (a: number, b: number, c: number): void => {
      const ax = positionArray[a * positions.itemSize] ?? 0;
      const ay = positionArray[a * positions.itemSize + 1] ?? 0;
      const az = positionArray[a * positions.itemSize + 2] ?? 0;
      const abx = (positionArray[b * positions.itemSize] ?? 0) - ax;
      const aby = (positionArray[b * positions.itemSize + 1] ?? 0) - ay;
      const abz = (positionArray[b * positions.itemSize + 2] ?? 0) - az;
      const acx = (positionArray[c * positions.itemSize] ?? 0) - ax;
      const acy = (positionArray[c * positions.itemSize + 1] ?? 0) - ay;
      const acz = (positionArray[c * positions.itemSize + 2] ?? 0) - az;
      const nx = aby * acz - abz * acy;
      const ny = abz * acx - abx * acz;
      const nz = abx * acy - aby * acx;
      for (const vertex of [a, b, c]) {
        normalArray[vertex * 3] = (normalArray[vertex * 3] ?? 0) + nx;
        normalArray[vertex * 3 + 1] = (normalArray[vertex * 3 + 1] ?? 0) + ny;
        normalArray[vertex * 3 + 2] = (normalArray[vertex * 3 + 2] ?? 0) + nz;
      }
    };

    if (this.index) {
      if (this.index.count % 3 !== 0) {
        throw new Error("Indexed triangle geometry requires an index count divisible by three.");
      }
      for (let offset = 0; offset < this.index.count; offset += 3) {
        accumulateTriangle(
          this.index.array[offset] ?? 0,
          this.index.array[offset + 1] ?? 0,
          this.index.array[offset + 2] ?? 0,
        );
      }
    } else {
      if (positions.count % 3 !== 0) {
        throw new Error(
          "Non-indexed triangle geometry requires a vertex count divisible by three.",
        );
      }
      for (let vertex = 0; vertex < positions.count; vertex += 3) {
        accumulateTriangle(vertex, vertex + 1, vertex + 2);
      }
    }

    for (let offset = 0; offset < normalArray.length; offset += 3) {
      const x = normalArray[offset] ?? 0;
      const y = normalArray[offset + 1] ?? 0;
      const z = normalArray[offset + 2] ?? 0;
      const length = Math.hypot(x, y, z);
      if (length > Number.EPSILON) {
        normalArray[offset] = x / length;
        normalArray[offset + 1] = y / length;
        normalArray[offset + 2] = z / length;
      }
    }
    normals.markUpdated();
    this.uploaded = false;
    this.version += 1;
    return normals;
  }

  /** Marks changed attributes for GPU upload and invalidates geometry-derived bounds. */
  markUpdated(attributeNames?: Iterable<string>): this {
    this.assertUsable();
    if (attributeNames) {
      for (const name of attributeNames) this.attributes.get(name)?.markUpdated();
    } else {
      for (const attribute of this.attributes.values()) attribute.markUpdated();
    }
    this.uploaded = false;
    this.modified = true;
    this.version += 1;
    this.boundingBox = null;
    this.boundingSphere = null;
    return this;
  }

  /** Creates an independent copy of all CPU-side attributes, indices and bounds. */
  clone(): Geometry {
    this.assertUsable();
    const copy = new Geometry();
    for (const [name, attribute] of this.attributes) {
      copy.setAttribute(
        name,
        new BufferAttribute(
          attribute.array.slice() as AttributeArray,
          attribute.itemSize,
          attribute.normalized,
        ),
      );
    }
    if (this.index) copy.setIndex(this.index.array.slice());
    if (this.boundingBox) copy.boundingBox = this.boundingBox.clone();
    if (this.boundingSphere) copy.boundingSphere = this.boundingSphere.clone();
    copy.modified = this.modified;
    return copy;
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
    this.version += 1;
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
