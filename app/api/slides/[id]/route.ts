import { UserRole } from "@prisma/client";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertSameOrigin, normalizeContentUrl, sanitizeOptionalText } from "@/lib/security";
import { slideUpdateSchema } from "@/lib/validations";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    assertSameOrigin(request);
    const user = await requireApiRole([UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR]);
    const { id } = await ctx.params;
    const data = slideUpdateSchema.parse(await request.json());

    const existing = await prisma.slide.findFirst({ where: { id, module: { licenseId: user.licenseId } } });
    if (!existing) return jsonError("Slide não encontrado.", 404, "NOT_FOUND");

    const slide = await prisma.slide.update({
      where: { id },
      data: {
        type: data.type,
        title: data.title !== undefined ? sanitizeOptionalText(data.title, 160) : undefined,
        description: data.description !== undefined ? sanitizeOptionalText(data.description, 500) : undefined,
        contentUrl: data.contentUrl !== undefined ? (data.contentUrl ? normalizeContentUrl(data.contentUrl) : null) : undefined,
        textContent: data.textContent !== undefined ? sanitizeOptionalText(data.textContent, 1600) : undefined,
        duration: data.duration,
        isActive: data.isActive,
        fit: data.fit,
        backgroundColor: data.backgroundColor,
        refreshInterval: data.refreshInterval === undefined ? undefined : data.refreshInterval || null,
        openMode: data.openMode
      }
    });

    await auditLog({ licenseId: user.licenseId, userId: user.id, action: "UPDATE_SLIDE", entity: "Slide", entityId: id, request });
    return json({ ok: true, slide });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  try {
    assertSameOrigin(request);
    const user = await requireApiRole([UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR]);
    const { id } = await ctx.params;
    const existing = await prisma.slide.findFirst({ where: { id, module: { licenseId: user.licenseId } } });
    if (!existing) return jsonError("Slide não encontrado.", 404, "NOT_FOUND");

    await prisma.slide.delete({ where: { id } });
    await auditLog({ licenseId: user.licenseId, userId: user.id, action: "DELETE_SLIDE", entity: "Slide", entityId: id, request });
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
