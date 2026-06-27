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
const DEFAULT_SLIDE_WIDTH_EMU = 12192000;
const DEFAULT_SLIDE_HEIGHT_EMU = 6858000;
const EMU_PER_POINT = 12700;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
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

type Xfrm = { x: number; y: number; cx: number; cy: number };
type SlideSize = { cx: number; cy: number };

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

function slideNumberFromPath(path: string) {
  const match = path.match(/slide(\d+)\.xml$/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function normalizeZipPath(path: string) {
  const output: string[] = [];
  for (const segment of path.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") output.pop();
    else output.push(segment);
  }
  return output.join("/");
}

function resolveRelationshipTarget(sourceSlidePath: string, target: string) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return null;
  const base = sourceSlidePath.split("/").slice(0, -1).join("/");
  return normalizeZipPath(`${base}/${target}`);
}

function readRelationshipAttributes(tag: string) {
  const attrs = new Map<string, string>();
  const regex = /([A-Za-z_:][\w:.-]*)\s*=\s*["']([^"']*)["']/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(tag))) attrs.set(match[1], match[2]);
  return attrs;
}

function parseSlideRelationships(xml: string, slidePath: string) {
  const relationships = new Map<string, string>();
  const regex = /<Relationship\b[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml))) {
    const attrs = readRelationshipAttributes(match[0]);
    const id = attrs.get("Id");
    const target = attrs.get("Target");
    const targetMode = attrs.get("TargetMode")?.toLowerCase();
    if (!id || !target || targetMode === "external") continue;
    const resolved = resolveRelationshipTarget(slidePath, target);
    if (resolved) relationships.set(id, resolved);
  }
  return relationships;
}

function mediaInfoFromPath(path: string) {
  const ext = extensionOf(path);
  const mimeType = IMAGE_MIME_BY_EXTENSION[ext];
  if (!mimeType) return null;
  return { ext: ext === "jpeg" ? "jpg" : ext, mimeType };
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function decodeXmlText(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&amp;/g, "&");
}

function firstMatch(xml: string, regex: RegExp) {
  const match = regex.exec(xml);
  return match?.[1] || null;
}

function numberAttr(tag: string, name: string, fallback = 0) {
  const value = firstMatch(tag, new RegExp(`${name}=["'](-?\\d+)["']`));
  return value ? Number(value) : fallback;
}

function readSlideSizeFromXml(xml: string | null | undefined): SlideSize {
  if (!xml) return { cx: DEFAULT_SLIDE_WIDTH_EMU, cy: DEFAULT_SLIDE_HEIGHT_EMU };
  const tag = firstMatch(xml, /(<p:sldSz\b[^/]*\/>)/) || firstMatch(xml, /(<p:sldSz\b[^>]*>)/);
  if (!tag) return { cx: DEFAULT_SLIDE_WIDTH_EMU, cy: DEFAULT_SLIDE_HEIGHT_EMU };
  return { cx: numberAttr(tag, "cx", DEFAULT_SLIDE_WIDTH_EMU), cy: numberAttr(tag, "cy", DEFAULT_SLIDE_HEIGHT_EMU) };
}

function parseXfrm(xml: string, fallback: Xfrm): Xfrm {
  const xfrm = firstMatch(xml, /(<a:xfrm\b[\s\S]*?<\/a:xfrm>)/);
  if (!xfrm) return fallback;
  const off = firstMatch(xfrm, /(<a:off\b[^>]*\/>)/);
  const ext = firstMatch(xfrm, /(<a:ext\b[^>]*\/>)/);
  return {
    x: off ? numberAttr(off, "x", fallback.x) : fallback.x,
    y: off ? numberAttr(off, "y", fallback.y) : fallback.y,
    cx: ext ? numberAttr(ext, "cx", fallback.cx) : fallback.cx,
    cy: ext ? numberAttr(ext, "cy", fallback.cy) : fallback.cy
  };
}

