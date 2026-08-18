import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  GeminiError,
  describeError,
  parseJsonResponse,
  backoffCeilingMs,
  outOfTime,
  budgetExhaustedError,
  MIN_CALL_MS,
} from "./gemini-response";

export { GeminiError } from "./gemini-response";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is not set. Add it to .env.local — get a free key at https://aistudio.google.com"
  );
}

const client = new GoogleGenerativeAI(apiKey);

// Model routing per the roadmap:
// - Flash-Lite for cheap/simple steps (parse, integrity check) — higher daily quota
// - Flash for quality-sensitive generation (tailoring, cover letter)
//
// These are pinned deliberately: the tailoring prompt is tuned against a
// specific model. The cost of pinning is that Google eventually retires a
// version and every call starts 404-ing with "no longer available to new
// users" (this is what happened to the original 2.5 pins). When that hits,
// list what your key can actually call and re-pin:
//
//   curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" \
//     | grep -o '"models/[^"]*"'
//
// Note that a model appearing in that list is not proof it's callable — the
// retired ones still show up. Send one real generateContent request to
// confirm before re-pinning. If you'd rather trade reproducibility for never
// being broken by a retirement, swap these for the floating aliases
// "gemini-flash-latest" and "gemini-flash-lite-latest".
export const MODELS = {
  fast: "gemini-3.5-flash-lite",
  quality: "gemini-3.5-flash",
} as const;

interface GenerateJsonOptions {
  model: keyof typeof MODELS;
  systemPrompt: string;
  userContent: string;
  maxRetries?: number;
  /**
   * Epoch-ms wall clock by which this call must be finished. Retries stop
   * early rather than running past it — see `outOfTime`.
   */
  deadline?: number;
}

/**
 * Calls Gemini and parses the response as JSON.
 *
 * Retries anything transient — rate limits, 5xx (including the 503 "high
 * demand" that Flash returns under load), dropped connections, and malformed
 * JSON — with exponential backoff plus jitter. The jitter matters because one
 * generation fires several calls; without it they back off in lockstep and
 * retry into the same busy moment together.
 */
export async function generateJson<T>({
  model,
  systemPrompt,
  userContent,
  maxRetries = 4,
  deadline,
}: GenerateJsonOptions): Promise<T> {
  const genModel = client.getGenerativeModel({
    model: MODELS[model],
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  let lastError: GeminiError | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Don't begin an attempt there isn't time to finish — being killed
    // mid-call loses the ability to report anything at all.
    if (outOfTime(deadline, MIN_CALL_MS)) {
      throw lastError ?? budgetExhaustedError(attempt);
    }

    try {
      const result = await genModel.generateContent(userContent);
      return parseJsonResponse<T>(result.response.text());
    } catch (err: unknown) {
      const described = describeError(err, attempt + 1);
      lastError = described;

      if (!described.retryable || attempt === maxRetries) {
        throw described;
      }

      const ceiling = backoffCeilingMs(attempt);
      const delay = Math.random() * ceiling;

      // Sleeping and then discovering there's no time left wastes the very
      // budget we're trying to protect.
      if (outOfTime(deadline, delay + MIN_CALL_MS)) {
        throw described;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new GeminiError("Gemini call failed.", false);
}
