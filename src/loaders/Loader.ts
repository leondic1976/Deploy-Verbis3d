import type { Asset } from "./Asset.js";

/** Asynchronous asset-loader contract. */
export abstract class Loader<TValue> {
  abstract load(url: string): Promise<Asset<TValue>>;
}
