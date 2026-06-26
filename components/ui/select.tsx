import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("h-11 w-full rounded-xl border border-border bg-[#0B1220] px-3 text-sm text-text outline-none transition focus:border-cyan focus:ring-4 focus:ring-cyan/10", className)} {...props}>
      {children}
    </select>
  );
}
