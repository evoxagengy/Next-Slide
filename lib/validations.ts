import { LicensePlan, LicenseStatus, SlideFit, SlideOpenMode, SlideType, UserRole } from "@prisma/client";
import { z } from "zod";
import { validateStrongPassword } from "@/lib/security";

const passwordSchema = z.string().min(8).superRefine((value, ctx) => {
  const errors = validateStrongPassword(value);
  if (errors.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `A senha precisa ter ${errors.join(", ")}.` });
  }
});

const optionalUrlSchema = z.string().url("Informe uma URL valida.").optional().or(z.literal("")).nullable();
const optionalAssetOrUrlSchema = z.string().optional().or(z.literal("")).nullable().refine((value) => !value || value.startsWith("/api/assets/") || /^https?:\/\//i.test(value), "Informe uma URL válida ou envie um arquivo.");
const optionalContentUrlSchema = z.string().optional().or(z.literal("")).nullable().refine((value) => !value || value.startsWith("/api/assets/") || /^https?:\/\//i.test(value), "Informe uma URL válida ou arquivo enviado.");
const durationSchema = z.coerce.number().int().min(3).max(3600);
const transitionSchema = z.enum(["fade", "cut"]).default("fade");

export const registerSchema = z.object({
  companyName: z.string().min(2, "Informe o nome da empresa.").max(120),
  name: z.string().min(2, "Informe seu nome.").max(120),
  email: z.string().email("Informe um e-mail válido.").max(180).transform((v) => v.toLowerCase().trim()),
  password: passwordSchema
});

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido.").max(180).transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Informe a senha.")
});

export const moduleCreateSchema = z.object({
  name: z.string().min(2, "Informe o nome do módulo.").max(120),
  description: z.string().max(500).optional().nullable(),
  defaultDuration: durationSchema.default(15),
  defaultTransition: transitionSchema,
  theme: z.string().max(40).default("next-dark"),
  logoUrl: optionalAssetOrUrlSchema
});

const moduleBulkItemSchema = z.object({
  title: z.string().max(160).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  url: z.string().min(1, "Informe o arquivo ou URL.").refine((value) => value.startsWith("/api/assets/") || /^https?:\/\//i.test(value), "Informe uma URL válida ou envie um arquivo."),
  duration: z.coerce.number().int().min(3).max(3600).optional().nullable(),
  fit: z.nativeEnum(SlideFit).optional().default(SlideFit.COVER),
  openMode: z.nativeEnum(SlideOpenMode).optional().default(SlideOpenMode.IFRAME),
  refreshInterval: z.coerce.number().int().min(1).max(1440).optional().nullable()
});

export const moduleBulkCreateSchema = moduleCreateSchema.extend({
  imageDuration: durationSchema.default(15),
  siteDuration: durationSchema.default(30),
  powerPointDuration: durationSchema.default(30),
  showSiteEveryImages: z.coerce.number().int().min(0).max(500).default(0),
  images: z.array(moduleBulkItemSchema).default([]),
  sites: z.array(moduleBulkItemSchema).default([]),
  powerPoints: z.array(moduleBulkItemSchema).default([])
}).superRefine((value, ctx) => {
  const total = value.images.length + value.sites.length + value.powerPoints.length;
  if (total === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Adicione pelo menos uma imagem, site ou PowerPoint." });
  }
});

export const moduleUpdateSchema = moduleCreateSchema.partial().extend({
  isActive: z.boolean().optional()
});

const slideBaseSchema = z.object({
  type: z.nativeEnum(SlideType),
  title: z.string().max(160).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  contentUrl: optionalContentUrlSchema,
  textContent: z.string().max(1600).optional().nullable(),
  duration: durationSchema.default(15),
  isActive: z.boolean().default(true),
  fit: z.nativeEnum(SlideFit).default(SlideFit.COVER),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  refreshInterval: z.coerce.number().int().min(1).max(1440).optional().nullable(),
  openMode: z.nativeEnum(SlideOpenMode).default(SlideOpenMode.IFRAME)
});

function validateSlideContent(value: z.infer<typeof slideBaseSchema>, ctx: z.RefinementCtx) {
  const requiresUrl =
    value.type === SlideType.IMAGE ||
    value.type === SlideType.URL ||
    value.type === SlideType.DASHBOARD ||
    value.type === SlideType.POWERPOINT;

  if (requiresUrl && !value.contentUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe uma URL válida para este tipo de slide." });
  }
  if (value.type === SlideType.TEXT && !value.title && !value.textContent) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe um título ou mensagem para o slide de texto." });
  }
}

export const slideCreateSchema = slideBaseSchema.superRefine(validateSlideContent);

export const slideUpdateSchema = slideBaseSchema.partial();

export const reorderSlidesSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1)
});

export const userCreateSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(180).transform((v) => v.toLowerCase().trim()),
  password: passwordSchema,
  role: z.nativeEnum(UserRole).default(UserRole.VIEWER)
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional()
});


export const managerCompanyCreateSchema = z.object({
  companyName: z.string().min(2, "Informe o nome da empresa.").max(120),
  plan: z.nativeEnum(LicensePlan).refine((value) => ([LicensePlan.BASIC, LicensePlan.PREMIUM, LicensePlan.ENTERPRISE] as LicensePlan[]).includes(value), "Selecione Basic, Premium ou Enterprise.").default(LicensePlan.BASIC),
  status: z.nativeEnum(LicenseStatus).default(LicenseStatus.ACTIVE),
  maxUsers: z.coerce.number().int().min(1).max(9999).default(5),
  expiresAt: z.string().datetime().optional().nullable().or(z.literal(""))
});

export const managerCompanyUpdateSchema = z.object({
  companyName: z.string().min(2).max(120).optional(),
  plan: z.nativeEnum(LicensePlan).refine((value) => ([LicensePlan.BASIC, LicensePlan.PREMIUM, LicensePlan.ENTERPRISE] as LicensePlan[]).includes(value), "Selecione Basic, Premium ou Enterprise.").optional(),
  status: z.nativeEnum(LicenseStatus).optional(),
  maxUsers: z.coerce.number().int().min(1).max(9999).optional(),
  expiresAt: z.string().datetime().optional().nullable().or(z.literal(""))
});

export const managerUserCreateSchema = z.object({
  licenseId: z.string().min(1, "Selecione a empresa."),
  name: z.string().min(2, "Informe o nome.").max(120),
  email: z.string().email("Informe um e-mail válido.").max(180).transform((v) => v.toLowerCase().trim()),
  password: passwordSchema,
  role: z.nativeEnum(UserRole).default(UserRole.VIEWER)
});

export const managerUserUpdateSchema = z.object({
  licenseId: z.string().min(1).optional(),
  name: z.string().min(2).max(120).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional()
});
