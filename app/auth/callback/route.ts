import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link landing route.
 *
 * @supabase/ssr uses the PKCE flow, so clicking the emailed link sends the
 * browser here with a one-time `?code=`. That code is worthless until it's
 * traded for a session — this route does the trade and, because it's a Route
 * Handler, is allowed to write the resulting session cookies.
 *
 * Point `emailRedirectTo` at this path, never at `/`. A code delivered to a
 * page that doesn't redeem it just sits in the URL bar and the user stays
 * logged out.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        "That sign-in link was missing its code. Request a new one."
      )}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
