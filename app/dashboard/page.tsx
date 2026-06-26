import Link from "next/link";
import { CalendarClock, MonitorPlay, Plus, Presentation, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/utils";
import { percentage } from "@/lib/format";
import { licenseStatusLabel, planLabel } from "@/lib/license";

export default async function DashboardPage() {
  const user = await requireUser();
  const [totalModules, activeModules, totalSlides, activeSlides, recentModules, usersCount] = await Promise.all([
    prisma.slideModule.count({ where: { licenseId: user.licenseId } }),
    prisma.slideModule.count({ where: { licenseId: user.licenseId, isActive: true } }),
    prisma.slide.count({ where: { module: { licenseId: user.licenseId } } }),
    prisma.slide.count({ where: { module: { licenseId: user.licenseId }, isActive: true } }),
    prisma.slideModule.findMany({ where: { licenseId: user.licenseId }, include: { _count: { select: { slides: true } } }, orderBy: { updatedAt: "desc" }, take: 6 }),
    prisma.user.count({ where: { licenseId: user.licenseId } })
  ]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Painel administrativo"
        title="Gestão à vista em tempo real"
        description="Acompanhe módulos, slides, uso da licença e acesse rapidamente o player público para TVs corporativas."
        action={<Link href="/modules/new"><Button><Plus size={18} /> Criar módulo</Button></Link>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Módulos ativos" value={activeModules} detail={`${totalModules} módulos cadastrados`} icon={MonitorPlay} />
        <StatCard title="Slides cadastrados" value={totalSlides} detail={`${activeSlides} slides ativos`} icon={Presentation} />
        <StatCard title="Telas em uso" value={activeModules} detail="Baseado em módulos ativos" icon={CalendarClock} />
        <StatCard title="Status da licença" value={licenseStatusLabel(user.license.status)} detail={planLabel(user.license.plan)} icon={ShieldCheck} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-bold">Últimos módulos alterados</h3>
            <p className="text-sm text-muted">Apresentações recentes para TV e dashboards.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentModules.map((module) => (
                <Link key={module.id} href={`/modules/${module.id}`} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/[0.03] p-4 transition hover:bg-white/[0.06]">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-text">{module.name}</div>
                    <div className="mt-1 text-xs text-muted">{module._count.slides} slides · atualizado em {formatDateTime(module.updatedAt)}</div>
                  </div>
                  <Badge tone={module.isActive ? "success" : "warning"}>{module.isActive ? "Ativo" : "Inativo"}</Badge>
                </Link>
              ))}
              {recentModules.length === 0 && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">Nenhum módulo criado ainda.</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-bold">Uso da licença</h3>
            <p className="text-sm text-muted">Plano {planLabel(user.license.plan)} · vencimento {formatDate(user.license.expiresAt)}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <Usage label="Usuários" used={usersCount} limit={user.license.maxUsers} />
            <Usage label="Módulos" used={totalModules} limit={user.license.maxModules} />
            <Usage label="Slides por módulo" used={Math.max(...recentModules.map((m) => m._count.slides), 0)} limit={user.license.maxSlidesPerModule} />
            <Link href="/license"><Button variant="secondary" className="w-full">Ver detalhes da licença</Button></Link>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Usage({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = percentage(used, limit);
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm"><span className="text-slate-200">{label}</span><span className="text-muted">{used}/{limit >= 9999 ? "custom" : limit}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
