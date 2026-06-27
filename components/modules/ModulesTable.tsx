"use client";

import { useRouter } from "next/navigation";
import { CopyPlus, ExternalLink, Pencil, RefreshCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/modules/CopyButton";
import { ModuleEditModal } from "@/components/modules/ModuleEditModal";

export type ModuleSlideRow = {
  id: string;
  type: "IMAGE" | "URL" | "DASHBOARD" | "POWERPOINT" | "TEXT";
  title: string | null;
  description: string | null;
  contentUrl: string | null;
  textContent: string | null;
  duration: number;
  sortOrder: number;
  isActive: boolean;
  fit: "COVER" | "CONTAIN";
  backgroundColor: string | null;
  refreshInterval: number | null;
  openMode: "IFRAME" | "NEW_TAB" | "PROXY";
};

export type ModuleRow = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isActive: boolean;
  defaultDuration: number;
  defaultTransition: string;
  theme: string;
  logoUrl: string | null;
  showClock: boolean;
  updatedAt: string;
  createdAt: string;
  lastTokenRotatedAt: string;
  slidesCount: number;
  publicPath: string;
  slides: ModuleSlideRow[];
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return "-";
  }
}

function absolutePath(path: string) {
  if (typeof window === "undefined") return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${window.location.origin}${path}`;
}

export function ModulesTable({ modules, canDelete }: { modules: ModuleRow[]; canDelete: boolean }) {
  const router = useRouter();

  async function rotate(moduleId: string) {
    const response = await fetch(`/api/modules/${moduleId}/token/rotate`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || "Não foi possível regenerar o link.");
      return;
    }
    const url = data.publicUrl || data.publicPath;
    if (url) await navigator.clipboard.writeText(absolutePath(url));
    alert("Novo link gerado e copiado. O link antigo foi invalidado.");
    router.refresh();
  }

  async function duplicate(moduleId: string) {
    const response = await fetch(`/api/modules/${moduleId}/duplicate`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || "Não foi possível duplicar o módulo.");
      return;
    }
    router.refresh();
  }

  async function remove(moduleId: string) {
    if (!confirm("Excluir este módulo e todos os slides?")) return;
    const response = await fetch(`/api/modules/${moduleId}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      alert(data.error || "Não foi possível excluir o módulo.");
      return;
    }
    router.refresh();
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.18em] text-muted">
            <tr>
              <th className="px-5 py-4 font-bold">Módulo</th>
              <th className="px-5 py-4 font-bold">Slides</th>
              <th className="px-5 py-4 font-bold">Status</th>
              <th className="px-5 py-4 font-bold">Player público</th>
              <th className="px-5 py-4 font-bold">Atualizado</th>
              <th className="px-5 py-4 text-right font-bold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/80">
            {modules.map((module) => (
              <tr key={module.id} className="transition hover:bg-white/[0.025]">
                <td className="max-w-[360px] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white/[0.04]">
                      {module.logoUrl ? <img src={module.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" /> : <span className="text-sm font-black text-cyan">NS</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-black text-text">{module.name}</div>
                      <div className="mt-1 line-clamp-1 text-xs text-muted">{module.description || "Sem descrição"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="font-bold text-text">{module.slidesCount}</div>
                  <div className="text-xs text-muted">{module.defaultDuration}s padrão · {module.defaultTransition === "cut" ? "Cut" : "Fade"} · {module.showClock ? "com relógio" : "sem relógio"}</div>
                </td>
                <td className="px-5 py-4"><Badge tone={module.isActive ? "success" : "warning"}>{module.isActive ? "Ativo" : "Inativo"}</Badge></td>
                <td className="px-5 py-4">
                  <div className="max-w-[260px] truncate rounded-xl border border-border bg-background/60 px-3 py-2 font-mono text-xs text-cyan">{module.publicPath}</div>
                </td>
                <td className="px-5 py-4 text-muted">{formatDate(module.updatedAt)}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    <CopyButton value={module.publicPath} label="Copiar" />
                    <Button type="button" variant="secondary" size="sm" onClick={() => window.open(module.publicPath, "_blank")}><ExternalLink size={15} /> Abrir</Button>
                    <ModuleEditModal module={module} trigger={<Button type="button" variant="secondary" size="sm"><Pencil size={15} /> Editar</Button>} />
                    <Button type="button" variant="secondary" size="sm" onClick={() => rotate(module.id)}><RefreshCcw size={15} /> Token</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => duplicate(module.id)}><CopyPlus size={15} /> Duplicar</Button>
                    {canDelete && <Button type="button" variant="danger" size="sm" onClick={() => remove(module.id)}><Trash2 size={15} /> Excluir</Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
