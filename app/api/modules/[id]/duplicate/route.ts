import { UserRole } from "@prisma/client";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isLicenseUsable } from "@/lib/license";
import { appUrl, assertSameOrigin, createPublicTokenPayload, sanitizeText } from "@/lib/security";
import { slugify } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

async function uniqueSlug(licenseId: string, name: string) {
  const base = slugify(name);
  let slug = base;
  let count = 2;
  while (await prisma.slideModule.findUnique({ where: { licenseId_slug: { licenseId, slug } } })) {
    slug = `${base}-${count}`;
    count += 1;
  }
  return slug;
}

export async function POST(request: Request, ctx: Ctx) {
  try {
    assertSameOrigin(request);
    const user = await requireApiRole([UserRole.OWNER, UserRole.ADMIN]);
    if (!isLicenseUsable(user.license)) return jsonError("Licença indisponível para duplicar módulos.", 403, "LICENSE_UNAVAILABLE");
    const { id } = await ctx.params;
    const source = await prisma.slideModule.findFirst({
      where: { id, licenseId: user.licenseId },
      include: { slides: { orderBy: { sortOrder: "asc" } } }
    });
    if (!source) return jsonError("Módulo não encontrado.", 404, "NOT_FOUND");

    const moduleCount = await prisma.slideModule.count({ where: { licenseId: user.licenseId } });
    if (moduleCount >= user.license.maxModules) return jsonError("Limite de módulos da licença atingido.", 403, "LICENSE_LIMIT");

    const token = createPublicTokenPayload();
    const copyName = sanitizeText(`${source.name} - cópia`, 120);
    const slug = await uniqueSlug(user.licenseId, copyName);

    const duplicated = await prisma.slideModule.create({
      data: {
        licenseId: user.licenseId,
        name: copyName,
        description: source.description,
        slug,
        publicTokenHash: token.tokenHash,
        publicTokenEncrypted: token.encrypted,
        publicTokenIv: token.iv,
        isActive: false,
        defaultDuration: source.defaultDuration,
        defaultTransition: source.defaultTransition,
        theme: source.theme,
        logoUrl: source.logoUrl,
        showClock: source.showClock,
        createdById: user.id,
        slides: {
          create: source.slides.map((slide) => ({
            type: slide.type,
            title: slide.title,
            description: slide.description,
            contentUrl: slide.contentUrl,
            textContent: slide.textContent,
            duration: slide.duration,
            sortOrder: slide.sortOrder,
            isActive: slide.isActive,
            fit: slide.fit,
            backgroundColor: slide.backgroundColor,
            refreshInterval: slide.refreshInterval,
            openMode: slide.openMode
          }))
        }
      }
    });

    await auditLog({ licenseId: user.licenseId, userId: user.id, action: "DUPLICATE_MODULE", entity: "SlideModule", entityId: duplicated.id, metadata: { sourceId: source.id }, request });
    return json({ ok: true, module: { ...duplicated, publicUrl: `${appUrl()}/play/${token.token}` } }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
