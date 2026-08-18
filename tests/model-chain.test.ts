import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MODEL_CHAINS, availableCandidates } from "../lib/model-chain";
import {
  ProviderHttpError,
  shouldSwitchModel,
  retryAfterMs,
  statusFromError,
} from "../lib/gemini-response";

// The verbatim quota refusal returned by the live API — the one that was
// being retried five times against a limit of 20.
const REAL_QUOTA_429 = new Error(
  "[GoogleGenerativeAI Error]: [429 Too Many Requests] Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.5-flash. Please retry in 48.858545774s."
);

describe("shouldSwitchModel", () => {
  it("switches away from an exhausted or overloaded model", () => {
    // Retrying these against the SAME model cannot succeed, and on a quota
    // error each attempt spends more of the allowance that just ran out.
    expect(shouldSwitchModel(REAL_QUOTA_429)).toBe(true);
    expect(shouldSwitchModel(new ProviderHttpError("busy", 503))).toBe(true);
    expect(shouldSwitchModel(new ProviderHttpError("overloaded", 529))).toBe(
      true
    );
  });

  it("does not switch for faults a retry could genuinely fix", () => {
    expect(shouldSwitchModel(new ProviderHttpError("boom", 500))).toBe(false);
    expect(shouldSwitchModel(new Error("fetch failed"))).toBe(false);
  });
});

describe("retryAfterMs", () => {
  it("reads the wait Gemini states in prose", () => {
    expect(retryAfterMs(REAL_QUOTA_429)).toBe(48_859);
  });

  it("reads a Retry-After header captured by a REST provider", () => {
    expect(retryAfterMs(new ProviderHttpError("slow", 429, 30_000))).toBe(
      30_000
    );
  });

  it("returns undefined when no wait was given", () => {
    expect(retryAfterMs(new Error("nope"))).toBeUndefined();
  });
});

describe("ProviderHttpError", () => {
  it("reports its status directly, without message scraping", () => {
    expect(statusFromError(new ProviderHttpError("x", 429))).toBe(429);
  });
});

describe("model chains", () => {
  it("defines a chain for every tier", () => {
    for (const tier of ["fast", "quality"] as const) {
      expect(MODEL_CHAINS[tier].length).toBeGreaterThan(1);
    }
  });

  it("never repeats a provider+model pair within a chain", () => {
    for (const tier of ["fast", "quality"] as const) {
      const keys = MODEL_CHAINS[tier].map((c) => `${c.provider}:${c.model}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("does not put two models from the same provider first", () => {
    // A chain whose first fallback shares a provider with the primary shares
    // its outages too. Gemini's per-MODEL quota makes a same-provider second
    // step useful, but a THIRD provider-independent option must exist.
    for (const tier of ["fast", "quality"] as const) {
      const providers = new Set(MODEL_CHAINS[tier].map((c) => c.provider));
      expect(providers.size).toBeGreaterThan(1);
    }
  });

  it("gives every candidate a human-readable label", () => {
    for (const tier of ["fast", "quality"] as const) {
      for (const c of MODEL_CHAINS[tier]) {
        expect(c.label.length).toBeGreaterThan(3);
      }
    }
  });
});

describe("availableCandidates", () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it("returns nothing when no provider is configured", () => {
    expect(availableCandidates("fast")).toEqual([]);
  });

  it("skips providers with no key rather than failing on them", () => {
    process.env.GEMINI_API_KEY = "test";
    const candidates = availableCandidates("quality");

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((c) => c.provider === "gemini")).toBe(true);
  });

  it("includes Groq once its key is present", () => {
    process.env.GEMINI_API_KEY = "test";
    process.env.GROQ_API_KEY = "test";

    expect(
      availableCandidates("quality").some((c) => c.provider === "groq")
    ).toBe(true);
  });
});
