import type { EngineCommand } from "../commands/index.js";
import type { AICommandContext, AIProvider } from "./AIProvider.js";
import { parseProviderJSON, systemPrompt } from "./ProviderUtilities.js";

export interface OpenAICompatibleProviderOptions {
  model: string;
  baseUrl: string;
  apiKey?: string;
  fetch?: typeof fetch;
}

/** Adapter for servers implementing the OpenAI-compatible chat-completions protocol. */
export class OpenAICompatibleProvider implements AIProvider {
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: OpenAICompatibleProviderOptions) {
    if (!options.model || !options.baseUrl) throw new Error("Model and base URL are required.");
    this.fetcher = options.fetch ?? fetch;
  }

  async parseCommand(input: string, _context: AICommandContext): Promise<EngineCommand[]> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.options.apiKey) headers["authorization"] = `Bearer ${this.options.apiKey}`;
    let response: Response;
    try {
      response = await this.fetcher(`${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.options.model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt() },
            { role: "user", content: input },
          ],
        }),
      });
    } catch (error) {
      throw new Error(`Compatible AI provider request failed at ${this.options.baseUrl}.`, {
        cause: error,
      });
    }
    if (!response.ok)
      throw new Error(`AI provider returned HTTP ${response.status}: ${await response.text()}`);
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI provider response did not include message content.");
    return parseProviderJSON(content);
  }
}
