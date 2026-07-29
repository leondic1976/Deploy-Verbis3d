/** Shared lifecycle contract for engine-owned resources. */
export interface Lifecycle {
  readonly disposed: boolean;
  dispose(): void;
}
