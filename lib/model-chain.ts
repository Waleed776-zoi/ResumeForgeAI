import { PROVIDERS, type ProviderId } from "./providers";

/**
 * Model fallback chains.
 *
 * Ordered best-first. The runner tries each in turn and moves on the moment a
 * model says it can't serve you — quota exhausted, overloaded, or retired.
 *
 * The ordering principle is *independence*, not just quality. Every entry
 * should fail for a different reason than the one above it, because a chain
 * of near-identical models shares a fate:
 *
 *   1. a pinned Gemini model      — best known quality for these prompts
 *   2. a DIFFERENT Gemini model   — separate quota bucket, same provider
 *   3. Groq                       — separate provider entirely, separate outage
 *
 * Step 2 is worth more than it looks. Free-tier quota on Gemini is counted
 * per model, so when `gemini-3.5-flash` returns "limit: 20", the floating
 * `gemini-flash-latest` alias is still answering normally.
 *
 * To see what a key can actually call:
 *   curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
 *   curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"
 *
 * Being listed is not proof of being callable — retired models still appear.
 * Send one real request before promoting anything up a chain.
 */

export type ModelTier = "fast" | "quality";

export interface ModelCandidate {
  provider: ProviderId;
  model: string;
  /** Shown to the user when this model produced the result. */
  label: string;
}

export const MODEL_CHAINS: Record<ModelTier, ModelCandidate[]> = {
  // Parsing and fact-checking: cheap, high-volume, quality-insensitive.
  fast: [
    { provider: "gemini", model: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
    { provider: "groq", model: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Groq)" },
    { provider: "gemini", model: "gemini-flash-lite-latest", label: "Gemini Flash Lite" },
    { provider: "groq", model: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Groq)" },
  ],

  // Tailoring and cover letter: the one step where output quality is the
  // product, so the fallbacks are the strongest models available free.
  quality: [
    { provider: "gemini", model: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
    { provider: "gemini", model: "gemini-flash-latest", label: "Gemini Flash" },
    { provider: "groq", model: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Groq)" },
    { provider: "gemini", model: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
  ],
};

/** Drops candidates whose provider has no API key configured. */
export function availableCandidates(tier: ModelTier): ModelCandidate[] {
  return MODEL_CHAINS[tier].filter((c) => PROVIDERS[c.provider].isConfigured());
}
