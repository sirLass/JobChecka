import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, json, parseBody, requireUser } from "@/lib/api";
import { jobPatchSchema } from "@/lib/validation";

/**
 * GET    /api/jobs/:id — job detail with its application row.
 * PATCH  /api/jobs/:id — edit job fields, notes, and status.
 * DELETE /api/jobs/:id — delete the job (cascades to applications via FK).
 */

const uuid = z.uuid();

function badId() {
  return new ApiError(404, "Job not found");
}

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!uuid.safeParse(id).success) throw badId();

    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("jobs")
      .select("*, applications(status, notes, applied_at)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new ApiError(500, "Could not load the job");
    if (!data) throw badId();

    return json({ job: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!uuid.safeParse(id).success) throw badId();

    const body = await parseBody(request, jobPatchSchema);
    const { supabase, user } = await requireUser();

    // Ownership check first so other users' ids get a clean 404, not a silent no-op.
    const { data: owned } = await supabase.from("jobs").select("id").eq("id", id).maybeSingle();
    if (!owned) throw badId();

    const jobFields: Record<string, string> = {};
    const jobKeys = [
      "title",
      "company_name",
      "location",
      "work_type",
      "salary_text",
      "contact_text",
      "source_url",
    ] as const;
    for (const key of jobKeys) {
      const value = body[key];
      if (value !== undefined) jobFields[key] = value;
    }
    if (Object.keys(jobFields).length > 0) {
      const { error } = await supabase.from("jobs").update(jobFields).eq("id", id);
      if (error) throw new ApiError(500, "Could not update the job");
    }

    const appFields: Record<string, string | null> = {};
    if (body.notes !== undefined) appFields.notes = body.notes;
    if (body.applied_at !== undefined) appFields.applied_at = body.applied_at;
    if (body.status !== undefined || body.notes !== undefined || body.applied_at !== undefined) {
      const { data: app } = await supabase
        .from("applications")
        .select("status, notes, applied_at")
        .eq("job_id", id)
        .maybeSingle();

      // Stamp applied_at the first time a job moves to "applied".
      if (body.status === "applied" && body.applied_at === undefined && !app?.applied_at) {
        appFields.applied_at = new Date().toISOString();
      }

      if (app) {
        if (Object.keys(appFields).length > 0) {
          const { error } = await supabase.from("applications").update(appFields).eq("job_id", id);
          if (error) throw new ApiError(500, "Could not update the status");
        }
      } else {
        const { error } = await supabase.from("applications").insert({
          job_id: id,
          user_id: user.id,
          status: body.status ?? "saved",
          notes: body.notes ?? null,
          applied_at: appFields.applied_at ?? null,
        });
        if (error) throw new ApiError(500, "Could not set the status");
      }
    }

    const { data: job } = await supabase
      .from("jobs")
      .select("*, applications(status, notes, applied_at)")
      .eq("id", id)
      .maybeSingle();
    return json({ job });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!uuid.safeParse(id).success) throw badId();

    const { supabase, user } = await requireUser();
    const { count, error } = await supabase
      .from("jobs")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw new ApiError(500, "Could not delete the job");
    if ((count ?? 0) === 0) throw badId();

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
