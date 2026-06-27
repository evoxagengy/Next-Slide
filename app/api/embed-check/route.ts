import { SlideOpenMode } from "@prisma/client";
import { NextResponse } from "next/server";
import { assertPublicDnsResolution, parsePublicHttpsUrl } from "@/lib/network-security";
import { isPublicTokenAllowedForExternalSlide } from "@/lib/public-access";
import { assertBasicRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EmbedCheckResult = {
  blocked: boolean;
  reason: string | null;
  status?: number;
};

function normalizeFrameAncestors(value: string) {
  const lower = value.toLowerCase();
  const match = lower.match(/frame-ancestors\s+([^;]+)/);
  return match?.[1]?.trim() || null;
}

function analyzeHeaders(headers: Headers, origin: string): EmbedCheckResult {
  const xFrameOptions = headers.get("x-frame-options")?.toLowerCase() || "";
  const csp = headers.get("content-security-policy") || "";
  const frameAncestors = normalizeFrameAncestors(csp);

  if (xFrameOptions.includes("deny")) {
    return { blocked: true, reason: "O site bloqueia incorporação por X-Frame-Options: DENY." };
  }

  if (xFrameOptions.includes("sameorigin")) {
    return { blocked: true, reason: "O site só permite iframe dentro do próprio domínio." };
  }

  if (frameAncestors) {
    if (frameAncestors.includes("'none'")) {
      return { blocked: true, reason: "O site bloqueia incorporação por Content-Security-Policy." };
    }

    const allowsAny = frameAncestors.includes("*");
    const allowsThisOrigin = frameAncestors.includes(origin.toLowerCase());
    const onlySelf = frameAncestors.includes("'self'") && !allowsThisOrigin;

    if (!allowsAny && !allowsThisOrigin && onlySelf) {
      return { blocked: true, reason: "O site permite iframe apenas no próprio domínio." };
    }
  }

  return { blocked: false, reason: null };
}

async function requestHeaders(url: string, method: "HEAD" | "GET") {
  let current = parsePublicHttpsUrl(url);

  for (let redirectCount = 0; redirectCount < 5; redirectCount += 1) {
    await assertPublicDnsResolution(current.hostname);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const response = await fetch(current.toString(), {
        method,
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "User-Agent": "NextSlideEmbedCheck/2.0"
        }
      });

      if (![301, 302, 303, 307, 308].includes(response.status)) return response;

      const location = response.headers.get("location");
      if (!location) return response;
      current = parsePublicHttpsUrl(new URL(location, current).toString());
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("TOO_MANY_REDIRECTS");
}

export async function GET(request: Request) {
  try {
    assertBasicRateLimit(request, "embed_check", { max: 120, windowMs: 60_000 });
  } catch {
    return NextResponse.json({ blocked: true, reason: "Muitas verificações em pouco tempo." }, { status: 429 });
  }

  const { searchParams, origin } = new URL(request.url);
  const rawUrl = searchParams.get("url");
  const publicToken = searchParams.get("token");

  if (!rawUrl) {
    return NextResponse.json({ blocked: true, reason: "URL não informada." }, { status: 400 });
  }

  if (!publicToken) {
    return NextResponse.json({ blocked: true, reason: "Token público não informado." }, { status: 401 });
  }

  let parsed: URL;
  try {
    parsed = parsePublicHttpsUrl(rawUrl);
  } catch {
    return NextResponse.json({ blocked: true, reason: "Use apenas URLs HTTPS públicas." }, { status: 400 });
  }

  const allowedForToken = await isPublicTokenAllowedForExternalSlide({
    publicToken,
    url: parsed,
    openModes: [SlideOpenMode.IFRAME]
  });

  if (!allowedForToken) {
    return NextResponse.json({ blocked: true, reason: "Este link não pertence a um slide ativo deste player." }, { status: 403 });
  }

  try {
    await assertPublicDnsResolution(parsed.hostname);
    let response = await requestHeaders(parsed.toString(), "HEAD");

    if (response.status === 405 || response.status === 403 || response.status === 404) {
      response = await requestHeaders(parsed.toString(), "GET");
    }

    const result = analyzeHeaders(response.headers, origin);

    return NextResponse.json({
      ...result,
      status: response.status
    });
  } catch {
    return NextResponse.json({
      blocked: false,
      reason: "Não foi possível validar previamente. O player tentará abrir em iframe."
    });
  }
}
