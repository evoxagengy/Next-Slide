"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Clock, FileUp, Globe2, Image as ImageIcon, Plus, Presentation, Trash2, UploadCloud, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const POWERPOINT_ACCEPT = ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation";

type MediaItem = {
  id: string;
  title: string;
  url: string;
  duration: string;
  fit?: "COVER" | "CONTAIN";
  openMode?: "IFRAME" | "NEW_TAB";
  refreshInterval?: string;
  file?: File | null;
  fileName?: string;
  fileSize?: number;
  previewUrl?: string;
};

type ModuleCreateFormProps = {
  modalMode?: boolean;
  onCreated?: () => void;
  onCancel?: () => void;
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

function itemFromFile(file: File, fit: "COVER" | "CONTAIN" = "COVER"): MediaItem {
  const cleanName = file.name.replace(/\.[^.]+$/, "");
  return {
    id: makeId(),
    title: cleanName,
    url: "",
    duration: "",
    fit,
    openMode: "IFRAME",
    file,
    fileName: file.name,
    fileSize: file.size,
    previewUrl: filePreview(file)
  };
}

function emptyImage(): MediaItem {
  return { id: makeId(), title: "", url: "", duration: "", fit: "COVER", openMode: "IFRAME" };
}

function emptySite(): MediaItem {
  return { id: makeId(), title: "", url: "", duration: "", fit: "COVER", openMode: "IFRAME", refreshInterval: "" };
}

function emptyPowerPoint(): MediaItem {
  return { id: makeId(), title: "", url: "", duration: "", fit: "CONTAIN", openMode: "IFRAME" };
}

async function uploadAsset(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/assets", {
    method: "POST",
    body: formData
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Não foi possível enviar ${file.name}.`);
  }

  return data.asset as { id: string; url: string; fileName: string; mimeType: string; sizeBytes: number; kind: "image" | "powerpoint" };
}

async function compactFileItems(items: MediaItem[], fallbackDuration: number, defaultFit: "COVER" | "CONTAIN") {
  const result = [] as Array<{
    title: string | null;
    url: string;
    duration: number;
    fit: "COVER" | "CONTAIN";
    openMode: "IFRAME" | "NEW_TAB";
    refreshInterval: number | null;
  }>;

  for (const item of items) {
    let url = item.url.trim();
    if (item.file) {
      const asset = await uploadAsset(item.file);
      url = asset.url;
    }
    if (!url) continue;

    result.push({
      title: item.title.trim() || item.fileName || null,
      url,
      duration: item.duration ? Number(item.duration) : fallbackDuration,
      fit: item.fit || defaultFit,
      openMode: item.openMode || "IFRAME",
      refreshInterval: item.refreshInterval ? Number(item.refreshInterval) : null
    });
  }

  return result;
}

function compactSites(items: MediaItem[], fallbackDuration: number) {
  return items
    .map((item) => ({
      title: item.title.trim() || null,
      url: item.url.trim(),
      duration: item.duration ? Number(item.duration) : fallbackDuration,
      fit: item.fit || "COVER",
      openMode: item.openMode || "IFRAME",
      refreshInterval: item.refreshInterval ? Number(item.refreshInterval) : null
    }))
    .filter((item) => item.url.length > 0);
}

export function ModuleCreateForm({ modalMode = false, onCreated, onCancel }: ModuleCreateFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultDuration, setDefaultDuration] = useState("15");
  const [imageDuration, setImageDuration] = useState("15");
  const [siteDuration, setSiteDuration] = useState("30");
  const [powerPointDuration, setPowerPointDuration] = useState("30");
  const [transition, setTransition] = useState<"fade" | "cut">("fade");
  const [logoUrl, setLogoUrl] = useState("");
  const [showSiteEveryImages, setShowSiteEveryImages] = useState("0");
  const [images, setImages] = useState<MediaItem[]>([]);
  const [sites, setSites] = useState<MediaItem[]>([emptySite()]);
  const [powerPoints, setPowerPoints] = useState<MediaItem[]>([]);

  const totalValidSlides = useMemo(() => {
    return images.filter((item) => item.file || item.url.trim()).length + sites.filter((item) => item.url.trim()).length + powerPoints.filter((item) => item.file || item.url.trim()).length;
  }, [images, sites, powerPoints]);

  function updateItem(kind: "images" | "sites" | "powerPoints", id: string, patch: Partial<MediaItem>) {
    const setter = kind === "images" ? setImages : kind === "sites" ? setSites : setPowerPoints;
    setter((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(kind: "images" | "sites" | "powerPoints", id: string) {
    const setter = kind === "images" ? setImages : kind === "sites" ? setSites : setPowerPoints;
    setter((current) => current.filter((item) => item.id !== id));
  }

  function addFiles(kind: "images" | "powerPoints", fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const items = files.map((file) => itemFromFile(file, kind === "images" ? "COVER" : "CONTAIN"));
    if (kind === "images") setImages((current) => [...current, ...items]);
    else setPowerPoints((current) => [...current, ...items]);
  }

  async function submit() {
    setLoading(true);
    setError("");

    try {
      const imageSeconds = Number(imageDuration || defaultDuration || 15);
      const siteSeconds = Number(siteDuration || defaultDuration || 30);
      const powerPointSeconds = Number(powerPointDuration || defaultDuration || 30);

      if (!name.trim()) {
        setError("Informe o nome do módulo.");
        setLoading(false);
        return;
      }

      if (totalValidSlides === 0) {
        setError("Adicione pelo menos uma imagem, site ou PowerPoint.");
        setLoading(false);
        return;
      }

      const [uploadedImages, uploadedPowerPoints] = await Promise.all([
        compactFileItems(images, imageSeconds, "COVER"),
        compactFileItems(powerPoints, powerPointSeconds, "CONTAIN")
      ]);

      const payload = {
        name,
        description: description || null,
        defaultDuration: Number(defaultDuration || 15),
        defaultTransition: transition,
        theme: "next-dark",
        logoUrl: logoUrl || "",
        imageDuration: imageSeconds,
        siteDuration: siteSeconds,
        powerPointDuration: powerPointSeconds,
        showSiteEveryImages: Number(showSiteEveryImages || 0),
        images: uploadedImages,
        sites: compactSites(sites, siteSeconds),
        powerPoints: uploadedPowerPoints
      };

      const response = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao criar módulo.");

      onCreated?.();
      router.push(`/modules/${data.module.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar módulo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={modalMode ? "space-y-5" : "space-y-6"}>
      <Card className="overflow-hidden p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-xs font-bold text-cyan">
              <Wand2 size={14} /> Criador inteligente de módulo
            </div>
            <h3 className="mt-4 text-xl font-black">Monte a sequência completa da TV</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Envie imagens e PowerPoints direto do computador, adicione sites/dashboards por URL e defina tempos globais ou individuais.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-white/[0.04] px-4 py-3 text-right">
            <div className="text-2xl font-black text-text">{totalValidSlides}</div>
            <div className="text-xs text-muted">slides válidos</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Field label="Nome do módulo">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Gestão à vista - Produção" required />
          </Field>
          <Field label="Logo por URL (opcional)">
            <Input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="https://..." />
          </Field>
          <div className="lg:col-span-2">
            <Field label="Descrição opcional">
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Resumo do conteúdo exibido nesta TV." />
            </Field>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Clock className="text-cyan" size={22} />
          <div>
            <h3 className="text-lg font-bold">Tempo e transição</h3>
            <p className="text-sm text-muted">Use tempo global por tipo ou sobrescreva individualmente em cada item.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Tempo padrão geral (s)"><Input type="number" min={3} value={defaultDuration} onChange={(event) => setDefaultDuration(event.target.value)} /></Field>
          <Field label="Tempo global imagens (s)"><Input type="number" min={3} value={imageDuration} onChange={(event) => setImageDuration(event.target.value)} /></Field>
          <Field label="Tempo global sites (s)"><Input type="number" min={3} value={siteDuration} onChange={(event) => setSiteDuration(event.target.value)} /></Field>
          <Field label="Tempo global PowerPoint (s)"><Input type="number" min={3} value={powerPointDuration} onChange={(event) => setPowerPointDuration(event.target.value)} /></Field>
          <Field label="Transição"><Select value={transition} onChange={(event) => setTransition(event.target.value as "fade" | "cut")}><option value="fade">Fade</option><option value="cut">Cut seco</option></Select></Field>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
          <Field label="Exibir site a cada N imagens">
            <Input type="number" min={0} value={showSiteEveryImages} onChange={(event) => setShowSiteEveryImages(event.target.value)} />
          </Field>
          <div className="rounded-2xl border border-border bg-white/[0.04] p-4 text-sm leading-6 text-muted">
            Use <b className="text-text">10</b> para inserir um site após cada 10 imagens. Use <b className="text-text">0</b> para deixar imagens primeiro, depois sites e PowerPoints.
          </div>
        </div>
      </Card>

      <FileMediaSection
        icon={<ImageIcon size={22} />}
        title="Imagens"
        description="Selecione arquivos de imagem do computador. Cada arquivo vira um slide e fica disponível no player da TV. Formatos: JPG, PNG, WEBP e GIF."
        items={images}
        kind="images"
        accept={IMAGE_ACCEPT}
        addLabel="Selecionar imagens"
        addFiles={addFiles}
        addEmpty={() => setImages((current) => [...current, emptyImage()])}
        update={updateItem}
        remove={removeItem}
        showFit
      />

      <SiteSection
        icon={<Globe2 size={22} />}
        title="Sites e dashboards"
        description="Adicione sites, Power BI, Grafana, Looker Studio, dashboards internos ou páginas externas por URL. Se bloquear iframe, o player mostra fallback elegante."
        items={sites}
        add={() => setSites((current) => [...current, emptySite()])}
        update={updateItem}
        remove={removeItem}
      />

      <FileMediaSection
        icon={<Presentation size={22} />}
        title="PowerPoints"
        description="Selecione arquivos .ppt ou .pptx do computador. O player tenta exibir com Office Viewer usando o arquivo publicado pelo próprio sistema."
        items={powerPoints}
        kind="powerPoints"
        accept={POWERPOINT_ACCEPT}
        addLabel="Selecionar PowerPoints"
        addFiles={addFiles}
        addEmpty={() => setPowerPoints((current) => [...current, emptyPowerPoint()])}
        update={updateItem}
        remove={removeItem}
      />

      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-red-200">{error}</div>}

      <div className={`${modalMode ? "" : "sticky bottom-4 z-10"} flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card/90 p-4 shadow-card backdrop-blur-xl`}>
        <div>
          <div className="font-bold text-text">Pronto para criar</div>
          <div className="text-sm text-muted">O módulo será criado já com {totalValidSlides} slide(s), ordenação e tempos definidos.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onCancel && <Button type="button" variant="secondary" onClick={onCancel}><X size={16} /> Cancelar</Button>}
          <Button type="button" onClick={submit} disabled={loading} size="lg">
            {loading ? "Enviando arquivos e criando..." : "Criar módulo completo"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}

function FileMediaSection({
  icon,
  title,
  description,
  items,
  kind,
  accept,
  addLabel,
  addFiles,
  addEmpty,
  update,
  remove,
  showFit = false
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: MediaItem[];
  kind: "images" | "powerPoints";
  accept: string;
  addLabel: string;
  addFiles: (kind: "images" | "powerPoints", files: FileList | null) => void;
  addEmpty: () => void;
  update: (kind: "images" | "sites" | "powerPoints", id: string, patch: Partial<MediaItem>) => void;
  remove: (kind: "images" | "sites" | "powerPoints", id: string) => void;
  showFit?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan/30 bg-cyan/10 text-cyan">{icon}</div>
          <div>
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-muted">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white/5 px-4 text-sm font-semibold text-text transition hover:bg-white/10">
            <UploadCloud size={16} /> {addLabel}
            <input type="file" accept={accept} multiple className="hidden" onChange={(event) => { addFiles(kind, event.target.files); event.currentTarget.value = ""; }} />
          </label>
          <Button type="button" variant="secondary" onClick={addEmpty}><Plus size={16} /> Adicionar linha</Button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.length === 0 && <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted">Nenhum arquivo adicionado.</div>}
        {items.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-border bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-text">{title.slice(0, -1)} {index + 1}</div>
              <Button type="button" variant="danger" size="sm" onClick={() => remove(kind, item.id)}><Trash2 size={15} /> Excluir</Button>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_2fr_150px]">
              <Input value={item.title} onChange={(event) => update(kind, item.id, { title: event.target.value })} placeholder="Título opcional" />
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border bg-white/[0.04] px-3 text-sm text-muted transition hover:border-cyan/60 hover:bg-white/[0.06]">
                <FileUp size={17} className="text-cyan" />
                <span className="min-w-0 flex-1 truncate">{item.fileName ? `${item.fileName} ${formatBytes(item.fileSize)}` : "Selecionar arquivo"}</span>
                <input type="file" accept={accept} className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) update(kind, item.id, { file, fileName: file.name, fileSize: file.size, previewUrl: filePreview(file), title: item.title || file.name.replace(/\.[^.]+$/, "") });
                  event.currentTarget.value = "";
                }} />
              </label>
              <Input value={item.duration} type="number" min={3} onChange={(event) => update(kind, item.id, { duration: event.target.value })} placeholder="Tempo próprio" />
            </div>
            {item.previewUrl && (
              <div className="mt-3 overflow-hidden rounded-xl border border-border bg-black/30">
                <img src={item.previewUrl} alt={item.title || item.fileName || "Preview"} className="max-h-48 w-full object-contain" />
              </div>
            )}
            {showFit && (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Select value={item.fit || "COVER"} onChange={(event) => update(kind, item.id, { fit: event.target.value as "COVER" | "CONTAIN" })}><option value="COVER">Imagem cover</option><option value="CONTAIN">Imagem contain</option></Select>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function SiteSection({
  icon,
  title,
  description,
  items,
  add,
  update,
  remove
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: MediaItem[];
  add: () => void;
  update: (kind: "images" | "sites" | "powerPoints", id: string, patch: Partial<MediaItem>) => void;
  remove: (kind: "images" | "sites" | "powerPoints", id: string) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan/30 bg-cyan/10 text-cyan">{icon}</div>
          <div>
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-muted">{description}</p>
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={add}><Plus size={16} /> Adicionar site</Button>
      </div>

      <div className="mt-5 space-y-3">
        {items.length === 0 && <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted">Nenhum site adicionado.</div>}
        {items.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-border bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-text">Site {index + 1}</div>
              <Button type="button" variant="danger" size="sm" onClick={() => remove("sites", item.id)}><Trash2 size={15} /> Excluir</Button>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_2fr_150px]">
              <Input value={item.title} onChange={(event) => update("sites", item.id, { title: event.target.value })} placeholder="Título opcional" />
              <Input value={item.url} onChange={(event) => update("sites", item.id, { url: event.target.value })} placeholder="https://dashboard.empresa.com" />
              <Input value={item.duration} type="number" min={3} onChange={(event) => update("sites", item.id, { duration: event.target.value })} placeholder="Tempo próprio" />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Select value={item.openMode || "IFRAME"} onChange={(event) => update("sites", item.id, { openMode: event.target.value as "IFRAME" | "NEW_TAB" })}><option value="IFRAME">Iframe quando permitido</option><option value="NEW_TAB">Fallback / nova aba</option></Select>
              <Input value={item.refreshInterval || ""} type="number" min={1} onChange={(event) => update("sites", item.id, { refreshInterval: event.target.value })} placeholder="Refresh min. opcional" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
