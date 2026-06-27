import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuleCreateModal } from "@/components/modules/ModuleCreateModal";
import { ModulesTable } from "@/components/modules/ModulesTable";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canDeleteModules } from "@/lib/permissions";
import { decryptSecret } from "@/lib/security";

export default async function ModulesPage() {
  const user = await requireUser();
  const modules = await prisma.slideModule.findMany({
    where: { licenseId: user.licenseId },
    include: {
      slides: { orderBy: { sortOrder: "asc" } },
      _count: { select: { slides: true } }
    },
    orderBy: { updatedAt: "desc" }
  });

  const rows = modules.map((module) => {
    const token = decryptSecret(module.publicTokenEncrypted, module.publicTokenIv);
    return {
      id: module.id,
      name: module.name,
      description: module.description,
      slug: module.slug,
      isActive: module.isActive,
      defaultDuration: module.defaultDuration,
      defaultTransition: module.defaultTransition,
      theme: module.theme,
      logoUrl: module.logoUrl,
      showClock: module.showClock,
      updatedAt: module.updatedAt.toISOString(),
      createdAt: module.createdAt.toISOString(),
      lastTokenRotatedAt: module.lastTokenRotatedAt.toISOString(),
      slidesCount: module._count.slides,
      publicPath: `/play/${token}`,
      slides: module.slides.map((slide) => ({
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
      }))
    };
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Apresentações"
        title="Módulos de slides"
        description="Crie, edite e copie o link público dos players de TV em uma tela simples."
        action={<ModuleCreateModal />}
      />
      {rows.length === 0 ? (
        <EmptyState title="Nenhum módulo criado" description="Crie seu primeiro módulo, adicione arquivos, sites e copie o link do player." />
      ) : (
        <ModulesTable modules={rows} canDelete={canDeleteModules(user.role)} />
      )}
    </AppShell>
  );
}
