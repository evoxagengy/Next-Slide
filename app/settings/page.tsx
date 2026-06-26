import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Configurações" title="Centro de controle" description="Base preparada para tema padrão, segurança, integrações e armazenamento futuro." />
      <div className="grid gap-6 xl:grid-cols-3">
        {[
          ["Tema padrão", "Dark mode premium ativo como identidade visual do produto."],
          ["Segurança", "Sessões HttpOnly, rate limit, logs críticos e separação por licença."],
          ["Armazenamento", "MVP usa imagem por URL. Estrutura preparada para Vercel Blob, S3, Supabase Storage ou Cloudinary."]
        ].map(([title, desc]) => (
          <Card key={title}><CardHeader><h3 className="text-lg font-bold">{title}</h3></CardHeader><CardContent><p className="text-sm leading-6 text-muted">{desc}</p></CardContent></Card>
        ))}
      </div>
    </AppShell>
  );
}
