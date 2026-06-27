"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Presentation, MonitorX, RefreshCcw } from "lucide-react";

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
    showClock: boolean;
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

type EmbedDecision = {
  checking: boolean;
  blocked: boolean;
  reason: string | null;
};

const DEFAULT_EMBED_DECISION: EmbedDecision = {
  checking: false,
  blocked: false,
  reason: null
};

function getOrCreateDeviceKey(publicToken: string) {
  if (typeof window === "undefined") return "server";
  const storageKey = `next-slide-device:${publicToken}`;
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const generated =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(storageKey, generated);
  return generated;
}


export function TVPlayer({ publicToken }: { publicToken: string }) {
  const [state, setState] = useState<PlayerState>({ status: "loading" });
  const [index, setIndex] = useState(0);
  const [clock, setClock] = useState(() => new Date());
  const [iframeError, setIframeError] = useState(false);
  const [iframeReloadKey, setIframeReloadKey] = useState(0);
  const [embedDecision, setEmbedDecision] = useState<EmbedDecision>(DEFAULT_EMBED_DECISION);
  const embedDecisionCacheRef = useRef<Record<string, EmbedDecision>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(15);

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

  const currentEmbedUrl = useMemo(() => {
    if (!currentSlide?.contentUrl) return null;
    if (currentSlide.type === "POWERPOINT") return toPowerPointEmbedUrl(currentSlide.contentUrl);
    if ((currentSlide.type === "URL" || currentSlide.type === "DASHBOARD") && currentSlide.openMode === "PROXY") {
      return toProxyUrl(currentSlide.contentUrl, publicToken);
    }
    return currentSlide.contentUrl;
  }, [currentSlide, publicToken]);

  const sendHeartbeat = useCallback(async () => {
    if (state.status !== "ready") return;

    try {
      await fetch(`/api/player/${publicToken}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        keepalive: true,
        body: JSON.stringify({
          deviceKey: getOrCreateDeviceKey(publicToken),
          screenWidth: window.screen?.width || window.innerWidth,
          screenHeight: window.screen?.height || window.innerHeight,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          slideId: currentSlide?.id || null,
          slideTitle: currentSlide?.title || currentSlide?.description || null,
          slideIndex: index,
          path: window.location.pathname
        })
      });
    } catch {
      // O heartbeat não pode interromper a apresentação da TV.
    }
  }, [state.status, publicToken, currentSlide?.id, currentSlide?.title, currentSlide?.description, index]);

  useEffect(() => {
    if (state.status !== "ready") return;

    void sendHeartbeat();

    const interval = window.setInterval(() => {
      void sendHeartbeat();
    }, 30_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") void sendHeartbeat();
    };

    window.addEventListener("online", sendHeartbeat);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", sendHeartbeat);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [state.status, sendHeartbeat]);


  useEffect(() => {
    if (state.status !== "ready" || state.slides.length === 0) return;
    setIframeError(false);
    setIframeReloadKey((current) => current + 1);
    setRemainingSeconds(Math.max(1, Math.ceil(durationMs / 1000)));

    const endAt = Date.now() + durationMs;
    const countdown = window.setInterval(() => {
      setRemainingSeconds(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
    }, 1000);
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % state.slides.length), durationMs);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(countdown);
    };
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

  useEffect(() => {
    const checkUrl = currentSlide?.contentUrl;
    const shouldCheck =
      Boolean(checkUrl) &&
      currentSlide?.openMode === "IFRAME" &&
      (currentSlide?.type === "URL" || currentSlide?.type === "DASHBOARD");

    if (!shouldCheck || !checkUrl) {
      setEmbedDecision(DEFAULT_EMBED_DECISION);
      return;
    }

    const cacheKey = `${currentSlide.id}:${checkUrl}`;
    const cachedDecision = embedDecisionCacheRef.current[cacheKey];

    if (cachedDecision) {
      setEmbedDecision(cachedDecision);
      return;
    }

    const controller = new AbortController();
    setEmbedDecision({ checking: true, blocked: false, reason: null });

    fetch(`/api/embed-check?url=${encodeURIComponent(checkUrl)}&token=${encodeURIComponent(publicToken)}`, {
      cache: "no-store",
      signal: controller.signal
    })
      .then((response) => response.json())
      .then((data: { blocked?: boolean; reason?: string | null }) => {
        const decision = {
          checking: false,
          blocked: Boolean(data.blocked),
          reason: data.reason || null
        };
        embedDecisionCacheRef.current[cacheKey] = decision;
        setEmbedDecision(decision);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          const decision = { checking: false, blocked: false, reason: null };
          embedDecisionCacheRef.current[cacheKey] = decision;
          setEmbedDecision(decision);
        }
      });

    return () => controller.abort();
  }, [currentSlide?.id, currentSlide?.contentUrl, currentSlide?.openMode, currentSlide?.type, publicToken]);

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
          {currentSlide && (
            <SlideRenderer
              slide={currentSlide}
              iframeKey={iframeReloadKey}
              iframeError={iframeError}
              embedDecision={embedDecision}
              embedUrl={currentEmbedUrl}
              onIframeError={() => setIframeError(true)}
              remainingSeconds={remainingSeconds}
              publicToken={publicToken}
            />
          )}
        </motion.section>
      </AnimatePresence>
      {state.module.showClock && <ClockOverlay clock={clock} />}
    </main>
  );
}

function ClockOverlay({ clock }: { clock: Date }) {
  const time = clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const date = clock.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-20 rounded-2xl border border-white/10 bg-black/25 px-4 py-2 text-right text-white shadow-lg backdrop-blur-md">
      <div className="font-mono text-3xl font-black leading-none tracking-wider drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] md:text-4xl">{time}</div>
      <div className="mt-1 font-mono text-xs font-semibold tracking-[0.22em] text-white/65 md:text-sm">{date}</div>
    </div>
  );
}

function SlideRenderer({
  slide,
  iframeKey,
  iframeError,
  embedDecision,
  embedUrl,
  onIframeError,
  remainingSeconds,
  publicToken
}: {
  slide: PlayerSlide;
  iframeKey: number;
  iframeError: boolean;
  embedDecision: EmbedDecision;
  embedUrl: string | null;
  onIframeError: () => void;
  remainingSeconds: number;
  publicToken: string;
}) {
  if (slide.type === "TEXT") return <TextSlide slide={slide} />;

  if (slide.type === "IMAGE" && slide.contentUrl) {
    return <img src={slide.contentUrl} alt={slide.title || "Imagem do módulo"} className="h-full w-full object-cover" onError={onIframeError} />;
  }

  if (slide.type === "POWERPOINT" && slide.contentUrl) {
    if (slide.openMode === "NEW_TAB" || iframeError) return <EmbedFallback url={slide.contentUrl} title={slide.title} powerPoint reason={iframeError ? "O visualizador online não conseguiu carregar este PowerPoint." : "Este PowerPoint está configurado como link externo."} remainingSeconds={remainingSeconds} />;
    return <iframe key={`${slide.id}-${iframeKey}`} title={slide.title || "PowerPoint"} src={embedUrl || toPowerPointEmbedUrl(slide.contentUrl)} className="h-full w-full border-0 bg-white" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads" onError={onIframeError} />;
  }

  if ((slide.type === "URL" || slide.type === "DASHBOARD") && slide.contentUrl) {
    if (slide.openMode === "PROXY") {
      if (iframeError) {
        return <EmbedFallback url={slide.contentUrl} title={slide.title} reason="O proxy do Next Slide não conseguiu renderizar este sistema. Verifique se o domínio está liberado em NEXT_SLIDE_PROXY_ALLOWED_HOSTS ou use link de embed/publicação." remainingSeconds={remainingSeconds} proxyMode />;
      }
      return <iframe key={`${slide.id}-${iframeKey}`} title={slide.title || "Sistema próprio"} src={embedUrl || toProxyUrl(slide.contentUrl, publicToken)} className="h-full w-full border-0 bg-white" sandbox="allow-scripts allow-forms allow-popups allow-downloads allow-top-navigation-by-user-activation" referrerPolicy="no-referrer" onError={onIframeError} />;
    }

    if (slide.openMode === "NEW_TAB" || iframeError || embedDecision.blocked) {
      return <EmbedFallback url={slide.contentUrl} title={slide.title} reason={embedDecision.reason || (iframeError ? "O site recusou a conexão dentro do iframe." : "Este link está configurado como externo.")} remainingSeconds={remainingSeconds} manualMode={slide.openMode === "NEW_TAB"} />;
    }
    return <iframe key={`${slide.id}-${iframeKey}`} title={slide.title || "Conteúdo externo"} src={slide.contentUrl} className="h-full w-full border-0 bg-white" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads" onError={onIframeError} />;
  }

  return <StatusScreen title="Slide sem conteúdo" description="Revise a configuração deste slide no painel administrativo." />;
}

function absoluteUrl(url: string) {
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
}

function toProxyUrl(url: string, publicToken: string) {
  const absolute = absoluteUrl(url);
  return `/api/proxy/page?url=${encodeURIComponent(absolute)}&token=${encodeURIComponent(publicToken)}`;
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

function EmbedFallback({ url, title, powerPoint = false, reason, remainingSeconds, manualMode = false, proxyMode = false }: { url: string; title: string | null; powerPoint?: boolean; reason?: string | null; remainingSeconds: number; manualMode?: boolean; proxyMode?: boolean }) {
  const Icon = powerPoint ? Presentation : MonitorX;
  return (
    <div className="flex h-full items-center justify-center p-10 text-center">
      <div className="max-w-4xl rounded-3xl border border-border bg-card/90 p-10 shadow-card backdrop-blur-xl">
        <Icon className="mx-auto text-cyan" size={56} />
        <h1 className="mt-6 text-4xl font-black">{title || (powerPoint ? "PowerPoint" : "Conteúdo externo")}</h1>
        <p className="mt-4 text-lg leading-8 text-muted">
          {powerPoint
            ? "Este PowerPoint não pôde ser incorporado pelo visualizador online. Para máxima compatibilidade em TV, use imagens/PDF ou um link público compatível."
            : proxyMode
              ? "Tentamos exibir este sistema próprio por proxy controlado, mas a página não respondeu de forma compatível. O player seguirá automaticamente para não travar a TV."
              : manualMode
                ? "Este link está configurado para abrir como conteúdo externo. Em TVs 24/7, o Next Slide mantém a apresentação rodando e segue automaticamente para o próximo item."
                : "Este site não permite ser exibido dentro de outro sistema. Isso é uma proteção do próprio site, não um erro do Next Slide."}
        </p>
        {reason && <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">{reason}</p>}
        <div className="mt-4 rounded-2xl border border-cyan/20 bg-cyan/10 px-4 py-3 text-sm font-semibold text-cyan">
          O player vai seguir automaticamente para o próximo slide em {Math.max(0, remainingSeconds)}s.
        </div>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href={absoluteUrl(url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-cyan px-6 py-3 font-bold text-white"><ExternalLink size={18} /> Abrir conteúdo</a>
          <span className="text-sm text-muted">Para exibir dentro do player, use link de embed/publicação ou libere iframe no sistema de origem.</span>
        </div>
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
