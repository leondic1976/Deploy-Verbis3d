import type {
  ReconstructionMeshData,
  VisionAnalysis,
  VisionAnalyzeOptions,
  VisionPhoto,
} from "./VisionTypes.js";

/**
 * Independent specialized mesh model that can consume analysis from another AI provider.
 * Output remains data-only and is validated before Geometry allocation.
 */
export interface VisionMeshGenerator {
  readonly id: string;
  readonly name: string;
  generateMesh(
    photos: readonly VisionPhoto[],
    analysis: VisionAnalysis,
    options?: VisionAnalyzeOptions,
  ): Promise<ReconstructionMeshData>;
}
