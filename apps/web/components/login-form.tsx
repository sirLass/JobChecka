"use client";

import { useState } from "react";

/**
 * Email sign-in form. Sends a magic link via POST /api/auth/magic-link;
 * Supabase emails the one-time link, which lands on /auth/callback.
 */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setState("sent");
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setMessage(data?.error ?? "Could not send the link. Please try again.");
      setState("error");
    } catch {
      setMessage("Network problem. Please try again.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-base font-semibold">Check your inbox</h2>
        <p className="mt-2 text-sm text-zinc-600">
          We sent a one-time sign-in link to <span className="font-medium">{email}</span>. It
          expires soon — open it on this device to stay signed in.
        </p>
        <button
          type="button"
          className="mt-4 text-sm text-teal-700 underline underline-offset-2 hover:text-teal-900"
          onClick={() => {
            setState("idle");
            setMessage(null);
          }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <label htmlFor="email" className="block text-sm font-medium text-zinc-900">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base placeholder:text-zinc-400 focus:border-teal-700 focus:outline-none sm:text-sm"
      />
      <button
        type="submit"
        disabled={state === "sending" || email.trim().length === 0}
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800 disabled:pointer-events-none disabled:opacity-50"
      >
        {state === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
      {message ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {message}
        </p>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {state === "sending" ? "Sending sign-in link" : ""}
      </p>
    </form>
  );
}
