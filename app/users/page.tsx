import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { UsersClient } from "@/components/users/UsersClient";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function UsersPage() {
  const user = await requireUser();
  const users = await prisma.user.findMany({
    where: { licenseId: user.licenseId },
    select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    orderBy: { createdAt: "asc" }
  });
  return (
    <AppShell>
      <PageHeader eyebrow="Administração" title="Usuários da organização" description="Gerencie usuários vinculados à licença e seus papéis de acesso." />
      <UsersClient initialUsers={users.map((item) => ({ ...item, lastLoginAt: item.lastLoginAt?.toISOString() || null, createdAt: item.createdAt.toISOString() }))} />
    </AppShell>
  );
}
