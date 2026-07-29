import type { AttributeArray, Geometry } from "../geometry/index.js";
import type { WebGLResourceTracker } from "./WebGLResourceTracker.js";

export interface GeometryBinding {
  readonly vertexArray: WebGLVertexArrayObject;
  readonly count: number;
  readonly indexed: boolean;
  readonly indexType: number;
}

/** Uploads Geometry attributes and configures program-specific VAOs. */
export class WebGLBufferManager {
  private readonly bindings = new WeakMap<Geometry, Map<WebGLProgram, GeometryBinding>>();

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
    if (cached && geometry.uploaded) return cached;

    const vertexArray = this.gl.createVertexArray();
    if (!vertexArray) throw new Error("WebGL could not allocate a vertex array.");
    this.resources.trackVertexArray(vertexArray);
    this.gl.bindVertexArray(vertexArray);
    for (const [name, attribute] of geometry.attributes) {
      const shaderName = this.attributeName(name);
      const location = this.gl.getAttribLocation(program, shaderName);
      if (location < 0) continue;
      const buffer = this.gl.createBuffer();
      if (!buffer) throw new Error(`WebGL could not allocate the '${name}' vertex buffer.`);
      this.resources.trackBuffer(buffer);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, attribute.array, this.gl.STATIC_DRAW);
      this.gl.enableVertexAttribArray(location);
      this.gl.vertexAttribPointer(
        location,
        attribute.itemSize,
        this.attributeType(attribute.array),
        attribute.normalized,
        0,
        0,
      );
    }
    let count = geometry.vertexCount;
    let indexType: number = this.gl.UNSIGNED_SHORT;
    if (geometry.index) {
      const indexBuffer = this.gl.createBuffer();
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
    };
    byProgram.set(program, binding);
    geometry.markUploaded();
    return binding;
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
