import type { AttributeArray, Geometry } from "../geometry/index.js";
import type { WebGLResourceTracker } from "./WebGLResourceTracker.js";

export interface GeometryBinding {
  readonly vertexArray: WebGLVertexArrayObject;
  readonly count: number;
  readonly indexed: boolean;
  readonly indexType: number;
}

interface ManagedGeometryBinding extends GeometryBinding {
  version: number;
  readonly attributeBuffers: Map<string, ManagedAttributeBinding>;
  readonly indexBuffer: WebGLBuffer | null;
}

interface ManagedAttributeBinding {
  readonly buffer: WebGLBuffer;
  readonly itemSize: number;
  readonly normalized: boolean;
  readonly type: number;
}

/** Uploads Geometry attributes and configures program-specific VAOs. */
export class WebGLBufferManager {
  private readonly bindings = new WeakMap<Geometry, Map<WebGLProgram, ManagedGeometryBinding>>();

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly resources: WebGLResourceTracker,
  ) {}

  get(geometry: Geometry, program: WebGLProgram): GeometryBinding {
    let byProgram = this.bindings.get(geometry);
    if (!byProgram) {
      byProgram = new Map();
      this.bindings.set(geometry, byProgram);
    }
    const cached = byProgram.get(program);
    if (cached && cached.version === geometry.version) return cached;
    if (cached && this.canRefresh(cached, geometry, program)) {
      this.refresh(cached, geometry);
      return cached;
    }
    if (cached) {
      this.release(cached);
      byProgram.delete(program);
    }

    const vertexArray = this.gl.createVertexArray();
    if (!vertexArray) throw new Error("WebGL could not allocate a vertex array.");
    this.resources.trackVertexArray(vertexArray);
    this.gl.bindVertexArray(vertexArray);
    const attributeBuffers = new Map<string, ManagedAttributeBinding>();
    for (const [name, attribute] of geometry.attributes) {
      const shaderName = this.attributeName(name);
      const location = this.gl.getAttribLocation(program, shaderName);
      if (location < 0) continue;
      const buffer = this.gl.createBuffer();
      if (!buffer) throw new Error(`WebGL could not allocate the '${name}' vertex buffer.`);
      this.resources.trackBuffer(buffer);
      const type = this.attributeType(attribute.array);
      attributeBuffers.set(name, {
        buffer,
        itemSize: attribute.itemSize,
        normalized: attribute.normalized,
        type,
      });
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, attribute.array, this.gl.DYNAMIC_DRAW);
      this.gl.enableVertexAttribArray(location);
      this.gl.vertexAttribPointer(location, attribute.itemSize, type, attribute.normalized, 0, 0);
    }
    let count = geometry.vertexCount;
    let indexType: number = this.gl.UNSIGNED_SHORT;
    let indexBuffer: WebGLBuffer | null = null;
    if (geometry.index) {
      indexBuffer = this.gl.createBuffer();
      if (!indexBuffer) throw new Error("WebGL could not allocate the index buffer.");
      this.resources.trackBuffer(indexBuffer);
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, geometry.index.array, this.gl.STATIC_DRAW);
      count = geometry.index.count;
      indexType =
        geometry.index.array instanceof Uint32Array ? this.gl.UNSIGNED_INT : this.gl.UNSIGNED_SHORT;
    }
    this.gl.bindVertexArray(null);
    const binding = {
      vertexArray,
      count,
      indexed: geometry.index !== null,
      indexType,
      version: geometry.version,
      attributeBuffers,
      indexBuffer,
    };
    byProgram.set(program, binding);
    geometry.markUploaded();
    return binding;
  }

  private canRefresh(
    binding: ManagedGeometryBinding,
    geometry: Geometry,
    program: WebGLProgram,
  ): boolean {
    const expectedCount = geometry.index?.count ?? geometry.vertexCount;
    if (binding.count !== expectedCount || binding.indexed !== (geometry.index !== null)) {
      return false;
    }
    if (
      geometry.index &&
      binding.indexType !==
        (geometry.index.array instanceof Uint32Array
          ? this.gl.UNSIGNED_INT
          : this.gl.UNSIGNED_SHORT)
    ) {
      return false;
    }
    for (const [name, managed] of binding.attributeBuffers) {
      const attribute = geometry.attributes.get(name);
      if (
        !attribute ||
        attribute.itemSize !== managed.itemSize ||
        attribute.normalized !== managed.normalized ||
        this.attributeType(attribute.array) !== managed.type
      ) {
        return false;
      }
    }
    for (const [name] of geometry.attributes) {
      const isActive = this.gl.getAttribLocation(program, this.attributeName(name)) >= 0;
      if (isActive && !binding.attributeBuffers.has(name)) return false;
    }
    return true;
  }

  private refresh(binding: ManagedGeometryBinding, geometry: Geometry): void {
    this.gl.bindVertexArray(binding.vertexArray);
    for (const [name, managed] of binding.attributeBuffers) {
      const attribute = geometry.attributes.get(name);
      if (!attribute) continue;
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, managed.buffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, attribute.array, this.gl.DYNAMIC_DRAW);
    }
    if (binding.indexBuffer && geometry.index) {
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, binding.indexBuffer);
      this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, geometry.index.array, this.gl.DYNAMIC_DRAW);
    }
    this.gl.bindVertexArray(null);
    binding.version = geometry.version;
    geometry.markUploaded();
  }

  private release(binding: ManagedGeometryBinding): void {
    for (const managed of binding.attributeBuffers.values()) {
      this.resources.releaseBuffer(managed.buffer);
    }
    if (binding.indexBuffer) this.resources.releaseBuffer(binding.indexBuffer);
    this.resources.releaseVertexArray(binding.vertexArray);
  }

  private attributeName(name: string): string {
    return `a${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  }

  private attributeType(array: AttributeArray): number {
    if (array instanceof Float32Array) return this.gl.FLOAT;
    if (array instanceof Uint32Array) return this.gl.UNSIGNED_INT;
    if (array instanceof Uint16Array) return this.gl.UNSIGNED_SHORT;
    return this.gl.UNSIGNED_BYTE;
  }
}
