import Link from "next/link";
import { ForgeMark } from "@/components/ForgeMark";
import { createClient } from "@/lib/supabase/server";

/**
 * One persistent bar across every page. The wordmark is the way home — the
 * results page previously had no exit at all, leaving the browser back
 * button as the only route out of a finished application.
 *
 * The lettering is all ink now. The mark beside it already carries the one
 * accent stroke it is entitled to, and colouring "Forge" as well would have
 * spent emerald twice in three centimetres — on identity, which is not one
 * of the four things green is allowed to mean here.
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
    <header className="border-b border-line/70 bg-paper/70 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-ink transition-opacity hover:opacity-75"
          aria-label="ResumeForge — back to home"
        >
          <ForgeMark size={19} />
          <span className="font-display text-[19px] tracking-display">
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
              <span className="text-ink-soft hidden sm:inline font-mono text-xs">
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
