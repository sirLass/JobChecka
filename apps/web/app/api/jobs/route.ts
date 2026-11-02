import type { NextRequest } from "next/server";
import { contentHash } from "@jobsafe/shared";
import { ApiError, handleApiError, json, parseBody, parseQuery, requireUser } from "@/lib/api";
import { jobCreateSchema, jobsListQuerySchema } from "@/lib/validation";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";

/**
 * GET  /api/jobs  — list the signed-in user's jobs (filters, search, pagination).
 * POST /api/jobs  — create a job (capture or paste) + its default application row.
 * DELETE /api/jobs — delete ALL of the user's jobs (settings page).
 */

export async function GET(request: NextRequest) {
  try {
    const params = parseQuery(request, jobsListQuerySchema);
    const { supabase } = await requireUser();

    const embed = params.status ? "*, applications!inner(status)" : "*, applications(status)";
    const from = (params.page - 1) * params.limit;
    let query = supabase
      .from("jobs")
      .select(embed, { count: "exact" })
      .order("captured_at", { ascending: false })
      .range(from, from + params.limit - 1);

    const qSafe = params.q?.replace(/[,()"]+/g, " ").trim();
    if (qSafe) {
      query = query.or(
        `title.ilike.%${qSafe}%,company_name.ilike.%${qSafe}%,description.ilike.%${qSafe}%`,
      );
    }
    if (params.platform) query = query.eq("source_platform", params.platform);
    if (params.status) query = query.eq("applications.status", params.status);

    const { data, count, error } = await query;
    if (error) throw new ApiError(500, "Could not load jobs");

    return json({ jobs: data ?? [], total: count ?? 0, page: params.page, limit: params.limit });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request, jobCreateSchema);
    const { supabase, user } = await requireUser();

    const limit = rateLimit(rateLimitKey(["jobs-post", user.id]), 30, 60_000);
    if (!limit.ok) {
      return json({ error: "Too many saves. Slow down a bit and try again." }, 429);
    }

    // Stable de-dup key for later check caching (plan section 4.1 / 7.6).
    const hash = await contentHash({
      title: body.title,
      company: body.company_name,
      description: body.description,
    });

    const { data: job, error } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        source_platform: body.source_platform,
        source_url: body.source_url ?? null,
        title: body.title ?? null,
        company_name: body.company_name ?? null,
        location: body.location ?? null,
        work_type: body.work_type ?? null,
        salary_text: body.salary_text ?? null,
        description: body.description,
        contact_text: body.contact_text ?? null,
        content_hash: hash,
      })
      .select()
      .single();
    if (error || !job) {
      console.error("[api/jobs] insert failed:", error?.code ?? "unknown");
      throw new ApiError(500, "Could not save the job. Please try again.");
    }

    // Seed the application pipeline row (status: saved).
    const { error: appError } = await supabase.from("applications").insert({
      job_id: (job as { id: string }).id,
      user_id: user.id,
      status: "saved",
    });
    if (appError) {
      // Non-fatal: the job is saved; the detail page treats a missing row as "saved".
      console.error("[api/jobs] application seed failed:", appError.code);
    }

    return json({ job, status: "saved" }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const { supabase, user } = await requireUser();
    const { count, error } = await supabase
      .from("jobs")
      .delete({ count: "exact" })
      .eq("user_id", user.id);
    if (error) throw new ApiError(500, "Could not delete jobs. Please try again.");
    return json({ deleted: count ?? 0 });
  } catch (error) {
    return handleApiError(error);
  }
}
