"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertTriangle } from "lucide-react";
import { GenerationProgress } from "@/components/GenerationProgress";
import type { GenerationEvent, StageId } from "@/lib/stages";

export function UploadForm() {
  const router = useRouter();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobPostingText, setJobPostingText] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [stage, setStage] = useState<StageId>("extracting");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!resumeFile || !jobPostingText.trim()) return;

    setStatus("submitting");
    setStage("extracting");
    setErrorMessage("");

    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("jobPostingText", jobPostingText);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      // Auth/validation failures are still ordinary status codes, sent
      // before the stream opens.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      if (!res.body) throw new Error("The server sent an empty response.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let navigated = false;

      // Newline-delimited JSON: one event per line, with the tail of a
      // partial line held back until the next chunk completes it.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;

          const event = JSON.parse(line) as GenerationEvent;

          if (event.type === "stage") {
            setStage(event.stage);
          } else if (event.type === "error") {
            throw new Error(event.error);
          } else if (event.type === "done") {
            navigated = true;
            router.push(`/results/${event.applicationId}`);
          }
        }
      }

      if (!navigated) {
        throw new Error(
          "The connection closed before your resume finished. Please try again."
        );
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
    }
  }

  if (status === "submitting") {
    return <GenerationProgress current={stage} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <label className="block text-sm font-medium text-ink mb-2">
          Your resume
        </label>
        <label
          htmlFor="resume-upload"
          className="flex items-center gap-3 border border-line rounded px-4 py-3 cursor-pointer hover:border-accent transition-colors bg-white"
        >
          <Upload size={18} className="text-accent" />
          <span className="text-sm text-ink-soft">
            {resumeFile ? resumeFile.name : "Choose a PDF or DOCX file"}
          </span>
        </label>
        <input
          id="resume-upload"
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
          required
        />
      </div>

      <div>
        <label
          htmlFor="job-posting"
          className="block text-sm font-medium text-ink mb-2"
        >
          Job posting
        </label>
        <textarea
          id="job-posting"
          rows={10}
          value={jobPostingText}
          onChange={(e) => setJobPostingText(e.target.value)}
          placeholder="Paste the full job description here..."
          className="w-full border border-line rounded px-4 py-3 text-sm bg-white focus:border-accent outline-none"
          required
        />
      </div>

      {status === "error" && (
        <div className="border border-flag/40 bg-flag/5 rounded px-4 py-3 flex gap-3">
          <AlertTriangle size={18} className="text-flag shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-flag">{errorMessage}</p>
            <p className="text-ink-soft mt-1">
              Your resume and job posting are still filled in — press the
              button again to retry.
            </p>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent text-white px-6 py-3 rounded font-medium hover:bg-accent/90 disabled:opacity-60 transition-colors"
      >
        {status === "error" ? "Try again" : "Tailor my resume"}
      </button>
    </form>
  );
}
