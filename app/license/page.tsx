import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { percentage } from "@/lib/format";
import { licenseStatusLabel, planLabel } from "@/lib/license";
import { formatDate } from "@/lib/utils";

export default async function LicensePage() {
  const user = await requireUser();
  const [users, modules] = await Promise.all([
    prisma.user.count({ where: { licenseId: user.licenseId } }),
    prisma.slideModule.count({ where: { licenseId: user.licenseId } })
  ]);
  return (
    <AppShell>
      <PageHeader eyebrow="Licença" title={user.license.companyName} description="Controle de plano, status, limites e uso atual da organização." />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader><h3 className="text-lg font-bold">Dados da licença</h3></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Item label="Plano" value={planLabel(user.license.plan)} />
            <Item label="Status" value={licenseStatusLabel(user.license.status)} badge />
            <Item label="Início" value={formatDate(user.license.startsAt)} />
            <Item label="Vencimento" value={formatDate(user.license.expiresAt)} />
            <Item label="Limite de usuários" value={String(user.license.maxUsers)} />
            <Item label="Limite de módulos" value={String(user.license.maxModules)} />
            <Item label="Slides por módulo" value={String(user.license.maxSlidesPerModule)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h3 className="text-lg font-bold">Uso</h3></CardHeader>
          <CardContent className="space-y-5">
            <Usage label="Usuários" used={users} limit={user.license.maxUsers} />
            <Usage label="Módulos" used={modules} limit={user.license.maxModules} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Item({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return <div className="rounded-2xl border border-border bg-white/[0.03] p-4"><div className="text-sm text-muted">{label}</div><div className="mt-2 font-semibold text-text">{badge ? <Badge tone="info">{value}</Badge> : value}</div></div>;
}
function Usage({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = percentage(used, limit);
  return <div><div className="mb-2 flex justify-between text-sm"><span>{label}</span><span className="text-muted">{used}/{limit}</span></div><div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-gradient-to-r from-primary to-cyan" style={{ width: `${pct}%` }} /></div></div>;
}
