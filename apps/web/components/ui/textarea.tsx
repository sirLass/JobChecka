import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base placeholder:text-zinc-400 focus:border-teal-700 focus:outline-none sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}
