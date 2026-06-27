import { SlideType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isLicenseUsable } from "@/lib/license";
import { sha256 } from "@/lib/security";

export type PlayerModuleState =
  | { status: "invalid" }
  | { status: "license_unavailable"; companyName: string }
  | { status: "module_inactive"; name: string }
  | { status: "empty"; name: string; companyName: string }
  | {
      status: "ready";
      module: {
        id: string;
        name: string;
        description: string | null;
        theme: string;
        defaultDuration: number;
        defaultTransition: string;
        logoUrl: string | null;
      };
      company: { name: string };
      slides: Array<{
        id: string;
        type: SlideType;
        title: string | null;
        description: string | null;
        contentUrl: string | null;
        textContent: string | null;
        duration: number;
        fit: string;
        backgroundColor: string | null;
        refreshInterval: number | null;
        openMode: string;
      }>;
    };


function withPublicToken(url: string | null, publicToken: string) {
  if (!url) return null;
  if (!url.startsWith("/api/assets/")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(publicToken)}`;
}

export async function getPlayerModule(publicToken: string): Promise<PlayerModuleState> {
  const module = await prisma.slideModule.findUnique({
    where: { publicTokenHash: sha256(publicToken) },
    include: {
      license: true,
      slides: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" }
      }
    }
  });

  if (!module) return { status: "invalid" };
  if (!isLicenseUsable(module.license)) {
    return { status: "license_unavailable", companyName: module.license.companyName };
  }
  if (!module.isActive) return { status: "module_inactive", name: module.name };
  if (module.slides.length === 0) {
    return { status: "empty", name: module.name, companyName: module.license.companyName };
  }

  return {
    status: "ready",
    module: {
      id: module.id,
      name: module.name,
      description: module.description,
      theme: module.theme,
      defaultDuration: module.defaultDuration,
      defaultTransition: module.defaultTransition,
      logoUrl: withPublicToken(module.logoUrl, publicToken)
    },
    company: { name: module.license.companyName },
    slides: module.slides.map((slide) => ({
      id: slide.id,
      type: slide.type,
      title: slide.title,
      description: slide.description,
      contentUrl: withPublicToken(slide.contentUrl, publicToken),
      textContent: slide.textContent,
      duration: slide.duration,
      fit: slide.fit,
      backgroundColor: slide.backgroundColor,
      refreshInterval: slide.refreshInterval,
      openMode: slide.openMode
    }))
  };
}
