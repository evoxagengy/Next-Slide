"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CopyPlus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Slide = {
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

export function SlideManager({ moduleId, defaultDuration, initialSlides }: { moduleId: string; defaultDuration: number; initialSlides: Slide[] }) {
  const [slides, setSlides] = useState(initialSlides);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function refresh() {
    const response = await fetch(`/api/modules/${moduleId}/slides`);
    const data = await response.json();
    if (response.ok) setSlides(data.slides);
  }

  async function create(formData: FormData) {
    setCreating(true);
    setError("");
    const payload = {
      type: formData.get("type"),
      title: formData.get("title") || null,
      description: formData.get("description") || null,
      contentUrl: formData.get("contentUrl") || null,
      textContent: formData.get("textContent") || null,
      duration: Number(formData.get("duration") || defaultDuration),
      fit: formData.get("fit") || "COVER",
      backgroundColor: formData.get("backgroundColor") || "#070B12",
      refreshInterval: formData.get("refreshInterval") ? Number(formData.get("refreshInterval")) : null,
      openMode: formData.get("openMode") || "IFRAME"
    };
    const response = await fetch(`/api/modules/${moduleId}/slides`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    setCreating(false);
    if (!response.ok) {
      setError(data.error || "Não foi possível criar slide.");
      return;
    }
    await refresh();
    const form = document.getElementById("create-slide-form") as HTMLFormElement | null;
    form?.reset();
  }

  async function update(slideId: string, formData: FormData) {
    const payload = {
      type: formData.get("type"),
      title: formData.get("title") || null,
      description: formData.get("description") || null,
      contentUrl: formData.get("contentUrl") || null,
      textContent: formData.get("textContent") || null,
      duration: Number(formData.get("duration") || defaultDuration),
      isActive: formData.get("isActive") === "on",
      fit: formData.get("fit") || "COVER",
      backgroundColor: formData.get("backgroundColor") || "#070B12",
      refreshInterval: formData.get("refreshInterval") ? Number(formData.get("refreshInterval")) : null,
      openMode: formData.get("openMode") || "IFRAME"
    };
    const response = await fetch(`/api/slides/${slideId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) alert(data.error || "Não foi possível salvar.");
    await refresh();
  }

  async function duplicate(slideId: string) {
    const response = await fetch(`/api/slides/${slideId}/duplicate`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) alert(data.error || "Não foi possível duplicar.");
    await refresh();
  }

  async function remove(slideId: string) {
    if (!confirm("Excluir este slide?")) return;
    const response = await fetch(`/api/slides/${slideId}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) alert(data.error || "Não foi possível excluir.");
    await refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...slides];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSlides(next);
    const response = await fetch(`/api/modules/${moduleId}/slides/reorder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderedIds: next.map((slide) => slide.id) }) });
    if (!response.ok) await refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="text-lg font-bold">Adicionar slide</h3>
        <p className="mt-1 text-sm text-muted">Use imagem por URL, dashboard, site, PowerPoint ou texto. Arquivos não são salvos no filesystem da Vercel.</p>
        <form id="create-slide-form" action={create} className="mt-5 grid gap-4 lg:grid-cols-2">
          <Field label="Tipo"><Select name="type" defaultValue="IMAGE"><option value="IMAGE">Imagem</option><option value="URL">Site / URL</option><option value="DASHBOARD">Dashboard</option><option value="POWERPOINT">PowerPoint</option><option value="TEXT">Texto</option></Select></Field>
          <Field label="Tempo em segundos"><Input name="duration" type="number" min={3} defaultValue={defaultDuration} /></Field>
          <Field label="Título"><Input name="title" placeholder="Título opcional" /></Field>
          <Field label="URL do conteúdo"><Input name="contentUrl" placeholder="https://..." /></Field>
          <Field label="Descrição"><Input name="description" placeholder="Descrição opcional" /></Field>
          <Field label="Modo de abertura"><Select name="openMode" defaultValue="IFRAME"><option value="IFRAME">Iframe quando permitido</option><option value="PROXY">Sistema próprio / proxy</option><option value="NEW_TAB">Nova aba / fallback</option></Select></Field>
          <Field label="Ajuste da imagem"><Select name="fit" defaultValue="COVER"><option value="COVER">Cover</option><option value="CONTAIN">Contain</option></Select></Field>
          <Field label="Refresh dashboard (min)"><Input name="refreshInterval" type="number" min={1} placeholder="Opcional" /></Field>
          <div className="lg:col-span-2"><Label>Mensagem de texto</Label><Textarea name="textContent" placeholder="Usado principalmente no tipo TEXT." /></div>
          {error && <div className="lg:col-span-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error}</div>}
          <div className="lg:col-span-2"><Button disabled={creating}>{creating ? "Criando..." : "Adicionar slide"}</Button></div>
        </form>
      </Card>

      <div className="space-y-4">
        {slides.map((slide, index) => (
          <Card key={slide.id} className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-sm font-bold">{index + 1}</div>
                <div><div className="font-semibold text-text">{slide.title || slide.type}</div><div className="text-xs text-muted">{slide.duration}s · {slide.type}</div></div>
              </div>
              <Badge tone={slide.isActive ? "success" : "warning"}>{slide.isActive ? "Ativo" : "Inativo"}</Badge>
            </div>
            <form action={(formData) => update(slide.id, formData)} className="grid gap-4 lg:grid-cols-2">
              <Field label="Tipo"><Select name="type" defaultValue={slide.type}><option value="IMAGE">Imagem</option><option value="URL">Site / URL</option><option value="DASHBOARD">Dashboard</option><option value="POWERPOINT">PowerPoint</option><option value="TEXT">Texto</option></Select></Field>
              <Field label="Tempo"><Input name="duration" type="number" defaultValue={slide.duration} min={3} /></Field>
              <Field label="Título"><Input name="title" defaultValue={slide.title || ""} /></Field>
              <Field label="URL"><Input name="contentUrl" defaultValue={slide.contentUrl || ""} /></Field>
              <Field label="Descrição"><Input name="description" defaultValue={slide.description || ""} /></Field>
              <Field label="Modo"><Select name="openMode" defaultValue={slide.openMode}><option value="IFRAME">Iframe</option><option value="PROXY">Sistema próprio / proxy</option><option value="NEW_TAB">Nova aba</option></Select></Field>
              <Field label="Fit"><Select name="fit" defaultValue={slide.fit}><option value="COVER">Cover</option><option value="CONTAIN">Contain</option></Select></Field>
              <Field label="Refresh (min)"><Input name="refreshInterval" type="number" defaultValue={slide.refreshInterval || ""} /></Field>
              <div className="lg:col-span-2"><Label>Texto</Label><Textarea name="textContent" defaultValue={slide.textContent || ""} /></div>
              <label className="flex items-center gap-2 text-sm text-muted"><input name="isActive" type="checkbox" defaultChecked={slide.isActive} /> Slide ativo</label>
              <div className="flex flex-wrap justify-end gap-2 lg:col-span-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => move(index, -1)}><ArrowUp size={15} /> Subir</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => move(index, 1)}><ArrowDown size={15} /> Descer</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => duplicate(slide.id)}><CopyPlus size={15} /> Duplicar</Button>
                <Button type="submit" variant="secondary" size="sm"><Save size={15} /> Salvar</Button>
                <Button type="button" variant="danger" size="sm" onClick={() => remove(slide.id)}><Trash2 size={15} /> Excluir</Button>
              </div>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}
