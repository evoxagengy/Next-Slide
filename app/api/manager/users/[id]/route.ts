import { UserRole } from "@prisma/client";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPlatformOwner } from "@/lib/manager";
import { assertSameOrigin, sanitizeText } from "@/lib/security";
import { managerUserUpdateSchema } from "@/lib/validations";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    assertSameOrigin(request);
    const current = await requireApiRole([UserRole.OWNER, UserRole.ADMIN]);
    const platformOwner = isPlatformOwner(current);
    const { id } = await ctx.params;
    const data = managerUserUpdateSchema.parse(await request.json());

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return jsonError("Usuário não encontrado.", 404, "USER_NOT_FOUND");

    if (!platformOwner && target.licenseId !== current.licenseId) {
      return jsonError("Você não pode editar usuário de outra empresa.", 403, "PERMISSION_DENIED");
    }

    if (target.id === current.id && data.isActive === false) {
      return jsonError("Você não pode desativar seu próprio usuário.", 422, "SELF_DISABLE");
    }

    if (data.role === UserRole.OWNER && current.role !== UserRole.OWNER) {
      return jsonError("Apenas Owner pode promover outro Owner.", 403, "PERMISSION_DENIED");
    }

    const targetLicenseId = platformOwner && data.licenseId ? data.licenseId : target.licenseId;
    if (targetLicenseId !== target.licenseId) {
      const license = await prisma.license.findUnique({ where: { id: targetLicenseId } });
      if (!license) return jsonError("Empresa de destino não encontrada.", 404, "COMPANY_NOT_FOUND");
      const totalUsers = await prisma.user.count({ where: { licenseId: targetLicenseId } });
      if (totalUsers >= license.maxUsers) return jsonError(`Limite de usuários/licenças atingido para esta empresa (${license.maxUsers}).`, 403, "LICENSE_LIMIT");
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        licenseId: targetLicenseId,
        name: data.name ? sanitizeText(data.name, 120) : undefined,
        role: data.role,
        isActive: data.isActive
      },
      select: { id: true, licenseId: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true }
    });

    if (data.isActive === false) {
      await prisma.session.deleteMany({ where: { userId: id } });
    }

    await auditLog({
      licenseId: current.licenseId,
      userId: current.id,
      action: "MANAGER_UPDATE_USER",
      entity: "User",
      entityId: id,
      metadata: { targetLicenseId: updated.licenseId, role: updated.role, isActive: updated.isActive },
      request
    });

    return json({ ok: true, user: { ...updated, lastLoginAt: updated.lastLoginAt?.toISOString() || null, createdAt: updated.createdAt.toISOString() } });
  } catch (error) {
    return handleApiError(error);
  }
}
