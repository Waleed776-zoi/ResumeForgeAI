import {
  GeminiError,
  describeError,
  parseJsonResponse,
  backoffCeilingMs,
  outOfTime,
  budgetExhaustedError,
  shouldSwitchModel,
  retryAfterMs,
  MIN_CALL_MS,
} from "./gemini-response";
import { PROVIDERS } from "./providers";
import {
  availableCandidates,
  type ModelCandidate,
  type ModelTier,
} from "./model-chain";

export { GeminiError } from "./gemini-response";

interface GenerateJsonOptions {
  model: ModelTier;
  systemPrompt: string;
  userContent: string;
  /** Attempts against a single model before moving to the next candidate. */
  attemptsPerModel?: number;
  /** Epoch-ms wall clock by which this call must be finished. */
  deadline?: number;
  /** Called with the label of whichever model actually answered. */
  onModelUsed?: (label: string) => void;
}

/**
 * Calls a model and parses the response as JSON, walking a fallback chain.
 *
 * The rule that matters: **a rate limit or an overload is a reason to change
 * model, not to ask the same one again.** Free-tier quota is counted per
 * model, so retrying an exhausted model cannot succeed and spends more of the
 * allowance that just ran out. Those failures fall straight through to the
 * next candidate; only genuinely transient faults (5xx, dropped sockets,
 * truncated JSON) get a second attempt against the same model.
 *
 * Everything is bounded by `deadline` so a long chain can't outlive the
 * serverless function and die without reporting anything.
 */
export async function generateJson<T>({
  model: tier,
  systemPrompt,
  userContent,
  attemptsPerModel = 2,
  deadline,
  onModelUsed,
}: GenerateJsonOptions): Promise<T> {
  const candidates = availableCandidates(tier);

  if (candidates.length === 0) {
    throw new GeminiError(
      "This app isn't configured yet — no provider key is set. Add GEMINI_API_KEY (and optionally GROQ_API_KEY) to your environment, then restart.",
      false
    );
  }

  let lastError: GeminiError | undefined;

  for (const candidate of candidates) {
    const result = await tryCandidate<T>({
      candidate,
      systemPrompt,
      userContent,
      attempts: attemptsPerModel,
      deadline,
    });

    if (result.ok) {
      onModelUsed?.(candidate.label);
      return result.value;
    }

    lastError = result.error;

    // A configuration fault (bad key, retired model, malformed request) will
    // fail identically on every attempt but says nothing about the NEXT
    // candidate, so keep walking rather than aborting the whole chain.
    if (outOfTime(deadline, MIN_CALL_MS)) {
      throw lastError ?? budgetExhaustedError(1);
    }
  }

  throw (
    lastError ??
    new GeminiError(
      "Couldn't finish this step — every available option turned the request away. Please try again in a minute.",
      false
    )
  );
}

type Attempt<T> =
  | { ok: true; value: T }
  | { ok: false; error: GeminiError };

async function tryCandidate<T>({
  candidate,
  systemPrompt,
  userContent,
  attempts,
  deadline,
}: {
  candidate: ModelCandidate;
  systemPrompt: string;
  userContent: string;
  attempts: number;
  deadline?: number;
}): Promise<Attempt<T>> {
  const provider = PROVIDERS[candidate.provider];
  let lastError: GeminiError | undefined;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (outOfTime(deadline, MIN_CALL_MS)) {
      return { ok: false, error: lastError ?? budgetExhaustedError(attempt) };
    }

    try {
      const text = await provider.generate({
        model: candidate.model,
        systemPrompt,
        userContent,
      });
      return { ok: true, value: parseJsonResponse<T>(text) };
    } catch (err: unknown) {
      const described = describeError(err, attempt + 1);
      lastError = described;

      // Out of quota or overloaded — another attempt here is wasted, and on
      // a quota error it actively makes things worse.
      if (shouldSwitchModel(err)) return { ok: false, error: described };

      if (!described.retryable || attempt === attempts - 1) {
        return { ok: false, error: described };
      }

      // Honour an explicit Retry-After when the provider gave one; guessing
      // shorter just buys another refusal.
      const asked = retryAfterMs(err);
      const delay = asked ?? Math.random() * backoffCeilingMs(attempt);

      if (outOfTime(deadline, delay + MIN_CALL_MS)) {
        return { ok: false, error: described };
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    ok: false,
    error: lastError ?? new GeminiError("Model call failed.", true),
  };
}
