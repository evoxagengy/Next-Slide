import { SecuritySeverity, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog, securityEvent } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertBasicRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, randomToken } from "@/lib/security";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_POWERPOINT_BYTES = 25 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
};

function extensionOf(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

function hasPrefix(buffer: Buffer, prefix: number[]) {
  if (buffer.length < prefix.length) return false;
  return prefix.every((value, index) => buffer[index] === value);
}

function detectFile(buffer: Buffer, originalName: string) {
  const ext = extensionOf(originalName);

  const isJpeg = hasPrefix(buffer, [0xff, 0xd8, 0xff]);
  const isPng = hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isGif = buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"));
  const isWebp = buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  const isZipBased = hasPrefix(buffer, [0x50, 0x4b, 0x03, 0x04]) || hasPrefix(buffer, [0x50, 0x4b, 0x05, 0x06]) || hasPrefix(buffer, [0x50, 0x4b, 0x07, 0x08]);
  const isLegacyOffice = hasPrefix(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

  if ((ext === "jpg" || ext === "jpeg") && isJpeg) return { ok: true as const, kind: "image" as const, ext: "jpg", mimeType: "image/jpeg", maxBytes: MAX_IMAGE_BYTES };
  if (ext === "png" && isPng) return { ok: true as const, kind: "image" as const, ext: "png", mimeType: "image/png", maxBytes: MAX_IMAGE_BYTES };
  if (ext === "gif" && isGif) return { ok: true as const, kind: "image" as const, ext: "gif", mimeType: "image/gif", maxBytes: MAX_IMAGE_BYTES };
  if (ext === "webp" && isWebp) return { ok: true as const, kind: "image" as const, ext: "webp", mimeType: "image/webp", maxBytes: MAX_IMAGE_BYTES };
  if (ext === "pptx" && isZipBased) return { ok: true as const, kind: "powerpoint" as const, ext: "pptx", mimeType: MIME_BY_EXTENSION.pptx, maxBytes: MAX_POWERPOINT_BYTES };
  if (ext === "ppt" && isLegacyOffice) return { ok: true as const, kind: "powerpoint" as const, ext: "ppt", mimeType: MIME_BY_EXTENSION.ppt, maxBytes: MAX_POWERPOINT_BYTES };

  return { ok: false as const, error: "Arquivo não permitido ou assinatura incompatível. Envie JPG, PNG, WEBP, GIF, PPT ou PPTX válido." };
}

function secureStoredFileName(extension: string) {
  return `next-slide-${Date.now()}-${randomToken(10)}.${extension}`;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    assertBasicRateLimit(request, "asset_upload", { max: 20, windowMs: 60_000 });

    const user = await requireApiRole([UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR]);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("Arquivo não enviado.", 400, "FILE_REQUIRED");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength <= 0) return jsonError("Arquivo vazio ou inválido.", 422, "INVALID_FILE");

    const detection = detectFile(buffer, file.name || "arquivo");
    if (!detection.ok) {
      await securityEvent({
        licenseId: user.licenseId,
        userId: user.id,
        eventType: "UPLOAD_REJECTED",
        severity: SecuritySeverity.MEDIUM,
        metadata: { reason: detection.error, sizeBytes: buffer.byteLength },
        request
      });
      return jsonError(detection.error, 422, "INVALID_FILE_SIGNATURE");
    }

    if (buffer.byteLength > detection.maxBytes) {
      const mb = Math.round(detection.maxBytes / 1024 / 1024);
      return jsonError(`Arquivo muito grande. Limite atual: ${mb} MB.`, 422, "FILE_TOO_LARGE");
    }

    const storedName = secureStoredFileName(detection.ext);

    const asset = await prisma.mediaAsset.create({
      data: {
        licenseId: user.licenseId,
        uploadedById: user.id,
        fileName: storedName,
        mimeType: detection.mimeType,
        sizeBytes: buffer.byteLength,
        dataBase64: buffer.toString("base64")
      }
    });

    await auditLog({
      licenseId: user.licenseId,
      userId: user.id,
      action: "UPLOAD_MEDIA_ASSET",
      entity: "MediaAsset",
      entityId: asset.id,
      metadata: { fileName: storedName, mimeType: detection.mimeType, sizeBytes: buffer.byteLength, kind: detection.kind },
      request
    });

    return json({
      ok: true,
      asset: {
        id: asset.id,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        kind: detection.kind,
        url: `/api/assets/${asset.id}/file`
      }
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Use POST multipart/form-data para enviar arquivos." });
}
