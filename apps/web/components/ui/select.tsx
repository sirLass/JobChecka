import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Native select — keyboard- and screen-reader-friendly out of the box. */
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base focus:border-teal-700 focus:outline-none sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}
