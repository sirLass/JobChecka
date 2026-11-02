import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleApiError, json, parseBody } from "@/lib/api";
import { authMagicLinkSchema } from "@/lib/validation";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";

/**
 * POST /api/auth/magic-link — request a one-time sign-in link.
 * Supabase sends the email; we never send email ourselves.
 * Always answers 200 (no account enumeration), even when the address is unknown.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request, authMagicLinkSchema);

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const limit = rateLimit(rateLimitKey(["magic-link", ip, body.email]), 5, 300_000);
    if (!limit.ok) {
      return json({ error: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` }, 429);
    }

    const supabase = await createClient();
    const next = body.next ?? "/dashboard";
    const { error } = await supabase.auth.signInWithOtp({
      email: body.email,
      options: {
        emailRedirectTo: `${request.nextUrl.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        // First-time users get an account automatically ("magic link first").
        shouldCreateUser: true,
      },
    });

    if (error) {
      // Surface config problems during development without leaking existence.
      console.error("[auth] signInWithOtp failed:", error.message);
      return json(
        {
          ok: true,
          ...(process.env.NODE_ENV !== "production" ? { devError: error.message } : {}),
        },
        200,
      );
    }

    return json({ ok: true }, 200);
  } catch (error) {
    return handleApiError(error);
  }
}
