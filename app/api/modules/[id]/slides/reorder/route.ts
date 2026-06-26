import { UserRole } from "@prisma/client";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertSameOrigin } from "@/lib/security";
import { reorderSlidesSchema } from "@/lib/validations";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    assertSameOrigin(request);
    const user = await requireApiRole([UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR]);
    const { id } = await ctx.params;
    const data = reorderSlidesSchema.parse(await request.json());

    const module = await prisma.slideModule.findFirst({ where: { id, licenseId: user.licenseId } });
    if (!module) return jsonError("Módulo não encontrado.", 404, "NOT_FOUND");

    const slides = await prisma.slide.findMany({ where: { moduleId: id, id: { in: data.orderedIds } } });
    if (slides.length !== data.orderedIds.length) return jsonError("Lista de ordenação inválida.", 422, "INVALID_ORDER");

    await prisma.$transaction(
      data.orderedIds.map((slideId, index) =>
        prisma.slide.update({ where: { id: slideId }, data: { sortOrder: index + 1 } })
      )
    );

    await auditLog({ licenseId: user.licenseId, userId: user.id, action: "REORDER_SLIDES", entity: "SlideModule", entityId: id, request });
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
