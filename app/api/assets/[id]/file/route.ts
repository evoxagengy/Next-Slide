import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

function contentDisposition(fileName: string, mimeType: string) {
  const safeName = fileName.replace(/["\\\r\n]/g, "_");
  const disposition = mimeType.startsWith("image/") ? "inline" : "inline";
  return `${disposition}; filename="${safeName}"`;
}

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });

  if (!asset) {
    return NextResponse.json({ ok: false, error: "Arquivo não encontrado." }, { status: 404 });
  }

  const buffer = Buffer.from(asset.dataBase64, "base64");
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(buffer.byteLength),
      "Content-Disposition": contentDisposition(asset.fileName, asset.mimeType),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
