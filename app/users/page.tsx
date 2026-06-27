import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ManagerClient } from "@/components/users/ManagerClient";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPlatformOwner } from "@/lib/manager";

export default async function ManagerPage() {
  const user = await requireUser();
  const canManageAllCompanies = isPlatformOwner(user);
  const companies = await prisma.license.findMany({
    where: canManageAllCompanies ? {} : { id: user.licenseId },
    include: {
      _count: { select: { users: true, modules: true } },
      users: {
        select: { id: true, licenseId: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const rows = companies.map((company) => ({
    id: company.id,
    companyName: company.companyName,
    plan: company.plan,
    status: company.status,
    maxUsers: company.maxUsers,
    maxModules: company.maxModules,
    maxSlidesPerModule: company.maxSlidesPerModule,
    startsAt: company.startsAt.toISOString(),
    expiresAt: company.expiresAt?.toISOString() || null,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
    usersCount: company._count.users,
    modulesCount: company._count.modules,
    users: company.users.map((item) => ({
      id: item.id,
      licenseId: item.licenseId,
      name: item.name,
      email: item.email,
      role: item.role,
      isActive: item.isActive,
      lastLoginAt: item.lastLoginAt?.toISOString() || null,
      createdAt: item.createdAt.toISOString()
    }))
  }));

  return (
    <AppShell>
      <PageHeader
        eyebrow="Administração"
        title="Gerenciador"
        description="Gerencie empresas, planos, licenças de usuário e acessos do Next Slide."
      />
      <ManagerClient initialCompanies={rows} currentLicenseId={user.licenseId} canManageAllCompanies={canManageAllCompanies} />
    </AppShell>
  );
}
