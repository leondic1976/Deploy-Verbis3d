export type AttributeArray = Float32Array | Uint8Array | Uint16Array | Uint32Array;

/** Typed vertex attribute with explicit component width and upload state. */
export class BufferAttribute<TArray extends AttributeArray = Float32Array> {
  needsUpload = true;
  disposed = false;

  constructor(
    public readonly array: TArray,
    public readonly itemSize: number,
    public readonly normalized = false,
  ) {
    if (!Number.isInteger(itemSize) || itemSize <= 0) {
      throw new RangeError("BufferAttribute itemSize must be a positive integer.");
    }
    if (array.length % itemSize !== 0) {
      throw new RangeError("BufferAttribute array length must be divisible by itemSize.");
    }
  }

  get count(): number {
    return this.array.length / this.itemSize;
  }

  markUpdated(): this {
    this.needsUpload = true;
    return this;
  }

  dispose(): void {
    this.disposed = true;
    this.needsUpload = false;
  }
}
