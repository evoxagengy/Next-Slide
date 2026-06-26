import { SlideFit, SlideOpenMode, SlideType, UserRole } from "@prisma/client";
import { z } from "zod";
import { validateStrongPassword } from "@/lib/security";

const passwordSchema = z.string().min(8).superRefine((value, ctx) => {
  const errors = validateStrongPassword(value);
  if (errors.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `A senha precisa ter ${errors.join(", ")}.` });
  }
});

export const registerSchema = z.object({
  companyName: z.string().min(2, "Informe o nome da empresa.").max(120),
  name: z.string().min(2, "Informe seu nome.").max(120),
  email: z.string().email("Informe um e-mail v??lido.").max(180).transform((v) => v.toLowerCase().trim()),
  password: passwordSchema
});

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail v??lido.").max(180).transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Informe a senha.")
});

export const moduleCreateSchema = z.object({
  name: z.string().min(2, "Informe o nome do m??dulo.").max(120),
  description: z.string().max(500).optional().nullable(),
  defaultDuration: z.coerce.number().int().min(3).max(3600).default(15),
  defaultTransition: z.string().max(40).default("fade"),
  theme: z.string().max(40).default("next-dark"),
  logoUrl: z.string().url().optional().or(z.literal("")).nullable()
});

export const moduleUpdateSchema = moduleCreateSchema.partial().extend({
  isActive: z.boolean().optional()
});

const slideBaseSchema = z.object({
  type: z.nativeEnum(SlideType),
  title: z.string().max(160).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  contentUrl: z.string().url().optional().or(z.literal("")).nullable(),
  textContent: z.string().max(1600).optional().nullable(),
  duration: z.coerce.number().int().min(3).max(3600).default(15),
  isActive: z.boolean().default(true),
  fit: z.nativeEnum(SlideFit).default(SlideFit.COVER),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  refreshInterval: z.coerce.number().int().min(1).max(1440).optional().nullable(),
  openMode: z.nativeEnum(SlideOpenMode).default(SlideOpenMode.IFRAME)
});

function validateSlideContent(value: z.infer<typeof slideBaseSchema>, ctx: z.RefinementCtx) {
  if ([SlideType.IMAGE, SlideType.URL, SlideType.DASHBOARD].includes(value.type) && !value.contentUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe uma URL v??lida para este tipo de slide." });
  }
  if (value.type === SlideType.TEXT && !value.title && !value.textContent) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe um t??tulo ou mensagem para o slide de texto." });
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


