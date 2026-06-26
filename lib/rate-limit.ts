import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/security";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function hashes(email: string, ip: string) {
  return {
    emailHash: sha256(email.trim().toLowerCase()),
    ipHash: sha256(ip)
  };
}

export async function assertLoginAllowed(email: string, ip: string) {
  const { emailHash, ipHash } = hashes(email, ip);
  const attempt = await prisma.loginAttempt.findUnique({
    where: { emailHash_ipHash: { emailHash, ipHash } }
  });

  if (attempt?.lockedUntil && attempt.lockedUntil.getTime() > Date.now()) {
    throw new Error("LOGIN_LOCKED");
  }
}

export async function recordFailedLogin(email: string, ip: string) {
  const { emailHash, ipHash } = hashes(email, ip);
  const current = await prisma.loginAttempt.findUnique({
    where: { emailHash_ipHash: { emailHash, ipHash } }
  });

  const attempts = (current?.attempts || 0) + 1;
  const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null;

  await prisma.loginAttempt.upsert({
    where: { emailHash_ipHash: { emailHash, ipHash } },
    create: {
      emailHash,
      ipHash,
      attempts,
      lockedUntil,
      lastAttemptAt: new Date()
    },
    update: {
      attempts,
      lockedUntil,
      lastAttemptAt: new Date()
    }
  });
}

export async function recordSuccessfulLogin(email: string, ip: string) {
  const { emailHash, ipHash } = hashes(email, ip);
  await prisma.loginAttempt.deleteMany({ where: { emailHash, ipHash } });
}
