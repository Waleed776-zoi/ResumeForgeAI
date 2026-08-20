/**
 * Verifies every model id in lib/model-chain.ts is actually callable.
 *
 * Written because this failure mode is invisible at runtime: a chain silently
 * walks past a model that doesn't exist, so a provider can look configured
 * and contribute nothing. It has already happened twice — Gemini retired the
 * 2.5 line, and Groq replaced its Llama ids with gpt-oss.
 *
 *   npm run check:models
 *
 * Sends one real, tiny request per id. Exits non-zero if any id is dead.
 */
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const CHAINS = readFileSync("lib/model-chain.ts", "utf8");
const candidates = [...CHAINS.matchAll(
  /provider:\s*"(gemini|groq)",\s*model:\s*"([^"]+)"/g
)].map(([, provider, model]) => ({ provider, model }));

const seen = new Set();
const unique = candidates.filter((c) => {
  const k = `${c.provider}:${c.model}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

async function checkGemini(model) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { skip: "GEMINI_API_KEY not set" };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Return JSON {\"ok\":true}" }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
  return { ok: res.ok, status: res.status, body: res.ok ? "" : await res.text() };
}

async function checkGroq(model) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { skip: "GROQ_API_KEY not set" };
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return ONLY valid JSON." },
        { role: "user", content: 'Return JSON {"ok":true}' },
      ],
    }),
  });
  return { ok: res.ok, status: res.status, body: res.ok ? "" : await res.text() };
}

let failed = 0;
console.log(`Checking ${unique.length} model ids from lib/model-chain.ts\n`);

for (const { provider, model } of unique) {
  const started = Date.now();
  let r;
  try {
    r = provider === "gemini" ? await checkGemini(model) : await checkGroq(model);
  } catch (err) {
    r = { ok: false, status: "network", body: String(err) };
  }
  const ms = Date.now() - started;

  if (r.skip) {
    console.log(`  SKIP  ${provider}/${model} — ${r.skip}`);
    continue;
  }
  if (r.ok) {
    console.log(`  OK    ${provider}/${model}  (${ms} ms)`);
  } else {
    failed++;
    let reason = "";
    try {
      reason = JSON.parse(r.body)?.error?.message ?? "";
    } catch {
      reason = r.body.slice(0, 120);
    }
    console.log(`  DEAD  ${provider}/${model}  [${r.status}] ${reason.slice(0, 110)}`);
  }
}

if (failed > 0) {
  console.log(`\n${failed} model id(s) unusable — update lib/model-chain.ts.`);
  process.exit(1);
}
console.log("\nAll model ids are callable.");
