import {
  PhotoReconstructionPipeline,
  RuleBasedVisionProvider,
  Scene,
  SilhouetteDepthEnhancer,
  type VisionAIProvider,
  type VisionPhoto,
} from "../../src/index.js";

/**
 * Reconstruct a scene object from decoded photographs. In a browser, obtain `pixels` with
 * CanvasRenderingContext2D.getImageData and retain a data URL when using a remote provider.
 */
export async function reconstructObjectFromPhotos(
  photos: readonly VisionPhoto[],
  provider: VisionAIProvider = new RuleBasedVisionProvider(),
  signal?: AbortSignal,
): Promise<Scene> {
  const pipeline = new PhotoReconstructionPipeline(provider);
  const result = await pipeline.reconstruct(photos, {
    name: "captured-object",
    resolution: 24,
    enhancers: [new SilhouetteDepthEnhancer()],
    projectColors: true,
    ...(signal ? { signal } : {}),
    onProgress: ({ message, progress }) => {
      console.info(`${Math.round(progress * 100)}% ${message}`);
    },
  });

  const scene = new Scene();
  scene.add(result.mesh);
  return scene;
}
