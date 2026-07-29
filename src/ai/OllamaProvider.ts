import type { EngineCommand } from "../commands/index.js";
import type { AICommandContext, AIProvider } from "./AIProvider.js";
import { parseProviderJSON, systemPrompt } from "./ProviderUtilities.js";

export interface OllamaProviderOptions {
  model: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

/** Ollama chat adapter. It never executes returned text and exposes connection errors clearly. */
export class OllamaProvider implements AIProvider {
  private readonly fetcher: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly options: OllamaProviderOptions) {
    if (!options.model) throw new Error("Ollama model is required.");
    this.baseUrl = (options.baseUrl ?? "http://127.0.0.1:11434").replace(/\/$/, "");
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async parseCommand(input: string, context: AICommandContext): Promise<EngineCommand[]> {
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
            { role: "system", content: systemPrompt(context) },
            { role: "user", content: input },
          ],
        }),
      });
    } catch (error) {
      throw new Error(
        `Ollama request failed at ${this.baseUrl}. Confirm that Ollama is running and CORS allows this origin.`,
        { cause: error },
      );
    }
    if (!response.ok)
      throw new Error(`Ollama returned HTTP ${response.status}: ${await response.text()}`);
    const payload = (await response.json()) as { message?: { content?: string } };
    const content = payload.message?.content;
    if (!content) throw new Error("Ollama response did not include message content.");
    return parseProviderJSON(content);
  }
}
