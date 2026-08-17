"use client";

import { useState, Suspense, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { describeAuthError } from "@/lib/auth-errors";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(searchParams.get("error") ?? "");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Must be the callback route, not "/" — see app/auth/callback/route.ts.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(describeAuthError(error));
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="text-ink-soft text-sm space-y-3">
        <p className="text-ink">Check your email for a sign-in link.</p>
        <p>
          Open it in <strong>this same browser</strong> — the link completes a
          handshake that started here, so it won&apos;t work anywhere else.
        </p>
        <p>
          Use the <strong>newest</strong> email. Each link has its destination
          baked in at send time, so older ones can still point somewhere you
          don&apos;t expect.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full border border-line rounded px-4 py-3 text-sm bg-white focus:border-accent outline-none"
      />
      {error && (
        <div className="border border-flag/40 bg-flag/5 rounded px-4 py-3 flex gap-3">
          <AlertTriangle size={18} className="text-flag shrink-0 mt-0.5" />
          <p className="text-flag text-sm leading-relaxed">{error}</p>
        </div>
      )}
      <button
        type="submit"
        className="w-full bg-accent text-white px-6 py-3 rounded font-medium hover:bg-accent/90 transition-colors"
      >
        Send magic link
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="max-w-sm mx-auto px-6 py-24">
      <h1 className="font-serif text-2xl mb-6">Sign in</h1>
      {/* useSearchParams needs a Suspense boundary or the build fails. */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
