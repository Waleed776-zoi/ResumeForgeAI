import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateJson, GeminiError } from "@/lib/llm";
import { gapAnalysis } from "@/lib/gap-analysis";
import { extractText } from "@/parsers/docx";
import type { GenerationEvent, StageId } from "@/lib/stages";
import type {
  ResumeJson,
  JobJson,
  TailoredOutput,
  IntegrityCheckResult,
} from "@/lib/types";

// Three model calls plus a file parse. Vercel's default function timeout is
// far shorter than that — without this the deployed route dies mid-tailoring
// while working fine locally. Note this is capped by your Vercel plan; a
// value above the plan ceiling is silently clamped, not honoured.
export const maxDuration = 60;

/**
 * Wall-clock budget for the model calls, held below `maxDuration` so the
 * route can still write an error event and close the stream cleanly.
 *
 * This exists because retrying and timing out interact badly. Retry logic is
 * what makes transient 503s survivable, but four retries with backoff can
 * consume a whole function's lifetime on their own — and a killed function
 * can't explain itself. The client just sees the connection close. Budgeting
 * the time up front means we stop retrying while there's still room to say
 * why.
 */
const MODEL_BUDGET_MS = 45_000;
const HEARTBEAT_MS = 10_000;

// Prompts are loaded as plain strings — see /prompts/*.md for the
// full documented versions. Keeping the system-instruction text here
// as constants; edit the .md files first, then mirror changes here
// (a v1.1 improvement is loading these from disk at build time).

const PARSE_SYSTEM_PROMPT = `You are a precise document parser. Extract only what is explicitly present in the text — never guess or infer. Return ONLY valid JSON, no markdown fences, no commentary.`;

const TAILOR_SYSTEM_PROMPT = `You are tailoring a resume and writing a cover letter for a specific job application.

RULE 1 (non-negotiable): Never fabricate, invent, or exaggerate any experience, skill, qualification, credential, or accomplishment not explicitly present in the original resume. You may reorder, reweight, and reword existing true content — you may never add new claims.

Preserve all dates, job titles, and company names exactly. You may reword bullets to use job-posting terminology ONLY if the underlying fact is unchanged. If unsure whether something is true of the candidate, leave it out — under-claiming is always safer than over-claiming.

Return ONLY valid JSON, no markdown fences, no commentary, matching: { "summary": string, "experience": [{"title": string, "company": string, "dates": string, "bullets": string[]}], "skills": string[], "cover_letter": string }`;

const INTEGRITY_SYSTEM_PROMPT = `You are a strict fact-checker comparing an ORIGINAL resume against a TAILORED version plus cover letter. Flag anything in the tailored output not directly traceable to the original — new skills, new accomplishments, changed dates/titles/companies, or ungrounded cover letter claims. Do not flag reasonable rewording of true facts. Return ONLY valid JSON: { "passed": boolean, "flagged_items": string[], "notes": string }`;

/**
 * Anything reaching the client should be a sentence, not a stack trace.
 * GeminiError already carries a written-for-humans message; everything else
 * gets its raw text, which for Supabase and the parsers is already clear.
 */
