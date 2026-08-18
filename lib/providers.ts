import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProviderHttpError } from "./gemini-response";

/**
 * Model providers.
 *
 * Each adapter takes a system prompt and a user message and returns raw text
 * that should be JSON. Nothing above this layer knows which company answered
 * — that's what lets the chain in lib/model-chain.ts fall through from one
 * provider to another when a free tier runs dry.
 *
 * A provider with no API key configured reports itself unconfigured and is
 * skipped silently, so adding a second provider is optional: the app runs on
 * Gemini alone exactly as before.
 */

export type ProviderId = "gemini" | "groq";

export interface Provider {
  id: ProviderId;
  label: string;
  isConfigured(): boolean;
  generate(opts: {
    model: string;
    systemPrompt: string;
    userContent: string;
  }): Promise<string>;
}

// --- Gemini -----------------------------------------------------------------

let geminiClient: GoogleGenerativeAI | null = null;
function gemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  geminiClient ??= new GoogleGenerativeAI(key);
  return geminiClient;
}

export const geminiProvider: Provider = {
  id: "gemini",
  label: "Google Gemini",
  isConfigured: () => Boolean(process.env.GEMINI_API_KEY),

  async generate({ model, systemPrompt, userContent }) {
    const genModel = gemini().getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await genModel.generateContent(userContent);
    return result.response.text();
  },
};

// --- Groq -------------------------------------------------------------------

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Groq speaks the OpenAI chat-completions shape, so this is a plain fetch —
 * no SDK, no new dependency, nothing to keep upgraded. It runs open models on
 * custom silicon, which makes it both free and considerably faster than
 * Gemini for this workload.
 */
export const groqProvider: Provider = {
  id: "groq",
  label: "Groq",
  isConfigured: () => Boolean(process.env.GROQ_API_KEY),

  async generate({ model, systemPrompt, userContent }) {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        // JSON mode requires the word "JSON" somewhere in the prompt; every
        // prompt in this app already ends with "Return ONLY valid JSON".
        response_format: { type: "json_object" },
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const header = response.headers.get("retry-after");
      throw new ProviderHttpError(
        `[${response.status} ${response.statusText}] ${body.slice(0, 300)}`,
        response.status,
        header ? Math.ceil(Number(header) * 1000) : undefined
      );
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const text = json.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("Groq returned a response with no message content.");
    }
    return text;
  },
};

export const PROVIDERS: Record<ProviderId, Provider> = {
  gemini: geminiProvider,
  groq: groqProvider,
};

export function configuredProviders(): Provider[] {
  return Object.values(PROVIDERS).filter((p) => p.isConfigured());
}
