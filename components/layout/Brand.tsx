import { MonitorPlay } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-cyan shadow-glow">
        <MonitorPlay size={22} className="text-white" />
      </div>
      {!compact && (
        <div>
          <div className="text-base font-black tracking-tight text-text">Next Slide</div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted">TV intelligence</div>
        </div>
      )}
    </div>
  );
}
