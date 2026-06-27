"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, MonitorPlay, Settings, ShieldCheck, Tv, Users } from "lucide-react";
import { Brand } from "@/components/layout/Brand";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/modules", label: "Módulos", icon: MonitorPlay },
  { href: "/devices", label: "Dispositivos", icon: Tv },
  { href: "/users", label: "Gerenciador", icon: Users },
  { href: "/license", label: "Licença", icon: ShieldCheck },
  { href: "/settings", label: "Configurações", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-border bg-surface/70 p-5 backdrop-blur-xl lg:sticky lg:top-0 lg:block">
      <Brand />
      <div className="mt-8 space-y-2">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                active ? "bg-gradient-to-r from-primary/90 to-cyan/80 text-white shadow-glow" : "text-muted hover:bg-white/5 hover:text-text"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-cyan/20 bg-cyan/10 p-4">
        <div className="text-sm font-semibold text-cyan-100">Modo TV 24/7</div>
        <p className="mt-1 text-xs leading-5 text-muted">Crie o módulo, copie o link público e rode em navegador, mini PC ou TV corporativa.</p>
      </div>
    </aside>
  );
}
