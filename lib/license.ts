import { License, LicensePlan, LicenseStatus } from "@prisma/client";

export type PlanLimits = { maxUsers: number; maxModules: number; maxSlidesPerModule: number };

export const PLAN_LIMITS: Record<LicensePlan, PlanLimits> = {
  TRIAL: { maxUsers: 1, maxModules: 2, maxSlidesPerModule: 10 },
  BASIC: { maxUsers: 5, maxModules: 20, maxSlidesPerModule: 200 },
  PRO: { maxUsers: 25, maxModules: 100, maxSlidesPerModule: 500 },
  PREMIUM: { maxUsers: 25, maxModules: 100, maxSlidesPerModule: 500 },
  ENTERPRISE: { maxUsers: 9999, maxModules: 9999, maxSlidesPerModule: 9999 }
};

export function limitsForPlan(plan: LicensePlan, maxUsersOverride?: number | null): PlanLimits {
  const base = PLAN_LIMITS[plan];
  return {
    ...base,
    maxUsers: typeof maxUsersOverride === "number" && maxUsersOverride > 0 ? maxUsersOverride : base.maxUsers
  };
}

export function canUsePptxConversion(plan: LicensePlan) {
  return plan === LicensePlan.PREMIUM || plan === LicensePlan.ENTERPRISE || plan === LicensePlan.PRO;
}

export function isLicenseUsable(license: Pick<License, "status" | "expiresAt"> & { plan?: LicensePlan | null }) {
  const validStatus = license.status === LicenseStatus.ACTIVE || license.status === LicenseStatus.TRIAL;
  if (!validStatus) return false;

  // Enterprise é tratado como licença sem vencimento operacional.
  // A licença ainda pode ser bloqueada com status SUSPENDED, CANCELLED ou EXPIRED.
  if (license.plan === LicensePlan.ENTERPRISE) return true;

  return !license.expiresAt || license.expiresAt.getTime() > Date.now();
}

export function licenseStatusLabel(status: LicenseStatus) {
  const labels: Record<LicenseStatus, string> = {
    ACTIVE: "Ativa",
    TRIAL: "Trial",
    EXPIRED: "Expirada",
    SUSPENDED: "Suspensa",
    CANCELLED: "Cancelada"
  };
  return labels[status];
}

export function planLabel(plan: LicensePlan) {
  const labels: Record<LicensePlan, string> = {
    TRIAL: "Basic (legado)",
    BASIC: "Basic",
    PRO: "Premium (legado)",
    PREMIUM: "Premium",
    ENTERPRISE: "Enterprise"
  };
  return labels[plan];
}

export function planDescription(plan: LicensePlan) {
  const descriptions: Record<LicensePlan, string> = {
    TRIAL: "Plano legado de avaliação.",
    BASIC: "Até 20 módulos. Sem conversão PPTX para imagens.",
    PRO: "Plano legado tratado como Premium.",
    PREMIUM: "Até 100 módulos. Conversão PPTX liberada.",
    ENTERPRISE: "Sem limite operacional de módulos. Conversão PPTX liberada."
  };
  return descriptions[plan];
}
