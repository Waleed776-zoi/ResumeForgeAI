import { createBrowserClient } from "@supabase/ssr";

/**
 * Use this client in Client Components (files with "use client").
 * Reads the public anon key — safe to expose in the browser, Row Level
 * Security policies in Supabase are what actually protect the data.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
