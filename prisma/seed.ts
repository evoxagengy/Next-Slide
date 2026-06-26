import { PrismaClient, LicensePlan, LicenseStatus, SlideFit, SlideOpenMode, SlideType, UserRole } from "@prisma/client";
import { hashPassword, createPublicTokenPayload } from "../lib/security";

const prisma = new PrismaClient();

async function main() {
  const email = "owner@nextslide.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Seed demo já existe.");
    return;
  }

  const token = createPublicTokenPayload();
  const license = await prisma.license.create({
    data: {
      companyName: "Next Slide Demo",
      plan: LicensePlan.TRIAL,
      status: LicenseStatus.TRIAL,
      maxUsers: 1,
      maxModules: 2,
      maxSlidesPerModule: 10,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    }
  });

  const user = await prisma.user.create({
    data: {
      licenseId: license.id,
      name: "Owner Demo",
      email,
      passwordHash: await hashPassword("NextSlide@123"),
      role: UserRole.OWNER
    }
  });

  const module = await prisma.slideModule.create({
    data: {
      licenseId: license.id,
      name: "Gestão à Vista - Demo",
      description: "Módulo exemplo com comunicado, imagem e conteúdo web.",
      slug: "gestao-a-vista-demo",
      publicTokenHash: token.tokenHash,
      publicTokenEncrypted: token.encrypted,
      publicTokenIv: token.iv,
      defaultDuration: 12,
      defaultTransition: "fade",
      theme: "next-dark",
      createdById: user.id,
      slides: {
        create: [
          {
            type: SlideType.TEXT,
            title: "NEXT SLIDE",
            description: "Telas corporativas inteligentes",
            textContent: "Gestão à vista, comunicados e dashboards rodando 24/7.",
            duration: 10,
            sortOrder: 1,
            backgroundColor: "#070B12",
            openMode: SlideOpenMode.IFRAME
          },
          {
            type: SlideType.IMAGE,
            title: "Ambiente operacional",
            description: "Imagem demonstrativa via URL.",
            contentUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1600&auto=format&fit=crop",
            duration: 12,
            sortOrder: 2,
            fit: SlideFit.COVER,
            backgroundColor: "#070B12",
            openMode: SlideOpenMode.IFRAME
          },
          {
            type: SlideType.URL,
            title: "Site institucional exemplo",
            contentUrl: "https://example.com",
            duration: 12,
            sortOrder: 3,
            backgroundColor: "#070B12",
            openMode: SlideOpenMode.IFRAME
          }
        ]
      }
    }
  });

  console.log("Seed concluído.");
  console.log("Login: owner@nextslide.local");
  console.log("Senha: NextSlide@123");
  console.log(`Player demo: ${(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")}/play/${token.token}`);
  console.log(`Módulo demo: ${module.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
