import { Mesh } from "../core/index.js";
import { BufferAttribute, Geometry } from "../geometry/index.js";
import { BasicMaterial } from "../materials/index.js";
import { isVisionMeshProvider, type VisionAIProvider } from "./VisionAIProvider.js";
import type {
  ReconstructionMeshData,
  ReconstructionProgress,
  VisionAnalysis,
  VisionAnalyzeOptions,
  VisionColor,
  VisionPhoto,
} from "./VisionTypes.js";
import {
  validateReconstructionMeshData,
  validateVisionAnalysis,
  validateVisionPhotos,
} from "./VisionValidation.js";
import { VisualHullReconstructor, type VisualHullOptions } from "./VisualHullReconstructor.js";

export interface PhotoReconstructionOptions extends VisionAnalyzeOptions, VisualHullOptions {
  readonly name?: string;
  readonly preferProviderMesh?: boolean;
  readonly onProgress?: (event: ReconstructionProgress) => void;
}

export interface PhotoReconstructionStats {
  readonly method: "visual-hull" | "provider-mesh";
  readonly sourcePhotoCount: number;
  readonly vertexCount: number;
  readonly triangleCount: number;
  readonly occupiedVoxelCount?: number;
  readonly resolution?: number;
}

export interface PhotoReconstructionResult {
  readonly mesh: Mesh;
  readonly analysis: VisionAnalysis;
  readonly providerId: string;
  readonly stats: PhotoReconstructionStats;
}

/**
 * Safe orchestration layer from untrusted photographs and AI data to engine-owned geometry.
 * It never executes provider text and enforces input, analysis and mesh resource limits.
 */
export class PhotoReconstructionPipeline {
  constructor(
    public readonly provider: VisionAIProvider,
    private readonly visualHull = new VisualHullReconstructor(),
  ) {}

  /** Analyze source photos and return one validated, renderable engine mesh. */
  async reconstruct(
    photos: readonly VisionPhoto[],
    options: PhotoReconstructionOptions = {},
  ): Promise<PhotoReconstructionResult> {
    emit(options, "validating", 0.05, "Validating photos and capture directions");
    validateVisionPhotos(photos);
    options.signal?.throwIfAborted();
    emit(options, "analyzing", 0.2, `Analyzing ${photos.length} photos with ${this.provider.name}`);
    const analysis = validateVisionAnalysis(
      await this.provider.analyze(photos, providerOptions(options)),
      photos,
    );
    options.signal?.throwIfAborted();
    emit(options, "reconstructing", 0.62, "Building validated 3D geometry");

    let geometry: Geometry;
    let color: VisionColor;
    let stats: PhotoReconstructionStats;
    if (options.preferProviderMesh !== false && isVisionMeshProvider(this.provider)) {
      const data = await this.provider.generateMesh(photos, analysis, providerOptions(options));
      validateReconstructionMeshData(data);
      geometry = geometryFromProvider(data);
      color = data.color ?? averageAnalysisColor(analysis);
      stats = {
        method: "provider-mesh",
        sourcePhotoCount: photos.length,
        vertexCount: geometry.vertexCount,
        triangleCount: data.indices.length / 3,
      };
    } else {
      const result = this.visualHull.reconstruct(analysis, {
        ...(options.resolution === undefined ? {} : { resolution: options.resolution }),
        ...(options.maximumTriangles === undefined
          ? {}
          : { maximumTriangles: options.maximumTriangles }),
      });
      geometry = result.geometry;
      color = result.color;
      stats = {
        method: "visual-hull",
        sourcePhotoCount: photos.length,
        vertexCount: geometry.vertexCount,
        triangleCount: result.triangleCount,
        occupiedVoxelCount: result.occupiedVoxelCount,
        resolution: result.resolution,
      };
    }

    const material = new BasicMaterial({ color });
    const mesh = new Mesh(geometry, material);
    mesh.name = safeName(options.name ?? analysis.label);
    mesh.userData["photoReconstruction"] = {
      providerId: this.provider.id,
      label: analysis.label,
      confidence: analysis.confidence,
      warnings: [...analysis.warnings],
      ...stats,
    };
    emit(options, "complete", 1, `Created ${stats.triangleCount} validated triangles`);
    return { mesh, analysis, providerId: this.provider.id, stats };
  }
}

function geometryFromProvider(data: ReconstructionMeshData): Geometry {
  const normals = data.normals ?? calculateVertexNormals(data.positions, data.indices);
  const geometry = new Geometry()
    .setAttribute("position", new BufferAttribute(data.positions.slice(), 3))
    .setAttribute("normal", new BufferAttribute(normals, 3))
    .setIndex(data.indices.slice());
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function calculateVertexNormals(
  positions: Float32Array,
  indices: Uint16Array | Uint32Array,
): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let offset = 0; offset < indices.length; offset += 3) {
    const a = (indices[offset] ?? 0) * 3;
    const b = (indices[offset + 1] ?? 0) * 3;
    const c = (indices[offset + 2] ?? 0) * 3;
    const abX = (positions[b] ?? 0) - (positions[a] ?? 0);
    const abY = (positions[b + 1] ?? 0) - (positions[a + 1] ?? 0);
    const abZ = (positions[b + 2] ?? 0) - (positions[a + 2] ?? 0);
    const acX = (positions[c] ?? 0) - (positions[a] ?? 0);
    const acY = (positions[c + 1] ?? 0) - (positions[a + 1] ?? 0);
    const acZ = (positions[c + 2] ?? 0) - (positions[a + 2] ?? 0);
    const normalX = abY * acZ - abZ * acY;
    const normalY = abZ * acX - abX * acZ;
    const normalZ = abX * acY - abY * acX;
    for (const vertex of [a, b, c]) {
      normals[vertex] = (normals[vertex] ?? 0) + normalX;
      normals[vertex + 1] = (normals[vertex + 1] ?? 0) + normalY;
      normals[vertex + 2] = (normals[vertex + 2] ?? 0) + normalZ;
    }
  }
  for (let offset = 0; offset < normals.length; offset += 3) {
    const length = Math.hypot(
      normals[offset] ?? 0,
      normals[offset + 1] ?? 0,
      normals[offset + 2] ?? 0,
    );
    if (length === 0) continue;
    normals[offset] = (normals[offset] ?? 0) / length;
    normals[offset + 1] = (normals[offset + 1] ?? 0) / length;
    normals[offset + 2] = (normals[offset + 2] ?? 0) / length;
  }
  return normals;
}

function averageAnalysisColor(analysis: VisionAnalysis): VisionColor {
  const total = analysis.views.reduce((sum, view) => sum + view.confidence, 0) || 1;
  const component = (index: number): number =>
    analysis.views.reduce(
      (sum, view) => sum + (view.foregroundColor[index] ?? 0) * view.confidence,
      0,
    ) / total;
  return [component(0), component(1), component(2), component(3)];
}

function providerOptions(options: PhotoReconstructionOptions): VisionAnalyzeOptions {
  return {
    ...(options.objectHint === undefined ? {} : { objectHint: options.objectHint }),
    ...(options.segmentationThreshold === undefined
      ? {}
      : { segmentationThreshold: options.segmentationThreshold }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  };
}

function emit(
  options: PhotoReconstructionOptions,
  stage: ReconstructionProgress["stage"],
  progress: number,
  message: string,
): void {
  options.onProgress?.({ stage, progress, message });
}

function safeName(value: string): string {
  const sanitized = value
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return sanitized || "reconstructed-object";
}
