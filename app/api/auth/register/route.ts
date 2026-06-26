import { LicensePlan, LicenseStatus, UserRole } from "@prisma/client";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog, securityEvent } from "@/lib/audit";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/license";
import { assertSameOrigin, hashPassword, sanitizeText } from "@/lib/security";
import { registerSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const data = registerSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return jsonError("Não foi possível criar a conta com estes dados.", 409, "ACCOUNT_EXISTS");
    }

    const trialLimits = PLAN_LIMITS.TRIAL;
    const result = await prisma.$transaction(async (tx) => {
      const license = await tx.license.create({
        data: {
          companyName: sanitizeText(data.companyName, 120),
          plan: LicensePlan.TRIAL,
          status: LicenseStatus.TRIAL,
          maxUsers: trialLimits.maxUsers,
          maxModules: trialLimits.maxModules,
          maxSlidesPerModule: trialLimits.maxSlidesPerModule,
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        }
      });

      const user = await tx.user.create({
        data: {
          licenseId: license.id,
          name: sanitizeText(data.name, 120),
          email: data.email,
          passwordHash: await hashPassword(data.password),
          role: UserRole.OWNER
        }
      });

      return { license, user };
    });

    await auditLog({
      licenseId: result.license.id,
      userId: result.user.id,
      action: "REGISTER_OWNER",
      entity: "User",
      entityId: result.user.id,
      request
    });

    await securityEvent({
      licenseId: result.license.id,
      userId: result.user.id,
      eventType: "OWNER_REGISTERED",
      request
    });

    await createSession(result.user.id, request);
    return json({ ok: true, redirectTo: "/dashboard" }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
