import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, de-duplicating conflicting Tailwind classes. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a timestamp for display (dashboard lists, detail pages). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** Map an application status to a small color hint used in badges. */
export function statusBadgeClass(status: string): string {
  switch (status) {
    case "applied":
      return "bg-sky-100 text-sky-800";
    case "interviewing":
      return "bg-violet-100 text-violet-800";
    case "offer":
      return "bg-emerald-100 text-emerald-800";
    case "rejected":
      return "bg-zinc-200 text-zinc-700";
    default:
      return "bg-zinc-100 text-zinc-800";
  }
}
