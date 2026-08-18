/**
 * Kept as a compatibility shim.
 *
 * Model selection is no longer Gemini-only — see lib/llm.ts for the runner
 * and lib/model-chain.ts for the fallback chains. Import from those directly
 * in new code.
 */
export { generateJson, GeminiError } from "./llm";
export { MODEL_CHAINS as MODELS } from "./model-chain";
