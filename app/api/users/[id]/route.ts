import { UserRole } from "@prisma/client";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertSameOrigin, sanitizeText } from "@/lib/security";
import { userUpdateSchema } from "@/lib/validations";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    assertSameOrigin(request);
    const current = await requireApiRole([UserRole.OWNER, UserRole.ADMIN]);
    const { id } = await ctx.params;
    const data = userUpdateSchema.parse(await request.json());
    const target = await prisma.user.findFirst({ where: { id, licenseId: current.licenseId } });
    if (!target) return jsonError("Usuário não encontrado.", 404, "NOT_FOUND");
    if (target.role === UserRole.OWNER && current.role !== UserRole.OWNER) return jsonError("Apenas o Owner pode alterar Owner.", 403, "PERMISSION_DENIED");
    if (data.role === UserRole.OWNER && current.role !== UserRole.OWNER) return jsonError("Apenas o Owner pode promover Owner.", 403, "PERMISSION_DENIED");

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: data.name ? sanitizeText(data.name, 120) : undefined,
        role: data.role,
        isActive: data.isActive
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true }
    });

    await auditLog({ licenseId: current.licenseId, userId: current.id, action: "UPDATE_USER", entity: "User", entityId: id, request });
    return json({ ok: true, user: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  try {
    assertSameOrigin(request);
    const current = await requireApiRole([UserRole.OWNER, UserRole.ADMIN]);
    const { id } = await ctx.params;
    if (id === current.id) return jsonError("Você não pode remover seu próprio acesso.", 422, "SELF_REMOVE");
    const target = await prisma.user.findFirst({ where: { id, licenseId: current.licenseId } });
    if (!target) return jsonError("Usuário não encontrado.", 404, "NOT_FOUND");
    if (target.role === UserRole.OWNER && current.role !== UserRole.OWNER) return jsonError("Apenas o Owner pode remover Owner.", 403, "PERMISSION_DENIED");

    await prisma.user.update({ where: { id }, data: { isActive: false } });
    await prisma.session.deleteMany({ where: { userId: id } });
    await auditLog({ licenseId: current.licenseId, userId: current.id, action: "DISABLE_USER", entity: "User", entityId: id, request });
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
