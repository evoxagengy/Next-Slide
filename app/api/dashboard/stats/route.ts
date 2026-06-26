import { json, handleApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireApiUser();
    const [totalModules, activeModules, totalSlides, activeSlides, recentModules] = await Promise.all([
      prisma.slideModule.count({ where: { licenseId: user.licenseId } }),
      prisma.slideModule.count({ where: { licenseId: user.licenseId, isActive: true } }),
      prisma.slide.count({ where: { module: { licenseId: user.licenseId } } }),
      prisma.slide.count({ where: { module: { licenseId: user.licenseId }, isActive: true } }),
      prisma.slideModule.findMany({
        where: { licenseId: user.licenseId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: { _count: { select: { slides: true } } }
      })
    ]);

    return json({
      totalModules,
      activeModules,
      totalSlides,
      activeSlides,
      playersActive: activeModules,
      license: {
        companyName: user.license.companyName,
        plan: user.license.plan,
        status: user.license.status,
        maxUsers: user.license.maxUsers,
        maxModules: user.license.maxModules,
        maxSlidesPerModule: user.license.maxSlidesPerModule,
        expiresAt: user.license.expiresAt
      },
      recentModules: recentModules.map((module) => ({
        id: module.id,
        name: module.name,
        slug: module.slug,
        isActive: module.isActive,
        updatedAt: module.updatedAt,
        slidesCount: module._count.slides
      }))
    });
  } catch (error) {
    return handleApiError(error);
  }
}
