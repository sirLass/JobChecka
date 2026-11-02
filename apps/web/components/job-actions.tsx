"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { APPLICATION_STATUSES } from "@jobsafe/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const STATUS_LABELS: Record<string, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
};

/** Status control, notes editor, and delete control for one job. */
export function JobActions({
  jobId,
  initialStatus,
  initialNotes,
}: {
  jobId: string;
  initialStatus: string;
  initialNotes: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [busy, setBusy] = useState<"status" | "notes" | "delete" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Could not save. Please try again.");
      return false;
    }
    setError(null);
    return true;
  }

  async function onStatusChange(next: string) {
    const previous = status;
    setStatus(next);
    setBusy("status");
    const ok = await patch({ status: next });
    if (!ok) setStatus(previous); // revert to the real saved value
    setBusy(null);
    router.refresh();
  }

  async function onSaveNotes() {
    setBusy("notes");
    const ok = await patch({ notes });
    if (ok) {
      setSavedNotes(notes);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    }
    setBusy(null);
  }

  async function onDelete() {
    setBusy("delete");
    const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setError(data?.error ?? "Could not delete. Please try again.");
    setBusy(null);
    setConfirming(false);
  }

  const notesDirty = notes !== savedNotes;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          id="status"
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          disabled={busy === "status"}
          className="mt-1"
        >
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s] ?? s}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Who you talked to, next steps, documents submitted…"
          className="mt-1"
        />
        <div className="mt-2 flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy === "notes" || !notesDirty}
            onClick={onSaveNotes}
          >
            {busy === "notes" ? "Saving…" : "Save notes"}
          </Button>
          <span aria-live="polite" className="text-xs text-emerald-700">
            {savedFlash ? "Notes saved" : ""}
          </span>
        </div>
      </div>

      <div className="border-t border-zinc-200 pt-4">
        {confirming ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-zinc-700">
              Delete this job and its status? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={busy === "delete"}
                onClick={onDelete}
              >
                {busy === "delete" ? "Deleting…" : "Yes, delete"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-700 hover:bg-red-50"
            onClick={() => setConfirming(true)}
          >
            Delete job
          </Button>
        )}
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
