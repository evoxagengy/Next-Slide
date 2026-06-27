import { LicenseStatus, UserRole } from "@prisma/client";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { limitsForPlan } from "@/lib/license";
import { isPlatformOwner } from "@/lib/manager";
import { assertSameOrigin, sanitizeText } from "@/lib/security";
import { managerCompanyCreateSchema } from "@/lib/validations";

function parseExpiresAt(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const current = await requireApiRole([UserRole.OWNER]);
    if (!isPlatformOwner(current)) return jsonError("Apenas o usuário master pode criar empresas.", 403, "PLATFORM_OWNER_REQUIRED");

    const data = managerCompanyCreateSchema.parse(await request.json());
    const limits = limitsForPlan(data.plan, data.maxUsers);

    const company = await prisma.license.create({
      data: {
        companyName: sanitizeText(data.companyName, 120),
        plan: data.plan,
        status: data.status || LicenseStatus.ACTIVE,
        maxUsers: limits.maxUsers,
        maxModules: limits.maxModules,
        maxSlidesPerModule: limits.maxSlidesPerModule,
        startsAt: new Date(),
        expiresAt: parseExpiresAt(data.expiresAt)
      }
    });

    await auditLog({
      licenseId: current.licenseId,
      userId: current.id,
      action: "CREATE_COMPANY_LICENSE",
      entity: "License",
      entityId: company.id,
      metadata: { companyName: company.companyName, plan: company.plan, maxUsers: company.maxUsers, maxModules: company.maxModules },
      request
    });

    return json({ ok: true, company }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
