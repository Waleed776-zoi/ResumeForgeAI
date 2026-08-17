# ResumeForge AI — Complete Setup Guide (VS Code)

This walks through everything from "empty VS Code window" to "working app
in your browser," in order. Follow it top to bottom the first time —
don't skip ahead.

---

## Part 1 — Prerequisites (do this once)

### 1.1 Install Node.js

You need Node.js 20 or later.

1. Go to [nodejs.org](https://nodejs.org) and download the **LTS** version.
2. Install it (default options are fine).
3. Verify it worked — open a terminal (see 1.3 below) and run:
   ```bash
   node --version
   npm --version
   ```
   You should see version numbers, not an error.

### 1.2 Install VS Code + recommended extensions

If you don't already have VS Code: [code.visualstudio.com](https://code.visualstudio.com).

Once installed, open VS Code and install these extensions (click the
Extensions icon in the left sidebar, search each name, click Install):

- **ESLint** (dbaeumer.vscode-eslint) — catches errors as you type
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss) — autocomplete for the styling in this project
- **Prettier** (esbenp.prettier-vscode) — auto-formats code on save (optional but recommended)

### 1.3 Open a terminal inside VS Code

You'll use this constantly. Open it with:
- **Windows/Linux:** `` Ctrl + ` `` (backtick, top-left key under Esc)
- **Mac:** `` Cmd + ` ``

Or via the menu: **Terminal → New Terminal**

Every command in this guide runs in this terminal, from inside the
project folder.

### 1.4 Install Git (if you don't have it)

Check first: `git --version` in the terminal. If it errors, install from
[git-scm.com](https://git-scm.com).

---

## Part 2 — Open the project in VS Code

1. Unzip the project folder you were given (`resumeforge-ai`) somewhere sensible, e.g. `Documents/Projects/`.
2. In VS Code: **File → Open Folder** → select `resumeforge-ai`.
3. You should see the folder structure in the left sidebar (`app/`, `components/`, `lib/`, etc.).
4. Open the integrated terminal (§1.3) — it should already be inside the project folder. Confirm with:
   ```bash
   pwd
   ```
   (On Windows, `cd` with no arguments.) It should show the `resumeforge-ai` path.

---

## Part 3 — Install dependencies

```bash
npm install
```

This will take a minute or two the first time — it's downloading
Next.js, React, Supabase's client library, the Gemini SDK, and everything
else in `package.json`. You'll see a `node_modules` folder appear (this
is normal, it's gitignored, don't touch it).

**If you see errors here:** they're almost always Node version issues.
Re-check `node --version` is 20+.

---

## Part 4 — Set up Supabase (free, no credit card)

### 4.1 Create a project

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign in with GitHub or email.
2. Click **New Project**.
3. Fill in:
   - **Name:** `resumeforge-ai` (or anything)
   - **Database Password:** generate one and **save it somewhere** — you likely won't need it for this project, but keep it safe.
   - **Region:** pick the one closest to you.
4. Click **Create new project**. Wait ~1-2 minutes while it provisions.

### 4.2 Run the database schema

1. In your Supabase project, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open `database/schema.sql` from this project in VS Code, copy its entire contents.
4. Paste into the Supabase SQL Editor, click **Run** (or `Ctrl+Enter`).
5. You should see "Success. No rows returned." Check **Table Editor** in the sidebar — you should now see `base_resumes` and `applications` tables.

### 4.3 Create the storage bucket

1. In Supabase, click **Storage** in the left sidebar.
2. Click **New bucket**.
3. Name it `resumes`, leave it **Private** (not public).
4. Click **Create bucket**.

### 4.4 Enable email authentication

This is on by default in Supabase, but confirm:
1. Click **Authentication** → **Providers** in the sidebar.
2. Confirm **Email** is enabled (it is by default).
3. For local development, magic links will work automatically — Supabase sends real emails even from a free project.

### 4.5 Get your API keys

1. Click **Project Settings** (gear icon) → **API**.
2. You'll need two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon / public key** (a long string starting with `eyJ...`)
3. Keep this tab open — you'll paste these in Part 6.

---

## Part 5 — Get your Gemini API key (free, no credit card)

