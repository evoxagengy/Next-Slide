import Link from "next/link";
import {
  Activity,
  BarChart3,
  Box,
  Building2,
  ExternalLink,
  Image,
  Link2,
  Monitor,
  MoreVertical,
  Plus,
  ShieldCheck,
  Tv,
  Users,
  Wifi
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { percentage } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { licenseStatusLabel, planLabel } from "@/lib/license";
import { appUrl, decryptSecret } from "@/lib/security";
import { formatDate, formatDateTime } from "@/lib/utils";

const ONLINE_WINDOW_MS = 90_000;

export default async function DashboardPage() {
  const user = await requireUser();
  const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS);

  const [
    totalModules,
    activeModules,
    totalSlides,
    activeSlides,
    usersCount,
    mediaAssets,
    recentModules,
    activeLinkModules,
    onlineDevices,
    totalDevices,
    recentDevices
  ] = await Promise.all([
    prisma.slideModule.count({ where: { licenseId: user.licenseId } }),
    prisma.slideModule.count({ where: { licenseId: user.licenseId, isActive: true } }),
    prisma.slide.count({ where: { module: { licenseId: user.licenseId } } }),
    prisma.slide.count({ where: { module: { licenseId: user.licenseId }, isActive: true } }),
    prisma.user.count({ where: { licenseId: user.licenseId } }),
    prisma.mediaAsset.count({ where: { licenseId: user.licenseId } }),
    prisma.slideModule.findMany({
      where: { licenseId: user.licenseId },
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { slides: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 4
    }),
    prisma.slideModule.findMany({
      where: { licenseId: user.licenseId, isActive: true },
      include: { _count: { select: { slides: true } } },
      orderBy: { updatedAt: "desc" },
      take: 4
    }),
    prisma.deviceSession.count({ where: { licenseId: user.licenseId, lastSeenAt: { gte: onlineSince } } }),
    prisma.deviceSession.count({ where: { licenseId: user.licenseId } }),
    prisma.deviceSession.findMany({
      where: { licenseId: user.licenseId },
      include: { module: { select: { id: true, name: true } } },
      orderBy: { lastSeenAt: "desc" },
      take: 4
    })
  ]);

  const maxSlidesInModule = Math.max(...recentModules.map((module) => module._count.slides), 0);
  const publicLinksActive = activeModules;
  const plan = planLabel(user.license.plan);
  const licenseStatus = licenseStatusLabel(user.license.status);

  return (
    <AppShell>
      <div className="flex h-auto flex-col gap-3 overflow-visible xl:h-[calc(100vh-112px)] xl:overflow-hidden">
        <section className="relative shrink-0 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(0,153,255,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.94))] px-5 py-4 shadow-[0_18px_70px_rgba(0,0,0,0.25)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px] opacity-35" />
          <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-cyan">Painel administrativo</p>
              <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white md:text-3xl">Gestão à vista em tempo real</h1>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-300 md:text-sm">
                Visão geral de módulos, slides, links públicos, TVs online e uso da licença em uma tela única.
              </p>
            </div>
            <Link href="/modules/new">
              <Button className="h-11 rounded-2xl px-5 text-sm shadow-[0_16px_44px_rgba(0,132,255,0.25)]">
                <Plus size={18} /> Criar módulo
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid shrink-0 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={Box} label="Módulos ativos" value={activeModules} detail={`${totalModules} cadastrados`} accent="blue" />
          <MetricCard icon={Image} label="Slides publicados" value={totalSlides} detail={`${activeSlides} ativos`} accent="cyan" />
          <MetricCard icon={Wifi} label="Telas online agora" value={onlineDevices} detail={`${totalDevices} registradas`} accent="green" />
          <MetricCard icon={Link2} label="Links públicos" value={publicLinksActive} detail={`${publicLinksActive} ativos`} accent="blue" />
          <LicenseMetricCard status={licenseStatus} plan={plan} expiresAt={user.license.expiresAt} />
        </section>

        <section className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <div className="grid min-h-0 gap-3 xl:grid-rows-[minmax(0,1fr)_minmax(0,0.78fr)]">
            <Card className="flex min-h-0 flex-col overflow-hidden border-white/10 bg-slate-950/70 shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
              <CardHeader className="flex shrink-0 flex-row items-center justify-between border-white/10 px-4 py-3">
                <div>
                  <h2 className="text-base font-black text-white">Módulos recentes</h2>
                  <p className="mt-0.5 text-xs text-muted">Últimas alterações e status atual.</p>
                </div>
                <Link href="/modules">
                  <Button variant="secondary" size="sm" className="h-9 rounded-xl text-xs">
                    Todos <ExternalLink size={14} />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 p-0">
                <div className="h-full overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="border-b border-white/10 bg-white/[0.025] text-[10px] uppercase tracking-[0.14em] text-slate-400">
                      <tr>
                        <th className="px-4 py-2.5 font-bold">Módulo</th>
                        <th className="px-4 py-2.5 font-bold">Tipo</th>
                        <th className="px-4 py-2.5 font-bold">Slides</th>
                        <th className="px-4 py-2.5 font-bold">Atualização</th>
                        <th className="px-4 py-2.5 font-bold">Status</th>
                        <th className="px-4 py-2.5 text-right font-bold">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {recentModules.map((module, index) => (
                        <tr key={module.id} className="group transition hover:bg-white/[0.035]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={iconTileClass(index)}>
                                <BarChart3 size={17} />
                              </div>
                              <div className="min-w-0">
                                <Link href={`/modules/${module.id}`} className="truncate text-sm font-black text-white transition hover:text-cyan">
                                  {module.name}
                                </Link>
                                <p className="mt-0.5 max-w-[280px] truncate text-[11px] text-slate-400">{module.description || "Apresentação corporativa"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone="info" className="rounded-lg border-blue-400/20 bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-200">
                              {module.theme === "next-dark" ? "Corporativo" : module.theme}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-200">{module._count.slides}</td>
                          <td className="px-4 py-3 text-xs text-slate-300">
                            <div>{formatDateTime(module.updatedAt)}</div>
                            <div className="text-[11px] text-slate-500">por {module.createdBy?.name || "Equipe"}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={module.isActive ? "success" : "warning"} className="px-2 py-0.5 text-[11px]">{module.isActive ? "Ativo" : "Inativo"}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/modules/${module.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Abrir módulo">
                              <MoreVertical size={16} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {recentModules.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Nenhum módulo criado ainda.</div>}
                </div>
              </CardContent>
            </Card>

            <Card className="flex min-h-0 flex-col overflow-hidden border-white/10 bg-slate-950/70 shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
              <CardHeader className="flex shrink-0 flex-row items-center justify-between border-white/10 px-4 py-3">
                <div>
                  <h2 className="text-base font-black text-white">Links públicos em uso</h2>
                  <p className="mt-0.5 text-xs text-muted">Links ativos para TVs e navegadores.</p>
                </div>
                <Link href="/modules">
                  <Button variant="secondary" size="sm" className="h-9 rounded-xl text-xs">
                    Gerenciar <ExternalLink size={14} />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 p-0">
                <div className="divide-y divide-white/10">
                  {activeLinkModules.slice(0, 3).map((module) => (
                    <div key={module.id} className="grid gap-2 px-4 py-3 transition hover:bg-white/[0.035] lg:grid-cols-[1fr_110px_64px_80px_32px] lg:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/15 text-violet-200">
                          <Link2 size={17} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">{module.name}</p>
                          <p className="truncate text-[11px] text-slate-500">{publicLinkFor(module) || "Link público protegido"}</p>
                        </div>
                      </div>
                      <div className="text-xs text-slate-300">{module.name}</div>
                      <div className="text-xs font-bold text-slate-300">{module._count.slides} slides</div>
                      <Badge tone="success" className="w-fit px-2 py-0.5 text-[11px]">Ativo</Badge>
                      <Link href={`/modules/${module.id}`} className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white">
                        <MoreVertical size={16} />
                      </Link>
                    </div>
                  ))}
                </div>
                {activeLinkModules.length === 0 && <div className="p-6 text-center text-sm text-slate-400">Nenhum link público ativo.</div>}
              </CardContent>
            </Card>
          </div>

          <div className="grid min-h-0 gap-3 xl:grid-rows-[auto_minmax(0,1fr)]">
            <Card className="overflow-hidden border-white/10 bg-slate-950/70 shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
              <CardHeader className="flex flex-row items-start justify-between border-white/10 px-4 py-3">
                <div>
                  <h2 className="text-base font-black text-white">Uso da licença</h2>
                  <p className="mt-0.5 text-xs text-muted">Plano {plan} · vencimento {formatDate(user.license.expiresAt)}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
                  <ShieldCheck size={19} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-4 py-3">
                <Usage icon={Users} label="Usuários" used={usersCount} limit={user.license.maxUsers} />
                <Usage icon={Building2} label="Módulos" used={totalModules} limit={user.license.maxModules} />
                <Usage icon={Image} label="Slides/módulo" used={maxSlidesInModule} limit={user.license.maxSlidesPerModule} />
                <Usage icon={Tv} label="TVs online" used={onlineDevices} limit={user.license.maxModules} />
                <Usage icon={Activity} label="Arquivos" used={mediaAssets} limit={Math.max(user.license.maxSlidesPerModule, 1)} optional />
              </CardContent>
            </Card>

            <Card className="flex min-h-0 flex-col overflow-hidden border-white/10 bg-slate-950/70 shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
              <CardHeader className="flex shrink-0 flex-row items-center justify-between border-white/10 px-4 py-3">
                <div>
                  <h2 className="text-base font-black text-white">TVs em exibição agora</h2>
                  <p className="mt-0.5 text-xs text-muted">Dispositivos reais do player.</p>
                </div>
                <Link href="/devices">
                  <Button variant="secondary" size="sm" className="h-9 rounded-xl text-xs">
                    Todas <ExternalLink size={14} />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 p-0">
                <div className="divide-y divide-white/10">
                  {recentDevices.slice(0, 4).map((device, index) => {
                    const online = device.lastSeenAt >= onlineSince;
                    return (
                      <div key={device.id} className="grid gap-2 px-4 py-3 transition hover:bg-white/[0.035]">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className={online ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/15 text-blue-200" : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-500/20 bg-slate-500/10 text-slate-300"}>
                              <Tv size={17} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-white">{device.name || `TV / Navegador ${index + 1}`}</p>
                              <p className="truncate text-[11px] text-slate-500">{device.module.name} · {device.screenWidth && device.screenHeight ? `${device.screenWidth}×${device.screenHeight}` : "Tela não informada"}</p>
                            </div>
                          </div>
                          <Badge tone={online ? "success" : "warning"} className="shrink-0 px-2 py-0.5 text-[11px]">{online ? "Online" : "Offline"}</Badge>
                        </div>
                        <div className="flex items-center justify-between pl-12 text-[11px] text-slate-500">
                          <span>{formatDateTime(device.lastSeenAt)}</span>
                          <Monitor size={15} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {recentDevices.length === 0 && <div className="p-6 text-center text-sm text-slate-400">Nenhum dispositivo detectado ainda.</div>}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function MetricCard({ icon: Icon, label, value, detail, accent }: { icon: typeof Box; label: string; value: string | number; detail: string; accent: "blue" | "cyan" | "green" }) {
  const accentClasses = {
    blue: "from-blue-600/95 to-blue-400/80 text-white shadow-blue-500/25",
    cyan: "from-cyan-500/95 to-blue-500/80 text-white shadow-cyan-500/25",
    green: "from-emerald-500/95 to-cyan-500/80 text-white shadow-emerald-500/25"
  };

  return (
    <Card className="group relative h-[108px] overflow-hidden border-white/10 bg-slate-950/70 p-4 shadow-[0_14px_55px_rgba(0,0,0,0.20)] transition hover:-translate-y-0.5 hover:border-cyan-300/25">
      <div className="absolute inset-x-0 bottom-0 h-12 bg-[radial-gradient(circle_at_90%_100%,rgba(0,132,255,0.24),transparent_56%)] opacity-80" />
      <div className="relative flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accentClasses[accent]} shadow-2xl`}>
          <Icon size={22} />
        </div>
        <TinySparkline accent={accent} />
      </div>
      <div className="relative mt-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <div className="mt-1 text-2xl font-black tracking-tight text-white">{value}</div>
        <p className="mt-1 text-[11px] font-medium text-slate-400">{detail}</p>
      </div>
    </Card>
  );
}

function LicenseMetricCard({ status, plan, expiresAt }: { status: string; plan: string; expiresAt: Date | null }) {
  return (
    <Card className="relative h-[108px] overflow-hidden border-white/10 bg-slate-950/70 p-4 shadow-[0_14px_55px_rgba(0,0,0,0.20)]">
      <div className="absolute inset-x-0 bottom-0 h-12 bg-[radial-gradient(circle_at_90%_100%,rgba(16,185,129,0.20),transparent_56%)]" />
      <div className="relative flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-2xl shadow-blue-500/25">
          <ShieldCheck size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Status da licença</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-2xl font-black text-white">{status}</span>
            <Badge tone="success" className="bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-200">{plan}</Badge>
          </div>
          <p className="mt-2 text-[11px] font-medium text-slate-400">Vencimento: {formatDate(expiresAt)}</p>
        </div>
      </div>
    </Card>
  );
}

function Usage({ icon: Icon, label, used, limit, optional = false }: { icon: typeof Users; label: string; used: number; limit: number; optional?: boolean }) {
  const isUnlimited = limit >= 9999;
  const pct = optional ? Math.min(100, used) : isUnlimited ? Math.min(28, used) : percentage(used, limit);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-200">
          <Icon size={16} className="text-blue-300" />
          {label}
        </div>
        <div className="font-semibold text-slate-400">{used} / {isUnlimited ? "∞" : limit}</div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500 shadow-[0_0_22px_rgba(0,174,255,0.35)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TinySparkline({ accent }: { accent: "blue" | "cyan" | "green" }) {
  const stroke = accent === "green" ? "#22c55e" : accent === "cyan" ? "#06b6d4" : "#2563eb";
  return (
    <svg viewBox="0 0 96 38" className="mt-2 h-8 w-20 opacity-65" aria-hidden="true">
      <path d="M2 33 C14 34 20 29 31 30 C43 31 46 24 55 25 C67 26 70 14 80 17 C88 19 91 12 94 8" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M2 37 C14 37 20 32 31 33 C43 34 46 28 55 29 C67 30 70 18 80 21 C88 23 91 16 94 12 L94 38 L2 38 Z" fill={stroke} opacity="0.14" />
    </svg>
  );
}

function iconTileClass(index: number) {
  const classes = [
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/15 text-violet-200",
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/15 text-amber-200",
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/15 text-cyan-200",
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/15 text-emerald-200"
  ];
  return classes[index % classes.length];
}

function publicLinkFor(module: { publicTokenEncrypted: string; publicTokenIv: string }) {
  try {
    const token = decryptSecret(module.publicTokenEncrypted, module.publicTokenIv);
    return `${appUrl()}/play/${token}`;
  } catch {
    return null;
  }
}
