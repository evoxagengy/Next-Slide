import Link from "next/link";
import { notFound } from "next/navigation";
import { Settings } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuleActions } from "@/components/modules/ModuleActions";
import { SlideManager } from "@/components/slides/SlideManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canDeleteModules } from "@/lib/permissions";
import { appUrl, decryptSecret } from "@/lib/security";
import { formatDateTime } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function ModuleDetailPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const module = await prisma.slideModule.findFirst({
    where: { id, licenseId: user.licenseId },
    include: { slides: { orderBy: { sortOrder: "asc" } } }
  });
  if (!module) notFound();
  const publicUrl = `${appUrl()}/play/${decryptSecret(module.publicTokenEncrypted, module.publicTokenIv)}`;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Módulo de TV"
        title={module.name}
        description={module.description || "Gerencie slides, link público e configurações desta apresentação."}
        action={<Link href={`/modules/${module.id}/settings`}><Button variant="secondary"><Settings size={18} /> Configurações</Button></Link>}
      />
      <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">Link público seguro</h3><Badge tone={module.isActive ? "success" : "warning"}>{module.isActive ? "Ativo" : "Inativo"}</Badge></div>
          </CardHeader>
          <CardContent>
            <div className="break-all rounded-2xl border border-border bg-background/70 p-4 text-sm text-cyan">{publicUrl}</div>
            <div className="mt-4"><ModuleActions moduleId={module.id} publicUrl={publicUrl} canDelete={canDeleteModules(user.role)} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h3 className="text-lg font-bold">Resumo</h3></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <Info label="Slides" value={module.slides.length.toString()} />
            <Info label="Tempo padrão" value={`${module.defaultDuration}s`} />
            <Info label="Tema" value={module.theme} />
            <Info label="Token regenerado" value={formatDateTime(module.lastTokenRotatedAt)} />
          </CardContent>
        </Card>
      </div>
      <SlideManager moduleId={module.id} defaultDuration={module.defaultDuration} initialSlides={module.slides.map((slide) => ({
        id: slide.id,
        type: slide.type,
        title: slide.title,
        description: slide.description,
        contentUrl: slide.contentUrl,
        textContent: slide.textContent,
        duration: slide.duration,
        sortOrder: slide.sortOrder,
        isActive: slide.isActive,
        fit: slide.fit,
        backgroundColor: slide.backgroundColor,
        refreshInterval: slide.refreshInterval,
        openMode: slide.openMode
      }))} />
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2"><span>{label}</span><b className="text-text">{value}</b></div>;
}
