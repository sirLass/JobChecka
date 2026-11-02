import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JobActions } from "@/components/job-actions";

export const metadata: Metadata = {
  title: "Job details",
};

// Per-user, cookie-authenticated data.
export const dynamic = "force-dynamic";

interface JobDetail {
  id: string;
  title: string | null;
  company_name: string | null;
  location: string | null;
  work_type: string | null;
  salary_text: string | null;
  description: string;
  contact_text: string | null;
  source_platform: string;
  source_url: string | null;
  content_hash: string;
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

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  let data: unknown = null;
  let notConfigured = false;
  try {
    const supabase = await createClient();
    const { data: row } = await supabase
      .from("jobs")
      .select("*, applications(status, notes, applied_at)")
      .eq("id", id)
      .maybeSingle();
    data = row;
  } catch (e) {
    notConfigured = e instanceof Error && e.message.includes("NEXT_PUBLIC_SUPABASE");
    if (!notConfigured) throw e;
  }

  if (notConfigured) {
    return (
      <section className="w-full max-w-5xl">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-zinc-700" role="alert">
              The dashboard is not connected to the database yet. Fill in <code>.env</code> at the
              repo root (apps/web/README.md) and refresh.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  // RLS scopes this to the owner; null here means "not yours / gone".
  if (!data) notFound();

  const job = data as unknown as JobDetail;
  const application = job.applications?.[0];
  const status = application?.status ?? "saved";

  const facts: [string, string | null][] = [
    ["Company", job.company_name],
    ["Location", job.location],
    ["Work type", job.work_type],
    ["Salary", job.salary_text],
    ["Source", PLATFORM_LABELS[job.source_platform] ?? job.source_platform],
    ["Saved at", formatDateTime(job.captured_at)],
  ];

  return (
    <section className="w-full max-w-5xl">
      <p className="mb-4 text-sm">
        <Link href="/dashboard" className="text-teal-700 underline-offset-2 hover:underline">
          ← Back to all jobs
        </Link>
      </p>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">{job.title || "Untitled job"}</h1>
          {job.source_url ? (
            <a
              href={job.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate text-sm text-teal-700 underline-offset-2 hover:underline"
            >
              {job.source_url}
            </a>
          ) : null}
        </div>
        <Badge
          className={status === "saved" ? "bg-zinc-100 text-zinc-800" : "bg-sky-100 text-sky-800"}
        >
          {status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Snapshot of the captured post */}
        <Card>
          <CardHeader>
            <CardTitle>Post snapshot</CardTitle>
            <CardDescription>Captured from the text you saved.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="font-medium text-zinc-500">{label}</dt>
                  <dd className="text-zinc-900">{value || "—"}</dd>
                </div>
              ))}
            </dl>

            {job.contact_text ? (
              <div className="mt-4">
                <h2 className="text-sm font-medium text-zinc-500">Contact details in post</h2>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-900">
                  {job.contact_text}
                </p>
              </div>
            ) : null}

            <div className="mt-4">
              <h2 className="text-sm font-medium text-zinc-500">Full post text</h2>
              <p className="mt-1 max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-900">
                {job.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tracking + checks sidebar */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Track this job</CardTitle>
              <CardDescription>Update status and your private notes.</CardDescription>
            </CardHeader>
            <CardContent>
              <JobActions
                jobId={job.id}
                initialStatus={status}
                initialNotes={application?.notes ?? ""}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scam checks</CardTitle>
              <CardDescription>
                Warning-sign checks land here in Phase 2 — the rules engine runs automatically on
                saved posts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600">
                Until then, please be cautious: never pay fees to apply and hold back IDs or bank
                details until a contract is signed.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
