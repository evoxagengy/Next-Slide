import { UserRole } from "@prisma/client";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isLicenseUsable } from "@/lib/license";
import { assertSameOrigin } from "@/lib/security";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    assertSameOrigin(request);
    const user = await requireApiRole([UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR]);
    if (!isLicenseUsable(user.license)) return jsonError("Licença indisponível para duplicar slides.", 403, "LICENSE_UNAVAILABLE");
    const { id } = await ctx.params;

    const source = await prisma.slide.findFirst({ where: { id, module: { licenseId: user.licenseId } }, include: { module: true } });
    if (!source) return jsonError("Slide não encontrado.", 404, "NOT_FOUND");

    const slideCount = await prisma.slide.count({ where: { moduleId: source.moduleId } });
    if (slideCount >= user.license.maxSlidesPerModule) return jsonError("Limite de slides por módulo atingido.", 403, "LICENSE_LIMIT");

    const last = await prisma.slide.findFirst({ where: { moduleId: source.moduleId }, orderBy: { sortOrder: "desc" } });
    const duplicated = await prisma.slide.create({
      data: {
        moduleId: source.moduleId,
        type: source.type,
        title: source.title ? `${source.title} - cópia` : null,
        description: source.description,
        contentUrl: source.contentUrl,
        textContent: source.textContent,
        duration: source.duration,
        sortOrder: (last?.sortOrder || 0) + 1,
        isActive: false,
        fit: source.fit,
        backgroundColor: source.backgroundColor,
        refreshInterval: source.refreshInterval,
        openMode: source.openMode
      }
    });

    await auditLog({ licenseId: user.licenseId, userId: user.id, action: "DUPLICATE_SLIDE", entity: "Slide", entityId: duplicated.id, metadata: { sourceId: source.id }, request });
    return json({ ok: true, slide: duplicated }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
