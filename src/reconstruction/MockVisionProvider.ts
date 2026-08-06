import type { VisionAIProvider } from "./VisionAIProvider.js";
import type {
  VisionAnalysis,
  VisionAnalyzeOptions,
  VisionCapability,
  VisionPhoto,
} from "./VisionTypes.js";

/** Deterministic resolver used to test reconstruction without an external model or network. */
export type MockVisionResolver = (
  photos: readonly VisionPhoto[],
  options: VisionAnalyzeOptions,
) => VisionAnalysis | Promise<VisionAnalysis>;

/** Test provider whose output is supplied by the application. */
export class MockVisionProvider implements VisionAIProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ReadonlySet<VisionCapability>;

  constructor(
    private readonly resolver: MockVisionResolver,
    options: {
      readonly id?: string;
      readonly name?: string;
      readonly capabilities?: readonly VisionCapability[];
    } = {},
  ) {
    this.id = options.id ?? "mock-vision";
    this.name = options.name ?? "Mock vision";
    this.capabilities = new Set(options.capabilities ?? ["recognition", "segmentation"]);
  }

  /** Resolve deterministic application-supplied analysis data. */
  async analyze(
    photos: readonly VisionPhoto[],
    options: VisionAnalyzeOptions = {},
  ): Promise<VisionAnalysis> {
    options.signal?.throwIfAborted();
    return this.resolver(photos, options);
  }
}
