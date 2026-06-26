import { UserRole } from "@prisma/client";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageUsers } from "@/lib/permissions";
import { assertSameOrigin, hashPassword, sanitizeText } from "@/lib/security";
import { userCreateSchema } from "@/lib/validations";

export async function GET() {
  try {
    const user = await requireApiRole([UserRole.OWNER, UserRole.ADMIN]);
    if (!canManageUsers(user.role)) throw new Error("PERMISSION_DENIED");
    const users = await prisma.user.findMany({
      where: { licenseId: user.licenseId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true
      }
    });
    return json({ users });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const current = await requireApiRole([UserRole.OWNER, UserRole.ADMIN]);
    if (!canManageUsers(current.role)) throw new Error("PERMISSION_DENIED");

    const totalUsers = await prisma.user.count({ where: { licenseId: current.licenseId } });
    if (totalUsers >= current.license.maxUsers) return jsonError("Limite de usuários da licença atingido.", 403, "LICENSE_LIMIT");

    const data = userCreateSchema.parse(await request.json());
    if (data.role === UserRole.OWNER && current.role !== UserRole.OWNER) {
      return jsonError("Apenas o Owner pode criar outro Owner.", 403, "PERMISSION_DENIED");
    }

    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) return jsonError("Não foi possível criar usuário com este e-mail.", 409, "ACCOUNT_EXISTS");

    const created = await prisma.user.create({
      data: {
        licenseId: current.licenseId,
        name: sanitizeText(data.name, 120),
        email: data.email,
        passwordHash: await hashPassword(data.password),
        role: data.role
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }
    });

    await auditLog({ licenseId: current.licenseId, userId: current.id, action: "CREATE_USER", entity: "User", entityId: created.id, request });
    return json({ ok: true, user: created }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
