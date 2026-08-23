import { NextRequest, NextResponse } from "next/server";
import {
  generateResumeDocx,
  generateCoverLetterDocx,
} from "@/generators/exportDocx";
import { createClient } from "@/lib/supabase/server";
import { resolveResumeMeta, exportFilename } from "@/lib/export-meta";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: application, error } = await supabase
    .from("applications")
    .select("*, base_resumes(resume_json)")
    .eq("id", id)
    .single();

  if (error || !application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Anything other than the cover letter is the resume — an unrecognised
  // value falls back rather than erroring, like `template` below.
  const wantsLetter =
    req.nextUrl.searchParams.get("doc") === "cover-letter";
  const template = req.nextUrl.searchParams.get("template") ?? undefined;
  const meta = resolveResumeMeta(application);

  if (wantsLetter && !application.cover_letter?.trim()) {
    return NextResponse.json(
      { error: "This application has no cover letter to download." },
      { status: 404 }
    );
  }

  const buffer = wantsLetter
    ? await generateCoverLetterDocx(application.cover_letter, meta, template)
    : await generateResumeDocx(
        application.tailored_resume_json,
        meta,
        template
      );

  // Node's Buffer isn't assignable to BodyInit under current TS lib types —
  // hand the Response a plain Uint8Array view instead.
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${exportFilename(
        application,
        "docx",
        wantsLetter ? "cover-letter" : "resume"
      )}"`,
    },
  });
}
