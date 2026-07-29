import type { Asset } from "./Asset.js";
import type { Loader } from "./Loader.js";

/** Deduplicates concurrent and repeated loads by URL. */
export class AssetManager {
  private readonly cache = new Map<string, Promise<Asset<unknown>>>();

  load<TValue>(url: string, loader: Loader<TValue>): Promise<Asset<TValue>> {
    const existing = this.cache.get(url);
    if (existing) return existing as Promise<Asset<TValue>>;
    const pending = loader.load(url).catch((error: unknown) => {
      this.cache.delete(url);
      throw error;
    });
    this.cache.set(url, pending);
    return pending;
  }

  has(url: string): boolean {
    return this.cache.has(url);
  }

  delete(url: string): boolean {
    return this.cache.delete(url);
  }

  clear(): void {
    this.cache.clear();
  }
}
