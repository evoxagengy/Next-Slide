import { UserRole } from "@prisma/client";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireApiRole, requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isLicenseUsable } from "@/lib/license";
import { canCreateModules } from "@/lib/permissions";
import { appUrl, assertSameOrigin, createPublicTokenPayload, decryptSecret, normalizeUrl, sanitizeOptionalText, sanitizeText } from "@/lib/security";
import { slugify } from "@/lib/utils";
import { moduleCreateSchema } from "@/lib/validations";

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

function publicUrlFromEncrypted(encrypted: string, iv: string) {
  return `${appUrl()}/play/${decryptSecret(encrypted, iv)}`;
}

export async function GET() {
  try {
    const user = await requireApiUser();
    const modules = await prisma.slideModule.findMany({
      where: { licenseId: user.licenseId },
      include: { _count: { select: { slides: true } } },
      orderBy: { updatedAt: "desc" }
    });

    return json({
      modules: modules.map((module) => ({
        id: module.id,
        name: module.name,
        description: module.description,
        slug: module.slug,
        isActive: module.isActive,
        defaultDuration: module.defaultDuration,
        defaultTransition: module.defaultTransition,
        theme: module.theme,
        logoUrl: module.logoUrl,
        updatedAt: module.updatedAt,
        createdAt: module.createdAt,
        slidesCount: module._count.slides,
        publicUrl: publicUrlFromEncrypted(module.publicTokenEncrypted, module.publicTokenIv)
      }))
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiRole([UserRole.OWNER, UserRole.ADMIN]);
    if (!canCreateModules(user.role)) throw new Error("PERMISSION_DENIED");
    if (!isLicenseUsable(user.license)) return jsonError("Licença indisponível para criar módulos.", 403, "LICENSE_UNAVAILABLE");

    const usage = await prisma.slideModule.count({ where: { licenseId: user.licenseId } });
    if (usage >= user.license.maxModules) return jsonError("Limite de módulos da licença atingido.", 403, "LICENSE_LIMIT");

    const data = moduleCreateSchema.parse(await request.json());
    const slug = await uniqueSlug(user.licenseId, data.name);
    const token = createPublicTokenPayload();

    const module = await prisma.slideModule.create({
      data: {
        licenseId: user.licenseId,
        name: sanitizeText(data.name, 120),
        description: sanitizeOptionalText(data.description, 500),
        slug,
        publicTokenHash: token.tokenHash,
        publicTokenEncrypted: token.encrypted,
        publicTokenIv: token.iv,
        defaultDuration: data.defaultDuration,
        defaultTransition: sanitizeText(data.defaultTransition, 40),
        theme: sanitizeText(data.theme, 40),
        logoUrl: data.logoUrl ? normalizeUrl(data.logoUrl) : null,
        createdById: user.id
      }
    });

    await auditLog({ licenseId: user.licenseId, userId: user.id, action: "CREATE_MODULE", entity: "SlideModule", entityId: module.id, request });
    return json({ ok: true, module: { ...module, publicUrl: `${appUrl()}/play/${token.token}` } }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
