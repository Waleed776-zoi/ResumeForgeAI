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
 * A model id that doesn't exist fails silently as a fallback: the chain just
 * walks past it, so a provider can appear "configured" while contributing
 * nothing. That has now happened twice — Gemini retired the 2.5 line, and
 * Groq replaced its Llama ids — so verifying ids is a command, not a habit:
 *
 *   npm run check:models
 *
 * Being listed is not proof of being callable — retired models still appear
 * in listings. The script sends a real request to each id in these chains.
 */

export type ModelTier = "fast" | "quality";

export interface ModelCandidate {
  provider: ProviderId;
  model: string;
  /** Shown to the user when this model produced the result. */
  label: string;
}

export const MODEL_CHAINS: Record<ModelTier, ModelCandidate[]> = {
  // Parsing and fact-checking: high-volume, quality-insensitive, and run
  // three times per generation.
  //
  // Groq leads here for two reasons. It measured ~0.7s against Gemini's
  // 1.4–4.7s on a realistic resume, and — more importantly — Gemini's free
  // tier is the SCARCE resource (20 requests on the quality model). Spending
  // the abundant provider on the cheap steps keeps the scarce one available
  // for the step where quality actually shows.
  fast: [
    { provider: "groq", model: "openai/gpt-oss-20b", label: "GPT-OSS 20B (Groq)" },
    { provider: "gemini", model: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
    { provider: "groq", model: "openai/gpt-oss-120b", label: "GPT-OSS 120B (Groq)" },
    { provider: "gemini", model: "gemini-flash-lite-latest", label: "Gemini Flash Lite" },
  ],

  // Tailoring and cover letter: the one step where output quality IS the
  // product. Gemini leads because the prompt is tuned against it; the
  // fallbacks are the strongest free models available.
  quality: [
    { provider: "gemini", model: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
    { provider: "gemini", model: "gemini-flash-latest", label: "Gemini Flash" },
    { provider: "groq", model: "openai/gpt-oss-120b", label: "GPT-OSS 120B (Groq)" },
    { provider: "gemini", model: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
  ],
};

/** Drops candidates whose provider has no API key configured. */
export function availableCandidates(tier: ModelTier): ModelCandidate[] {
  return MODEL_CHAINS[tier].filter((c) => PROVIDERS[c.provider].isConfigured());
}
