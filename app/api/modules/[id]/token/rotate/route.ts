import { UserRole } from "@prisma/client";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog, securityEvent } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appUrl, assertSameOrigin, createPublicTokenPayload } from "@/lib/security";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    assertSameOrigin(request);
    const user = await requireApiRole([UserRole.OWNER, UserRole.ADMIN]);
    const { id } = await ctx.params;
    const existing = await prisma.slideModule.findFirst({ where: { id, licenseId: user.licenseId } });
    if (!existing) return jsonError("Módulo não encontrado.", 404, "NOT_FOUND");

    const token = createPublicTokenPayload();
    await prisma.slideModule.update({
      where: { id },
      data: {
        publicTokenHash: token.tokenHash,
        publicTokenEncrypted: token.encrypted,
        publicTokenIv: token.iv,
        lastTokenRotatedAt: new Date()
      }
    });

    await auditLog({ licenseId: user.licenseId, userId: user.id, action: "ROTATE_PUBLIC_TOKEN", entity: "SlideModule", entityId: id, request });
    await securityEvent({ licenseId: user.licenseId, userId: user.id, eventType: "PUBLIC_TOKEN_ROTATED", request });

    return json({ ok: true, publicUrl: `${appUrl()}/play/${token.token}`, publicPath: `/play/${token.token}` });
  } catch (error) {
    return handleApiError(error);
  }
}
