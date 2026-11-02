import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/dashboard" className="text-base font-bold tracking-tight">
            JobSafe Tracker
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1 text-sm">
            <Link href="/dashboard" className="rounded-md px-3 py-2 hover:bg-zinc-100">
              Jobs
            </Link>
            <Link href="/dashboard/new" className="rounded-md px-3 py-2 hover:bg-zinc-100">
              Add job
            </Link>
            <Link href="/settings" className="rounded-md px-3 py-2 hover:bg-zinc-100">
              Settings
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>

      <footer className="border-t border-zinc-200 bg-white py-4 text-center text-xs text-zinc-500">
        JobSafe Tracker gives warning signs, not guarantees. Never pay fees to apply.
      </footer>
    </div>
  );
}
