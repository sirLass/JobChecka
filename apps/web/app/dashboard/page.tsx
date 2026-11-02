import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { jobsListQuerySchema, APPLICATION_STATUS_VALUES, JOB_SOURCES } from "@/lib/validation";
import { formatDateTime, statusBadgeClass } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Jobs",
};

// Per-user, cookie-authenticated list — always rendered per request.
export const dynamic = "force-dynamic";

interface JobRow {
  id: string;
  title: string | null;
  company_name: string | null;
  location: string | null;
  work_type: string | null;
  salary_text: string | null;
  description: string;
  source_platform: string;
  source_url: string | null;
  captured_at: string;
  applications:
    | {
        status: string;
        notes: string | null;
        applied_at: string | null;
      }[]
    | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  jobstreet: "JobStreet",
  indeed: "Indeed",
  manual: "Manual",
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const parsed = jobsListQuerySchema.safeParse({
    q: typeof sp.q === "string" ? sp.q : undefined,
    platform: typeof sp.platform === "string" ? sp.platform : undefined,
    status: typeof sp.status === "string" ? sp.status : undefined,
    page: typeof sp.page === "string" ? sp.page : undefined,
    limit: typeof sp.limit === "string" ? sp.limit : undefined,
  });
  const params = parsed.success ? parsed.data : { page: 1, limit: 20 };

  const jobs: JobRow[] = [];
  let total = 0;
  let loadError: "unconfigured" | "load" | null = null;

  try {
    const supabase = await createClient();

    // When filtering by status we need an inner join so jobs without an
    // application row are excluded instead of returned with null status.
    const embed = params.status ? "*, applications!inner(status)" : "*, applications(status)";

    const from = (params.page - 1) * params.limit;
    const to = from + params.limit - 1;

    let query = supabase
      .from("jobs")
      .select(embed, { count: "exact" })
      .order("captured_at", { ascending: false })
      .range(from, to);

    // Search across title, company, and description. Commas/brackets would break
    // the `or()` filter list; replace them before interpolating.
    const qSafe = (params.q ?? "").replace(/[,()"]+/g, " ").trim();
    if (qSafe) {
      query = query.or(
        `title.ilike.%${qSafe}%,company_name.ilike.%${qSafe}%,description.ilike.%${qSafe}%`,
      );
    }
    if (params.platform) {
      query = query.eq("source_platform", params.platform);
    }
    if (params.status) {
      query = query.eq("applications.status", params.status);
    }
    const { data, count, error } = await query;
    if (error) throw new Error("jobs query failed");

    jobs.push(...((data ?? []) as unknown as JobRow[]));
    total = count ?? 0;
  } catch (e) {
    // Unconfigured env gets a friendlier card below; everything else a generic one.
    loadError =
      e instanceof Error && e.message.includes("NEXT_PUBLIC_SUPABASE") ? "unconfigured" : "load";
  }

  const first = total === 0 ? 0 : (params.page - 1) * params.limit + 1;
  const last = Math.min((params.page - 1) * params.limit + params.limit, total);

  function pageUrl(page: number): string {
    const usp = new URLSearchParams();
    if (params.q) usp.set("q", params.q);
    if (params.platform) usp.set("platform", params.platform);
    if (params.status) usp.set("status", params.status);
    if (page > 1) usp.set("page", String(page));
    const s = usp.toString();
    return s ? `/dashboard?${s}` : "/dashboard";
  }

  return (
    <section className="w-full max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Your jobs</h1>
        <Link href="/dashboard/new" className={buttonVariants()}>
          Add job
        </Link>
      </div>

      <form method="get" action="/dashboard" className="mb-6" aria-label="Filter jobs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-64">
            <Label htmlFor="q">Search</Label>
            <Input
              id="q"
              name="q"
              type="search"
              defaultValue={params.q ?? ""}
              placeholder="Title, company, or text"
              className="mt-1 bg-white"
            />
          </div>
          <div className="sm:w-36">
            <Label htmlFor="platform">Source</Label>
            <Select
              id="platform"
              name="platform"
              defaultValue={params.platform ?? ""}
              className="mt-1 bg-white"
            >
              <option value="">All sources</option>
              {JOB_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {PLATFORM_LABELS[source] ?? source}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:w-40">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              name="status"
              defaultValue={params.status ?? ""}
              className="mt-1 bg-white"
            >
              <option value="">All statuses</option>
              {APPLICATION_STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {status[0]?.toUpperCase() + status.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="outline" className="shrink-0">
            Apply filters
          </Button>
        </div>
      </form>

      {loadError ? (
        <Card>
          <CardContent className="p-6">
            {loadError === "unconfigured" ? (
              <p className="text-sm text-zinc-700" role="alert">
                The dashboard is not connected to the database yet. Fill in <code>.env</code> at the
                repo root (apps/web/README.md) and refresh.
              </p>
            ) : (
              <p className="text-sm text-red-700" role="alert">
                Could not load your jobs. If this persists, the database migration may not be
                applied yet — see apps/web/README.md.
              </p>
            )}
          </CardContent>
        </Card>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-zinc-600">
              {total === 0
                ? "No jobs saved yet. Add your first job by pasting a post."
                : "No jobs match these filters."}
            </p>
            {total === 0 ? (
              <Link href="/dashboard/new" className={buttonVariants({ variant: "outline" })}>
                Add your first job
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards on mobile */}
          <ul className="flex flex-col gap-3 md:hidden">
            {jobs.map((job) => (
              <li key={job.id}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/dashboard/jobs/${job.id}`}
                        className="text-sm font-semibold text-teal-800 underline-offset-2 hover:underline"
                      >
                        {job.title || "Untitled job"}
                      </Link>
                      <Badge className={statusBadgeClass(job.applications?.[0]?.status ?? "saved")}>
                        {job.applications?.[0]?.status ?? "saved"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {[job.company_name, job.location].filter(Boolean).join(" · ") ||
                        "No company given"}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-700">{job.description}</p>
                    <p className="mt-2 text-xs text-zinc-400">
                      {PLATFORM_LABELS[job.source_platform] ?? job.source_platform} ·{" "}
                      {formatDateTime(job.captured_at)}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          {/* Table on desktop */}
          <div className="hidden rounded-lg border border-zinc-200 bg-white shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Title</TableHead>
                  <TableHead scope="col">Company</TableHead>
                  <TableHead scope="col">Location</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Source</TableHead>
                  <TableHead scope="col">Saved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="max-w-72">
                      <Link
                        href={`/dashboard/jobs/${job.id}`}
                        className="font-medium text-teal-800 underline-offset-2 hover:underline"
                      >
                        {job.title || "Untitled job"}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{job.company_name ?? "—"}</TableCell>
                    <TableCell className="max-w-36 truncate">{job.location ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClass(job.applications?.[0]?.status ?? "saved")}>
                        {job.applications?.[0]?.status ?? "saved"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {PLATFORM_LABELS[job.source_platform] ?? job.source_platform}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-zinc-500">
                      {formatDateTime(job.captured_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
            <p aria-live="polite">
              Showing {first}–{last} of {total}
            </p>
            <div className="flex gap-2">
              {params.page > 1 ? (
                <Link
                  href={pageUrl(params.page - 1)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  ← Previous
                </Link>
              ) : null}
              {last < total ? (
                <Link
                  href={pageUrl(params.page + 1)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Next →
                </Link>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
