import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { applicationTitle } from "@/lib/display";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: applications } = await supabase
    .from("applications")
    .select("id, company, role, integrity_passed, gap_analysis, created_at")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-serif text-3xl mb-8">Your applications</h1>

      {!applications?.length && (
        <p className="text-ink-soft text-sm">
          No applications yet.{" "}
          <Link href="/" className="text-accent underline">
            Tailor your first one
          </Link>
          .
        </p>
      )}

      <div className="space-y-3">
        {applications?.map((app) => (
          <Link
            key={app.id}
            href={`/results/${app.id}`}
            className="flex items-center justify-between border border-line rounded bg-white px-5 py-4 hover:border-accent transition-colors"
          >
            <div>
              <p className="font-medium">{applicationTitle(app)}</p>
              <p className="text-ink-soft text-sm">
                {new Date(app.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-ink-soft">
                {Math.round((app.gap_analysis?.matchRate ?? 0) * 100)}% match
              </span>
              {app.integrity_passed ? (
                <ShieldCheck size={18} className="text-accent" />
              ) : (
                <ShieldAlert size={18} className="text-flag" />
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
