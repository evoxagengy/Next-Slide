"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Image as ImageIcon, Link2, Presentation, Save, Trash2, UploadCloud, X } from "lucide-react";
import { ModuleRow, ModuleSlideRow } from "@/components/modules/ModulesTable";
import { CopyButton } from "@/components/modules/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const LOGO_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

type EditableSlide = ModuleSlideRow & { saving?: boolean };

function fileNameFromUrl(url?: string | null) {
  if (!url) return "Arquivo";
  if (url.startsWith("/api/assets/")) return "Arquivo enviado";
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function typeLabel(type: ModuleSlideRow["type"]) {
  if (type === "IMAGE") return "Imagem";
  if (type === "URL") return "Site";
  if (type === "DASHBOARD") return "Dashboard";
  if (type === "POWERPOINT") return "PowerPoint";
  return "Texto";
}

function TypeIcon({ type }: { type: ModuleSlideRow["type"] }) {
  if (type === "IMAGE") return <ImageIcon size={16} />;
  if (type === "URL" || type === "DASHBOARD") return <Link2 size={16} />;
  if (type === "POWERPOINT") return <Presentation size={16} />;
  return <FileText size={16} />;
}

async function uploadAsset(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/assets", { method: "POST", body: formData });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Não foi possível enviar o arquivo.");
  return data.asset as { url: string; fileName: string };
}

