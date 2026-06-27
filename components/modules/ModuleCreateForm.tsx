"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Clock, Globe2, Image as ImageIcon, Plus, Trash2, UploadCloud, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const POWERPOINT_ACCEPT = ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation";

type MediaItem = {
  id: string;
  title: string;
  duration: string;
  file?: File;
  fileName: string;
  fileSize: number;
  previewUrl?: string;
  uploadedUrl?: string;
  source: "image" | "pptx-slide";
  sourceLabel?: string;
};

type SiteItem = {
  id: string;
  title: string;
  url: string;
  duration: string;
  refreshInterval: string;
  openMode: "IFRAME" | "NEW_TAB" | "PROXY";
};

type ModuleCreateFormProps = {
  modalMode?: boolean;
  onCreated?: () => void;
  onCancel?: () => void;
};

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
  conversion?: "extracted-images";
  slides?: ExtractedPowerPointSlide[];
};

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatBytes(value?: number) {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function filePreview(file: File) {
  if (typeof URL === "undefined") return undefined;
  return file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
}

function cleanFileTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function imageItemFromFile(file: File): MediaItem {
  return {
    id: makeId(),
    title: cleanFileTitle(file.name),
    duration: "",
    file,
    fileName: file.name,
    fileSize: file.size,
    previewUrl: filePreview(file),
    source: "image"
  };
}

function emptySite(): SiteItem {
  return { id: makeId(), title: "", url: "", duration: "", refreshInterval: "", openMode: "IFRAME" };
}

async function uploadAsset(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/assets", { method: "POST", body: formData });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Não foi possível enviar ${file.name}.`);
  return data.asset as UploadedAsset;
}

function compactSites(items: SiteItem[], fallbackDuration: number) {
  return items
    .map((item) => ({
      title: item.title.trim() || null,
      url: item.url.trim(),
      duration: item.duration ? Number(item.duration) : fallbackDuration,
      fit: "COVER" as const,
      openMode: item.openMode,
      refreshInterval: item.refreshInterval ? Number(item.refreshInterval) : null
    }))
    .filter((item) => item.url.length > 0);
}

export function ModuleCreateForm({ modalMode = false, onCreated, onCancel }: ModuleCreateFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [convertingPptx, setConvertingPptx] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMode, setDurationMode] = useState<"global" | "separate">("global");
  const [defaultDuration, setDefaultDuration] = useState("15");
  const [imageDuration, setImageDuration] = useState("15");
  const [siteDuration, setSiteDuration] = useState("30");
  const [transition, setTransition] = useState<"fade" | "cut">("fade");
  const [showClock, setShowClock] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [showSiteEveryImages, setShowSiteEveryImages] = useState("0");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const imageSeconds = Number((durationMode === "global" ? defaultDuration : imageDuration) || 15);
  const siteSeconds = Number((durationMode === "global" ? defaultDuration : siteDuration) || 30);
  const totalValidSlides = useMemo(() => mediaItems.length + sites.filter((item) => item.url.trim()).length, [mediaItems, sites]);

  function addImageFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const items = Array.from(fileList).map(imageItemFromFile);
    setMediaItems((current) => [...current, ...items]);
  }

  async function addPowerPointFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setConvertingPptx(true);
    setError("");
    try {
      const nextSlides: MediaItem[] = [];
      for (const file of Array.from(fileList)) {
        const asset = await uploadAsset(file);
        if (!asset.slides?.length) {
          throw new Error(`${file.name} não gerou imagens. Salve a apresentação como .pptx e use slides com imagens/fundos exportáveis.`);
        }
        const baseTitle = cleanFileTitle(file.name);
        asset.slides.forEach((slide) => {
          nextSlides.push({
            id: makeId(),
            title: `${baseTitle} - Slide ${String(slide.slideNumber).padStart(2, "0")}`,
            duration: "",
            fileName: slide.fileName,
            fileSize: slide.sizeBytes,
            previewUrl: slide.url,
            uploadedUrl: slide.url,
            source: "pptx-slide",
            sourceLabel: file.name
          });
        });
      }
      setMediaItems((current) => [...current, ...nextSlides]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao converter PPTX.");
    } finally {
      setConvertingPptx(false);
    }
  }

  function updateMedia(id: string, patch: Partial<MediaItem>) {
    setMediaItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeMedia(id: string) {
    setMediaItems((current) => current.filter((item) => item.id !== id));
  }

  function moveMedia(id: string, direction: -1 | 1) {
    setMediaItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  }

  function moveDraggedMedia(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    setMediaItems((current) => {
      const from = current.findIndex((item) => item.id === draggingId);
      const to = current.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return current;
      const copy = [...current];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
    setDraggingId(null);
  }

  function updateSite(id: string, patch: Partial<SiteItem>) {
    setSites((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function compactMediaItems(items: MediaItem[], fallbackDuration: number) {
    const result = [] as Array<{
      title: string | null;
      url: string;
      duration: number;
      fit: "COVER";
      openMode: "IFRAME";
      refreshInterval: null;
    }>;

    for (const item of items) {
      let url = item.uploadedUrl;
      let fileName = item.fileName;

      if (!url) {
        if (!item.file) throw new Error(`Arquivo inválido: ${item.fileName}.`);
        const asset = await uploadAsset(item.file);
        if (!asset.url) throw new Error(`Não foi possível gerar URL para ${item.fileName}.`);
        url = asset.url;
        fileName = asset.fileName;
      }

      result.push({
        title: item.title.trim() || cleanFileTitle(fileName),
        url,
        duration: item.duration ? Number(item.duration) : fallbackDuration,
        fit: "COVER",
        openMode: "IFRAME",
        refreshInterval: null
      });
    }

    return result;
  }

  async function submit() {
    setLoading(true);
    setError("");

    try {
      if (!name.trim()) throw new Error("Informe o nome do módulo.");
      if (convertingPptx) throw new Error("Aguarde a conversão do PPTX terminar.");
      if (totalValidSlides === 0) throw new Error("Adicione pelo menos uma imagem, PPTX ou site.");

      const [uploadedImages, logoAsset] = await Promise.all([
        compactMediaItems(mediaItems, imageSeconds),
        logoFile ? uploadAsset(logoFile) : Promise.resolve(null)
      ]);

      const payload = {
        name,
        description: description || null,
        defaultDuration: Number(defaultDuration || 15),
        defaultTransition: transition,
        theme: "next-dark",
        logoUrl: logoAsset?.url || "",
        showClock,
        imageDuration: imageSeconds,
        siteDuration: siteSeconds,
        powerPointDuration: imageSeconds,
        showSiteEveryImages: Number(showSiteEveryImages || 0),
        images: uploadedImages,
        sites: compactSites(sites, siteSeconds),
        powerPoints: []
      };

      const response = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao criar módulo.");

      router.refresh();
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar módulo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={modalMode ? "space-y-5" : "space-y-6"}>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-xs font-bold text-cyan"><Wand2 size={14} /> Novo módulo</div>
            <h3 className="mt-4 text-xl font-black">Crie uma apresentação simples para TV</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Adicione imagens, PPTX convertido em imagens, sites e defina a ordem de exibição sem mexer em código.</p>
          </div>
          <div className="rounded-2xl border border-border bg-white/[0.04] px-4 py-3 text-right">
            <div className="text-2xl font-black text-text">{totalValidSlides}</div>
            <div className="text-xs text-muted">itens adicionados</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome do módulo"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Gestão à vista - Produção" required /></Field>
            <Field label="Transição"><Select value={transition} onChange={(event) => setTransition(event.target.value as "fade" | "cut")}><option value="fade">Fade</option><option value="cut">Cut seco</option></Select></Field>
            <Field label="Mostrar data e hora"><Select value={showClock ? "yes" : "no"} onChange={(event) => setShowClock(event.target.value === "yes")}><option value="yes">Sim, no canto do player</option><option value="no">Não mostrar</option></Select></Field>
            <div className="md:col-span-2"><Field label="Descrição opcional"><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Resumo do conteúdo exibido nesta TV." /></Field></div>
          </div>
          <div>
            <Label>Logo do módulo opcional</Label>
            <label className="mt-2 flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-white/[0.04] p-3 text-center text-sm text-muted hover:border-cyan/50">
              {logoPreview ? <img src={logoPreview} alt="Logo" className="max-h-24 max-w-full object-contain" /> : <UploadCloud className="text-cyan" size={24} />}
              <span>Selecionar imagem</span>
              <input type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setLogoFile(file);
                  if (typeof URL !== "undefined") setLogoPreview(URL.createObjectURL(file));
                }
                event.currentTarget.value = "";
              }} />
            </label>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-3"><Clock className="text-cyan" size={22} /><div><h3 className="text-lg font-bold">Tempo dos slides</h3><p className="text-sm text-muted">Escolha um tempo único para tudo ou separe sites das imagens. PPTX convertido usa o tempo das imagens.</p></div></div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Field label="Como deseja configurar?"><Select value={durationMode} onChange={(event) => setDurationMode(event.target.value as "global" | "separate")}><option value="global">Usar tempo padrão geral</option><option value="separate">Separar imagem/PPTX e site</option></Select></Field>
          <Field label="Tempo padrão geral (s)"><Input type="number" min={3} value={defaultDuration} onChange={(event) => setDefaultDuration(event.target.value)} /></Field>
          {durationMode === "separate" && <Field label="Tempo imagem e PPTX (s)"><Input type="number" min={3} value={imageDuration} onChange={(event) => setImageDuration(event.target.value)} /></Field>}
          {durationMode === "separate" && <Field label="Tempo sites/dashboards (s)"><Input type="number" min={3} value={siteDuration} onChange={(event) => setSiteDuration(event.target.value)} /></Field>}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
          <Field label="Mostrar site a cada N imagens"><Input type="number" min={0} value={showSiteEveryImages} onChange={(event) => setShowSiteEveryImages(event.target.value)} /></Field>
          <div className="rounded-2xl border border-border bg-white/[0.04] p-4 text-sm leading-6 text-muted">Exemplo: use <b className="text-text">10</b> para mostrar um site depois de cada 10 imagens. Use <b className="text-text">0</b> para seguir a ordem padrão. A ordem manual das imagens será respeitada.</div>
        </div>
      </Card>

      <MediaTableSection
        items={mediaItems}
        convertingPptx={convertingPptx}
        addImageFiles={addImageFiles}
        addPowerPointFiles={addPowerPointFiles}
        update={updateMedia}
        remove={removeMedia}
        move={moveMedia}
        draggingId={draggingId}
        setDraggingId={setDraggingId}
        moveDragged={moveDraggedMedia}
      />

      <SiteTableSection items={sites} add={() => setSites((current) => [...current, emptySite()])} update={updateSite} remove={(id) => setSites((current) => current.filter((item) => item.id !== id))} />

      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-red-200">{error}</div>}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card/90 p-4 shadow-card backdrop-blur-xl">
        <div><div className="font-bold text-text">Pronto para criar</div><div className="text-sm text-muted">O módulo será criado com as imagens na ordem definida acima. Você não será levado para outra página.</div></div>
        <div className="flex flex-wrap gap-2">
          {onCancel && <Button type="button" variant="secondary" onClick={onCancel}><X size={16} /> Cancelar</Button>}
          <Button type="button" onClick={submit} disabled={loading || convertingPptx} size="lg">{loading ? "Enviando e criando..." : convertingPptx ? "Convertendo PPTX..." : "Criar módulo"}</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}

function MediaTableSection({ items, convertingPptx, addImageFiles, addPowerPointFiles, update, remove, move, draggingId, setDraggingId, moveDragged }: {
  items: MediaItem[];
  convertingPptx: boolean;
  addImageFiles: (files: FileList | null) => void;
  addPowerPointFiles: (files: FileList | null) => void;
  update: (id: string, patch: Partial<MediaItem>) => void;
  remove: (id: string) => void;
  move: (id: string, direction: -1 | 1) => void;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  moveDragged: (targetId: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5">
        <div className="flex gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan/30 bg-cyan/10 text-cyan"><ImageIcon size={22} /></div><div><h3 className="text-lg font-bold">Imagens da apresentação</h3><p className="mt-1 text-sm leading-6 text-muted">Selecione imagens ou um PPTX. PPTX será convertido em imagens e seguirá a ordem abaixo.</p></div></div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white/5 px-4 text-sm font-semibold text-text transition hover:bg-white/10"><UploadCloud size={16} /> Selecionar imagens<input type="file" accept={IMAGE_ACCEPT} multiple className="hidden" onChange={(event) => { addImageFiles(event.target.files); event.currentTarget.value = ""; }} /></label>
          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-cyan/30 bg-cyan/10 px-4 text-sm font-semibold text-cyan transition hover:bg-cyan/15"><UploadCloud size={16} /> Selecionar PPTX<input type="file" accept={POWERPOINT_ACCEPT} multiple className="hidden" onChange={(event) => { addPowerPointFiles(event.target.files); event.currentTarget.value = ""; }} /></label>
        </div>
      </div>
      {convertingPptx && <div className="border-b border-cyan/20 bg-cyan/10 px-5 py-3 text-sm font-semibold text-cyan">Convertendo PPTX em imagens. Aguarde antes de criar o módulo...</div>}
      {items.length === 0 ? <div className="p-5 text-center text-sm text-muted">Nenhuma imagem adicionada.</div> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.16em] text-muted"><tr><th className="px-4 py-3">Ordem</th><th className="px-4 py-3">Preview</th><th className="px-4 py-3">Arquivo</th><th className="px-4 py-3">Título</th><th className="px-4 py-3">Tempo próprio</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
            <tbody className="divide-y divide-border/70">
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggingId(item.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => moveDragged(item.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className={draggingId === item.id ? "bg-cyan/10 opacity-70" : ""}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="cursor-grab rounded-lg border border-border bg-white/[0.04] px-2 py-1 text-muted active:cursor-grabbing" title="Arraste para ordenar">↕</span>
                      <span className="w-7 text-center font-bold text-text">{index + 1}</span>
                      <div className="flex flex-col gap-1">
                        <button type="button" className="rounded border border-border px-2 text-xs text-muted hover:text-text disabled:opacity-30" disabled={index === 0} onClick={() => move(item.id, -1)}>↑</button>
                        <button type="button" className="rounded border border-border px-2 text-xs text-muted hover:text-text disabled:opacity-30" disabled={index === items.length - 1} onClick={() => move(item.id, 1)}>↓</button>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><div className="flex h-14 w-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-black/30">{item.previewUrl ? <img src={item.previewUrl} alt={item.title} className="h-full w-full object-cover" /> : <ImageIcon size={20} className="text-cyan" />}</div></td>
                  <td className="px-4 py-3"><div className="font-bold text-text">{item.fileName}</div><div className="text-xs text-muted">{item.source === "pptx-slide" ? `Convertido de ${item.sourceLabel || "PPTX"}` : formatBytes(item.fileSize)}</div></td>
                  <td className="px-4 py-3"><Input value={item.title} onChange={(event) => update(item.id, { title: event.target.value })} placeholder="Título opcional" /></td>
                  <td className="px-4 py-3"><Input value={item.duration} type="number" min={3} onChange={(event) => update(item.id, { duration: event.target.value })} placeholder="Usar global" /></td>
                  <td className="px-4 py-3 text-right"><Button type="button" variant="danger" size="sm" onClick={() => remove(item.id)}><Trash2 size={15} /> Excluir</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function SiteTableSection({ items, add, update, remove }: { items: SiteItem[]; add: () => void; update: (id: string, patch: Partial<SiteItem>) => void; remove: (id: string) => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5">
        <div className="flex gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan/30 bg-cyan/10 text-cyan"><Globe2 size={22} /></div><div><h3 className="text-lg font-bold">Sites e dashboards</h3><p className="mt-1 text-sm leading-6 text-muted">Aqui sim você usa URL. O modo automático tenta incorporar; o modo proxy tenta exibir sistemas próprios que bloqueiam iframe.</p></div></div>
        <Button type="button" variant="secondary" onClick={add}><Plus size={16} /> Adicionar site</Button>
      </div>
      {items.length === 0 ? <div className="p-5 text-center text-sm text-muted">Nenhum site adicionado.</div> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.16em] text-muted"><tr><th className="px-4 py-3">Título</th><th className="px-4 py-3">URL</th><th className="px-4 py-3">Modo</th><th className="px-4 py-3">Tempo próprio</th><th className="px-4 py-3">Refresh min.</th><th className="px-4 py-3 text-right">Ação</th></tr></thead>
            <tbody className="divide-y divide-border/70">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3"><Input value={item.title} onChange={(event) => update(item.id, { title: event.target.value })} placeholder="Título opcional" /></td>
                  <td className="px-4 py-3"><Input value={item.url} onChange={(event) => update(item.id, { url: event.target.value })} placeholder="https://..." /></td>
                  <td className="px-4 py-3"><Select value={item.openMode} onChange={(event) => update(item.id, { openMode: event.target.value as "IFRAME" | "NEW_TAB" | "PROXY" })}>
                      <option value="IFRAME">Automático / embed</option>
                      <option value="PROXY">Sistema próprio / proxy</option>
                      <option value="NEW_TAB">Link externo / aviso</option>
                    </Select></td>
                  <td className="px-4 py-3"><Input value={item.duration} type="number" min={3} onChange={(event) => update(item.id, { duration: event.target.value })} placeholder="Usar global" /></td>
                  <td className="px-4 py-3"><Input value={item.refreshInterval} type="number" min={1} onChange={(event) => update(item.id, { refreshInterval: event.target.value })} placeholder="Opcional" /></td>
                  <td className="px-4 py-3 text-right"><Button type="button" variant="danger" size="sm" onClick={() => remove(item.id)}><Trash2 size={15} /> Excluir</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
