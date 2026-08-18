import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateResumeDocx } from "@/generators/exportDocx";
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

  // Unrecognised values fall back to the default rather than erroring — a
  // stale bookmark shouldn't break a download.
  const buffer = await generateResumeDocx(
    application.tailored_resume_json,
    resolveResumeMeta(application),
    req.nextUrl.searchParams.get("template") ?? undefined
  );

  // Node's Buffer isn't assignable to BodyInit under current TS lib types —
  // hand the Response a plain Uint8Array view instead.
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${exportFilename(
        application,
        "docx"
      )}"`,
    },
  });
}
