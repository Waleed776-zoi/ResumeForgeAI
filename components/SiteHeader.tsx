import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

/**
 * One persistent bar across every page. The wordmark is the way home — the
 * results page previously had no exit at all, leaving the browser back
 * button as the only route out of a finished application.
 *
 * Rendered from the layout, so it reads auth state once per request rather
 * than each page re-deriving it.
 */
export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-line bg-paper/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-accent hover:opacity-80 transition-opacity"
          aria-label="ResumeForge — back to home"
        >
          <ShieldCheck size={16} />
          <span className="font-serif text-base tracking-tight">
            ResumeForge
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-sm">
          {user ? (
            <>
              <Link
                href="/history"
                className="text-ink-soft hover:text-accent transition-colors"
              >
                History
              </Link>
              <span className="text-ink-soft/70 hidden sm:inline">
                {user.email}
              </span>
              <form action="/auth/signout" method="post" className="flex">
                <button
                  type="submit"
                  className="text-ink-soft hover:text-accent transition-colors"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="text-accent hover:opacity-80 transition-opacity"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
