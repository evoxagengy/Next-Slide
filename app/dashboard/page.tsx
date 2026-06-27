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
      take: 6
    }),
    prisma.slideModule.findMany({
      where: { licenseId: user.licenseId, isActive: true },
      include: { _count: { select: { slides: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.deviceSession.count({ where: { licenseId: user.licenseId, lastSeenAt: { gte: onlineSince } } }),
    prisma.deviceSession.count({ where: { licenseId: user.licenseId } }),
    prisma.deviceSession.findMany({
      where: { licenseId: user.licenseId },
      include: { module: { select: { id: true, name: true } } },
      orderBy: { lastSeenAt: "desc" },
      take: 5
    })
  ]);

  const maxSlidesInModule = Math.max(...recentModules.map((module) => module._count.slides), 0);
  const publicLinksActive = activeModules;
  const plan = planLabel(user.license.plan);
  const licenseStatus = licenseStatusLabel(user.license.status);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(0,153,255,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.94))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.30)] lg:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px] opacity-40" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan">Painel administrativo</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">Gestão à vista em tempo real</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Acompanhe módulos, slides, links públicos, empresas, TVs online e uso da licença em tempo real.
              </p>
            </div>
            <Link href="/modules/new">
              <Button className="h-14 rounded-2xl px-6 text-base shadow-[0_18px_50px_rgba(0,132,255,0.28)]">
                <Plus size={20} /> Criar módulo
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={Box} label="Módulos ativos" value={activeModules} detail={`${totalModules} módulos cadastrados`} accent="blue" />
          <MetricCard icon={Image} label="Slides publicados" value={totalSlides} detail={`${activeSlides} slides ativos`} accent="cyan" />
          <MetricCard icon={Wifi} label="Telas online agora" value={onlineDevices} detail={`${totalDevices} dispositivos registrados`} accent="green" />
          <MetricCard icon={Link2} label="Links públicos ativos" value={publicLinksActive} detail={`${publicLinksActive} links disponíveis`} accent="blue" />
          <LicenseMetricCard status={licenseStatus} plan={plan} expiresAt={user.license.expiresAt} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card className="overflow-hidden border-white/10 bg-slate-950/70 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <CardHeader className="flex flex-col gap-4 border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Módulos recentes</h2>
                <p className="mt-1 text-sm text-muted">Últimos módulos alterados e seu status atual.</p>
              </div>
              <Link href="/modules">
                <Button variant="secondary" size="sm" className="rounded-xl">
                  Ver todos os módulos <ExternalLink size={15} />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="border-b border-white/10 bg-white/[0.025] text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    <tr>
                      <th className="px-5 py-4 font-bold">Nome do módulo</th>
                      <th className="px-5 py-4 font-bold">Tipo / finalidade</th>
                      <th className="px-5 py-4 font-bold">Qtd. slides</th>
                      <th className="px-5 py-4 font-bold">Última atualização</th>
                      <th className="px-5 py-4 font-bold">Status</th>
                      <th className="px-5 py-4 text-right font-bold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {recentModules.map((module, index) => (
                      <tr key={module.id} className="group transition hover:bg-white/[0.035]">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={iconTileClass(index)}>
                              <BarChart3 size={20} />
                            </div>
                            <div className="min-w-0">
                              <Link href={`/modules/${module.id}`} className="truncate text-sm font-black text-white transition hover:text-cyan">
                                {module.name}
                              </Link>
                              <p className="mt-1 max-w-[240px] truncate text-xs text-slate-400">{module.description || "Apresentação corporativa"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge tone="info" className="rounded-lg border-blue-400/20 bg-blue-500/10 text-blue-200">
                            {module.theme === "next-dark" ? "Corporativo" : module.theme}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-200">{module._count.slides}</td>
                        <td className="px-5 py-4 text-sm text-slate-300">
                          <div>{formatDateTime(module.updatedAt)}</div>
                          <div className="text-xs text-slate-500">por {module.createdBy?.name || "Equipe"}</div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge tone={module.isActive ? "success" : "warning"}>{module.isActive ? "Ativo" : "Inativo"}</Badge>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link href={`/modules/${module.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Abrir módulo">
                            <MoreVertical size={18} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {recentModules.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Nenhum módulo criado ainda.</div>}

              <div className="border-t border-white/10 p-4 text-center">
                <Link href="/modules" className="text-sm font-bold text-cyan transition hover:text-lime-300">
                  Ver todos os módulos ›
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/10 bg-slate-950/70 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <CardHeader className="flex flex-row items-start justify-between border-white/10">
              <div>
                <h2 className="text-xl font-black text-white">Uso da licença</h2>
                <p className="mt-1 text-sm text-muted">Plano {plan} · vencimento {formatDate(user.license.expiresAt)}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
                <ShieldCheck size={22} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Usage icon={Users} label="Usuários" used={usersCount} limit={user.license.maxUsers} />
              <Usage icon={Building2} label="Módulos" used={totalModules} limit={user.license.maxModules} />
              <Usage icon={Image} label="Slides por módulo" used={maxSlidesInModule} limit={user.license.maxSlidesPerModule} />
              <Usage icon={Tv} label="TVs conectadas" used={onlineDevices} limit={user.license.maxModules} />
              <Usage icon={Activity} label="Arquivos enviados" used={mediaAssets} limit={Math.max(user.license.maxSlidesPerModule, 1)} optional />
              <Link href="/license">
                <Button variant="secondary" className="mt-1 w-full rounded-xl">
                  <ShieldCheck size={17} /> Ver detalhes da licença
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <Card className="overflow-hidden border-white/10 bg-slate-950/70 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <CardHeader className="flex flex-col gap-4 border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Links públicos em uso</h2>
                <p className="mt-1 text-sm text-muted">Links ativos para exibição em TVs ou navegadores.</p>
              </div>
              <Link href="/modules">
                <Button variant="secondary" size="sm">Gerenciar links <ExternalLink size={15} /></Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/10">
                {activeLinkModules.slice(0, 4).map((module) => (
                  <div key={module.id} className="grid gap-3 px-5 py-4 transition hover:bg-white/[0.035] sm:grid-cols-[1fr_140px_80px_90px_40px] sm:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/15 text-violet-200">
                        <Link2 size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{module.name}</p>
                        <p className="truncate text-xs text-slate-500">{publicLinkFor(module) || "Link público protegido"}</p>
                      </div>
                    </div>
                    <div className="text-sm text-slate-300">{module.name}</div>
                    <div className="text-sm font-bold text-slate-300">{module._count.slides}</div>
                    <Badge tone="success">Ativo</Badge>
                    <Link href={`/modules/${module.id}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white">
                      <MoreVertical size={18} />
                    </Link>
                  </div>
                ))}
              </div>
              {activeLinkModules.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Nenhum link público ativo.</div>}
              <div className="border-t border-white/10 p-4 text-center">
                <Link href="/modules" className="text-sm font-bold text-cyan transition hover:text-lime-300">Ver todos os links ›</Link>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/10 bg-slate-950/70 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <CardHeader className="flex flex-col gap-4 border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-white">TVs em exibição agora</h2>
                <p className="mt-1 text-sm text-muted">Dispositivos reais com heartbeat do player público.</p>
              </div>
              <Link href="/devices">
                <Button variant="secondary" size="sm">Ver todas as TVs <ExternalLink size={15} /></Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/10">
                {recentDevices.slice(0, 4).map((device, index) => {
                  const online = device.lastSeenAt >= onlineSince;
                  return (
                    <div key={device.id} className="grid gap-3 px-5 py-4 transition hover:bg-white/[0.035] sm:grid-cols-[1fr_120px_150px_90px_36px] sm:items-center">
                      <div className="flex items-center gap-3">
                        <div className={online ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/15 text-blue-200" : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-500/20 bg-slate-500/10 text-slate-300"}>
                          <Tv size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">{device.name || `TV / Navegador ${index + 1}`}</p>
                          <p className="text-xs text-slate-500">{device.screenWidth && device.screenHeight ? `${device.screenWidth}×${device.screenHeight}` : "Tela não informada"}</p>
                        </div>
                      </div>
                      <div className="text-sm text-slate-300">{device.module.name}</div>
                      <div className="text-sm text-slate-300">{formatDateTime(device.lastSeenAt)}</div>
                      <Badge tone={online ? "success" : "warning"}>{online ? "Online" : "Offline"}</Badge>
                      <Monitor size={18} className="text-slate-400" />
                    </div>
                  );
                })}
              </div>
              {recentDevices.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Nenhum dispositivo detectado ainda. Abra um link público em uma TV.</div>}
              <div className="border-t border-white/10 p-4 text-center">
                <Link href="/devices" className="text-sm font-bold text-cyan transition hover:text-lime-300">Ver todas as TVs ›</Link>
              </div>
            </CardContent>
          </Card>
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
    <Card className="group relative overflow-hidden border-white/10 bg-slate-950/70 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-cyan-300/25">
      <div className="absolute inset-x-0 bottom-0 h-14 bg-[radial-gradient(circle_at_90%_100%,rgba(0,132,255,0.24),transparent_56%)] opacity-80" />
      <div className="relative flex items-start justify-between gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${accentClasses[accent]} shadow-2xl`}>
          <Icon size={27} />
        </div>
        <TinySparkline accent={accent} />
      </div>
      <div className="relative mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <div className="mt-2 text-4xl font-black tracking-tight text-white">{value}</div>
        <p className="mt-3 text-xs font-medium text-slate-400">{detail}</p>
      </div>
    </Card>
  );
}

