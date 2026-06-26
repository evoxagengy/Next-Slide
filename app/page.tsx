import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { CopyButton } from "@/components/modules/CopyButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appUrl, decryptSecret } from "@/lib/security";
import { formatDateTime } from "@/lib/utils";

export default async function ModulesPage() {
  const user = await requireUser();
  const modules = await prisma.slideModule.findMany({
    where: { licenseId: user.licenseId },
    include: { _count: { select: { slides: true } } },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <AppShell>
      <PageHeader eyebrow="Apresentações" title="Módulos de slides" description="Cada módulo gera um link público seguro para rodar em uma TV corporativa." action={<Link href="/modules/new"><Button><Plus size={18} /> Novo módulo</Button></Link>} />
      {modules.length === 0 ? <EmptyState title="Nenhum módulo criado" description="Crie seu primeiro módulo, adicione slides e copie o link do player." /> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {modules.map((module) => {
            const publicUrl = `${appUrl()}/play/${decryptSecret(module.publicTokenEncrypted, module.publicTokenIv)}`;
            return (
              <Card key={module.id} className="overflow-hidden">
                <CardContent>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/modules/${module.id}`} className="text-xl font-bold text-text hover:text-cyan">{module.name}</Link>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{module.description || "Sem descrição."}</p>
                    </div>
                    <Badge tone={module.isActive ? "success" : "warning"}>{module.isActive ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  <div className="mt-5 grid gap-3 text-sm text-muted sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/[0.04] p-3"><b className="block text-text">{module._count.slides}</b>Slides</div>
                    <div className="rounded-2xl bg-white/[0.04] p-3"><b className="block text-text">{module.defaultDuration}s</b>Tempo padrão</div>
                    <div className="rounded-2xl bg-white/[0.04] p-3"><b className="block text-text">{formatDateTime(module.updatedAt)}</b>Atualizado</div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <CopyButton value={publicUrl} />
                    <Link href={publicUrl} target="_blank"><Button variant="secondary" size="sm"><ExternalLink size={15} /> Abrir player</Button></Link>
                    <Link href={`/modules/${module.id}`}><Button variant="ghost" size="sm">Gerenciar</Button></Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
