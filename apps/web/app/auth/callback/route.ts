import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/callback?code=...&next=... — Supabase magic-link landing.
 * Exchanges the one-time code for a session cookie, then redirects on.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/dashboard";
  // Only allow relative in-app paths (no open redirect).
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  try {
    if (!code) throw new Error("missing code");
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return NextResponse.redirect(`${origin}${next}`);
  } catch (error) {
    if (error instanceof Error && error.message !== "missing code") {
      console.error("[auth] code exchange failed:", error.message);
    }
    return NextResponse.redirect(`${origin}/login?error=link_maybe_used_or_expired`);
  }
}
