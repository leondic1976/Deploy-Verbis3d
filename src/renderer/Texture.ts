/** Backend-neutral image texture descriptor. */
export class Texture {
  needsUpload = true;
  disposed = false;

  constructor(public readonly source: TexImageSource) {}

  dispose(): void {
    this.disposed = true;
    this.needsUpload = false;
  }
}
