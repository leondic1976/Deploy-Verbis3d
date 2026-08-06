import type {
  ReconstructionMeshData,
  VisionAnalysis,
  VisionAnalyzeOptions,
  VisionCapability,
  VisionPhoto,
} from "./VisionTypes.js";

/**
 * Provider boundary for object recognition, segmentation and optional mesh generation.
 * Provider output is data only and is validated before the engine allocates geometry.
 */
export interface VisionAIProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ReadonlySet<VisionCapability>;
  analyze(photos: readonly VisionPhoto[], options?: VisionAnalyzeOptions): Promise<VisionAnalysis>;
  generateMesh?(
    photos: readonly VisionPhoto[],
    analysis: VisionAnalysis,
    options?: VisionAnalyzeOptions,
  ): Promise<ReconstructionMeshData>;
}

/** True when a provider advertises and implements direct mesh generation. */
export function isVisionMeshProvider(
  provider: VisionAIProvider,
): provider is VisionAIProvider & Required<Pick<VisionAIProvider, "generateMesh">> {
  return (
    provider.capabilities.has("mesh-generation") && typeof provider.generateMesh === "function"
  );
}
