import Link from "next/link";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Depends on the session cookies per request; never prerender at build time.
export const dynamic = "force-dynamic";

/** Signed in → dashboard; otherwise → login (with a friendly note if not configured). */
export default async function Home() {
  let user: User | null | undefined;
  try {
    const supabase = await createClient();
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();
    user = sessionUser;
  } catch (error) {
    // Missing Supabase env vars: show setup instructions instead of a 500.
    console.error(
      "[home] supabase not configured:",
      error instanceof Error ? error.message : error,
    );
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-12">
        <h1 className="text-xl font-bold tracking-tight">JobSafe Tracker</h1>
        <p className="mt-3 text-sm text-zinc-700">
          The dashboard is not connected to the database yet. Follow
          <span className="font-medium"> apps/web/README.md </span>
          steps 1–3: create the Supabase project, fill in <code>.env</code> at the repo root, and
          run the migration in <code>apps/web/supabase/migrations/</code>.
        </p>
        <Link href="/login" className="mt-4 text-sm text-teal-700 underline underline-offset-2">
          Sign-in page
        </Link>
      </main>
    );
  }
  // redirect() throws by design — call it OUTSIDE the try/catch above.
  redirect(user ? "/dashboard" : "/login");
}
