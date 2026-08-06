import type {
  VisionAnalysis,
  VisionAnalyzeOptions,
  VisionCapability,
  VisionPhoto,
} from "./VisionTypes.js";

/**
 * Composable analysis stage for combining segmentation, depth and pose models.
 * Enhancers receive validated data and must return a complete analysis for validation.
 */
export interface VisionAnalysisEnhancer {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ReadonlySet<VisionCapability>;
  enhance(
    photos: readonly VisionPhoto[],
    analysis: VisionAnalysis,
    options?: VisionAnalyzeOptions,
  ): Promise<VisionAnalysis>;
}
