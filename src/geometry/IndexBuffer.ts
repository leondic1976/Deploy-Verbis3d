import { BufferAttribute } from "./BufferAttribute.js";

/** Uint16/Uint32 triangle index attribute. */
export class IndexBuffer extends BufferAttribute<Uint16Array | Uint32Array> {
  constructor(array: Uint16Array | Uint32Array) {
    super(array, 1, false);
  }
}
