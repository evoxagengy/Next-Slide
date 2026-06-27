import { LicensePlan, UserRole } from "@prisma/client";

export type ManagerUserScope = {
  id: string;
  email: string;
  role: UserRole;
  licenseId: string;
};

const DEFAULT_PLATFORM_OWNER_EMAILS = ["santos.bruno@engenixsystem.com.br", "evoxagengy@gmail.com"];
const PLATFORM_MASTER_LICENSE_ID = "license_engenix_master";

export function platformOwnerEmails() {
  const raw = process.env.NEXT_SLIDE_PLATFORM_OWNER_EMAILS;
  if (!raw) return DEFAULT_PLATFORM_OWNER_EMAILS;
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformOwner(user: ManagerUserScope) {
  if (user.role !== UserRole.OWNER) return false;
  const emailAllowed = platformOwnerEmails().includes(user.email.toLowerCase());
  const masterLicense = user.licenseId === PLATFORM_MASTER_LICENSE_ID;
  return emailAllowed || masterLicense;
}

export function managerPlanOptions(): LicensePlan[] {
  return [LicensePlan.BASIC, LicensePlan.PREMIUM, LicensePlan.ENTERPRISE];
}

export function normalizeManagerPlan(plan: LicensePlan) {
  if (plan === LicensePlan.TRIAL) return LicensePlan.BASIC;
  if (plan === LicensePlan.PRO) return LicensePlan.PREMIUM;
  return plan;
}
