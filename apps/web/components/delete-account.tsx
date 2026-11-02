"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Permanent account deletion (right to erasure). Requires the
 * SUPABASE_SERVICE_ROLE_KEY to be configured server-side — the API returns 503
 * with a clear message otherwise.
 */
export function DeleteAccount() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (res.status === 204) {
        window.location.assign("/");
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Could not delete the account. Please try again.");
      setBusy(false);
      setConfirming(false);
    } catch {
      setError("Network problem. Please try again.");
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-start gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-teal-700 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700"
        />
        I understand this permanently deletes my account, all saved jobs, notes, and check results.
        This cannot be undone.
      </label>

      {confirming ? (
        <div className="flex gap-2">
          <Button type="button" variant="destructive" disabled={busy} onClick={onDelete}>
            {busy ? "Deleting account…" : "Delete my account"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="destructive"
          className="w-fit"
          disabled={!acknowledged || busy}
          onClick={() => setConfirming(true)}
        >
          Delete account
        </Button>
      )}

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
