import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base placeholder:text-zinc-400 focus:border-teal-700 focus:outline-none sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}
