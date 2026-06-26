import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuleSettingsForm } from "@/components/modules/ModuleSettingsForm";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export default async function ModuleSettingsPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const module = await prisma.slideModule.findFirst({ where: { id, licenseId: user.licenseId } });
  if (!module) notFound();
  return (
    <AppShell>
      <PageHeader eyebrow="Configurações" title={module.name} description="Ajuste status, tempo padrão, transição, tema e logo do player." />
      <Card className="max-w-3xl"><CardContent><ModuleSettingsForm module={{ id: module.id, name: module.name, description: module.description, isActive: module.isActive, defaultDuration: module.defaultDuration, defaultTransition: module.defaultTransition, theme: module.theme, logoUrl: module.logoUrl }} /></CardContent></Card>
    </AppShell>
  );
}
