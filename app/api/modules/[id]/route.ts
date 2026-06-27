import { UserRole } from "@prisma/client";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireApiRole, requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canDeleteModules, canEditModules } from "@/lib/permissions";
import { appUrl, assertSameOrigin, decryptSecret, normalizeAssetOrUrl, sanitizeOptionalText, sanitizeText } from "@/lib/security";
import { moduleUpdateSchema } from "@/lib/validations";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;
    const module = await prisma.slideModule.findFirst({
      where: { id, licenseId: user.licenseId },
      include: { slides: { orderBy: { sortOrder: "asc" } }, _count: { select: { slides: true } } }
    });
    if (!module) return jsonError("Módulo não encontrado.", 404, "NOT_FOUND");

    return json({
      module: {
        ...module,
        publicUrl: `${appUrl()}/play/${decryptSecret(module.publicTokenEncrypted, module.publicTokenIv)}`
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    assertSameOrigin(request);
    const user = await requireApiRole([UserRole.OWNER, UserRole.ADMIN]);
    if (!canEditModules(user.role)) throw new Error("PERMISSION_DENIED");
    const { id } = await ctx.params;
    const data = moduleUpdateSchema.parse(await request.json());

    const existing = await prisma.slideModule.findFirst({ where: { id, licenseId: user.licenseId } });
    if (!existing) return jsonError("Módulo não encontrado.", 404, "NOT_FOUND");

    const module = await prisma.slideModule.update({
      where: { id },
      data: {
        name: data.name ? sanitizeText(data.name, 120) : undefined,
        description: data.description !== undefined ? sanitizeOptionalText(data.description, 500) : undefined,
        defaultDuration: data.defaultDuration,
        defaultTransition: data.defaultTransition ? sanitizeText(data.defaultTransition, 40) : undefined,
        theme: data.theme ? sanitizeText(data.theme, 40) : undefined,
        logoUrl: data.logoUrl !== undefined ? (data.logoUrl ? normalizeAssetOrUrl(data.logoUrl) : null) : undefined,
        showClock: data.showClock,
        isActive: data.isActive
      }
    });

    await auditLog({ licenseId: user.licenseId, userId: user.id, action: "UPDATE_MODULE", entity: "SlideModule", entityId: id, request });
    return json({ ok: true, module });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  try {
    assertSameOrigin(request);
    const user = await requireApiRole([UserRole.OWNER]);
    if (!canDeleteModules(user.role)) throw new Error("PERMISSION_DENIED");
    const { id } = await ctx.params;
    const existing = await prisma.slideModule.findFirst({ where: { id, licenseId: user.licenseId } });
    if (!existing) return jsonError("Módulo não encontrado.", 404, "NOT_FOUND");

    await prisma.slideModule.delete({ where: { id } });
    await auditLog({ licenseId: user.licenseId, userId: user.id, action: "DELETE_MODULE", entity: "SlideModule", entityId: id, request });
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
