import { SlideOpenMode, SlideType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isLicenseUsable } from "@/lib/license";
import { sha256 } from "@/lib/security";
import { sameNormalizedExternalUrl } from "@/lib/network-security";

export function assetFilePath(assetId: string) {
  return `/api/assets/${assetId}/file`;
}

function stripQuery(value: string | null | undefined) {
  if (!value) return null;
  return value.split("?")[0] || value;
}

function matchesAssetPath(value: string | null | undefined, assetId: string) {
  return stripQuery(value) === assetFilePath(assetId);
}

export async function canAccessAssetWithPublicToken(assetId: string, licenseId: string, publicToken: string) {
  const module = await prisma.slideModule.findUnique({
    where: { publicTokenHash: sha256(publicToken) },
    include: {
      license: true,
      slides: {
        where: { isActive: true },
        select: { contentUrl: true }
      }
    }
  });

  if (!module || !module.isActive || module.licenseId !== licenseId || !isLicenseUsable(module.license)) return false;
  if (matchesAssetPath(module.logoUrl, assetId)) return true;
  return module.slides.some((slide) => matchesAssetPath(slide.contentUrl, assetId));
}

export async function isPublicTokenAllowedForExternalSlide(input: {
  publicToken: string;
  url: URL;
  openModes?: SlideOpenMode[];
}) {
  const module = await prisma.slideModule.findUnique({
    where: { publicTokenHash: sha256(input.publicToken) },
    include: {
      license: true,
      slides: {
        where: {
          isActive: true,
          type: { in: [SlideType.URL, SlideType.DASHBOARD] }
        },
        select: { contentUrl: true, openMode: true }
      }
    }
  });

  if (!module || !module.isActive || !isLicenseUsable(module.license)) return false;

  return module.slides.some((slide) => {
    const modeAllowed = !input.openModes?.length || input.openModes.includes(slide.openMode);
    return modeAllowed && sameNormalizedExternalUrl(slide.contentUrl, input.url);
  });
}
