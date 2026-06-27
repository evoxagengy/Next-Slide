import { NextResponse } from "next/server";
import { json, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isLicenseUsable } from "@/lib/license";
import { getClientIp, getUserAgent, sanitizeOptionalText, sanitizeText, sha256 } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ publicToken: string }> };

function toSafeInt(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100000, Math.floor(number)));
}

function bodyValue(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key) ? body[key] : undefined;
}

export async function POST(request: Request, { params }: Props) {
  try {
    const { publicToken } = await params;

    const module = await prisma.slideModule.findUnique({
      where: { publicTokenHash: sha256(publicToken) },
      include: { license: true }
    });

    if (!module) return jsonError("Link público inválido.", 404, "PLAYER_LINK_NOT_FOUND");
    if (!module.isActive) return jsonError("Módulo inativo.", 403, "MODULE_INACTIVE");
    if (!isLicenseUsable(module.license)) return jsonError("Licença indisponível.", 403, "LICENSE_UNAVAILABLE");

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const ipAddress = getClientIp(request);
    const userAgent = getUserAgent(request);
    const rawDeviceKey = typeof body.deviceKey === "string" ? body.deviceKey : "";
    const fallbackKey = sha256(`${publicToken}:${ipAddress}:${userAgent}`).slice(0, 48);
    const deviceKey = sanitizeText(rawDeviceKey, 80) || fallbackKey;

    const width = toSafeInt(bodyValue(body, "screenWidth"));
    const height = toSafeInt(bodyValue(body, "screenHeight"));
    const slideIndex = toSafeInt(bodyValue(body, "slideIndex"));

    const data = {
      licenseId: module.licenseId,
      moduleId: module.id,
      deviceKey,
      name: sanitizeOptionalText(typeof body.name === "string" ? body.name : null, 80),
      userAgent,
      ipAddress,
      screenWidth: width || null,
      screenHeight: height || null,
      timezone: sanitizeOptionalText(typeof body.timezone === "string" ? body.timezone : null, 80),
      currentSlideId: sanitizeOptionalText(typeof body.slideId === "string" ? body.slideId : null, 80),
      currentSlideTitle: sanitizeOptionalText(typeof body.slideTitle === "string" ? body.slideTitle : null, 160),
      currentSlideIndex: slideIndex,
      currentPath: sanitizeOptionalText(typeof body.path === "string" ? body.path : null, 300),
      lastSeenAt: new Date()
    };

    const device = await prisma.deviceSession.upsert({
      where: {
        moduleId_deviceKey: {
          moduleId: module.id,
          deviceKey
        }
      },
      create: data,
      update: data,
      select: {
        id: true,
        lastSeenAt: true
      }
    });

    return json({
      ok: true,
      deviceId: device.id,
      lastSeenAt: device.lastSeenAt
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Heartbeat de dispositivos online. Use POST pelo player público."
  });
}
