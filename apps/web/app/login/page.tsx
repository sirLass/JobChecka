import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  let notice: string | null = null;
  if (error === "link_maybe_used_or_expired") {
    notice =
      "That sign-in link is missing, expired, or was already used. Enter your email to get a new one.";
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">JobSafe Tracker</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Your private job tracker. Sign in with a one-time link — no password needed.
        </p>
      </header>

      {notice ? (
        <p
          className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="alert"
        >
          {notice}
        </p>
      ) : null}

      <LoginForm />

      <p className="mt-8 text-center text-xs text-zinc-500">
        Only the job posts you choose to save are stored. Nothing is read in the background.
      </p>
    </main>
  );
}
