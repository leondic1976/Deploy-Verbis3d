import type { VisionAnalysisEnhancer } from "./VisionAnalysisEnhancer.js";
import type {
  VisionAnalysis,
  VisionAnalyzeOptions,
  VisionMask,
  VisionPhoto,
} from "./VisionTypes.js";

export interface SilhouetteDepthEnhancerOptions {
  /** Maximum normalized relief assigned to silhouette edges. */
  readonly maximumRelief?: number;
  /** Preserve depth supplied by an earlier specialized model. */
  readonly preserveExisting?: boolean;
}

/**
 * Deterministic local depth proxy derived from distance-to-silhouette edges.
 * It is useful for rounded previews but is not a learned metric-depth estimator.
 */
export class SilhouetteDepthEnhancer implements VisionAnalysisEnhancer {
  readonly id = "silhouette-depth";
  readonly name = "Local silhouette depth";
  readonly capabilities = new Set(["depth-estimation"] as const);

  constructor(private readonly defaults: SilhouetteDepthEnhancerOptions = {}) {}

  enhance(
    _photos: readonly VisionPhoto[],
    analysis: VisionAnalysis,
    options: VisionAnalyzeOptions = {},
  ): Promise<VisionAnalysis> {
    options.signal?.throwIfAborted();
    const maximumRelief = this.defaults.maximumRelief ?? 0.28;
    if (!Number.isFinite(maximumRelief) || maximumRelief < 0.02 || maximumRelief > 0.75) {
      throw new RangeError("Silhouette maximumRelief must be in the 0.02..0.75 range.");
    }
    const preserveExisting = this.defaults.preserveExisting ?? true;
    const views = analysis.views.map((view) => ({
      ...view,
      depth:
        preserveExisting && view.depth
          ? view.depth.slice()
          : createSilhouetteDepth(view.mask, maximumRelief),
    }));
    return Promise.resolve({
      ...analysis,
      views,
      warnings: [
        ...analysis.warnings,
        "Depth refinement is silhouette-derived and does not represent measured metric depth.",
      ],
    });
  }
}

function createSilhouetteDepth(mask: VisionMask, maximumRelief: number): Float32Array {
  const length = mask.data.length;
  const distances = new Uint16Array(length);
  distances.fill(65_535);
  const queue = new Uint32Array(length);
  let head = 0;
  let tail = 0;

  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      const index = y * mask.width + x;
      const boundary = x === 0 || y === 0 || x === mask.width - 1 || y === mask.height - 1;
      if (mask.data[index] === 0 || boundary) {
        distances[index] = 0;
        queue[tail] = index;
        tail += 1;
      }
    }
  }

  while (head < tail) {
    const index = queue[head] ?? 0;
    head += 1;
    const x = index % mask.width;
    const y = Math.floor(index / mask.width);
    const distance = (distances[index] ?? 0) + 1;
    for (const neighbor of [
      x > 0 ? index - 1 : -1,
      x + 1 < mask.width ? index + 1 : -1,
      y > 0 ? index - mask.width : -1,
      y + 1 < mask.height ? index + mask.width : -1,
    ]) {
      if (neighbor < 0 || distance >= (distances[neighbor] ?? 0)) continue;
      distances[neighbor] = distance;
      queue[tail] = neighbor;
      tail += 1;
    }
  }

  let maximumDistance = 1;
  for (let index = 0; index < length; index += 1) {
    if (mask.data[index] !== 0) maximumDistance = Math.max(maximumDistance, distances[index] ?? 0);
  }
  const depth = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    if (mask.data[index] === 0) {
      depth[index] = 1;
      continue;
    }
    const normalizedDistance = Math.min(1, (distances[index] ?? 0) / maximumDistance);
    depth[index] = maximumRelief * (1 - normalizedDistance);
  }
  return depth;
}
