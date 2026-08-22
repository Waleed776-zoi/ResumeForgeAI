import { describe, it, expect } from "vitest";
import {
  GeminiError,
  describeError,
  parseJsonResponse,
  statusFromError,
  backoffCeilingMs,
  outOfTime,
  budgetExhaustedError,
  MIN_CALL_MS,
} from "../lib/gemini-response";

// The literal string the SDK produced in production, kept verbatim — the
// status is parsed out of prose, so a format change must fail loudly here.
const REAL_503 = new Error(
  "[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent: [503 Service Unavailable] This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."
);

describe("statusFromError", () => {
  it("extracts the status out of the SDK's message format", () => {
    expect(statusFromError(REAL_503)).toBe(503);
    expect(statusFromError(new Error("[429 Too Many Requests] slow down"))).toBe(
      429
    );
  });

  it("returns undefined when there's no status to find", () => {
    expect(statusFromError(new Error("something else"))).toBeUndefined();
    expect(statusFromError("not an error")).toBeUndefined();
  });
});

describe("describeError", () => {
  it("marks overload and rate limits as retryable", () => {
    // Regression: only 429 used to retry, so a 503 failed on the first try.
    expect(describeError(REAL_503, 1).retryable).toBe(true);
    expect(describeError(new Error("[429 Too Many]"), 1).retryable).toBe(true);
    expect(describeError(new Error("[500 Internal]"), 1).retryable).toBe(true);
    expect(describeError(new Error("[502 Bad Gateway]"), 1).retryable).toBe(
      true
    );
    expect(describeError(new Error("fetch failed"), 1).retryable).toBe(true);
  });

  it("does not retry errors that will never succeed", () => {
    expect(describeError(new Error("[400 Bad Request]"), 1).retryable).toBe(
      false
    );
    expect(describeError(new Error("[403 Forbidden]"), 1).retryable).toBe(false);
    expect(describeError(new Error("[404 Not Found]"), 1).retryable).toBe(false);
  });

  it("replaces SDK prose with an actionable sentence", () => {
    const described = describeError(REAL_503, 5);
    expect(described.message).not.toContain("generativelanguage.googleapis.com");
    expect(described.message).toContain("heavy load");
    // Says that retrying already happened, without reciting a counter.
    expect(described.message).toContain("already retried");
  });

  it("keeps vendor names out of what a reader is shown", () => {
    // These reach someone who wants their resume, not a status page. The
    // config errors below are the deliberate exception.
    for (const attempts of [1, 4]) {
      for (const err of [REAL_503, new Error("[429 Too Many Requests]"),
                         new Error("[500 Internal Server Error]"),
                         new Error("[400 Bad Request]"),
                         new Error("fetch failed")]) {
        const message = describeError(err, attempts).message;
        expect(message).not.toMatch(/gemini|groq|google/i);
      }
    }
  });

  it("still names the variable an operator has to go and fix", () => {
    // A key problem is only ever fixable by whoever deployed this, and for
    // them the machinery IS the actionable content.
    expect(describeError(new Error("[403 Forbidden]"), 1).message).toContain(
      "GEMINI_API_KEY"
    );
  });

  it("does not leave double spaces when there was only one attempt", () => {
    expect(describeError(REAL_503, 1).message).not.toMatch(/ {2}/);
    expect(describeError(REAL_503, 1).message).not.toContain("already retried");
  });

  it("passes an already-described error straight through", () => {
    const original = new GeminiError("already friendly", false);
    expect(describeError(original, 3)).toBe(original);
  });
});

describe("parseJsonResponse", () => {
  it("parses ordinary JSON", () => {
    expect(parseJsonResponse('{"ok":true}')).toEqual({ ok: true });
  });

  it("survives markdown fences", () => {
    expect(parseJsonResponse('```json\n{"ok":true}\n```')).toEqual({
      ok: true,
    });
    expect(parseJsonResponse('```\n{"ok":true}\n```')).toEqual({ ok: true });
  });

  it("salvages JSON wrapped in commentary", () => {
    expect(
      parseJsonResponse('Here you go:\n{"skills":["python"]}\nHope that helps!')
    ).toEqual({ skills: ["python"] });
  });

  it("flags truncated output as retryable rather than crashing", () => {
    // A response cut off mid-object is the "bracket error" users hit; a
    // re-roll usually fixes it, so it must not be fatal.
    try {
      parseJsonResponse('{"summary":"half a sen');
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(GeminiError);
      expect((err as GeminiError).retryable).toBe(true);
    }
  });
});

describe("outOfTime", () => {
  it("is never true without a deadline", () => {
    expect(outOfTime(undefined, 999_999)).toBe(false);
  });

  it("is true only when the work would run past the deadline", () => {
    const in10s = Date.now() + 10_000;
    expect(outOfTime(in10s, 4_000)).toBe(false);
    expect(outOfTime(in10s, 30_000)).toBe(true);
  });

  it("stops a retry that couldn't finish, which is what a timeout can't do", () => {
    // Regression: four retries with backoff can outlive the whole serverless
    // function, and a killed function can't report anything — the client
    // just sees the connection drop. The budget check has to fire first.
    const almostUp = Date.now() + 500;
    expect(outOfTime(almostUp, MIN_CALL_MS)).toBe(true);
    expect(budgetExhaustedError(3).retryable).toBe(false);
    expect(budgetExhaustedError(3).message).toContain("already retried");
  });
});

describe("backoffCeilingMs", () => {
  it("grows exponentially and then caps", () => {
    expect(backoffCeilingMs(0)).toBe(1000);
    expect(backoffCeilingMs(1)).toBe(2000);
    expect(backoffCeilingMs(3)).toBe(8000);
    expect(backoffCeilingMs(10)).toBe(12_000);
  });
});
