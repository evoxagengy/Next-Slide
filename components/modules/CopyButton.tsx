"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

function absoluteValue(value: string) {
  if (typeof window === "undefined") return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${window.location.origin}${value}`;
  return value;
}

export function CopyButton({ value, label = "Copiar link" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(absoluteValue(value));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return <Button type="button" variant="secondary" size="sm" onClick={copy}><Copy size={15} /> {copied ? "Copiado" : label}</Button>;
}
