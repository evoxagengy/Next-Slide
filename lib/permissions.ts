import { UserRole } from "@prisma/client";

export function canManageLicense(role: UserRole) {
  return role === UserRole.OWNER;
}

export function canManageUsers(role: UserRole) {
  return role === UserRole.OWNER || role === UserRole.ADMIN;
}

export function canCreateModules(role: UserRole) {
  return role === UserRole.OWNER || role === UserRole.ADMIN;
}

export function canDeleteModules(role: UserRole) {
  return role === UserRole.OWNER;
}

export function canEditModules(role: UserRole) {
  return role === UserRole.OWNER || role === UserRole.ADMIN;
}

export function canEditSlides(role: UserRole) {
  return role === UserRole.OWNER || role === UserRole.ADMIN || role === UserRole.EDITOR;
}

export function assertPermission(allowed: boolean) {
  if (!allowed) {
    throw new Error("PERMISSION_DENIED");
  }
}
