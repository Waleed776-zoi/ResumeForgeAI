/**
 * The pipeline's stages, in order.
 *
 * Shared by the API route (which emits ids as it goes) and the client
 * (which renders labels). Keeping one list means the progress display can
 * never claim a step the server didn't actually reach — this is real
 * progress reported by the work, not a timer pretending on its behalf.
 */
export const GENERATION_STAGES = [
  { id: "extracting", label: "Reading your resume file" },
  { id: "parsing", label: "Understanding your resume and the job posting" },
  { id: "comparing", label: "Comparing your skills against the role" },
  { id: "tailoring", label: "Tailoring your resume and cover letter" },
  { id: "verifying", label: "Fact-checking every claim against your original" },
  { id: "saving", label: "Saving your application" },
] as const;

export type StageId = (typeof GENERATION_STAGES)[number]["id"];

export type GenerationEvent =
  | { type: "stage"; stage: StageId }
  | { type: "done"; applicationId: string }
  | { type: "error"; error: string };

export function stageIndex(stage: StageId): number {
  return GENERATION_STAGES.findIndex((s) => s.id === stage);
}
