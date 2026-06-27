import { UserRole } from "@prisma/client";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { limitsForPlan } from "@/lib/license";
import { isPlatformOwner } from "@/lib/manager";
import { assertSameOrigin, sanitizeText } from "@/lib/security";
import { managerCompanyUpdateSchema } from "@/lib/validations";

type Ctx = { params: Promise<{ id: string }> };

function parseExpiresAt(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    assertSameOrigin(request);
    const current = await requireApiRole([UserRole.OWNER]);
    if (!isPlatformOwner(current)) return jsonError("Apenas o usuário master pode editar empresas.", 403, "PLATFORM_OWNER_REQUIRED");

    const { id } = await ctx.params;
    const existing = await prisma.license.findUnique({ where: { id } });
    if (!existing) return jsonError("Empresa não encontrada.", 404, "COMPANY_NOT_FOUND");

    const data = managerCompanyUpdateSchema.parse(await request.json());
    const targetPlan = data.plan || existing.plan;
    const limits = data.plan ? limitsForPlan(targetPlan, data.maxUsers ?? existing.maxUsers) : null;

    const company = await prisma.license.update({
      where: { id },
      data: {
        companyName: data.companyName ? sanitizeText(data.companyName, 120) : undefined,
        plan: data.plan,
        status: data.status,
        maxUsers: data.maxUsers ?? limits?.maxUsers,
        maxModules: limits?.maxModules,
        maxSlidesPerModule: limits?.maxSlidesPerModule,
        expiresAt: parseExpiresAt(data.expiresAt)
      }
    });

    await auditLog({
      licenseId: current.licenseId,
      userId: current.id,
      action: "UPDATE_COMPANY_LICENSE",
      entity: "License",
      entityId: company.id,
      metadata: { companyName: company.companyName, plan: company.plan, status: company.status, maxUsers: company.maxUsers, maxModules: company.maxModules },
      request
    });

    return json({ ok: true, company });
  } catch (error) {
    return handleApiError(error);
  }
}
