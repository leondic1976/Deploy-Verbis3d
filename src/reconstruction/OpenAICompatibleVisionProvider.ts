import { parseRemoteVisionJSON, visionAnalysisPrompt } from "./RemoteVisionUtilities.js";
import type { VisionAIProvider } from "./VisionAIProvider.js";
import type { VisionAnalysis, VisionAnalyzeOptions, VisionPhoto } from "./VisionTypes.js";
import { validateVisionPhotos } from "./VisionValidation.js";

export interface OpenAICompatibleVisionProviderOptions {
  readonly model: string;
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly imageDetail?: "auto" | "low" | "high";
  readonly fetch?: typeof fetch;
}

/** Adapter for multimodal servers implementing OpenAI-compatible chat completions. */
export class OpenAICompatibleVisionProvider implements VisionAIProvider {
  readonly id = "openai-compatible-vision";
  readonly name = "OpenAI-compatible vision";
  readonly capabilities = new Set(["recognition", "segmentation"] as const);
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: OpenAICompatibleVisionProviderOptions) {
    if (!options.model.trim() || !options.baseUrl.trim()) {
      throw new TypeError("Compatible vision model and base URL are required.");
    }
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /** Send multimodal image content to a compatible endpoint and validate its analysis. */
  async analyze(
    photos: readonly VisionPhoto[],
    options: VisionAnalyzeOptions = {},
  ): Promise<VisionAnalysis> {
    validateVisionPhotos(photos);
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.options.apiKey) headers["authorization"] = `Bearer ${this.options.apiKey}`;
    const content: Array<Record<string, unknown>> = [
      { type: "text", text: visionAnalysisPrompt(photos, options.objectHint) },
    ];
    for (const photo of photos) {
      if (!photo.dataUrl?.startsWith("data:image/")) {
        throw new TypeError(
          `Compatible vision requires an image data URL for photo '${photo.id}'.`,
        );
      }
      content.push({
        type: "image_url",
        image_url: { url: photo.dataUrl, detail: this.options.imageDetail ?? "auto" },
      });
    }

    let response: Response;
    try {
      response = await this.fetcher(`${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.options.model,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content }],
        }),
        ...(options.signal ? { signal: options.signal } : {}),
      });
    } catch (error) {
      throw new Error(`Compatible vision provider request failed at ${this.options.baseUrl}.`, {
        cause: error,
      });
    }
    if (!response.ok) {
      throw new Error(
        `Compatible vision returned HTTP ${response.status}: ${await response.text()}`,
      );
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const responseContent = payload.choices?.[0]?.message?.content;
    if (!responseContent) throw new Error("Compatible vision response did not include content.");
    return parseRemoteVisionJSON(responseContent, photos);
  }
}
