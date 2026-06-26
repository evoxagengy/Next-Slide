"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Clock, Presentation, Globe2, Image as ImageIcon, Plus, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type MediaItem = {
  id: string;
  title: string;
  url: string;
  duration: string;
  fit?: "COVER" | "CONTAIN";
  openMode?: "IFRAME" | "NEW_TAB";
  refreshInterval?: string;
};

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function compactItems(items: MediaItem[], fallbackDuration: number) {
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

export function ModuleCreateForm() {
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
  const [images, setImages] = useState<MediaItem[]>([emptyImage()]);
  const [sites, setSites] = useState<MediaItem[]>([emptySite()]);
  const [powerPoints, setPowerPoints] = useState<MediaItem[]>([]);

  const totalValidSlides = useMemo(() => {
    return images.filter((item) => item.url.trim()).length + sites.filter((item) => item.url.trim()).length + powerPoints.filter((item) => item.url.trim()).length;
  }, [images, sites, powerPoints]);

  function updateItem(kind: "images" | "sites" | "powerPoints", id: string, patch: Partial<MediaItem>) {
    const setter = kind === "images" ? setImages : kind === "sites" ? setSites : setPowerPoints;
    setter((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(kind: "images" | "sites" | "powerPoints", id: string) {
    const setter = kind === "images" ? setImages : kind === "sites" ? setSites : setPowerPoints;
    setter((current) => current.filter((item) => item.id !== id));
  }

  async function submit() {
    setLoading(true);
    setError("");

    const imageSeconds = Number(imageDuration || defaultDuration || 15);
    const siteSeconds = Number(siteDuration || defaultDuration || 30);
    const powerPointSeconds = Number(powerPointDuration || defaultDuration || 30);

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
      images: compactItems(images, imageSeconds),
      sites: compactItems(sites, siteSeconds),
      powerPoints: compactItems(powerPoints, powerPointSeconds)
    };

    if (!payload.name.trim()) {
      setLoading(false);
      setError("Informe o nome do módulo.");
      return;
    }

    if (payload.images.length + payload.sites.length + payload.powerPoints.length === 0) {
      setLoading(false);
      setError("Adicione pelo menos uma imagem, site ou PowerPoint com URL válida.");
      return;
    }

    const response = await fetch("/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
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
    <div className="space-y-6">
      <Card className="overflow-hidden p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-xs font-bold text-cyan">
              <Wand2 size={14} /> Criador inteligente de módulo
            </div>
            <h3 className="mt-4 text-xl font-black">Monte a sequência completa da TV</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Adicione imagens, sites e PowerPoints por URL pública. O Next Slide cria todos os slides já ordenados e prontos para o player 24/7.
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

      <MediaSection
        icon={<ImageIcon size={22} />}
        title="Imagens"
        description="Cole URLs públicas de imagens. Cada imagem vira um slide. Use duração individual apenas quando quiser fugir do tempo global."
        items={images}
        kind="images"
        addLabel="Adicionar imagem"
        add={() => setImages((current) => [...current, emptyImage()])}
        update={updateItem}
        remove={removeItem}
        urlPlaceholder="https://site.com/imagem.jpg"
        showFit
      />

      <MediaSection
        icon={<Globe2 size={22} />}
        title="Sites e dashboards"
        description="Cole links de sites, dashboards, Power BI, Grafana, Looker Studio ou páginas internas. Se o site bloquear iframe, o player mostra fallback elegante."
        items={sites}
        kind="sites"
        addLabel="Adicionar site"
        add={() => setSites((current) => [...current, emptySite()])}
        update={updateItem}
        remove={removeItem}
        urlPlaceholder="https://dashboard.empresa.com"
        showOpenMode
        showRefresh
      />

      <MediaSection
        icon={<Presentation size={22} />}
        title="PowerPoints"
        description="Use URL pública de arquivo .ppt/.pptx ou link público compatível. O player exibe via Office Viewer quando possível."
        items={powerPoints}
        kind="powerPoints"
        addLabel="Adicionar PowerPoint"
        add={() => setPowerPoints((current) => [...current, emptyPowerPoint()])}
        update={updateItem}
        remove={removeItem}
        urlPlaceholder="https://site.com/apresentacao.pptx"
      />

      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-red-200">{error}</div>}

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card/90 p-4 shadow-card backdrop-blur-xl">
        <div>
          <div className="font-bold text-text">Pronto para criar</div>
          <div className="text-sm text-muted">O módulo será criado já com {totalValidSlides} slide(s), ordenação e tempos definidos.</div>
        </div>
        <Button type="button" onClick={submit} disabled={loading} size="lg">
          {loading ? "Criando módulo..." : "Criar módulo completo"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}

function MediaSection({
  icon,
  title,
  description,
  items,
  kind,
  addLabel,
  add,
  update,
  remove,
  urlPlaceholder,
  showFit = false,
  showOpenMode = false,
  showRefresh = false
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: MediaItem[];
  kind: "images" | "sites" | "powerPoints";
  addLabel: string;
  add: () => void;
  update: (kind: "images" | "sites" | "powerPoints", id: string, patch: Partial<MediaItem>) => void;
  remove: (kind: "images" | "sites" | "powerPoints", id: string) => void;
  urlPlaceholder: string;
  showFit?: boolean;
  showOpenMode?: boolean;
  showRefresh?: boolean;
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
        <Button type="button" variant="secondary" onClick={add}><Plus size={16} /> {addLabel}</Button>
      </div>

      <div className="mt-5 space-y-3">
        {items.length === 0 && <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted">Nenhum item adicionado.</div>}
        {items.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-border bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-text">{title.slice(0, -1)} {index + 1}</div>
              <Button type="button" variant="danger" size="sm" onClick={() => remove(kind, item.id)}><Trash2 size={15} /> Excluir</Button>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_2fr_150px]">
              <Input value={item.title} onChange={(event) => update(kind, item.id, { title: event.target.value })} placeholder="Título opcional" />
              <Input value={item.url} onChange={(event) => update(kind, item.id, { url: event.target.value })} placeholder={urlPlaceholder} />
              <Input value={item.duration} type="number" min={3} onChange={(event) => update(kind, item.id, { duration: event.target.value })} placeholder="Tempo próprio" />
            </div>
            {(showFit || showOpenMode || showRefresh) && (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {showFit && <Select value={item.fit || "COVER"} onChange={(event) => update(kind, item.id, { fit: event.target.value as "COVER" | "CONTAIN" })}><option value="COVER">Imagem cover</option><option value="CONTAIN">Imagem contain</option></Select>}
                {showOpenMode && <Select value={item.openMode || "IFRAME"} onChange={(event) => update(kind, item.id, { openMode: event.target.value as "IFRAME" | "NEW_TAB" })}><option value="IFRAME">Iframe quando permitido</option><option value="NEW_TAB">Fallback / nova aba</option></Select>}
                {showRefresh && <Input value={item.refreshInterval || ""} type="number" min={1} onChange={(event) => update(kind, item.id, { refreshInterval: event.target.value })} placeholder="Refresh min. opcional" />}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
