import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError, handleApiError, requireUser } from "@/lib/api";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";

/**
 * DELETE /api/account — permanent self-service account deletion.
 *
 * Uses the service-role key (server only) to delete the auth user; every
 * jobs/applications/scam_checks/reports row cascades via FK "on delete cascade"
 * (see supabase/migrations). The signed-in session cookies are cleared after.
 */
export async function DELETE(_request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();

    const limit = rateLimit(rateLimitKey(["account-delete", user.id]), 3, 600_000);
    if (!limit.ok) {
      return new Response(
        JSON.stringify({ error: `Please wait ${limit.retryAfterSeconds}s before retrying.` }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      throw new ApiError(
        503,
        "Account deletion is not configured yet. Set SUPABASE_SERVICE_ROLE_KEY on the server and try again.",
      );
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      console.error("[api/account] deleteUser failed:", error.code ?? "unknown");
      throw new ApiError(502, "Account deletion failed. Please try again.");
    }

    // Cascade already removed the data; clear the now-invalid session cookies.
    await supabase.auth.signOut();

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