function userFacingMessage(err: unknown): string {
  if (err instanceof GeminiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong while tailoring your resume.";
}

export async function POST(req: NextRequest) {
  // Auth and input validation happen before the stream opens, so genuine
  // request errors are still ordinary status codes the client can read
  // with res.json(). Once streaming starts the status is committed to 200
  // and failures have to travel as events instead.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData();
  const resumeFile = formData.get("resume") as File | null;
  const jobPostingText = formData.get("jobPostingText") as string | null;

  if (!resumeFile || !jobPostingText) {
    return NextResponse.json(
      { error: "Missing resume file or job posting text" },
      { status: 400 }
    );
  }

  // Drain the upload now — the request body isn't readable once we've
  // returned a streaming response.
  const buffer = Buffer.from(await resumeFile.arrayBuffer());
  const filename = resumeFile.name;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: GenerationEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      const stage = (id: StageId) => send({ type: "stage", stage: id });

      const deadline = Date.now() + MODEL_BUDGET_MS;
      const heartbeat = setInterval(() => send({ type: "ping" }), HEARTBEAT_MS);

      try {
        // --- Step 0: extract raw text from the uploaded file ---
        stage("extracting");
        const resumeRawText = await extractText(buffer, filename);

        // --- Call 1: parse both documents (Flash-Lite) ---
        // These two are independent, so they run concurrently — the tailoring
        // call below is what actually needs both results. Two round trips of
        // roughly equal length collapse into one.
        stage("parsing");
        const [resumeJson, jobJson] = await Promise.all([
          generateJson<ResumeJson>({
            model: "fast",
            systemPrompt: PARSE_SYSTEM_PROMPT,
            deadline,
            onModelUsed: (label) => send({ type: "model", label }),
            userContent: `Extract structured data from this resume. Return JSON matching: { "name": string, "contact": string, "summary": string, "skills": string[], "experience": [{"title": string, "company": string, "dates": string, "bullets": string[]}], "education": string[], "certifications": string[], "publications": string[] }

For "publications": one entry per cited work, copied VERBATIM as a single string — keep the author list, title, venue/journal, date and DOI exactly as written. Do not renumber, reformat, abbreviate, or summarise them. A citation is a factual record and must survive unchanged. Include only formal citations here; profile links (ORCID, ResearchGate, Google Scholar) belong in "contact". Return an empty array if the resume lists none.

<document>${resumeRawText}</document>`,
          }),
          generateJson<JobJson>({
            model: "fast",
            systemPrompt: PARSE_SYSTEM_PROMPT,
            deadline,
            onModelUsed: (label) => send({ type: "model", label }),
            userContent: `Extract structured data from this job posting. Return JSON matching: { "role": string, "company": string, "seniority": string, "required_skills": string[], "responsibilities": string[] }\n\n<document>${jobPostingText}</document>`,
          }),
        ]);

        // --- Deterministic step: gap analysis (NO AI, per roadmap decision) ---
        stage("comparing");
        const gapResult = gapAnalysis(
          resumeJson.skills,
          jobJson.required_skills
        );

        // --- Call 2: tailor resume + cover letter (Flash — quality tier) ---
        stage("tailoring");
        const tailored = await generateJson<TailoredOutput>({
          model: "quality",
          systemPrompt: TAILOR_SYSTEM_PROMPT,
          deadline,
          onModelUsed: (label) => send({ type: "model", label }),
          userContent: `Original resume:\n<resume_json>${JSON.stringify(
            resumeJson
          )}</resume_json>\n\nTarget job:\n<job_json>${JSON.stringify(
            jobJson
          )}</job_json>\n\nGap analysis (missing skills must NOT be claimed):\n<gap_analysis>${JSON.stringify(
            gapResult
          )}</gap_analysis>\n\nTailor the resume and write a cover letter for this role.`,
        });

        // --- Call 3: integrity check (Flash-Lite) ---
        //
        // Non-fatal on purpose. By this point the expensive work is done and
        // the tailored resume exists; throwing it away because the *checker*
        // was rate-limited would be the worst of both worlds — the user waits
        // 40 seconds and gets nothing. Instead the failure is recorded and
        // the application is saved UNVERIFIED, which the results page already
        // renders as "Review needed before you submit this". Failing this way
        // round is the safe direction: an unchecked resume is flagged, never
        // silently stamped as verified.
        stage("verifying");
        let integrity: IntegrityCheckResult;
        try {
          integrity = await generateJson<IntegrityCheckResult>({
            model: "fast",
            systemPrompt: INTEGRITY_SYSTEM_PROMPT,
            deadline,
            onModelUsed: (label) => send({ type: "model", label }),
            userContent: `Original:\n<original>${JSON.stringify(
              resumeJson
            )}</original>\n\nTailored:\n<tailored>${JSON.stringify(
              tailored
            )}</tailored>\n\nCheck for unsupported claims.`,
          });
        } catch (err: unknown) {
          integrity = {
            passed: false,
            flagged_items: [
              "The automated fact-check did not run, so nothing below has been verified against your original resume. Read it through yourself before sending it anywhere.",
            ],
            notes: `Integrity check failed: ${userFacingMessage(err)}`,
          };
        }

        // --- Deterministic step: explainability diff (NO AI) ---
        stage("saving");
        const originalSkillsSet = new Set(
          resumeJson.skills.map((s) => s.toLowerCase())
        );
        const addedKeywords = tailored.skills.filter(
          (s) => !originalSkillsSet.has(s.toLowerCase())
        );

        // Match roles by title+company rather than array index: the tailored
        // output is free to reorder or drop roles, so position means nothing.
        const originalBulletsByRole = new Map(
          resumeJson.experience.map((exp) => [
            `${exp.title}||${exp.company}`.toLowerCase(),
            new Set(exp.bullets ?? []),
          ])
        );

        const explainability = {
          addedKeywords, // should be empty/small if integrity check passed
          reorderedSections: true,
          bulletChanges: tailored.experience.reduce((count, exp) => {
            const originals = originalBulletsByRole.get(
              `${exp.title}||${exp.company}`.toLowerCase()
            );
            // No matching original role — every bullet under it is new.
            if (!originals) return count + exp.bullets.length;
            return count + exp.bullets.filter((b) => !originals.has(b)).length;
          }, 0),
        };

        // --- Save the parsed original resume ---
        // Exports read the candidate's name, contact, education and
        // certifications from here. The tailored JSON deliberately carries
        // none of those (the model must not be able to touch them), so
        // without this row every export falls back to a nameless stub.
        const { data: baseResume, error: baseResumeError } = await supabase
          .from("base_resumes")
          .insert({ user_id: user.id, resume_json: resumeJson })
          .select("id")
          .single();

        if (baseResumeError) throw new Error(baseResumeError.message);

        // --- Save to database ---
        const { data: application, error: insertError } = await supabase
          .from("applications")
          .insert({
            user_id: user.id,
            base_resume_id: baseResume.id,
            company: jobJson.company,
            role: jobJson.role,
            job_posting_text: jobPostingText,
            job_json: jobJson,
            gap_analysis: gapResult,
            tailored_resume_json: tailored,
            cover_letter: tailored.cover_letter,
            explainability,
            integrity_passed: integrity.passed,
            integrity_flagged_items: integrity.flagged_items ?? [],
            integrity_notes: integrity.notes ?? "",
          })
          .select("id")
          .single();

        if (insertError) throw new Error(insertError.message);

        send({ type: "done", applicationId: application.id });
      } catch (err: unknown) {
        send({ type: "error", error: userFacingMessage(err) });
      } finally {
        clearInterval(heartbeat);
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // Tells nginx-style proxies not to buffer, which would defeat the
      // whole point by delivering every stage at once at the end.
      "X-Accel-Buffering": "no",
    },
  });
}
