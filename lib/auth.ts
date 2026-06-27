import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LicenseStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getClientIp, getUserAgent, randomToken, SESSION_COOKIE, sha256 } from "@/lib/security";

const SESSION_DAYS = 7;

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value || null;
}

async function readCurrentUserByToken(rawToken: string) {
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(rawToken) },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          licenseId: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          license: {
            select: {
              id: true,
              companyName: true,
              plan: true,
              status: true,
              maxUsers: true,
              maxModules: true,
              maxSlidesPerModule: true,
              startsAt: true,
              expiresAt: true,
              createdAt: true,
              updatedAt: true
            }
          }
        }
      }
    }
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  if (!session.user.isActive) return null;
  if (session.user.license.status === LicenseStatus.CANCELLED) return null;

  return session.user;
}

const getCurrentUserByToken = cache(readCurrentUserByToken);

export async function getCurrentUser() {
  const rawToken = await getSessionToken();
  if (!rawToken) return null;
  return getCurrentUserByToken(rawToken);
}

export type AuthUser = Awaited<ReturnType<typeof getCurrentUser>>;

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireApiRole(roles: UserRole[]) {
  const user = await requireApiUser();
  if (!roles.includes(user.role)) throw new Error("PERMISSION_DENIED");
  return user;
}

export async function createSession(userId: string, request: Request) {
  const token = randomToken(48);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request)
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  });
}

export async function destroyCurrentSession() {
  const token = await getSessionToken();
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}
