import { createUUID } from "../core/UUID.js";

/** Loaded resource plus source metadata. */
export class Asset<TValue> {
  readonly id = createUUID();

  constructor(
    public readonly url: string,
    public readonly value: TValue,
  ) {}
}
