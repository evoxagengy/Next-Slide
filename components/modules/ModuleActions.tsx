"use client";

import { useRouter } from "next/navigation";
import { CopyButton } from "@/components/modules/CopyButton";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Trash2, CopyPlus } from "lucide-react";

export function ModuleActions({ moduleId, publicUrl, canDelete }: { moduleId: string; publicUrl: string; canDelete: boolean }) {
  const router = useRouter();
  async function rotate() {
    const response = await fetch(`/api/modules/${moduleId}/token/rotate`, { method: "POST" });
    const data = await response.json();
    if (response.ok && data.publicUrl) {
      await navigator.clipboard.writeText(data.publicUrl);
      alert("Novo link gerado e copiado. O link antigo foi invalidado.");
      router.refresh();
    } else {
      alert(data.error || "Não foi possível regenerar o link.");
    }
  }
  async function duplicate() {
    const response = await fetch(`/api/modules/${moduleId}/duplicate`, { method: "POST" });
    const data = await response.json();
    if (response.ok) {
      router.push(`/modules/${data.module.id}`);
      router.refresh();
    } else alert(data.error || "Não foi possível duplicar.");
  }
  async function remove() {
    if (!confirm("Excluir este módulo e todos os slides?")) return;
    const response = await fetch(`/api/modules/${moduleId}`, { method: "DELETE" });
    if (response.ok) {
      router.push("/modules");
      router.refresh();
    } else {
      const data = await response.json();
      alert(data.error || "Não foi possível excluir.");
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <CopyButton value={publicUrl} />
      <Button variant="secondary" size="sm" onClick={() => window.open(publicUrl, "_blank")} type="button">Abrir player</Button>
      <Button variant="secondary" size="sm" onClick={rotate} type="button"><RefreshCcw size={15} /> Regenerar token</Button>
      <Button variant="secondary" size="sm" onClick={duplicate} type="button"><CopyPlus size={15} /> Duplicar</Button>
      {canDelete && <Button variant="danger" size="sm" onClick={remove} type="button"><Trash2 size={15} /> Excluir</Button>}
    </div>
  );
}
