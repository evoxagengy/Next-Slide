import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, tone = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "success" | "warning" | "danger" | "info" }) {
  const tones = {
    default: "border-border bg-white/5 text-muted",
    success: "border-success/30 bg-success/10 text-green-200",
    warning: "border-warning/30 bg-warning/10 text-yellow-200",
    danger: "border-danger/30 bg-danger/10 text-red-200",
    info: "border-cyan/30 bg-cyan/10 text-cyan-100"
  };
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", tones[tone], className)} {...props} />;
}
