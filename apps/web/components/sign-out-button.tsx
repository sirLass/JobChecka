"use client";

import { useState } from "react";

/** Clears the session cookie server-side, then hard-navigates to /login. */
export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-50"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/auth/signout", { method: "POST" });
        } finally {
          window.location.assign("/login");
        }
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
