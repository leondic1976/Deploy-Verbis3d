import type { VisionAIProvider } from "./VisionAIProvider.js";

/** Application-owned registry for swapping local, hosted and domain-specific vision providers. */
export class VisionProviderRegistry {
  private readonly providers = new Map<string, VisionAIProvider>();

  /** Register one provider; duplicate ids are rejected instead of overwritten. */
  register(provider: VisionAIProvider): this {
    const id = provider.id.trim();
    if (!id) throw new TypeError("Vision provider id is required.");
    if (this.providers.has(id)) throw new Error(`Vision provider '${id}' is already registered.`);
    this.providers.set(id, provider);
    return this;
  }

  /** Remove a provider from this registry without affecting any other application registry. */
  unregister(id: string): boolean {
    return this.providers.delete(id);
  }

  /** Return whether a provider id is registered. */
  has(id: string): boolean {
    return this.providers.has(id);
  }

  /** Look up a provider without throwing when it is absent. */
  get(id: string): VisionAIProvider | undefined {
    return this.providers.get(id);
  }

  /** Look up a provider and throw a descriptive error when it is absent. */
  require(id: string): VisionAIProvider {
    const provider = this.get(id);
    if (!provider) throw new Error(`Vision provider '${id}' is not registered.`);
    return provider;
  }

  /** Return a snapshot of providers in registration order. */
  list(): readonly VisionAIProvider[] {
    return [...this.providers.values()];
  }
}
