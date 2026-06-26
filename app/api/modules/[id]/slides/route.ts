import { UserRole } from "@prisma/client";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireApiRole, requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isLicenseUsable } from "@/lib/license";
import { canEditSlides } from "@/lib/permissions";
import { assertSameOrigin, normalizeUrl, sanitizeOptionalText } from "@/lib/security";
import { slideCreateSchema } from "@/lib/validations";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;
    const module = await prisma.slideModule.findFirst({ where: { id, licenseId: user.licenseId } });
    if (!module) return jsonError("Módulo não encontrado.", 404, "NOT_FOUND");
    const slides = await prisma.slide.findMany({ where: { moduleId: id }, orderBy: { sortOrder: "asc" } });
    return json({ slides });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, ctx: Ctx) {
  try {
    assertSameOrigin(request);
    const user = await requireApiRole([UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR]);
    if (!canEditSlides(user.role)) throw new Error("PERMISSION_DENIED");
    if (!isLicenseUsable(user.license)) return jsonError("Licença indisponível para criar slides.", 403, "LICENSE_UNAVAILABLE");

    const { id } = await ctx.params;
    const module = await prisma.slideModule.findFirst({ where: { id, licenseId: user.licenseId } });
    if (!module) return jsonError("Módulo não encontrado.", 404, "NOT_FOUND");

    const slideCount = await prisma.slide.count({ where: { moduleId: id } });
    if (slideCount >= user.license.maxSlidesPerModule) return jsonError("Limite de slides por módulo atingido.", 403, "LICENSE_LIMIT");

    const data = slideCreateSchema.parse(await request.json());
    const last = await prisma.slide.findFirst({ where: { moduleId: id }, orderBy: { sortOrder: "desc" } });
    const slide = await prisma.slide.create({
      data: {
        moduleId: id,
        type: data.type,
        title: sanitizeOptionalText(data.title, 160),
        description: sanitizeOptionalText(data.description, 500),
        contentUrl: data.contentUrl ? normalizeUrl(data.contentUrl) : null,
        textContent: sanitizeOptionalText(data.textContent, 1600),
        duration: data.duration || module.defaultDuration,
        sortOrder: (last?.sortOrder || 0) + 1,
        isActive: data.isActive,
        fit: data.fit,
        backgroundColor: data.backgroundColor || "#070B12",
        refreshInterval: data.refreshInterval || null,
        openMode: data.openMode
      }
    });

    await auditLog({ licenseId: user.licenseId, userId: user.id, action: "CREATE_SLIDE", entity: "Slide", entityId: slide.id, metadata: { moduleId: id }, request });
    return json({ ok: true, slide }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