function LicenseMetricCard({ status, plan, expiresAt }: { status: string; plan: string; expiresAt: Date | null }) {
  return (
    <Card className="relative overflow-hidden border-white/10 bg-slate-950/70 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
      <div className="absolute inset-x-0 bottom-0 h-16 bg-[radial-gradient(circle_at_90%_100%,rgba(16,185,129,0.20),transparent_56%)]" />
      <div className="relative flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-2xl shadow-blue-500/25">
          <ShieldCheck size={27} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Status da licença</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-3xl font-black text-white">{status}</span>
            <Badge tone="success" className="bg-emerald-500/15 text-emerald-200">{plan}</Badge>
          </div>
          <p className="mt-4 text-xs font-medium text-slate-400">Vencimento: {formatDate(expiresAt)}</p>
        </div>
      </div>
    </Card>
  );
}

function Usage({ icon: Icon, label, used, limit, optional = false }: { icon: typeof Users; label: string; used: number; limit: number; optional?: boolean }) {
  const isUnlimited = limit >= 9999;
  const pct = optional ? Math.min(100, used) : isUnlimited ? Math.min(28, used) : percentage(used, limit);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-3 font-bold text-slate-200">
          <Icon size={19} className="text-blue-300" />
          {label}
        </div>
        <div className="font-semibold text-slate-400">{used} / {isUnlimited ? "∞" : limit}</div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500 shadow-[0_0_22px_rgba(0,174,255,0.35)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TinySparkline({ accent }: { accent: "blue" | "cyan" | "green" }) {
  const stroke = accent === "green" ? "#22c55e" : accent === "cyan" ? "#06b6d4" : "#2563eb";
  return (
    <svg viewBox="0 0 96 38" className="mt-5 h-10 w-24 opacity-70" aria-hidden="true">
      <path d="M2 33 C14 34 20 29 31 30 C43 31 46 24 55 25 C67 26 70 14 80 17 C88 19 91 12 94 8" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M2 37 C14 37 20 32 31 33 C43 34 46 28 55 29 C67 30 70 18 80 21 C88 23 91 16 94 12 L94 38 L2 38 Z" fill={stroke} opacity="0.14" />
    </svg>
  );
}

function iconTileClass(index: number) {
  const classes = [
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/15 text-violet-200",
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/15 text-amber-200",
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/15 text-cyan-200",
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/15 text-emerald-200"
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
