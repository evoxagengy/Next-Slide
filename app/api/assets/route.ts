import { SecuritySeverity, UserRole } from "@prisma/client";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { json, jsonError, handleApiError } from "@/lib/api";
import { auditLog, securityEvent } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canUsePptxConversion } from "@/lib/license";
import { assertBasicRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, randomToken } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_POWERPOINT_BYTES = 35 * 1024 * 1024;
const MAX_EXTRACTED_POWERPOINT_SLIDES = 200;
const CONVERTAPI_ENDPOINT = "https://v2.convertapi.com/convert/pptx/to/png";

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip"
};

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif"
};

type DetectedFile =
  | { ok: true; kind: "image"; ext: string; mimeType: string; maxBytes: number }
  | { ok: true; kind: "pptx"; ext: "pptx"; mimeType: string; maxBytes: number }
  | { ok: true; kind: "legacyPpt"; ext: "ppt"; mimeType: string; maxBytes: number }
  | { ok: false; error: string };

type ExtractedPowerPointSlide = {
  slideNumber: number;
  assetId: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type RawConvertedFile = {
  FileName?: string;
  Url?: string;
  FileSize?: number;
  fileName?: string;
  url?: string;
  fileSize?: number;
};

type ConvertApiResponse = {
  Files?: RawConvertedFile[];
  files?: RawConvertedFile[];
  ConversionCost?: number;
};

type DownloadedConvertedFile = {
  fileName: string;
  ext: string;
  mimeType: string;
  buffer: Buffer;
};

function extensionOf(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

function hasPrefix(buffer: Buffer, prefix: number[]) {
  if (buffer.length < prefix.length) return false;
  return prefix.every((value, index) => buffer[index] === value);
}

function detectFile(buffer: Buffer, originalName: string): DetectedFile {
  const ext = extensionOf(originalName);
  const isJpeg = hasPrefix(buffer, [0xff, 0xd8, 0xff]);
  const isPng = hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isGif = buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"));
  const isWebp = buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  const isZipBased = hasPrefix(buffer, [0x50, 0x4b, 0x03, 0x04]) || hasPrefix(buffer, [0x50, 0x4b, 0x05, 0x06]) || hasPrefix(buffer, [0x50, 0x4b, 0x07, 0x08]);
  const isLegacyOffice = hasPrefix(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

  if ((ext === "jpg" || ext === "jpeg") && isJpeg) return { ok: true, kind: "image", ext: "jpg", mimeType: "image/jpeg", maxBytes: MAX_IMAGE_BYTES };
  if (ext === "png" && isPng) return { ok: true, kind: "image", ext: "png", mimeType: "image/png", maxBytes: MAX_IMAGE_BYTES };
  if (ext === "gif" && isGif) return { ok: true, kind: "image", ext: "gif", mimeType: "image/gif", maxBytes: MAX_IMAGE_BYTES };
  if (ext === "webp" && isWebp) return { ok: true, kind: "image", ext: "webp", mimeType: "image/webp", maxBytes: MAX_IMAGE_BYTES };
  if (ext === "pptx" && isZipBased) return { ok: true, kind: "pptx", ext: "pptx", mimeType: MIME_BY_EXTENSION.pptx, maxBytes: MAX_POWERPOINT_BYTES };
  if (ext === "ppt" && isLegacyOffice) return { ok: true, kind: "legacyPpt", ext: "ppt", mimeType: MIME_BY_EXTENSION.ppt, maxBytes: MAX_POWERPOINT_BYTES };

  return { ok: false, error: "Arquivo não permitido ou assinatura incompatível. Envie JPG, PNG, WEBP, GIF ou PPTX válido." };
}

function secureStoredFileName(extension: string, prefix = "next-slide") {
  return `${prefix}-${Date.now()}-${randomToken(10)}.${extension}`;
}

function mediaInfoFromPath(path: string) {
  const ext = extensionOf(path);
  const mimeType = IMAGE_MIME_BY_EXTENSION[ext];
  if (!mimeType) return null;
  return { ext: ext === "jpeg" ? "jpg" : ext, mimeType };
}

function ensureConfiguredConvertApiSecret() {
  const secret = process.env.CONVERTAPI_SECRET?.trim();
  if (!secret) throw new Error("PPTX_CONVERTER_NOT_CONFIGURED");
  return secret;
}

function normalizeConvertedFile(raw: RawConvertedFile) {
  const url = raw.Url || raw.url || "";
  const fallbackName = url ? decodeURIComponent(new URL(url).pathname.split("/").pop() || "slide.png") : "slide.png";
  return {
    fileName: raw.FileName || raw.fileName || fallbackName,
    url,
    fileSize: raw.FileSize || raw.fileSize || 0
  };
}

function slideIndexFromName(name: string) {
  const match = name.match(/(?:slide|page|image|png)[-_ ]?(\d+)/i) || name.match(/(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function naturalFileSort(a: { fileName: string }, b: { fileName: string }) {
  const byNumber = slideIndexFromName(a.fileName) - slideIndexFromName(b.fileName);
  if (byNumber !== 0) return byNumber;
  return a.fileName.localeCompare(b.fileName, "pt-BR", { numeric: true, sensitivity: "base" });
}

async function downloadRemoteFile(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("PPTX_CONVERSION_DOWNLOAD_FAILED");
  return Buffer.from(await response.arrayBuffer());
}

async function extractConvertedFilesFromZip(zipBuffer: Buffer) {
  const zip = await JSZip.loadAsync(zipBuffer);
  const entries = Object.keys(zip.files)
    .filter((path) => !zip.files[path]?.dir)
    .map((path) => ({ path, info: mediaInfoFromPath(path) }))
    .filter((item): item is { path: string; info: { ext: string; mimeType: string } } => Boolean(item.info))
    .sort((a, b) => naturalFileSort({ fileName: a.path }, { fileName: b.path }));

  const files: DownloadedConvertedFile[] = [];
  for (const entry of entries) {
    const file = zip.file(entry.path);
    if (!file) continue;
    const buffer = await file.async("nodebuffer");
    if (!buffer.length) continue;
    files.push({
      fileName: entry.path.split("/").pop() || `slide.${entry.info.ext}`,
      ext: entry.info.ext,
      mimeType: entry.info.mimeType,
      buffer
    });
  }
  return files;
}

async function convertPptxWithConvertApi(buffer: Buffer, originalName: string) {
  const secret = ensureConfiguredConvertApiSecret();
  const formData = new FormData();
  formData.set("File", new Blob([buffer], { type: MIME_BY_EXTENSION.pptx }), originalName);
  formData.set("StoreFile", "true");

  const response = await fetch(`${CONVERTAPI_ENDPOINT}?Secret=${encodeURIComponent(secret)}`, {
    method: "POST",
    body: formData,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("PPTX_CONVERSION_REQUEST_FAILED");
  }

  const payload = (await response.json()) as ConvertApiResponse;
  const normalizedFiles = (payload.Files || payload.files || [])
    .map(normalizeConvertedFile)
    .filter((item) => Boolean(item.url))
    .sort(naturalFileSort);

  if (normalizedFiles.length === 0) {
    throw new Error("PPTX_CONVERSION_EMPTY");
  }

  if (normalizedFiles.length === 1 && extensionOf(normalizedFiles[0].fileName) === "zip") {
    const zipBuffer = await downloadRemoteFile(normalizedFiles[0].url);
    return extractConvertedFilesFromZip(zipBuffer);
  }

  const output: DownloadedConvertedFile[] = [];
  for (const file of normalizedFiles) {
    const info = mediaInfoFromPath(file.fileName) || mediaInfoFromPath(file.url);
    if (!info) continue;
    const fileBuffer = await downloadRemoteFile(file.url);
    if (!fileBuffer.length) continue;
    output.push({
      fileName: file.fileName,
      ext: info.ext,
      mimeType: info.mimeType,
      buffer: fileBuffer
    });
  }

  if (output.length === 0) {
    throw new Error("PPTX_CONVERSION_NO_IMAGES");
  }

  return output.sort(naturalFileSort);
}

async function storeConvertedSlides(input: { licenseId: string; uploadedById: string; sourceName: string; files: DownloadedConvertedFile[] }) {
  const extracted: ExtractedPowerPointSlide[] = [];
  const total = Math.min(input.files.length, MAX_EXTRACTED_POWERPOINT_SLIDES);

  for (let index = 0; index < total; index += 1) {
    const item = input.files[index];
    const slideNumber = index + 1;
    const fileName = secureStoredFileName(item.ext, `next-slide-ppt-slide-${String(slideNumber).padStart(2, "0")}`);

    const asset = await prisma.mediaAsset.create({
      data: {
        licenseId: input.licenseId,
        uploadedById: input.uploadedById,
        fileName,
        mimeType: item.mimeType,
        sizeBytes: item.buffer.byteLength,
        dataBase64: item.buffer.toString("base64")
      }
    });

    extracted.push({
      slideNumber,
      assetId: asset.id,
      url: `/api/assets/${asset.id}/file`,
      fileName,
      mimeType: item.mimeType,
      sizeBytes: item.buffer.byteLength
    });
  }

  if (extracted.length === 0) {
    throw new Error("PPTX_CONVERSION_NO_IMAGES");
  }

  return {
    sourceName: input.sourceName,
    title: input.sourceName.replace(/\.[^.]+$/, "") || "powerpoint",
    extractedSlides: extracted
  };
}

async function extractPowerPointSlides(input: { buffer: Buffer; originalName: string; licenseId: string; uploadedById: string }) {
  const files = await convertPptxWithConvertApi(input.buffer, input.originalName);
  return storeConvertedSlides({
    licenseId: input.licenseId,
    uploadedById: input.uploadedById,
    sourceName: input.originalName,
    files
  });
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    assertBasicRateLimit(request, "asset_upload", { max: 20, windowMs: 60_000 });

    const user = await requireApiRole([UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR]);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) return jsonError("Arquivo não enviado.", 400, "FILE_REQUIRED");

    const buffer = Buffer.from(await file.arrayBuffer());
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

    if (detection.kind === "legacyPpt") {
      return jsonError("Arquivos .ppt antigos não podem ser convertidos com segurança no servidor. Salve a apresentação como .pptx e envie novamente.", 422, "LEGACY_PPT_NOT_SUPPORTED");
    }

    if (detection.kind === "pptx") {
      if (!canUsePptxConversion(user.license.plan)) {
        return jsonError("Seu plano atual não permite conversão automática de PPTX. Faça upgrade para Premium ou Enterprise.", 403, "PPTX_PLAN_UPGRADE_REQUIRED");
      }

      try {
        const extracted = await extractPowerPointSlides({
          buffer,
          originalName: file.name || "apresentacao.pptx",
          licenseId: user.licenseId,
          uploadedById: user.id
        });

        await auditLog({
          licenseId: user.licenseId,
          userId: user.id,
          action: "CONVERT_POWERPOINT_TO_PNG_SLIDES",
          entity: "MediaAsset",
          metadata: {
            sourceName: file.name,
            slidesExtracted: extracted.extractedSlides.length,
            sizeBytes: buffer.byteLength,
            provider: "convertapi"
          },
          request
        });

        return json({
          ok: true,
          asset: {
            id: null,
            fileName: file.name,
            mimeType: detection.mimeType,
            sizeBytes: buffer.byteLength,
            kind: "powerpoint",
            conversion: "convertapi-png",
            url: null,
            slides: extracted.extractedSlides
          }
        }, 201);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "PPTX_CONVERTER_NOT_CONFIGURED") {
          return jsonError(
            "A conversão fiel de PPTX ainda não foi configurada no ambiente. Adicione CONVERTAPI_SECRET na Vercel para converter slides exatamente como no PowerPoint.",
            500,
            "PPTX_CONVERTER_NOT_CONFIGURED"
          );
        }
        if (["PPTX_CONVERSION_EMPTY", "PPTX_CONVERSION_NO_IMAGES", "PPTX_CONVERSION_DOWNLOAD_FAILED", "PPTX_CONVERSION_REQUEST_FAILED"].includes(message)) {
          return jsonError(
            "Não foi possível converter o PowerPoint em imagens PNG neste momento. Verifique a configuração do conversor e tente novamente.",
            422,
            "PPTX_CONVERSION_FAILED"
          );
        }
        throw error;
      }
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
