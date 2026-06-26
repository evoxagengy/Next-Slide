"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ExternalLink, Presentation, MonitorX, RefreshCcw } from "lucide-react";

type PlayerSlide = {
  id: string;
  type: "IMAGE" | "URL" | "DASHBOARD" | "POWERPOINT" | "TEXT";
  title: string | null;
  description: string | null;
  contentUrl: string | null;
  textContent: string | null;
  duration: number;
  fit: string;
  backgroundColor: string | null;
  refreshInterval: number | null;
  openMode: string;
};

type ReadyState = {
  status: "ready";
  module: {
    id: string;
    name: string;
    description: string | null;
    theme: string;
    defaultDuration: number;
    defaultTransition: string;
    logoUrl: string | null;
  };
  company: { name: string };
  slides: PlayerSlide[];
};

type PlayerState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "license_unavailable"; companyName: string }
  | { status: "module_inactive"; name: string }
  | { status: "empty"; name: string; companyName: string }
  | ReadyState;

export function TVPlayer({ publicToken }: { publicToken: string }) {
  const [state, setState] = useState<PlayerState>({ status: "loading" });
  const [index, setIndex] = useState(0);
  const [clock, setClock] = useState(() => new Date());
  const [iframeError, setIframeError] = useState(false);
  const [iframeReloadKey, setIframeReloadKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/player/${publicToken}`, { cache: "no-store" });
      const data = await response.json();
      setState(data);
      if (data.status === "ready") {
        setIndex((current) => Math.min(current, data.slides.length - 1));
      }
    } catch {
      setState({ status: "invalid" });
    }
  }, [publicToken]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const interval = window.setInterval(load, 60_000);
    return () => window.clearInterval(interval);
  }, [load]);
  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const currentSlide = state.status === "ready" ? state.slides[index] : null;
  const durationMs = (currentSlide?.duration || 15) * 1000;

  useEffect(() => {
    if (state.status !== "ready" || state.slides.length === 0) return;
    setIframeError(false);
    setIframeReloadKey((current) => current + 1);
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % state.slides.length), durationMs);
    return () => window.clearTimeout(timer);
  }, [state, index, durationMs]);

  useEffect(() => {
    if (!currentSlide || !currentSlide.refreshInterval) return;
    const isEmbeddableType = currentSlide.type === "URL" || currentSlide.type === "DASHBOARD" || currentSlide.type === "POWERPOINT";
    if (!isEmbeddableType) return;
    const timer = window.setInterval(() => {
      setIframeError(false);
      setIframeReloadKey((current) => current + 1);
    }, currentSlide.refreshInterval * 60_000);
    return () => window.clearInterval(timer);
  }, [currentSlide]);

  if (state.status === "loading") return <StatusScreen title="Carregando Next Slide" description="Preparando player em tela cheia." />;
  if (state.status === "invalid") return <StatusScreen icon="error" title="Link inválido" description="Token não encontrado ou link regenerado pelo administrador." />;
  if (state.status === "license_unavailable") return <StatusScreen icon="error" title="Licença indisponível" description="Entre em contato com o administrador da organização." />;
  if (state.status === "module_inactive") return <StatusScreen icon="warning" title="Módulo inativo" description="Este módulo foi desativado temporariamente." />;
  if (state.status === "empty") return <StatusScreen title="Módulo sem slides" description="Adicione slides ativos para iniciar a exibição na TV." />;

  const transitionDuration = state.module.defaultTransition === "cut" ? 0 : 0.45;
  const motionInitial = state.module.defaultTransition === "cut" ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.01 };
  const motionExit = state.module.defaultTransition === "cut" ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.995 };

  return (
    <main className="tv-safe relative h-screen w-screen overflow-hidden bg-background text-text">
      <div className="absolute inset-0 bg-radial-blue next-grid" />
      <AnimatePresence mode="wait">
        <motion.section
          key={currentSlide?.id}
          initial={motionInitial}
          animate={{ opacity: 1, scale: 1 }}
          exit={motionExit}
          transition={{ duration: transitionDuration }}
          className="relative z-10 h-full w-full"
          style={{ backgroundColor: currentSlide?.backgroundColor || "#070B12" }}
        >
          {currentSlide && <SlideRenderer slide={currentSlide} iframeKey={iframeReloadKey} iframeError={iframeError} onIframeError={() => setIframeError(true)} />}
        </motion.section>
      </AnimatePresence>
      <div className="pointer-events-none absolute bottom-6 left-6 right-6 z-20 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 px-5 py-3 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          {state.module.logoUrl ? <img src={state.module.logoUrl} alt="Logo" className="h-8 max-w-32 object-contain" /> : <div className="h-3 w-3 rounded-full bg-cyan shadow-glow" />}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{state.module.name}</div>
            <div className="text-xs text-muted">{state.company.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted">
          <span>{index + 1}/{state.slides.length}</span>
          <span className="hidden items-center gap-2 sm:flex"><Clock size={16} /> {clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>
    </main>
  );
}

function SlideRenderer({ slide, iframeKey, iframeError, onIframeError }: { slide: PlayerSlide; iframeKey: number; iframeError: boolean; onIframeError: () => void }) {
  if (slide.type === "TEXT") return <TextSlide slide={slide} />;
  if (slide.type === "IMAGE" && slide.contentUrl) {
    return <img src={slide.contentUrl} alt={slide.title || "Imagem do módulo"} className="h-full w-full object-cover" onError={onIframeError} />;
  }
  if (slide.type === "POWERPOINT" && slide.contentUrl) {
    if (slide.openMode === "NEW_TAB" || iframeError) return <EmbedFallback url={slide.contentUrl} title={slide.title} powerPoint />;
    return <iframe key={`${slide.id}-${iframeKey}`} title={slide.title || "PowerPoint"} src={toPowerPointEmbedUrl(slide.contentUrl)} className="h-full w-full border-0 bg-white" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads" onError={onIframeError} />;
  }
  if ((slide.type === "URL" || slide.type === "DASHBOARD") && slide.contentUrl) {
    if (slide.openMode === "NEW_TAB" || iframeError) return <EmbedFallback url={slide.contentUrl} title={slide.title} />;
    return <iframe key={`${slide.id}-${iframeKey}`} title={slide.title || "Conteúdo externo"} src={slide.contentUrl} className="h-full w-full border-0 bg-white" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads" onError={onIframeError} />;
  }
  return <StatusScreen title="Slide sem conteúdo" description="Revise a configuração deste slide no painel administrativo." />;
}

function absoluteUrl(url: string) {
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
}

function toPowerPointEmbedUrl(url: string) {
  try {
    const absolute = absoluteUrl(url);
    const parsed = new URL(absolute);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("view.officeapps.live.com") || host.includes("docs.google.com")) return absolute;
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absolute)}`;
  } catch {
    return url;
  }
}

