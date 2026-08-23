"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { GenerationProgress } from "@/components/GenerationProgress";
import type { GenerationEvent, StageId } from "@/lib/stages";

export function UploadForm() {
  const router = useRouter();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobPostingText, setJobPostingText] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [stage, setStage] = useState<StageId>("extracting");
  const [model, setModel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // FileUpload manages its own input, so the native `required` guard is
    // gone; this check is now the only thing preventing an empty submit.
    if (!resumeFile || !jobPostingText.trim()) return;

    setStatus("submitting");
    setStage("extracting");
    setModel("");
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

          if (event.type === "ping") {
            // Liveness only — proves the server is still working.
            continue;
          } else if (event.type === "model") {
            setModel(event.label);
          } else if (event.type === "stage") {
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
        // The stream ended without a result and without an error event,
        // which means the server was cut off rather than failing — almost
        // always the hosting platform's function time limit.
        throw new Error(
          "This run took too long and was cut off. That is almost always a slow response on our side rather than a problem with your resume — generating again usually works."
        );
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
    }
  }

  if (status === "submitting") {
    return <GenerationProgress current={stage} model={model} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <FileUpload onChange={(files) => setResumeFile(files[0] ?? null)} />

      <div>
        <label htmlFor="job-posting" className="eyebrow text-ink-soft mb-2.5 block">
          Job posting
        </label>
        <textarea
          id="job-posting"
          rows={10}
          value={jobPostingText}
          onChange={(e) => setJobPostingText(e.target.value)}
          placeholder="Paste the full job description here..."
          className="w-full border border-steel rounded-lg px-4 py-3.5 text-sm bg-surface/70 leading-relaxed placeholder:text-ink-soft/60 focus:border-accent outline-none transition-colors resize-y"
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

      <HoverBorderGradient
        as="button"
        type="submit"
        duration={2.8}
        containerClassName="rounded-full"
        className="px-7 py-3"
      >
        {status === "error" ? "Try again" : "Tailor my resume"}
      </HoverBorderGradient>
    </form>
  );
}