function colorFromXml(xml: string, fallback = "#333333") {
  const srgb = firstMatch(xml, /<a:srgbClr\b[^>]*val=["']([0-9A-Fa-f]{6})["'][^>]*>/);
  if (srgb) return `#${srgb}`;
  const scheme = firstMatch(xml, /<a:schemeClr\b[^>]*val=["']([^"']+)["'][^>]*>/);
  const map: Record<string, string> = {
    tx1: "#333333",
    tx2: "#666666",
    bg1: "#ffffff",
    bg2: "#f3f4f6",
    accent1: "#2563eb",
    accent2: "#06b6d4",
    accent3: "#22c55e",
    accent4: "#facc15",
    accent5: "#ef4444",
    accent6: "#64748b"
  };
  return scheme ? map[scheme] || fallback : fallback;
}

function fillColorFromShape(xml: string) {
  const spPr = firstMatch(xml, /(<p:spPr\b[\s\S]*?<\/p:spPr>)/);
  if (!spPr || /<a:noFill\b/.test(spPr)) return null;
  return colorFromXml(spPr, "#ffffff");
}

function fontSizeFromRun(runXml: string, fallback = 28 * EMU_PER_POINT) {
  const value = firstMatch(runXml, /<a:rPr\b[^>]*sz=["'](\d+)["'][^>]*>/) || firstMatch(runXml, /<a:defRPr\b[^>]*sz=["'](\d+)["'][^>]*>/);
  if (!value) return fallback;
  return Math.max(8 * EMU_PER_POINT, Math.round((Number(value) / 100) * EMU_PER_POINT));
}

function textFromParagraph(paragraphXml: string) {
  return Array.from(paragraphXml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)).map((match) => decodeXmlText(match[1])).join("");
}

function paragraphFontSize(paragraphXml: string) {
  const firstRun = firstMatch(paragraphXml, /(<a:r\b[\s\S]*?<\/a:r>)/) || paragraphXml;
  return fontSizeFromRun(firstRun);
}

function paragraphColor(paragraphXml: string) {
  const firstRun = firstMatch(paragraphXml, /(<a:r\b[\s\S]*?<\/a:r>)/) || paragraphXml;
  return colorFromXml(firstRun, "#333333");
}

function paragraphBold(paragraphXml: string) {
  return /<a:rPr\b[^>]*\bb=["']1["']/.test(paragraphXml) || /<a:defRPr\b[^>]*\bb=["']1["']/.test(paragraphXml);
}

function paragraphAlign(paragraphXml: string) {
  const align = firstMatch(paragraphXml, /<a:pPr\b[^>]*algn=["']([^"']+)["']/);
  if (align === "ctr") return "middle";
  if (align === "r") return "end";
  return "start";
}

function wrapText(text: string, maxChars: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function renderTextShape(shapeXml: string, slideSize: SlideSize) {
  if (!/<p:txBody\b/.test(shapeXml)) return "";
  const box = parseXfrm(shapeXml, { x: 0, y: 0, cx: slideSize.cx, cy: slideSize.cy });
  const fill = fillColorFromShape(shapeXml);
  const fillSvg = fill ? `<rect x="${box.x}" y="${box.y}" width="${box.cx}" height="${box.cy}" fill="${fill}"/>` : "";
  const paragraphs = Array.from(shapeXml.matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)).map((match) => match[0]);
  const textSvg: string[] = [];
  let y = box.y;

  for (const paragraph of paragraphs) {
    const text = textFromParagraph(paragraph);
    if (!text.trim()) {
      y += 18 * EMU_PER_POINT;
      continue;
    }
    const fontSize = paragraphFontSize(paragraph);
    const color = paragraphColor(paragraph);
    const weight = paragraphBold(paragraph) ? 700 : 400;
    const anchor = paragraphAlign(paragraph);
    const maxChars = Math.max(8, Math.floor(box.cx / Math.max(1, fontSize * 0.48)));
    const lines = wrapText(text, maxChars);
    const lineHeight = Math.round(fontSize * 1.2);
    const x = anchor === "middle" ? box.x + box.cx / 2 : anchor === "end" ? box.x + box.cx : box.x;
    for (const line of lines) {
      y += lineHeight;
      if (y > box.y + box.cy + lineHeight) break;
      textSvg.push(`<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${escapeXml(line)}</text>`);
    }
  }
  return `${fillSvg}${textSvg.join("")}`;
}

async function renderPicture(input: { zip: JSZip; pictureXml: string; rels: Map<string, string>; slideSize: SlideSize }) {
  const rId = firstMatch(input.pictureXml, /<a:blip\b[^>]*(?:r:embed|r:link)=["']([^"']+)["'][^>]*>/);
  if (!rId) return "";
  const mediaPath = input.rels.get(rId);
  if (!mediaPath) return "";
  const mediaInfo = mediaInfoFromPath(mediaPath);
  if (!mediaInfo) return "";
  const mediaFile = input.zip.file(mediaPath);
  if (!mediaFile) return "";
  const buffer = await mediaFile.async("nodebuffer");
  if (!buffer.length) return "";
  const box = parseXfrm(input.pictureXml, { x: 0, y: 0, cx: input.slideSize.cx, cy: input.slideSize.cy });
  const dataUri = `data:${mediaInfo.mimeType};base64,${buffer.toString("base64")}`;
  return `<image x="${box.x}" y="${box.y}" width="${box.cx}" height="${box.cy}" preserveAspectRatio="xMidYMid slice" href="${dataUri}"/>`;
}

function slideBackgroundColor(slideXml: string) {
  const bg = firstMatch(slideXml, /(<p:bg\b[\s\S]*?<\/p:bg>)/);
  return bg ? colorFromXml(bg, "#ffffff") : "#ffffff";
}

async function renderSlideToSvg(input: { zip: JSZip; slideXml: string; slideSize: SlideSize; rels: Map<string, string> }) {
  const elements: string[] = [];
  const shapeRegex = /<p:(pic|sp)\b[\s\S]*?<\/p:\1>/g;
  let match: RegExpExecArray | null;
  while ((match = shapeRegex.exec(input.slideXml))) {
    const type = match[1];
    const block = match[0];
    if (type === "pic") elements.push(await renderPicture({ zip: input.zip, pictureXml: block, rels: input.rels, slideSize: input.slideSize }));
    else elements.push(renderTextShape(block, input.slideSize));
  }
  const bg = slideBackgroundColor(input.slideXml);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${input.slideSize.cx} ${input.slideSize.cy}" width="1920" height="1080" role="img">
  <rect x="0" y="0" width="${input.slideSize.cx}" height="${input.slideSize.cy}" fill="${bg}"/>
  ${elements.filter(Boolean).join("\n  ")}
</svg>`;
}

async function extractPowerPointSlides(input: { buffer: Buffer; originalName: string; licenseId: string; uploadedById: string }) {
  const zip = await JSZip.loadAsync(input.buffer);
  const presentationXml = await zip.file("ppt/presentation.xml")?.async("string");
  const slideSize = readSlideSizeFromXml(presentationXml);
  const slidePaths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
    .sort((a, b) => slideNumberFromPath(a) - slideNumberFromPath(b));
  const extracted: ExtractedPowerPointSlide[] = [];

  for (const slidePath of slidePaths) {
    if (extracted.length >= MAX_EXTRACTED_POWERPOINT_SLIDES) break;
    const slideFile = zip.file(slidePath);
    if (!slideFile) continue;
    const slideXml = await slideFile.async("string");
    const relPath = slidePath.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
    const relXml = await zip.file(relPath)?.async("string");
    const rels = relXml ? parseSlideRelationships(relXml, slidePath) : new Map<string, string>();
    const slideNumber = slideNumberFromPath(slidePath);
    const svg = await renderSlideToSvg({ zip, slideXml, slideSize, rels });
    const buffer = Buffer.from(svg, "utf8");
    const fileName = secureStoredFileName("svg", `next-slide-ppt-slide-${String(slideNumber).padStart(2, "0")}`);
    const asset = await prisma.mediaAsset.create({
      data: {
        licenseId: input.licenseId,
        uploadedById: input.uploadedById,
        fileName,
        mimeType: "image/svg+xml",
        sizeBytes: buffer.byteLength,
        dataBase64: buffer.toString("base64")
      }
    });
    extracted.push({ slideNumber, assetId: asset.id, url: `/api/assets/${asset.id}/file`, fileName, mimeType: "image/svg+xml", sizeBytes: buffer.byteLength });
  }

  if (slidePaths.length > 0 && extracted.length === 0) throw new Error("PPTX_WITHOUT_EXTRACTABLE_IMAGES");
  return { sourceName: input.originalName, title: input.originalName.replace(/\.[^.]+$/, "") || "powerpoint", extractedSlides: extracted };
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

    if (detection.kind === "pptx" && !canUsePptxConversion(user.license.plan)) {
      await securityEvent({
        licenseId: user.licenseId,
        userId: user.id,
        eventType: "PPTX_CONVERSION_BLOCKED_BY_PLAN",
        severity: SecuritySeverity.LOW,
        metadata: { plan: user.license.plan, sizeBytes: buffer.byteLength },
        request
      });
      return jsonError("Conversão de PPTX para imagens está disponível apenas nos planos Premium e Enterprise.", 403, "PLAN_REQUIRES_PREMIUM");
    }

    if (detection.kind === "pptx") {
      try {
        const extracted = await extractPowerPointSlides({ buffer, originalName: file.name || "apresentacao.pptx", licenseId: user.licenseId, uploadedById: user.id });
        await auditLog({
          licenseId: user.licenseId,
          userId: user.id,
          action: "RENDER_POWERPOINT_SLIDES_TO_IMAGES",
          entity: "MediaAsset",
          metadata: { sourceName: file.name, slidesExtracted: extracted.extractedSlides.length, sizeBytes: buffer.byteLength, output: "svg" },
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
            conversion: "rendered-slide-images",
            url: null,
            slides: extracted.extractedSlides
          }
        }, 201);
      } catch (error) {
        if (error instanceof Error && error.message === "PPTX_WITHOUT_EXTRACTABLE_IMAGES") {
          return jsonError("Não foi possível ler os slides deste PowerPoint. Salve novamente como .pptx e tente enviar outra vez.", 422, "PPTX_WITHOUT_EXTRACTABLE_IMAGES");
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
