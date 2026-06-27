import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessAssetWithPublicToken } from "@/lib/public-access";
import { assertBasicRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function contentDisposition(fileName: string) {
  const safeName = fileName.replace(/["\\\r\n]/g, "_");
  return `inline; filename="${safeName}"`;
}

function unauthorizedAssetResponse() {
  return NextResponse.json({ ok: false, error: "Arquivo não encontrado ou acesso indisponível." }, { status: 404 });
}

export async function GET(request: Request, ctx: Ctx) {
  try {
    assertBasicRateLimit(request, "asset_file", { max: 600, windowMs: 60_000 });
  } catch {
    return NextResponse.json({ ok: false, error: "Muitas requisições em pouco tempo." }, { status: 429 });
  }

  const { id } = await ctx.params;
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });

  if (!asset) return unauthorizedAssetResponse();

  const url = new URL(request.url);
  const publicToken = url.searchParams.get("token");
  const user = await getCurrentUser().catch(() => null);

  const allowedBySession = Boolean(user && user.licenseId === asset.licenseId);
  const allowedByPublicToken = publicToken ? await canAccessAssetWithPublicToken(asset.id, asset.licenseId, publicToken) : false;

  if (!allowedBySession && !allowedByPublicToken) return unauthorizedAssetResponse();

  const buffer = Buffer.from(asset.dataBase64, "base64");
  const crossOriginPolicy = asset.mimeType.includes("powerpoint") || asset.mimeType.includes("presentation") ? "cross-origin" : "same-origin";

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(buffer.byteLength),
      "Content-Disposition": contentDisposition(asset.fileName),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cross-Origin-Resource-Policy": crossOriginPolicy
    }
  });
}