export function ModuleEditModal({ module, trigger }: { module: ModuleRow; trigger: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(module.name);
  const [description, setDescription] = useState(module.description || "");
  const [isActive, setIsActive] = useState(module.isActive);
  const [defaultDuration, setDefaultDuration] = useState(String(module.defaultDuration));
  const [transition, setTransition] = useState(module.defaultTransition === "cut" ? "cut" : "fade");
  const [logoUrl, setLogoUrl] = useState(module.logoUrl || "");
  const [logoPreview, setLogoPreview] = useState(module.logoUrl || "");
  const [slides, setSlides] = useState<EditableSlide[]>(module.slides);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  async function chooseLogo(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      if (typeof URL !== "undefined") setLogoPreview(URL.createObjectURL(file));
      const asset = await uploadAsset(file);
      setLogoUrl(asset.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar logo.");
    }
  }

  async function saveModule() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/modules/${module.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          defaultDuration: Number(defaultDuration || 15),
          defaultTransition: transition,
          theme: module.theme || "next-dark",
          logoUrl: logoUrl || null,
          isActive
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar o módulo.");
      router.refresh();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar módulo.");
    } finally {
      setSaving(false);
    }
  }

  async function patchSlide(slideId: string, patch: Partial<EditableSlide>) {
    const slide = slides.find((item) => item.id === slideId);
    if (!slide) return;
    setSlides((current) => current.map((item) => item.id === slideId ? { ...item, ...patch, saving: true } : item));
    try {
      const response = await fetch(`/api/slides/${slideId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível atualizar o slide.");
      setSlides((current) => current.map((item) => item.id === slideId ? { ...item, ...patch, saving: false } : item));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar slide.");
      setSlides((current) => current.map((item) => item.id === slideId ? { ...item, saving: false } : item));
    }
  }

  async function deleteSlide(slideId: string) {
    if (!confirm("Excluir este slide?")) return;
    const response = await fetch(`/api/slides/${slideId}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      alert(data.error || "Não foi possível excluir o slide.");
      return;
    }
    setSlides((current) => current.filter((item) => item.id !== slideId));
    router.refresh();
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm lg:p-8">
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-background shadow-card">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-5 py-4 backdrop-blur-xl">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-cyan">Editar módulo</div>
                <h2 className="text-xl font-black text-text">{module.name}</h2>
                <p className="text-sm text-muted">Ajustes simples, link público e slides cadastrados.</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} aria-label="Fechar modal"><X size={20} /></Button>
            </div>

            <div className="max-h-[calc(100vh-150px)] space-y-5 overflow-y-auto p-4 lg:p-6">
              <Card className="p-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nome do módulo"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
                    <Field label="Status"><Select value={isActive ? "active" : "inactive"} onChange={(event) => setIsActive(event.target.value === "active")}><option value="active">Ativo</option><option value="inactive">Inativo</option></Select></Field>
                    <Field label="Tempo padrão geral (s)"><Input type="number" min={3} value={defaultDuration} onChange={(event) => setDefaultDuration(event.target.value)} /></Field>
                    <Field label="Transição"><Select value={transition} onChange={(event) => setTransition(event.target.value as "fade" | "cut")}><option value="fade">Fade</option><option value="cut">Cut seco</option></Select></Field>
                    <div className="md:col-span-2"><Field label="Descrição opcional"><Textarea value={description} onChange={(event) => setDescription(event.target.value)} /></Field></div>
                  </div>
                  <div>
                    <Label>Logo do módulo</Label>
                    <label className="mt-2 flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-white/[0.04] p-3 text-center text-sm text-muted hover:border-cyan/50">
                      {logoPreview ? <img src={logoPreview} alt="Logo" className="max-h-24 max-w-full object-contain" /> : <UploadCloud className="text-cyan" size={24} />}
                      <span>Selecionar imagem</span>
                      <input type="file" accept={LOGO_ACCEPT} className="hidden" onChange={(event) => { chooseLogo(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                    </label>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-text">Link público do player</h3>
                    <p className="text-sm text-muted">Use este link na TV, navegador ou mini PC.</p>
                  </div>
                  <Badge tone={isActive ? "success" : "warning"}>{isActive ? "Ativo" : "Inativo"}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="min-w-0 flex-1 break-all rounded-2xl border border-border bg-background/70 p-3 font-mono text-xs text-cyan">{module.publicPath}</div>
                  <CopyButton value={module.publicPath} />
                  <Button type="button" variant="secondary" onClick={() => window.open(module.publicPath, "_blank")}><ExternalLink size={16} /> Abrir</Button>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border p-4">
                  <div>
                    <h3 className="text-lg font-black text-text">Slides do módulo</h3>
                    <p className="text-sm text-muted">Visual simples: arquivos aparecem pelo nome/miniatura. URLs aparecem apenas para sites.</p>
                  </div>
                  <Badge tone="info">{slides.length} slides</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.16em] text-muted">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Conteúdo</th>
                        <th className="px-4 py-3">Tempo</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {slides.map((slide, index) => (
                        <tr key={slide.id}>
                          <td className="px-4 py-3 text-muted">{index + 1}</td>
                          <td className="px-4 py-3"><div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.04] px-3 py-1"><TypeIcon type={slide.type} /> {typeLabel(slide.type)}</div></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-black/30">
                                {slide.type === "IMAGE" && slide.contentUrl ? <img src={slide.contentUrl} alt="Preview" className="h-full w-full object-cover" /> : <TypeIcon type={slide.type} />}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-bold text-text">{slide.title || fileNameFromUrl(slide.contentUrl)}</div>
                                {(slide.type === "URL" || slide.type === "DASHBOARD") && <div className="max-w-[360px] truncate font-mono text-xs text-cyan">{slide.contentUrl}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><Input className="w-24" type="number" min={3} value={slide.duration} onChange={(event) => setSlides((current) => current.map((item) => item.id === slide.id ? { ...item, duration: Number(event.target.value || 3) } : item))} onBlur={(event) => patchSlide(slide.id, { duration: Number(event.target.value || 3) })} /></td>
                          <td className="px-4 py-3"><Select value={slide.isActive ? "active" : "inactive"} onChange={(event) => patchSlide(slide.id, { isActive: event.target.value === "active" })}><option value="active">Ativo</option><option value="inactive">Inativo</option></Select></td>
                          <td className="px-4 py-3 text-right"><Button type="button" variant="danger" size="sm" onClick={() => deleteSlide(slide.id)}><Trash2 size={15} /> Excluir</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {slides.length === 0 && <div className="p-6 text-center text-sm text-muted">Este módulo ainda não possui slides.</div>}
              </Card>

              {error && <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-red-200">{error}</div>}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/90 p-4 shadow-card">
                <div className="text-sm text-muted">As alterações do módulo são salvas ao clicar em salvar. Tempo/status de slides são aplicados individualmente.</div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}><X size={16} /> Cancelar</Button>
                  <Button type="button" onClick={saveModule} disabled={saving}><Save size={16} /> {saving ? "Salvando..." : "Salvar módulo"}</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}
