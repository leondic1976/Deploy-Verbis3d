/** Tracks WebGL resources so renderer disposal is complete and deterministic. */
export class WebGLResourceTracker {
  private readonly buffers = new Set<WebGLBuffer>();
  private readonly vertexArrays = new Set<WebGLVertexArrayObject>();
  private readonly programs = new Set<WebGLProgram>();
  private readonly textures = new Set<WebGLTexture>();

  constructor(private readonly gl: WebGL2RenderingContext) {}

  trackBuffer(resource: WebGLBuffer): WebGLBuffer {
    this.buffers.add(resource);
    return resource;
  }

  trackVertexArray(resource: WebGLVertexArrayObject): WebGLVertexArrayObject {
    this.vertexArrays.add(resource);
    return resource;
  }

  trackProgram(resource: WebGLProgram): WebGLProgram {
    this.programs.add(resource);
    return resource;
  }

  trackTexture(resource: WebGLTexture): WebGLTexture {
    this.textures.add(resource);
    return resource;
  }

  dispose(): void {
    for (const resource of this.buffers) this.gl.deleteBuffer(resource);
    for (const resource of this.vertexArrays) this.gl.deleteVertexArray(resource);
    for (const resource of this.programs) this.gl.deleteProgram(resource);
    for (const resource of this.textures) this.gl.deleteTexture(resource);
    this.buffers.clear();
    this.vertexArrays.clear();
    this.programs.clear();
    this.textures.clear();
  }
}
