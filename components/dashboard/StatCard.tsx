import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatCard({ title, value, detail, icon: Icon }: { title: string; value: string | number; detail: string; icon: LucideIcon }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{title}</p>
          <div className="mt-2 text-3xl font-black text-text">{value}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-cyan"><Icon size={22} /></div>
      </div>
      <p className="mt-4 text-xs text-muted">{detail}</p>
    </Card>
  );
}
