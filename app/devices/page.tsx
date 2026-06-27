import Link from "next/link";
import { Activity, ExternalLink, Monitor, MonitorCheck, MonitorX, RefreshCw, Tv, Wifi, WifiOff } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

const ONLINE_WINDOW_MS = 90_000;

export default async function DevicesPage() {
  const user = await requireUser();
  const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS);

  const devices = await prisma.deviceSession.findMany({
    where: { licenseId: user.licenseId },
    include: {
      module: {
        select: {
          id: true,
          name: true,
          isActive: true
        }
      }
    },
    orderBy: { lastSeenAt: "desc" },
    take: 200
  });

  const onlineDevices = devices.filter((device) => device.lastSeenAt >= onlineSince);
  const offlineDevices = devices.length - onlineDevices.length;
  const modulesOnline = new Set(onlineDevices.map((device) => device.moduleId)).size;

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(0,153,255,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.94))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.30)] lg:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px] opacity-40" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan">Monitoramento de TVs</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">Dispositivos online</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Acompanhe em tempo real quais TVs, mini PCs e navegadores estão exibindo módulos do Next Slide.
              </p>
            </div>
            <Link href="/modules">
              <Button className="h-14 rounded-2xl px-6 text-base shadow-[0_18px_50px_rgba(0,132,255,0.28)]">
                <ExternalLink size={20} /> Abrir módulos
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DeviceMetric icon={MonitorCheck} label="Online agora" value={onlineDevices.length} detail="com sinal nos últimos 90s" tone="success" />
          <DeviceMetric icon={Tv} label="Dispositivos registrados" value={devices.length} detail="TVs e navegadores detectados" tone="info" />
          <DeviceMetric icon={Activity} label="Módulos em exibição" value={modulesOnline} detail="módulos com pelo menos 1 TV online" tone="info" />
          <DeviceMetric icon={MonitorX} label="Offline" value={offlineDevices} detail="sem sinal recente" tone="warning" />
        </section>

        <Card className="overflow-hidden border-white/10 bg-slate-950/70 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <CardHeader className="flex flex-col gap-4 border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">TVs e navegadores detectados</h2>
              <p className="mt-1 text-sm text-muted">O status online é calculado pelo último heartbeat enviado pelo player público.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300">
              <RefreshCw size={15} className="text-cyan" />
              Atualiza a cada acesso ao painel
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="border-b border-white/10 bg-white/[0.025] text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-5 py-4 font-bold">Dispositivo</th>
                    <th className="px-5 py-4 font-bold">Módulo</th>
                    <th className="px-5 py-4 font-bold">Slide atual</th>
                    <th className="px-5 py-4 font-bold">Tela</th>
                    <th className="px-5 py-4 font-bold">Último sinal</th>
                    <th className="px-5 py-4 font-bold">Status</th>
                    <th className="px-5 py-4 text-right font-bold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {devices.map((device, index) => {
                    const online = device.lastSeenAt >= onlineSince;
                    return (
                      <tr key={device.id} className="transition hover:bg-white/[0.035]">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={online ? "flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/15 text-emerald-200" : "flex h-11 w-11 items-center justify-center rounded-xl border border-slate-500/20 bg-slate-500/10 text-slate-300"}>
                              {online ? <Wifi size={20} /> : <WifiOff size={20} />}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-white">{device.name || `TV / Navegador ${index + 1}`}</p>
                              <p className="mt-1 max-w-[300px] truncate text-xs text-slate-500">{device.userAgent || "Dispositivo não identificado"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <Link href={`/modules/${device.module.id}`} className="text-sm font-bold text-slate-200 transition hover:text-cyan">
                            {device.module.name}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">{device.module.isActive ? "Módulo ativo" : "Módulo inativo"}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-300">
                          <div className="font-bold text-slate-200">{device.currentSlideTitle || "Slide não informado"}</div>
                          <div className="mt-1 text-xs text-slate-500">posição {device.currentSlideIndex + 1}</div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-300">
                          {device.screenWidth && device.screenHeight ? `${device.screenWidth}×${device.screenHeight}` : "—"}
                          {device.timezone && <div className="mt-1 text-xs text-slate-500">{device.timezone}</div>}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-300">
                          <div>{formatDateTime(device.lastSeenAt)}</div>
                          <div className="mt-1 text-xs text-slate-500">{timeAgo(device.lastSeenAt)}</div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge tone={online ? "success" : "warning"}>{online ? "Online" : "Offline"}</Badge>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link href={`/modules/${device.module.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Abrir módulo">
                            <ExternalLink size={17} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {devices.length === 0 && (
              <div className="p-10 text-center">
                <Monitor className="mx-auto text-cyan" size={48} />
                <h3 className="mt-4 text-lg font-black text-white">Nenhum dispositivo detectado ainda</h3>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
                  Abra um link público de módulo em uma TV, mini PC ou navegador. O player enviará o primeiro sinal automaticamente.
                </p>
                <Link href="/modules" className="mt-5 inline-flex">
                  <Button>Ver módulos</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function DeviceMetric({ icon: Icon, label, value, detail, tone }: { icon: typeof Monitor; label: string; value: number; detail: string; tone: "success" | "warning" | "info" }) {
  const toneClass = {
    success: "from-emerald-500 to-cyan-500 shadow-emerald-500/25",
    warning: "from-amber-500 to-orange-500 shadow-amber-500/25",
    info: "from-blue-600 to-cyan-500 shadow-blue-500/25"
  };

  return (
    <Card className="relative overflow-hidden border-white/10 bg-slate-950/70 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
      <div className="absolute inset-x-0 bottom-0 h-16 bg-[radial-gradient(circle_at_90%_100%,rgba(0,132,255,0.22),transparent_56%)]" />
      <div className="relative flex items-start gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClass[tone]} text-white shadow-2xl`}>
          <Icon size={27} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <div className="mt-2 text-4xl font-black tracking-tight text-white">{value}</div>
          <p className="mt-3 text-xs font-medium text-slate-400">{detail}</p>
        </div>
      </div>
    </Card>
  );
}

function timeAgo(date: Date) {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s atrás`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}