function TextSlide({ slide }: { slide: PlayerSlide }) {
  return (
    <div className="flex h-full items-center justify-center p-12 text-center">
      <div className="max-w-5xl">
        <div className="mx-auto mb-8 h-2 w-28 rounded-full bg-gradient-to-r from-primary to-cyan" />
        {slide.title && <h1 className="text-6xl font-black tracking-tight md:text-8xl">{slide.title}</h1>}
        {slide.description && <p className="mt-6 text-2xl text-muted md:text-3xl">{slide.description}</p>}
        {slide.textContent && <p className="mt-10 whitespace-pre-wrap text-3xl leading-snug text-slate-100 md:text-5xl">{slide.textContent}</p>}
      </div>
    </div>
  );
}

function EmbedFallback({ url, title, powerPoint = false }: { url: string; title: string | null; powerPoint?: boolean }) {
  const Icon = powerPoint ? Presentation : MonitorX;
  return (
    <div className="flex h-full items-center justify-center p-10 text-center">
      <div className="max-w-3xl rounded-3xl border border-border bg-card/90 p-10 shadow-card backdrop-blur-xl">
        <Icon className="mx-auto text-cyan" size={56} />
        <h1 className="mt-6 text-4xl font-black">{title || (powerPoint ? "PowerPoint" : "Conteúdo externo")}</h1>
        <p className="mt-4 text-lg leading-8 text-muted">
          {powerPoint
            ? "Este PowerPoint não pôde ser incorporado pelo visualizador online. Use PDF/imagem para máxima compatibilidade ou abra o conteúdo em nova guia."
            : "Este conteúdo não permite incorporação ou foi configurado para abrir fora do iframe. Use um link compatível com embed ou abra em nova guia."}
        </p>
        <a href={absoluteUrl(url)} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-cyan px-6 py-3 font-bold text-white"><ExternalLink size={18} /> Abrir conteúdo</a>
      </div>
    </div>
  );
}

function StatusScreen({ title, description, icon = "loading" }: { title: string; description: string; icon?: "loading" | "warning" | "error" }) {
  const Icon = icon === "loading" ? RefreshCcw : MonitorX;
  return (
    <main className="flex h-screen w-screen items-center justify-center bg-background bg-radial-blue p-8 text-center text-text next-grid">
      <div className="max-w-2xl rounded-3xl border border-border bg-card/85 p-10 shadow-card backdrop-blur-xl">
        <Icon className={`mx-auto ${icon === "loading" ? "animate-spin text-cyan" : icon === "warning" ? "text-warning" : "text-danger"}`} size={58} />
        <h1 className="mt-6 text-4xl font-black">{title}</h1>
        <p className="mt-4 text-lg leading-8 text-muted">{description}</p>
      </div>
    </main>
  );
}
