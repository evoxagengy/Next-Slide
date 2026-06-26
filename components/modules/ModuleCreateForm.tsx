"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ModuleCreateForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    const response = await fetch("/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        description: formData.get("description"),
        defaultDuration: Number(formData.get("defaultDuration") || 15),
        defaultTransition: formData.get("defaultTransition") || "fade",
        theme: "next-dark",
        logoUrl: formData.get("logoUrl") || ""
      })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Erro ao criar módulo.");
      return;
    }
    router.push(`/modules/${data.module.id}`);
    router.refresh();
  }

  return (
    <form action={submit} className="space-y-5">
      <div>
        <Label htmlFor="name">Nome do módulo</Label>
        <Input id="name" name="name" placeholder="Ex.: Indicadores Industriais - Moenda" required />
      </div>
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" placeholder="Resumo do que será exibido nesta TV." />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="defaultDuration">Tempo padrão por slide</Label>
          <Input id="defaultDuration" name="defaultDuration" type="number" defaultValue={15} min={3} />
        </div>
        <div>
          <Label htmlFor="defaultTransition">Transição</Label>
          <Input id="defaultTransition" name="defaultTransition" defaultValue="fade" />
        </div>
      </div>
      <div>
        <Label htmlFor="logoUrl">Logo por URL (opcional)</Label>
        <Input id="logoUrl" name="logoUrl" placeholder="https://..." />
      </div>
      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error}</div>}
      <Button disabled={loading}>{loading ? "Criando..." : "Criar módulo"}</Button>
    </form>
  );
}
