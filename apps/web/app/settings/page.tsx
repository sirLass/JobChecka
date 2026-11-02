import type { Metadata } from "next";
import { DeleteAllJobs } from "@/components/delete-all-jobs";
import { DeleteAccount } from "@/components/delete-account";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <section className="w-full max-w-2xl">
      <h1 className="mb-6 text-xl font-bold tracking-tight">Settings</h1>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Export your data</CardTitle>
            <CardDescription>
              Download every saved job, status, and note in CSV (spreadsheets) or JSON.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <a
              href="/api/export?format=csv"
              download="jobsafe-jobs.csv"
              className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
            >
              Download CSV
            </a>
            <a
              href="/api/export?format=json"
              download="jobsafe-jobs.json"
              className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
            >
              Download JSON
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delete all jobs</CardTitle>
            <CardDescription>
              Removes every saved job, status, and note. Your account stays active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAllJobs />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>
              Deleting your account is permanent and cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccount />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data &amp; privacy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-600">
            <p>
              JobSafe Tracker stores only the job posts you choose to save, plus the status and
              notes you write. Nothing is read in the background, and your data is visible only to
              you.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