1. Go to [aistudio.google.com](https://aistudio.google.com).
2. Sign in with a Google account.
3. Click **Get API key** (usually top-left or in a sidebar).
4. Click **Create API key** → select or create a Google Cloud project when prompted (this is just an organizational container, doesn't cost anything).
5. Copy the generated key — it's a long string.

**Important:** on the free tier, Google may use your prompts/responses to
improve their models. Don't paste anyone's sensitive personal data
through this while testing except your own — see the roadmap notes on
this.

---

## Part 6 — Configure environment variables

1. In VS Code, find `.env.local.example` in the file explorer.
2. Right-click it → **Copy**, then right-click the `resumeforge-ai` root folder → **Paste**, rename the copy to `.env.local`.
   (Or in the terminal: `cp .env.local.example .env.local` on Mac/Linux, `copy .env.local.example .env.local` on Windows.)
3. Open `.env.local` and fill in the three values:
   ```
   GEMINI_API_KEY=your_gemini_key_here
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_anon_key
   ```
4. Save the file (`Ctrl+S` / `Cmd+S`).

**This file is gitignored** — it will never be committed to GitHub, which is correct, since it contains your private keys.

---

## Part 7 — Verify the core logic works (no keys needed for this step)

Before touching the AI or database, confirm the deterministic gap-analysis
function — the piece we deliberately kept AI-free — actually works:

```bash
npm run test
```

You should see all tests passing (11 tests, all green checkmarks). This
step requires **no API keys at all** — it's pure logic, which is exactly
the point of having made it deterministic.

If this fails, something is wrong with the install (go back to Part 3)
before debugging anything else.

---

## Part 8 — Run the app locally

```bash
npm run dev
```

You should see output like:
```
▲ Next.js 15.x.x
- Local:  http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
You should see the ResumeForge upload page.

**Keep this terminal running** while you work — it's your live dev
server. To stop it, click into the terminal and press `Ctrl+C`.

---

## Part 9 — Test the full flow end-to-end

1. Go to `http://localhost:3000/login`, enter your email, click **Send magic link**.
2. Check your email, click the link — it'll redirect you back to the app, now signed in.
3. Go back to `http://localhost:3000`.
4. Upload a real resume (PDF or DOCX) and paste a real job posting.
5. Click **Tailor my resume**.
6. Watch the terminal in VS Code — you'll see request logs as the three Gemini calls happen in sequence (parse → tailor → integrity check).
7. You should land on a results page showing: the integrity badge, the gap analysis panel (instant, no AI delay — that's the deterministic step), the tailored resume, and the cover letter.
8. Try the **Download DOCX** and **Download PDF** buttons.

**If something fails here**, check the terminal output first — errors
from Gemini or Supabase will print there with a message, not just in the
browser.

---

## Part 10 — Common issues and fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| `GEMINI_API_KEY is not set` | `.env.local` missing or dev server started before you saved it | Confirm the file exists and restart `npm run dev` (env vars only load on startup) |
| `429` errors from Gemini | Hit the free-tier rate limit (RPM) | Wait a minute — the code already retries with backoff, but heavy testing in a short burst can still hit it |
| "Not authenticated" error on generate | Magic link session didn't take, or cookies blocked | Re-do the login flow; check you're not in an incognito/private window that blocks cookies |
| PDF upload fails to extract text | It's a scanned/image-only PDF | Use a DOCX version, or a text-based PDF — OCR is a v2 feature |
| Blank/white page | A React error — check the browser console (F12) and the VS Code terminal | The error message will point to the specific file |
| `npm install` fails | Node version too old, or a network/proxy issue | Re-check `node --version` is 20+ |

---

## Part 11 — Git and GitHub (so your work is saved and shareable)

```bash
git init
git add .
git commit -m "Initial commit: ResumeForge AI v1"
```

Then on [github.com](https://github.com):
1. Click **New repository**, name it `resumeforge-ai`, keep it **Private** initially (it's fine to make public later once you're comfortable with what's in it).
2. Don't initialize with a README (you already have one).
3. Copy the commands GitHub shows you under "…or push an existing repository," run them in your VS Code terminal.

Double-check `.env.local` is **not** in what you're about to push:
```bash
git status
```
You should NOT see `.env.local` listed — the `.gitignore` handles this
automatically. If you do see it listed, stop and fix `.gitignore` before
pushing.

---

## Part 12 — Deploy to Vercel (free)

1. Go to [vercel.com](https://vercel.com), sign in with GitHub.
2. Click **Add New → Project**, select your `resumeforge-ai` repo.
3. Vercel auto-detects Next.js — leave build settings as default.
4. Before deploying, click **Environment Variables** and add the same three from your `.env.local`:
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**. Wait ~1-2 minutes.
6. You'll get a live URL like `resumeforge-ai.vercel.app` — this is now a real, working, deployed app.

**One more Supabase step after deploying:** go back to Supabase →
**Authentication → URL Configuration**, and add your Vercel URL to the
**Redirect URLs** list, or magic-link login won't redirect correctly in
production.

---

## Part 13 — Your first week working on this

Suggested order, building on the 3-weekend plan from the roadmap:

1. **Day 1-2:** Get through Parts 1-9 above — a working local app.
2. **Day 3-4:** Test with 5-10 of your own real resume/job-posting pairs. Note where the tailoring output feels off — that's prompt-tuning work in `prompts/tailor_and_cover_letter.md` (remember to mirror any edits into `app/api/generate/route.ts`, since that's where the actual strings live for now).
3. **Day 5:** Add 3-5 more entries to `SKILL_ALIASES` in `lib/gap-analysis.ts` based on real mismatches you noticed — and write a test for each one you add.
4. **Day 6-7:** Deploy (Part 12), share the link with a friend, get feedback on the actual output quality — not just whether it runs.

## What's deliberately NOT built yet (see roadmap for the reasoning)

- ATS scoring
- Browser extension / job-URL scraping
- Multiple resume templates
- Billing/Stripe
- OCR for scanned PDFs

Don't build these until the core loop (upload → tailor → verify → export)
feels solid and you've used it yourself at least a dozen times.
