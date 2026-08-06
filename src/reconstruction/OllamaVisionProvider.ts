import {
  dataUrlBase64,
  parseRemoteVisionJSON,
  visionAnalysisPrompt,
} from "./RemoteVisionUtilities.js";
import type { VisionAIProvider } from "./VisionAIProvider.js";
import type { VisionAnalysis, VisionAnalyzeOptions, VisionPhoto } from "./VisionTypes.js";
import { validateVisionPhotos } from "./VisionValidation.js";

export interface OllamaVisionProviderOptions {
  readonly model: string;
  readonly baseUrl?: string;
  readonly fetch?: typeof fetch;
}

/** Multimodal Ollama adapter using image messages and a restricted JSON silhouette schema. */
export class OllamaVisionProvider implements VisionAIProvider {
  readonly id = "ollama-vision";
  readonly name = "Ollama vision";
  readonly capabilities = new Set(["recognition", "segmentation"] as const);
  private readonly fetcher: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly options: OllamaVisionProviderOptions) {
    if (!options.model.trim()) throw new TypeError("Ollama vision model is required.");
    this.baseUrl = (options.baseUrl ?? "http://127.0.0.1:11434").replace(/\/$/, "");
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /** Send image bytes to the configured Ollama model and parse restricted JSON analysis. */
  async analyze(
    photos: readonly VisionPhoto[],
    options: VisionAnalyzeOptions = {},
  ): Promise<VisionAnalysis> {
    validateVisionPhotos(photos);
    const images = photos.map(dataUrlBase64);
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: this.options.model,
          stream: false,
          format: "json",
          messages: [
            {
              role: "user",
              content: visionAnalysisPrompt(photos, options.objectHint),
              images,
            },
          ],
        }),
        ...(options.signal ? { signal: options.signal } : {}),
      });
    } catch (error) {
      throw new Error(
        `Ollama vision request failed at ${this.baseUrl}. Confirm the server, vision model and CORS settings.`,
        { cause: error },
      );
    }
    if (!response.ok) {
      throw new Error(`Ollama vision returned HTTP ${response.status}: ${await response.text()}`);
    }
    const payload = (await response.json()) as { message?: { content?: string } };
    const content = payload.message?.content;
    if (!content) throw new Error("Ollama vision response did not include message content.");
    return parseRemoteVisionJSON(content, photos);
  }
}
