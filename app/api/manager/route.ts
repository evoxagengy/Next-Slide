import { UserRole } from "@prisma/client";
import { json, handleApiError } from "@/lib/api";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPlatformOwner } from "@/lib/manager";

export async function GET() {
  try {
    const current = await requireApiRole([UserRole.OWNER, UserRole.ADMIN]);
    const canManageAllCompanies = isPlatformOwner(current);
    const where = canManageAllCompanies ? {} : { id: current.licenseId };

    const companies = await prisma.license.findMany({
      where,
      include: {
        _count: { select: { users: true, modules: true } },
        users: {
          select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true, licenseId: true },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return json({
      canManageAllCompanies,
      currentLicenseId: current.licenseId,
      companies: companies.map((company) => ({
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
        users: company.users.map((user) => ({
          ...user,
          lastLoginAt: user.lastLoginAt?.toISOString() || null,
          createdAt: user.createdAt.toISOString()
        }))
      }))
    });
  } catch (error) {
    return handleApiError(error);
  }
}
