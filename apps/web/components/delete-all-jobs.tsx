"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Deletes every job row owned by the signed-in user (account is kept). */
export function DeleteAllJobs() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setBusy(true);
    try {
      const res = await fetch("/api/jobs", { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as {
        deleted?: number;
        error?: string;
      } | null;
      if (res.ok) {
        setMessage(`Deleted ${data?.deleted ?? 0} job${data?.deleted === 1 ? "" : "s"}.`);
        setError(null);
        setConfirming(false);
        router.refresh();
      } else {
        setError(data?.error ?? "Could not delete jobs. Please try again.");
      }
    } catch {
      setError("Network problem. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-zinc-700">
            Really delete all saved jobs? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={onConfirm}
            >
              {busy ? "Deleting…" : "Yes, delete everything"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="default"
          className="w-fit border-red-300 text-red-700 hover:bg-red-50"
          onClick={() => setConfirming(true)}
        >
          Delete all jobs
        </Button>
      )}
      {message ? (
        <p className="text-sm text-emerald-700" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
