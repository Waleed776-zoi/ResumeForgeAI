/**
 * Pure response/error handling for the Gemini client.
 *
 * Kept apart from lib/gemini.ts deliberately: that module constructs an SDK
 * client and throws at import time when GEMINI_API_KEY is unset, which makes
 * it untestable. Nothing here touches the network or the environment, so the
 * retry and salvage rules — the parts that actually decide whether a user
 * sees a result or an error — can be unit tested.
 */

/** An error carrying a message fit to show a user, plus whether a retry could help. */
export class GeminiError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

// Transient on Google's side or the network — worth another attempt.
// Everything else (400 bad request, 401/403 bad key, 404 retired model) fails
// identically no matter how many times we ask.
const RETRYABLE_STATUSES = new Set([408, 409, 429, 500, 502, 503, 504]);

const NETWORK_ERROR_FRAGMENTS = [
  "fetch failed",
  "econnreset",
  "etimedout",
  "enotfound",
  "socket hang up",
  "network error",
  "terminated",
];

/**
 * An HTTP failure from any provider, with the status already extracted.
 *
 * Providers that speak plain REST (Groq) can report their status exactly;
 * only the Gemini SDK forces us to scrape it out of prose.
 */
export class ProviderHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = "ProviderHttpError";
  }
}

export function statusFromError(err: unknown): number | undefined {
  if (err instanceof ProviderHttpError) return err.status;
  if (!(err instanceof Error)) return undefined;
  // The SDK stringifies upstream failures as:
  //   [GoogleGenerativeAI Error]: Error fetching from <url>: [503 Service
  //   Unavailable] This model is currently experiencing high demand...
  const match = err.message.match(/\[(\d{3})\s/);
  return match ? Number(match[1]) : undefined;
}

/**
 * How long the provider asked us to wait, if it said.
 *
 * Gemini puts it in prose ("Please retry in 48.858545774s"); Groq returns a
 * Retry-After header, which the adapter converts before throwing. Honouring
 * it matters because guessing shorter just spends quota on a request that is
 * guaranteed to be refused.
 */
export function retryAfterMs(err: unknown): number | undefined {
  if (err instanceof ProviderHttpError && err.retryAfterMs !== undefined) {
    return err.retryAfterMs;
  }
  if (!(err instanceof Error)) return undefined;
  const match = err.message.match(/retry in ([\d.]+)s/i);
  return match ? Math.ceil(Number(match[1]) * 1000) : undefined;
}

/**
 * True when the failure means "this specific model is unavailable to you
 * right now" — quota exhausted or overloaded.
 *
 * These must NOT be retried against the same model. A 429 on a per-minute or
 * per-day quota cannot succeed by asking again sooner, and each attempt
 * spends more of the allowance. The correct response is to fall through to a
 * different model, whose limits are counted separately.
 */
export function shouldSwitchModel(err: unknown): boolean {
  const status = statusFromError(err);
  return status === 429 || status === 503 || status === 529;
}

export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return NETWORK_ERROR_FRAGMENTS.some((f) => message.includes(f));
}

/**
 * Turns an SDK error into something worth putting in front of a person. The
 * raw messages are a URL, a bracketed status and a paragraph of Google prose
 * — accurate, but not actionable.
 */
export function describeError(err: unknown, attempts: number): GeminiError {
  if (err instanceof GeminiError) return err;

  const status = statusFromError(err);
  const retryable =
    (status !== undefined && RETRYABLE_STATUSES.has(status)) ||
    isNetworkError(err);

  const tried = `Tried ${attempts} time${attempts === 1 ? "" : "s"}.`;

  if (status === 503) {
    return new GeminiError(
      `The model is under heavy load right now and turned the request away. ${tried} This usually clears within a minute — please try again.`,
      true,
      status
    );
  }

  if (status === 429) {
    return new GeminiError(
      `You've hit the free tier's rate limit. ${tried} Please wait about a minute before generating again.`,
      true,
      status
    );
  }

  if (status === 500 || status === 502 || status === 504) {
    return new GeminiError(
      `Gemini returned a server error (${status}). ${tried} This is on Google's side — try again shortly.`,
      true,
      status
    );
  }

  if (status === 400) {
    return new GeminiError(
      "Gemini rejected the request as malformed. If your resume is unusually long, try trimming it.",
      false,
      status
    );
  }

  if (status === 401 || status === 403) {
    return new GeminiError(
      "Your GEMINI_API_KEY was rejected. Check the value in .env.local and restart the dev server.",
      false,
      status
    );
  }

  if (status === 404) {
    return new GeminiError(
      "The configured Gemini model is unavailable to this API key. See the re-pinning note in lib/gemini.ts.",
      false,
      status
    );
  }

  if (isNetworkError(err)) {
    return new GeminiError(
      `Couldn't reach Gemini — the network request failed. ${tried} Check your connection and try again.`,
      true,
      status
    );
  }

  const detail = err instanceof Error ? err.message : "Unknown error";
  return new GeminiError(detail, retryable, status);
}

/**
 * Pulls JSON out of a model response.
 *
 * `responseMimeType: "application/json"` makes fenced output rare, but not
 * impossible — and a response truncated mid-object throws a bare "Unexpected
 * end of JSON input" that tells the user nothing. Salvage what we can, then
 * let the retry loop have another go.
 */
export function parseJsonResponse<T>(raw: string): T {
  const text = raw.trim();

  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const unfenced = fenced ? fenced[1].trim() : text;

  try {
    return JSON.parse(unfenced) as T;
  } catch {
    // Last resort: the model wrapped valid JSON in prose.
    const start = unfenced.search(/[{[]/);
    const end = Math.max(unfenced.lastIndexOf("}"), unfenced.lastIndexOf("]"));

    if (start !== -1 && end > start) {
      try {
        return JSON.parse(unfenced.slice(start, end + 1)) as T;
      } catch {
        // fall through to the retryable error below
      }
    }

    throw new GeminiError(
      "Gemini returned output that wasn't valid JSON — usually a response cut short mid-answer.",
      true // a re-roll genuinely tends to fix this
    );
  }
}

/** Full jitter: a random point in [0, 2^attempt * base], capped. */
export function backoffCeilingMs(attempt: number, base = 1000, cap = 12_000) {
  return Math.min(2 ** attempt * base, cap);
}

/**
 * A rough floor for how long one model call takes. Used to decide whether
 * there's enough time left to bother starting another attempt.
 */
export const MIN_CALL_MS = 4_000;

/**
 * True when `needMs` more work would run past the deadline.
 *
 * Retrying and timing out are both failures, but only one of them can
 * explain itself. Serverless platforms cap function duration; when the cap
 * hits, the process is killed mid-flight and any streaming response simply
 * stops — the client sees a closed connection and no reason. Checking the
 * budget *before* committing to another attempt buys back the chance to
 * report what happened.
 */
export function outOfTime(deadline: number | undefined, needMs: number) {
  return deadline !== undefined && Date.now() + needMs > deadline;
}

export function budgetExhaustedError(attempts: number): GeminiError {
  // "Tried 0 times" is a nonsense sentence to show a user. Zero attempts and
  // several failed attempts are different failures and deserve different
  // explanations.
  if (attempts === 0) {
    return new GeminiError(
      "This step ran out of time before it could start — the earlier steps used the whole request budget. Trying again usually works, since the models are rarely slow twice in a row.",
      false
    );
  }

  return new GeminiError(
    `The model didn't answer within the time this request allows. Tried ${attempts} time${attempts === 1 ? "" : "s"}. This usually means it's under load — waiting a minute and retrying is the fix.`,
    false
  );
}
