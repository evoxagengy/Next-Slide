import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn("h-11 w-full rounded-xl border border-border bg-white/[0.04] px-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan focus:ring-4 focus:ring-cyan/10", className)}
      {...props}
    />
  );
}
