import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type EmbedCheckResult = {
  blocked: boolean;
  reason: string | null;
  status?: number;
};

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fd00:/i,
  /^fe80:/i
];

function isBlockedHost(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(normalized));
}

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
    const allowsSelfOnly = frameAncestors.includes("'self'") && !frameAncestors.includes(origin.toLowerCase());
    const allowsThisOrigin = frameAncestors.includes(origin.toLowerCase());

    if (!allowsAny && !allowsThisOrigin && allowsSelfOnly) {
      return { blocked: true, reason: "O site permite iframe apenas no próprio domínio." };
    }
  }

  return { blocked: false, reason: null };
}

async function requestHeaders(url: string, method: "HEAD" | "GET") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "NextSlideEmbedCheck/1.0"
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ blocked: true, reason: "URL não informada." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json({ blocked: true, reason: "URL inválida." }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ blocked: true, reason: "Use apenas URLs HTTP ou HTTPS." }, { status: 400 });
  }

  if (isBlockedHost(parsed.hostname)) {
    return NextResponse.json({ blocked: true, reason: "URL interna/privada não pode ser verificada pelo player público." }, { status: 400 });
  }

  try {
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
