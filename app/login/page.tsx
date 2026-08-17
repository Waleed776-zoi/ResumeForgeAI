"use client";

import { useState, Suspense, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <p className="text-ink-soft text-sm">
        Check your email for a magic link to sign in. Open it in this same
        browser — the link sets a cookie, so it won&apos;t work if you open it
        somewhere else.
      </p>
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
      {error && <p className="text-flag text-sm">{error}</p>}
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
