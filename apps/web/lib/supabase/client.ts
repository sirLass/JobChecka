import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Session tokens live in cookies managed by
 * @supabase/ssr, so the browser client stays consistent with the server one.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.",
    );
  }
  return createBrowserClient(url, anon);
}
