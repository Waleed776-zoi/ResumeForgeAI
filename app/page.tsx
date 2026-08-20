import Link from "next/link";
import { UploadForm } from "@/components/UploadForm";
import { TransformationHero } from "@/components/TransformationHero";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="max-w-3xl mx-auto px-6 py-14">
      {/* The demonstration leads; the form follows it. Burying the
          transformation under a headline would describe the product instead
          of showing it. */}
      <TransformationHero />

      <div className="border-t border-line pt-10">
        {user ? (
          <UploadForm />
        ) : (
          <div className="panel px-6 py-8 text-center">
            <p className="text-ink-soft text-sm mb-5 max-w-md mx-auto leading-relaxed">
              Sign in to try it on your own resume — each tailored application
              is saved to your account, so generating one means knowing who you
              are.
            </p>
            <Link
              href="/login"
              className="inline-block bg-accent text-paper px-6 py-3 rounded font-medium hover:bg-accent-bright transition-colors text-sm"
            >
              Sign in to continue
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
