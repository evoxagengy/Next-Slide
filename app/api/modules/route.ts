import { SlideFit, SlideOpenMode, SlideType, UserRole } from "@prisma/client";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireApiRole, requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isLicenseUsable } from "@/lib/license";
import { canCreateModules } from "@/lib/permissions";
import { appUrl, assertSameOrigin, createPublicTokenPayload, decryptSecret, normalizeUrl, sanitizeOptionalText, sanitizeText } from "@/lib/security";
import { slugify } from "@/lib/utils";
import { moduleBulkCreateSchema, moduleCreateSchema } from "@/lib/validations";

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

type BulkItem = {
  title?: string | null;
  description?: string | null;
  url: string;
  duration?: number | null;
  fit?: SlideFit;
  openMode?: SlideOpenMode;
  refreshInterval?: number | null;
};

type PendingSlide = {
  type: SlideType;
  title: string | null;
  description: string | null;
  contentUrl: string;
  duration: number;
  sortOrder: number;
  fit: SlideFit;
  openMode: SlideOpenMode;
  refreshInterval: number | null;
};

function toPendingSlide(input: {
  item: BulkItem;
  type: SlideType;
  fallbackTitle: string;
  fallbackDuration: number;
  sortOrder: number;
  fit?: SlideFit;
  openMode?: SlideOpenMode;
}): PendingSlide {
  return {
    type: input.type,
    title: sanitizeOptionalText(input.item.title || input.fallbackTitle, 160),
    description: sanitizeOptionalText(input.item.description, 500),
    contentUrl: normalizeUrl(input.item.url),
    duration: input.item.duration || input.fallbackDuration,
    sortOrder: input.sortOrder,
    fit: input.item.fit || input.fit || SlideFit.COVER,
    openMode: input.item.openMode || input.openMode || SlideOpenMode.IFRAME,
    refreshInterval: input.item.refreshInterval || null
  };
}

type BulkModuleData = {
  imageDuration: number;
  siteDuration: number;
  powerPointDuration: number;
  showSiteEveryImages: number;
  images: BulkItem[];
  sites: BulkItem[];
  powerPoints: BulkItem[];
};

function buildBulkSlides(data: BulkModuleData): PendingSlide[] {
  const imageSlides = data.images.map((item, index) => ({ item, index }));
  const siteSlides = data.sites.map((item, index) => ({ item, index }));
  const powerPointSlides = data.powerPoints.map((item, index) => ({ item, index }));
  const ordered: Array<{ item: BulkItem; type: SlideType; fallbackTitle: string; fallbackDuration: number; fit?: SlideFit; openMode?: SlideOpenMode }> = [];

  if (data.showSiteEveryImages > 0 && siteSlides.length > 0 && imageSlides.length > 0) {
    let insertedSites = 0;
    imageSlides.forEach(({ item, index }) => {
      ordered.push({
        item,
        type: SlideType.IMAGE,
        fallbackTitle: `Imagem ${index + 1}`,
        fallbackDuration: data.imageDuration,
        fit: item.fit || SlideFit.COVER,
        openMode: SlideOpenMode.IFRAME
      });

      const shouldInsertSite = (index + 1) % data.showSiteEveryImages === 0;
      if (shouldInsertSite) {
        const site = siteSlides[insertedSites % siteSlides.length];
        ordered.push({
          item: site.item,
          type: SlideType.URL,
          fallbackTitle: site.item.title || `Site ${site.index + 1}`,
          fallbackDuration: data.siteDuration,
          fit: SlideFit.COVER,
          openMode: site.item.openMode || SlideOpenMode.IFRAME
        });
        insertedSites += 1;
      }
    });

    if (insertedSites === 0) {
      siteSlides.forEach(({ item, index }) => {
        ordered.push({ item, type: SlideType.URL, fallbackTitle: `Site ${index + 1}`, fallbackDuration: data.siteDuration, fit: SlideFit.COVER, openMode: item.openMode || SlideOpenMode.IFRAME });
      });
    }
  } else {
    imageSlides.forEach(({ item, index }) => {
      ordered.push({ item, type: SlideType.IMAGE, fallbackTitle: `Imagem ${index + 1}`, fallbackDuration: data.imageDuration, fit: item.fit || SlideFit.COVER, openMode: SlideOpenMode.IFRAME });
    });
    siteSlides.forEach(({ item, index }) => {
      ordered.push({ item, type: SlideType.URL, fallbackTitle: `Site ${index + 1}`, fallbackDuration: data.siteDuration, fit: SlideFit.COVER, openMode: item.openMode || SlideOpenMode.IFRAME });
    });
  }

  powerPointSlides.forEach(({ item, index }) => {
    ordered.push({ item, type: SlideType.POWERPOINT, fallbackTitle: `PowerPoint ${index + 1}`, fallbackDuration: data.powerPointDuration, fit: SlideFit.CONTAIN, openMode: SlideOpenMode.IFRAME });
  });

  return ordered.map((slide, index) => toPendingSlide({ ...slide, sortOrder: index + 1 }));
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

    const raw = await request.json();
    const isBulkPayload = Array.isArray(raw.images) || Array.isArray(raw.sites) || Array.isArray(raw.powerPoints);
    const token = createPublicTokenPayload();

    if (!isBulkPayload) {
      const data = moduleCreateSchema.parse(raw);
      const slug = await uniqueSlug(user.licenseId, data.name);
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
          defaultTransition: data.defaultTransition,
          theme: sanitizeText(data.theme, 40),
          logoUrl: data.logoUrl ? normalizeUrl(data.logoUrl) : null,
          createdById: user.id
        }
      });

      await auditLog({ licenseId: user.licenseId, userId: user.id, action: "CREATE_MODULE", entity: "SlideModule", entityId: module.id, request });
      return json({ ok: true, module: { ...module, publicUrl: `${appUrl()}/play/${token.token}` } }, 201);
    }

    const data = moduleBulkCreateSchema.parse(raw);
    const pendingSlides = buildBulkSlides(data);
    if (pendingSlides.length > user.license.maxSlidesPerModule) {
      return jsonError(`Este módulo possui ${pendingSlides.length} slides, mas sua licença permite até ${user.license.maxSlidesPerModule}.`, 403, "LICENSE_LIMIT");
    }

    const slug = await uniqueSlug(user.licenseId, data.name);
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
        defaultTransition: data.defaultTransition,
        theme: sanitizeText(data.theme, 40),
        logoUrl: data.logoUrl ? normalizeUrl(data.logoUrl) : null,
        createdById: user.id,
        slides: {
          create: pendingSlides.map((slide) => ({
            type: slide.type,
            title: slide.title,
            description: slide.description,
            contentUrl: slide.contentUrl,
            duration: slide.duration,
            sortOrder: slide.sortOrder,
            isActive: true,
            fit: slide.fit,
            backgroundColor: "#070B12",
            refreshInterval: slide.refreshInterval,
            openMode: slide.openMode
          }))
        }
      },
      include: { _count: { select: { slides: true } } }
    });

    await auditLog({
      licenseId: user.licenseId,
      userId: user.id,
      action: "CREATE_MODULE_WITH_SLIDES",
      entity: "SlideModule",
      entityId: module.id,
      metadata: { slidesCreated: pendingSlides.length, showSiteEveryImages: data.showSiteEveryImages },
      request
    });

    return json({ ok: true, module: { ...module, publicUrl: `${appUrl()}/play/${token.token}` } }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
