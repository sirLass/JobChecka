import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireUser } from "@/lib/api";

/**
 * GET /api/export?format=csv|json — export the signed-in user's data
 * (right to data portability). Streams all rows, no pagination window on the client.
 */

interface ExportJob {
  id: string;
  source_platform: string;
  source_url: string | null;
  title: string | null;
  company_name: string | null;
  location: string | null;
  work_type: string | null;
  salary_text: string | null;
  description: string;
  contact_text: string | null;
  content_hash: string;
  captured_at: string;
  applications: { status: string; notes: string | null; applied_at: string | null }[] | null;
}

const CSV_HEADERS = [
  "id",
  "saved_at",
  "source_platform",
  "source_url",
  "title",
  "company_name",
  "location",
  "work_type",
  "salary_text",
  "status",
  "applied_at",
  "notes",
  "description",
  "contact_text",
] as const;

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function csvCell(value: unknown): string {
  return csvEscape(value === null || value === undefined ? "" : String(value));
}

export async function GET(request: NextRequest) {
  try {
    const format = new URL(request.url).searchParams.get("format") ?? "json";
    if (format !== "csv" && format !== "json") {
      throw new ApiError(400, "format must be csv or json");
    }

    const { supabase, user } = await requireUser();

    // Fetch in pages of 1000 — Supabase caps request row counts.
    const all: unknown[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, applications(status, notes, applied_at)")
        .order("captured_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) throw new ApiError(500, "Could not export your data");
      const rows = data ?? [];
      all.push(...rows);
      if (rows.length < PAGE) break;
    }

    const jobs = all as unknown as ExportJob[];
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const lines = [
        CSV_HEADERS.join(","),
        ...jobs.map((job) => {
          const app = job.applications?.[0];
          return [
            job.id,
            job.captured_at,
            job.source_platform,
            job.source_url,
            job.title,
            job.company_name,
            job.location,
            job.work_type,
            job.salary_text,
            app?.status ?? "saved",
            app?.applied_at,
            app?.notes,
            job.description,
            job.contact_text,
          ]
            .map(csvCell)
            .join(",");
        }),
      ];
      // BOM keeps Excel happy with UTF-8.
      const body = "\uFEFF" + lines.join("\r\n");
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="jobsafe-export-${stamp}.csv"`,
        },
      });
    }

    return new NextResponse(
      JSON.stringify({ exported_at: new Date().toISOString(), user_id: user.id, jobs }, null, 2),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="jobsafe-export-${stamp}.json"`,
        },
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
