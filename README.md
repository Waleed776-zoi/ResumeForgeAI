# ResumeForge AI

Upload a resume + paste a job posting → get a tailored resume and cover
letter, with a deterministic (non-AI) skill gap analysis and an AI
integrity check that verifies nothing was fabricated.

**Full setup walkthrough:** see [`docs/SETUP_GUIDE.md`](./docs/SETUP_GUIDE.md) —
start there, not here, if this is your first time running the project.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth + Storage) — free tier
- Gemini API (2.5 Flash / Flash-Lite) — free tier
- `docx` + `pdf-lib` for exports
- Vitest for testing

## Architecture

```
Upload resume + job posting
        │
        ▼
[AI] Parse both → structured JSON        (Gemini Flash-Lite)
        │
        ▼
[CODE] Deterministic gap analysis         (lib/gap-analysis.ts — no AI)
        │
        ▼
[AI] Tailor resume + cover letter         (Gemini Flash)
        │
        ▼
[AI] Integrity check                      (Gemini Flash-Lite)
        │
        ▼
[CODE] Explainability diff                (no AI)
        │
        ▼
Editable preview → export PDF/DOCX → save to history
```

3 AI calls per session, 2 deterministic steps. See `docs/SETUP_GUIDE.md`
for why gap analysis is intentionally code, not AI.

## Quick start

```bash
npm install
cp .env.local.example .env.local   # then fill in your keys
npm run test                        # verify gap-analysis logic (no keys needed)
npm run dev                         # http://localhost:3000
```

## Project structure

```
app/              Next.js pages and API routes
components/       React components
lib/               Gemini client, Supabase clients, gap-analysis, types
parsers/          PDF/DOCX text extraction
generators/       DOCX/PDF export
prompts/          Documented prompt templates (source of truth)
database/         Supabase schema.sql
tests/            Vitest unit tests
docs/             Full setup guide
```
