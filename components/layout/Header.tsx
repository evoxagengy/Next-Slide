"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/layout/Brand";

export function Header({ name, company, role }: { name: string; company: string; role: string }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/75 px-4 py-4 backdrop-blur-xl lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="lg:hidden"><Brand compact /></div>
        <div className="hidden min-w-0 lg:block">
          <p className="text-sm text-muted">Organização</p>
          <h1 className="truncate text-xl font-bold text-text">{company}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold text-text">{name}</div>
            <div className="text-xs text-muted">{role}</div>
          </div>
          <Button variant="secondary" size="sm" onClick={logout}>
            <LogOut size={16} /> Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
