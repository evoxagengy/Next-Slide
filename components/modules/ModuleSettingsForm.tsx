"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ModuleSettings = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  defaultDuration: number;
  defaultTransition: string;
  theme: string;
  logoUrl: string | null;
};

export function ModuleSettingsForm({ module }: { module: ModuleSettings }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/modules/${module.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        description: formData.get("description"),
        defaultDuration: Number(formData.get("defaultDuration") || module.defaultDuration),
        defaultTransition: formData.get("defaultTransition") || "fade",
        theme: formData.get("theme") || "next-dark",
        logoUrl: formData.get("logoUrl") || "",
        isActive: formData.get("isActive") === "on"
      })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Não foi possível salvar.");
      return;
    }
    router.refresh();
  }
  return (
    <form action={submit} className="space-y-5">
      <div><Label>Nome</Label><Input name="name" defaultValue={module.name} /></div>
      <div><Label>Descrição</Label><Textarea name="description" defaultValue={module.description || ""} /></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>Tempo padrão</Label><Input name="defaultDuration" type="number" min={3} defaultValue={module.defaultDuration} /></div>
        <div><Label>Transição</Label><Input name="defaultTransition" defaultValue={module.defaultTransition} /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>Tema</Label><Input name="theme" defaultValue={module.theme} /></div>
        <div><Label>Logo URL</Label><Input name="logoUrl" defaultValue={module.logoUrl || ""} /></div>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted"><input name="isActive" type="checkbox" defaultChecked={module.isActive} /> Módulo ativo para player público</label>
      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error}</div>}
      <Button disabled={loading}>{loading ? "Salvando..." : "Salvar configurações"}</Button>
    </form>
  );
}
