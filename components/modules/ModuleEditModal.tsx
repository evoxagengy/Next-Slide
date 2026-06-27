"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const POWERPOINT_ACCEPT = ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation";
const LOGO_ACCEPT = IMAGE_ACCEPT;

type EditableSlide = ModuleSlideRow & { saving?: boolean };

type ExtractedPowerPointSlide = {
  slideNumber: number;
  assetId: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type UploadedAsset = {
  id: string | null;
  url: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: "image" | "powerpoint";
  conversion?: string;
  slides?: ExtractedPowerPointSlide[];
};

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

function cleanFileTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
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

function isMediaSlide(slide: Pick<ModuleSlideRow, "type">) {
  return slide.type === "IMAGE" || slide.type === "POWERPOINT";
}

function isSiteSlide(slide: Pick<ModuleSlideRow, "type">) {
  return slide.type === "URL" || slide.type === "DASHBOARD";
}

function numberOrFallback(value: string | number | undefined | null, fallback: number) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(3, Math.floor(parsed));
}

async function uploadAsset(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/assets", { method: "POST", body: formData });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Não foi possível enviar o arquivo.");
  return data.asset as UploadedAsset;
}

export function ModuleEditModal({ module, trigger }: { module: ModuleRow; trigger: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orderSaving, setOrderSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [convertingPptx, setConvertingPptx] = useState(false);
  const [deletingMedia, setDeletingMedia] = useState(false);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(module.name);
  const [description, setDescription] = useState(module.description || "");
  const [isActive, setIsActive] = useState(module.isActive);
  const [defaultDuration, setDefaultDuration] = useState(String(module.defaultDuration));
  const [transition, setTransition] = useState(module.defaultTransition === "cut" ? "cut" : "fade");
  const [showClock, setShowClock] = useState(module.showClock);
  const [logoUrl, setLogoUrl] = useState(module.logoUrl || "");
  const [logoPreview, setLogoPreview] = useState(module.logoUrl || "");
  const [slides, setSlides] = useState<EditableSlide[]>(module.slides);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const mediaCount = slides.filter(isMediaSlide).length;
  const siteCount = slides.filter(isSiteSlide).length;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);


  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingSlides(true);
    setError("");

    fetch(`/api/modules/${module.id}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.module) throw new Error(data?.error || "Não foi possível carregar os slides do módulo.");
        const loaded = data.module;
        setName(loaded.name || module.name);
        setDescription(loaded.description || "");
        setIsActive(Boolean(loaded.isActive));
        setDefaultDuration(String(loaded.defaultDuration || module.defaultDuration));
        setTransition(loaded.defaultTransition === "cut" ? "cut" : "fade");
        setShowClock(Boolean(loaded.showClock));
        setLogoUrl(loaded.logoUrl || "");
        setLogoPreview(loaded.logoUrl || "");
        setSlides((loaded.slides || []).map((slide: EditableSlide) => ({ ...slide, saving: false })));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar slides do módulo.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSlides(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, module.id]);

  async function chooseLogo(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      if (typeof URL !== "undefined") setLogoPreview(URL.createObjectURL(file));
      const asset = await uploadAsset(file);
      if (!asset.url) throw new Error("Não foi possível gerar a URL da logo.");
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
          showClock,
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
    const slide = slides.find((item) => item.id === slideId);
    const label = slide && isSiteSlide(slide) ? "Excluir este site/dashboard?" : "Excluir este slide?";
    if (!confirm(label)) return;

    const response = await fetch(`/api/slides/${slideId}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      alert(data.error || "Não foi possível excluir o slide.");
      return;
    }
    setSlides((current) => current.filter((item) => item.id !== slideId));
    router.refresh();
  }

  async function persistOrder(nextSlides: EditableSlide[]) {
    if (nextSlides.length === 0) return;
    setOrderSaving(true);
    setError("");
    const ordered = nextSlides.map((slide, index) => ({ ...slide, sortOrder: index + 1 }));
    setSlides(ordered);
    try {
      const response = await fetch(`/api/modules/${module.id}/slides/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: ordered.map((slide) => slide.id) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar a ordem dos slides.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar ordem.");
    } finally {
      setOrderSaving(false);
    }
  }

  function moveSlide(slideId: string, direction: -1 | 1) {
    const index = slides.findIndex((item) => item.id === slideId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= slides.length) return;
    const copy = [...slides];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    void persistOrder(copy);
  }

  function moveDraggedSlide(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const from = slides.findIndex((item) => item.id === draggingId);
    const to = slides.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const copy = [...slides];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    setDraggingId(null);
    void persistOrder(copy);
  }

  async function createImageSlide(input: { title: string | null; url: string; duration?: number }) {
    const response = await fetch(`/api/modules/${module.id}/slides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "IMAGE",
        title: input.title,
        description: null,
        contentUrl: input.url,
        textContent: null,
        duration: input.duration || numberOrFallback(defaultDuration, module.defaultDuration),
        isActive: true,
        fit: "COVER",
        backgroundColor: "#070B12",
        refreshInterval: null,
        openMode: "IFRAME"
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível criar o slide.");
    return data.slide as EditableSlide;
  }

  async function addImageFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploadingImages(true);
    setError("");
    try {
      const created: EditableSlide[] = [];
      for (const file of Array.from(fileList)) {
        const asset = await uploadAsset(file);
        if (!asset.url) throw new Error(`Não foi possível gerar URL para ${file.name}.`);
        const slide = await createImageSlide({
          title: cleanFileTitle(file.name),
          url: asset.url
        });
        created.push(slide);
      }
      setSlides((current) => [...current, ...created]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar imagens.");
    } finally {
      setUploadingImages(false);
    }
  }

  async function addPowerPointFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setConvertingPptx(true);
    setError("");
    try {
      const created: EditableSlide[] = [];
      for (const file of Array.from(fileList)) {
        const asset = await uploadAsset(file);
        if (!asset.slides?.length) {
          throw new Error(`${file.name} não gerou imagens. Verifique a conversão PPTX e tente novamente.`);
        }
        const baseTitle = cleanFileTitle(file.name);
        for (const slide of asset.slides) {
          const createdSlide = await createImageSlide({
            title: `${baseTitle} - Slide ${String(slide.slideNumber).padStart(2, "0")}`,
            url: slide.url
          });
          created.push(createdSlide);
        }
      }
      setSlides((current) => [...current, ...created]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao converter PPTX.");
    } finally {
      setConvertingPptx(false);
    }
  }

  async function deleteOnlyMediaSlides() {
    const mediaSlides = slides.filter(isMediaSlide);
    if (mediaSlides.length === 0) {
      alert("Este módulo não possui imagens/PPTX para apagar.");
      return;
    }

    if (!confirm(`Apagar ${mediaSlides.length} imagem(ns)/PPTX deste módulo? Os sites e dashboards serão mantidos.`)) return;

    setDeletingMedia(true);
    setError("");
    try {
      for (const slide of mediaSlides) {
        const response = await fetch(`/api/slides/${slide.id}`, { method: "DELETE" });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Não foi possível excluir ${slide.title || "um slide"}.`);
        }
      }

      const remaining = slides.filter((slide) => !isMediaSlide(slide));
      setSlides(remaining);

      if (remaining.length > 0) {
        await persistOrder(remaining);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao apagar imagens.");
    } finally {
      setDeletingMedia(false);
    }
  }

  const busy = saving || orderSaving || uploadingImages || convertingPptx || deletingMedia || loadingSlides;

  const modal = open ? (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm lg:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-background shadow-card">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-5 py-4 backdrop-blur-xl">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-cyan">Editar módulo</div>
            <h2 className="text-xl font-black text-text">{module.name}</h2>
            <p className="text-sm text-muted">Ajustes, link público, ordem de exibição e troca de imagens/PPTX sem apagar sites.</p>
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
                <Field label="Mostrar data e hora no player"><Select value={showClock ? "yes" : "no"} onChange={(event) => setShowClock(event.target.value === "yes")}><option value="yes">Sim, mostrar no canto</option><option value="no">Não mostrar</option></Select></Field>
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
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-4">
              <div>
                <h3 className="text-lg font-black text-text">Slides do módulo</h3>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-muted">
                  Edite a ordem de imagens e sites arrastando ou usando as setas. Você também pode apagar somente imagens/PPTX e importar novas imagens ou um novo PowerPoint sem remover os sites.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="info">{slides.length} slides</Badge>
                  <Badge tone="default">{mediaCount} imagens/PPTX</Badge>
                  <Badge tone="default">{siteCount} sites/dashboards</Badge>
                  {orderSaving && <Badge tone="info">Salvando ordem...</Badge>}
                  {uploadingImages && <Badge tone="info">Enviando imagens...</Badge>}
                  {convertingPptx && <Badge tone="info">Convertendo PPTX...</Badge>}
                  {deletingMedia && <Badge tone="warning">Apagando imagens...</Badge>}
                  {loadingSlides && <Badge tone="info">Carregando slides...</Badge>}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white/5 px-3 text-sm font-semibold text-text transition hover:bg-white/10">
                  <UploadCloud size={16} /> Importar imagens
                  <input type="file" accept={IMAGE_ACCEPT} multiple className="hidden" disabled={busy} onChange={(event) => { addImageFiles(event.target.files); event.currentTarget.value = ""; }} />
                </label>

                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-cyan/30 bg-cyan/10 px-3 text-sm font-semibold text-cyan transition hover:bg-cyan/15">
                  <UploadCloud size={16} /> Importar PPTX
                  <input type="file" accept={POWERPOINT_ACCEPT} multiple className="hidden" disabled={busy} onChange={(event) => { addPowerPointFiles(event.target.files); event.currentTarget.value = ""; }} />
                </label>

                <Button type="button" variant="danger" disabled={busy || mediaCount === 0} onClick={deleteOnlyMediaSlides}>
                  <Trash2 size={15} /> Apagar só imagens
                </Button>
              </div>
            </div>

            {loadingSlides ? (
              <div className="p-8 text-center text-sm font-semibold text-cyan">Carregando slides deste módulo...</div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px] text-sm">
                <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.16em] text-muted">
                  <tr>
                    <th className="px-4 py-3">Ordem</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Conteúdo</th>
                    <th className="px-4 py-3">Tempo</th>
                    <th className="px-4 py-3">Modo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {slides.map((slide, index) => (
                    <tr
                      key={slide.id}
                      draggable
                      onDragStart={() => setDraggingId(slide.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => moveDraggedSlide(slide.id)}
                      onDragEnd={() => setDraggingId(null)}
                      className={draggingId === slide.id ? "bg-cyan/10 opacity-70" : ""}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="cursor-grab rounded-lg border border-border bg-white/[0.04] px-2 py-1 text-muted active:cursor-grabbing" title="Arraste para ordenar">↕</span>
                          <span className="w-7 text-center font-bold text-text">{index + 1}</span>
                          <div className="flex flex-col gap-1">
                            <button type="button" className="rounded border border-border px-2 text-xs text-muted hover:text-text disabled:opacity-30" disabled={index === 0 || busy} onClick={() => moveSlide(slide.id, -1)}>↑</button>
                            <button type="button" className="rounded border border-border px-2 text-xs text-muted hover:text-text disabled:opacity-30" disabled={index === slides.length - 1 || busy} onClick={() => moveSlide(slide.id, 1)}>↓</button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.04] px-3 py-1">
                          <TypeIcon type={slide.type} /> {typeLabel(slide.type)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-black/30">
                            {slide.type === "IMAGE" && slide.contentUrl ? <img src={slide.contentUrl} alt="Preview" className="h-full w-full object-cover" /> : <TypeIcon type={slide.type} />}
                          </div>
                          <div className="min-w-0">
                            <Input
                              className="h-9 max-w-[360px]"
                              value={slide.title || ""}
                              placeholder={fileNameFromUrl(slide.contentUrl)}
                              onChange={(event) => setSlides((current) => current.map((item) => item.id === slide.id ? { ...item, title: event.target.value } : item))}
                              onBlur={(event) => patchSlide(slide.id, { title: event.target.value || null })}
                            />
                            {(slide.type === "URL" || slide.type === "DASHBOARD") && <div className="mt-1 max-w-[360px] truncate font-mono text-xs text-cyan">{slide.contentUrl}</div>}
                            {isMediaSlide(slide) && <div className="mt-1 max-w-[360px] truncate text-xs text-muted">Arquivo de imagem/PPTX convertido</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          className="w-24"
                          type="number"
                          min={3}
                          value={slide.duration}
                          onChange={(event) => setSlides((current) => current.map((item) => item.id === slide.id ? { ...item, duration: Number(event.target.value || 3) } : item))}
                          onBlur={(event) => patchSlide(slide.id, { duration: Number(event.target.value || 3) })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {(slide.type === "URL" || slide.type === "DASHBOARD") ? (
                          <Select value={slide.openMode} onChange={(event) => patchSlide(slide.id, { openMode: event.target.value as EditableSlide["openMode"] })}>
                            <option value="IFRAME">Automático</option>
                            <option value="PROXY">Sistema próprio / proxy</option>
                            <option value="NEW_TAB">Link externo</option>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted">Arquivo</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Select value={slide.isActive ? "active" : "inactive"} onChange={(event) => patchSlide(slide.id, { isActive: event.target.value === "active" })}>
                          <option value="active">Ativo</option>
                          <option value="inactive">Inativo</option>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button type="button" variant="danger" size="sm" disabled={busy} onClick={() => deleteSlide(slide.id)}>
                          <Trash2 size={15} /> Excluir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {!loadingSlides && slides.length === 0 && <div className="p-6 text-center text-sm text-muted">Este módulo ainda não possui slides.</div>}
          </Card>

          {error && <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-red-200">{error}</div>}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/90 p-4 shadow-card">
            <div className="text-sm text-muted">A ordem, status e tempo dos slides são salvos individualmente. O botão abaixo salva os dados gerais do módulo.</div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}><X size={16} /> Cancelar</Button>
              <Button type="button" onClick={saveModule} disabled={saving}><Save size={16} /> {saving ? "Salvando..." : "Salvar módulo"}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <span className="inline-flex" onClick={(event) => { event.stopPropagation(); setOpen(true); }}>{trigger}</span>
      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}
