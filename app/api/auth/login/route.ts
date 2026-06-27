import { LicenseStatus } from "@prisma/client";
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

    const [user] = await Promise.all([
      prisma.user.findUnique({
        where: { email: data.email },
        select: {
          id: true,
          licenseId: true,
          passwordHash: true,
          isActive: true,
          license: { select: { status: true } }
        }
      }),
      assertLoginAllowed(data.email, ip)
    ]);

    const validPassword = user ? await verifyPassword(data.password, user.passwordHash) : false;
    const blockedLicense = user?.license.status === LicenseStatus.CANCELLED || user?.license.status === LicenseStatus.SUSPENDED;

    if (!user || !validPassword || !user.isActive || blockedLicense) {
      await Promise.all([
        recordFailedLogin(data.email, ip),
        securityEvent({
          licenseId: user?.licenseId,
          userId: user?.id,
          eventType: "LOGIN_FAILED",
          metadata: { reason: blockedLicense ? "license_unavailable" : "invalid_credentials" },
          request
        })
      ]);
      return jsonError(GENERIC_ERROR, 401, "INVALID_CREDENTIALS");
    }

    await Promise.all([
      recordSuccessfulLogin(data.email, ip),
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
      createSession(user.id, request),
      auditLog({ licenseId: user.licenseId, userId: user.id, action: "LOGIN", entity: "User", entityId: user.id, request })
    ]);

    return json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    return handleApiError(error);
  }
}
