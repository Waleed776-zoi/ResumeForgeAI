import { describe, it, expect } from "vitest";
import { coverLetterBlocks, blockLines } from "../generators/coverLetter";
import { exportFilename } from "../lib/export-meta";

describe("coverLetterBlocks", () => {
  const letter = [
    "Dear Hiring Manager,",
    "",
    "I am writing to apply for the Machine Learning Engineer role. Over the",
    "past three years I have built and deployed imaging systems in production.",
    "",
    "I would welcome the chance to discuss the role.",
    "",
    "Sincerely,",
    "Alex Mercer",
  ].join("\n");

  it("splits on blank lines, not on every newline", () => {
    const blocks = coverLetterBlocks(letter);
    expect(blocks).toHaveLength(4);
  });

  it("treats a hard-wrapped paragraph as one line of prose", () => {
    const [, body] = coverLetterBlocks(letter);
    expect(body.prose).toBe(true);
    // The model's soft wrapping is not intent — it must not survive into a
    // typeset document, where the measure is a different width entirely.
    expect(blockLines(body)).toHaveLength(1);
    expect(blockLines(body)[0]).toContain("role. Over the past three years");
  });

  it("keeps a sign-off stacked instead of justifying it", () => {
    const signoff = coverLetterBlocks(letter).at(-1)!;
    expect(signoff.prose).toBe(false);
    expect(blockLines(signoff)).toEqual(["Sincerely,", "Alex Mercer"]);
  });

  it("treats a lone salutation as a stacked line", () => {
    expect(coverLetterBlocks(letter)[0].prose).toBe(false);
  });

  it("survives an empty or whitespace-only letter", () => {
    expect(coverLetterBlocks("")).toEqual([]);
    expect(coverLetterBlocks("   \n\n  \n ")).toEqual([]);
  });

  it("normalises Windows line endings", () => {
    const blocks = coverLetterBlocks("First para.\r\n\r\nSecond para.");
    expect(blocks).toHaveLength(2);
    expect(blocks[1].lines[0]).toBe("Second para.");
  });

  it("does not mistake four long lines for a signature block", () => {
    const wrapped = Array.from(
      { length: 4 },
      () => "This line is comfortably longer than the sixty character bar."
    ).join("\n");
    expect(coverLetterBlocks(wrapped)[0].prose).toBe(true);
  });
});

describe("exportFilename", () => {
  const app = { company: "Halcyon Diagnostics", role: "ML Engineer" };

  it("names the two documents differently", () => {
    expect(exportFilename(app, "pdf")).toBe("resume-halcyon-diagnostics.pdf");
    expect(exportFilename(app, "docx", "cover-letter")).toBe(
      "cover-letter-halcyon-diagnostics.docx"
    );
  });

  it("falls back to the role when no company was stated", () => {
    expect(exportFilename({ company: null, role: "ML Engineer" }, "pdf")).toBe(
      "resume-ml-engineer.pdf"
    );
  });

  it("never produces a null in the filename", () => {
    // The bug this replaced shipped "resume-null.pdf" to real users.
    const bare = exportFilename({ company: null, role: null }, "pdf");
    expect(bare).toBe("resume.pdf");
    expect(bare).not.toContain("null");
    expect(exportFilename({}, "docx", "cover-letter")).toBe(
      "cover-letter.docx"
    );
  });
});
