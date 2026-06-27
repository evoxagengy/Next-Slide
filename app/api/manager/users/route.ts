import { UserRole } from "@prisma/client";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPlatformOwner } from "@/lib/manager";
import { assertSameOrigin, hashPassword, sanitizeText } from "@/lib/security";
import { managerUserCreateSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const current = await requireApiRole([UserRole.OWNER, UserRole.ADMIN]);
    const platformOwner = isPlatformOwner(current);
    const data = managerUserCreateSchema.parse(await request.json());
    const targetLicenseId = platformOwner ? data.licenseId : current.licenseId;

    if (!platformOwner && data.licenseId !== current.licenseId) {
      return jsonError("Você só pode criar usuários na sua própria empresa.", 403, "PERMISSION_DENIED");
    }

    if (data.role === UserRole.OWNER && current.role !== UserRole.OWNER) {
      return jsonError("Apenas Owner pode criar outro Owner.", 403, "PERMISSION_DENIED");
    }

    const license = await prisma.license.findUnique({ where: { id: targetLicenseId } });
    if (!license) return jsonError("Empresa não encontrada.", 404, "COMPANY_NOT_FOUND");

    const totalUsers = await prisma.user.count({ where: { licenseId: targetLicenseId } });
    if (totalUsers >= license.maxUsers) {
      return jsonError(`Limite de usuários/licenças atingido para esta empresa (${license.maxUsers}).`, 403, "LICENSE_LIMIT");
    }

    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) return jsonError("Não foi possível criar usuário com este e-mail.", 409, "ACCOUNT_EXISTS");

    const created = await prisma.user.create({
      data: {
        licenseId: targetLicenseId,
        name: sanitizeText(data.name, 120),
        email: data.email,
        passwordHash: await hashPassword(data.password),
        role: data.role
      },
      select: { id: true, licenseId: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true }
    });

    await auditLog({
      licenseId: current.licenseId,
      userId: current.id,
      action: "MANAGER_CREATE_USER",
      entity: "User",
      entityId: created.id,
      metadata: { targetLicenseId, role: created.role },
      request
    });

    return json({ ok: true, user: { ...created, lastLoginAt: null, createdAt: created.createdAt.toISOString() } }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
