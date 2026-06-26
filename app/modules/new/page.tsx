import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuleCreateForm } from "@/components/modules/ModuleCreateForm";
import { Card, CardContent } from "@/components/ui/card";

export default function NewModulePage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Novo módulo" title="Criar apresentação para TV" description="Defina o módulo principal. Depois você adiciona imagens, sites, dashboards ou textos." />
      <Card className="max-w-3xl"><CardContent><ModuleCreateForm /></CardContent></Card>
    </AppShell>
  );
}
