import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog, securityEvent } from "@/lib/audit";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertLoginAllowed, recordFailedLogin, recordSuccessfulLogin } from "@/lib/rate-limit";
import { assertSameOrigin, getClientIp, verifyPassword } from "@/lib/security";
import { loginSchema } from "@/lib/validations";

const GENERIC_ERROR = "E-mail ou senha inválidos.";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const data = loginSchema.parse(await request.json());
    const ip = getClientIp(request);

    await assertLoginAllowed(data.email, ip);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { license: true }
    });

    const validPassword = user ? await verifyPassword(data.password, user.passwordHash) : false;
    if (!user || !validPassword || !user.isActive) {
      await recordFailedLogin(data.email, ip);
      await securityEvent({
        licenseId: user?.licenseId,
        userId: user?.id,
        eventType: "LOGIN_FAILED",
        metadata: { reason: "invalid_credentials" },
        request
      });
      return jsonError(GENERIC_ERROR, 401, "INVALID_CREDENTIALS");
    }

    await recordSuccessfulLogin(data.email, ip);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await createSession(user.id, request);
    await auditLog({ licenseId: user.licenseId, userId: user.id, action: "LOGIN", entity: "User", entityId: user.id, request });

    return json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    return handleApiError(error);
  }
}
