import type { NextRequest } from "next/server";
import { ApiError, handleApiError, json, parseBody, requireUser } from "@/lib/api";
import { reportCreateSchema } from "@/lib/validation";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";

/**
 * POST /api/reports — submit "scam" or "false_alarm" feedback (internal use).
 * Identity keys are normalized here; counts are only ever aggregated server-side.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request, reportCreateSchema);
    const { supabase, user } = await requireUser();

    // Reports are abuse-prone (threat model T4): a tight per-user cap.
    const limit = rateLimit(rateLimitKey(["reports-post", user.id]), 10, 60_000);
    if (!limit.ok) {
      return json({ error: "Too many reports. Try again in a minute." }, 429);
    }

    // Normalize identity keys from the linked job (own jobs only, per RLS).
    let companyKey: string | null = null;
    let domainKey: string | null = null;
    let contactKey: string | null = null;

    if (body.job_id) {
      const { data: job } = await supabase
        .from("jobs")
        .select("company_name, source_url, contact_text")
        .eq("id", body.job_id)
        .maybeSingle();
      if (job) {
        const row = job as {
          company_name: string | null;
          source_url: string | null;
          contact_text: string | null;
        };
        if (row.company_name) {
          companyKey = row.company_name.trim().toLowerCase();
        }
        if (row.source_url) {
          try {
            domainKey = new URL(row.source_url).hostname.replace(/^www\./, "").toLowerCase();
          } catch {
            domainKey = null;
          }
        }
        if (row.contact_text) {
          contactKey = row.contact_text.trim().toLowerCase();
        }
      }
    }

    const { error } = await supabase.from("reports").insert({
      user_id: user.id,
      job_id: body.job_id ?? null,
      kind: body.kind,
      reason: body.reason ?? null,
      company_key: companyKey,
      domain_key: domainKey,
      contact_key: contactKey,
    });
    if (error) {
      console.error("[api/reports] insert failed:", error.code);
      throw new ApiError(500, "Could not save the report. Please try again.");
    }

    return json({ ok: true }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
