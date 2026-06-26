import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertSameOrigin, sanitizeText } from "@/lib/security";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_POWERPOINT_BYTES = 25 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const POWERPOINT_MIME_TYPES = new Set([
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/octet-stream"
]);

function extensionOf(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

function normalizeMime(file: File) {
  const ext = extensionOf(file.name);
  if (file.type) return file.type;
  if (["jpg", "jpeg"].includes(ext)) return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "ppt") return "application/vnd.ms-powerpoint";
  if (ext === "pptx") return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  return "application/octet-stream";
}

function validateFile(file: File) {
  const mimeType = normalizeMime(file);
  const ext = extensionOf(file.name);
  const isImage = IMAGE_MIME_TYPES.has(mimeType) || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
  const isPowerPoint = POWERPOINT_MIME_TYPES.has(mimeType) && ["ppt", "pptx"].includes(ext);

  if (!isImage && !isPowerPoint) {
    return { ok: false as const, error: "Arquivo não permitido. Envie imagens JPG, PNG, WEBP, GIF ou PowerPoint PPT/PPTX." };
  }

  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_POWERPOINT_BYTES;
  if (file.size <= 0) return { ok: false as const, error: "Arquivo vazio ou inválido." };
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / 1024 / 1024);
    return { ok: false as const, error: `Arquivo muito grande. Limite atual: ${mb} MB.` };
  }

  return { ok: true as const, mimeType, kind: isImage ? "image" as const : "powerpoint" as const };
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiRole([UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR]);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("Arquivo não enviado.", 400, "FILE_REQUIRED");
    }

    const validation = validateFile(file);
    if (!validation.ok) return jsonError(validation.error, 422, "INVALID_FILE");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = sanitizeText(file.name || "arquivo", 180) || "arquivo";

    const asset = await prisma.mediaAsset.create({
      data: {
        licenseId: user.licenseId,
        uploadedById: user.id,
        fileName: safeName,
        mimeType: validation.mimeType,
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
      metadata: { fileName: safeName, mimeType: validation.mimeType, sizeBytes: buffer.byteLength, kind: validation.kind },
      request
    });

    return json({
      ok: true,
      asset: {
        id: asset.id,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        kind: validation.kind,
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
