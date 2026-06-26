import { SecuritySeverity } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getClientIp, getUserAgent } from "@/lib/security";

type AuditInput = {
  licenseId: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  request?: Request;
};

export async function auditLog(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      licenseId: input.licenseId,
      userId: input.userId || null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId || null,
      metadata: input.metadata || undefined,
      ipAddress: input.request ? getClientIp(input.request) : undefined,
      userAgent: input.request ? getUserAgent(input.request) : undefined
    }
  });
}

type SecurityInput = {
  licenseId?: string | null;
  userId?: string | null;
  eventType: string;
  severity?: SecuritySeverity;
  metadata?: Record<string, unknown>;
  request?: Request;
};

export async function securityEvent(input: SecurityInput) {
  await prisma.securityEvent.create({
    data: {
      licenseId: input.licenseId || null,
      userId: input.userId || null,
      eventType: input.eventType,
      severity: input.severity || SecuritySeverity.LOW,
      metadata: input.metadata || undefined,
      ipAddress: input.request ? getClientIp(input.request) : undefined,
      userAgent: input.request ? getUserAgent(input.request) : undefined
    }
  });
}
