import { License, LicensePlan, LicenseStatus } from "@prisma/client";

export const PLAN_LIMITS: Record<LicensePlan, { maxUsers: number; maxModules: number; maxSlidesPerModule: number }> = {
  TRIAL: { maxUsers: 1, maxModules: 2, maxSlidesPerModule: 10 },
  PRO: { maxUsers: 5, maxModules: 20, maxSlidesPerModule: 50 },
  ENTERPRISE: { maxUsers: 9999, maxModules: 9999, maxSlidesPerModule: 9999 }
};

export function isLicenseUsable(license: Pick<License, "status" | "expiresAt">) {
  const validStatus = license.status === LicenseStatus.ACTIVE || license.status === LicenseStatus.TRIAL;
  const notExpired = !license.expiresAt || license.expiresAt.getTime() > Date.now();
  return validStatus && notExpired;
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
    TRIAL: "Free / Trial",
    PRO: "Pro",
    ENTERPRISE: "Enterprise"
  };
  return labels[plan];
}
