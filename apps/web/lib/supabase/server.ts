import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for Server Components, Server Actions, and
 * Route Handlers. It reads/writes the session cookies so RLS sees the
 * signed-in user (auth.uid()).
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.",
    );
  }
  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component where cookies cannot be set.
          // The proxy refreshes tokens before requests, so this is safe to ignore.
        }
      },
    },
  });
}
