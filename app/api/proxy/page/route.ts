import { SlideOpenMode } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { assertPublicDnsResolution, parsePublicHttpsUrl } from "@/lib/network-security";
import { isPublicTokenAllowedForExternalSlide } from "@/lib/public-access";
import { assertBasicRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_ALLOWED_HOSTS = ["cartaconvitecerradao.vercel.app"];
const MAX_HTML_BYTES = 6 * 1024 * 1024;

function configuredAllowedHosts() {
  const raw = process.env.NEXT_SLIDE_PROXY_ALLOWED_HOSTS;
  if (!raw) return DEFAULT_ALLOWED_HOSTS;
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function hostMatches(hostname: string, pattern: string) {
  const normalizedHost = hostname.toLowerCase();
  const normalizedPattern = pattern.toLowerCase();

  if (normalizedPattern.startsWith("*.")) {
    const suffix = normalizedPattern.slice(1);
    return normalizedHost.endsWith(suffix) && normalizedHost !== normalizedPattern.slice(2);
  }

  return normalizedHost === normalizedPattern;
}

function isAllowedHost(hostname: string) {
  return configuredAllowedHosts().some((pattern) => hostMatches(hostname, pattern));
}

function buildSecurityHeaders(contentType = "text/html; charset=utf-8") {
  return {
    "Content-Type": contentType,
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": [
      "default-src 'none'",
      "script-src https: 'unsafe-inline' 'unsafe-eval'",
      "style-src https: 'unsafe-inline'",
      "img-src https: data: blob:",
      "font-src https: data:",
      "connect-src https:",
      "frame-src https: data: blob:",
      "media-src https: data: blob:",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'self'"
    ].join("; ")
  };
}

function rewriteHtml(html: string, target: URL) {
  let output = html;
  const baseTag = `<base href="${target.href}">`;

  if (/<head[^>]*>/i.test(output)) {
    output = output.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  } else {
    output = `${baseTag}${output}`;
  }

  output = output.replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi, "");
  output = output.replace(/<meta[^>]+http-equiv=["']?x-frame-options["']?[^>]*>/gi, "");
  output = output.replace(/<meta[^>]+http-equiv=["']?refresh["']?[^>]*>/gi, "");

  const origin = target.origin;
  output = output.replace(/\b(src|href)=(['"])\/(?!\/)/gi, (_match, attr: string, quote: string) => `${attr}=${quote}${origin}/`);
  output = output.replace(/\baction=(['"])[^'"]*\1/gi, "action=\"#\"");
  output = output.replace(/\bsrcset=(["'])([^"']+)\1/gi, (_match, quote: string, srcset: string) => {
    const rewritten = srcset
      .split(",")
      .map((part) => {
        const trimmed = part.trim();
        if (!trimmed.startsWith("/")) return trimmed;
        return `${origin}${trimmed}`;
      })
      .join(", ");
    return `srcset=${quote}${rewritten}${quote}`;
  });

  return output;
}


async function fetchAllowedPublicUrl(initialTarget: URL) {
  let current = initialTarget;

  for (let redirectCount = 0; redirectCount < 5; redirectCount += 1) {
    if (!isAllowedHost(current.hostname)) {
      throw new Error("PROXY_HOST_NOT_ALLOWED");
    }

    await assertPublicDnsResolution(current.hostname);

    const response = await fetch(current.toString(), {
      redirect: "manual",
      cache: "no-store",
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "NextSlideTVProxy/2.0"
      }
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) return response;

    const location = response.headers.get("location");
    if (!location) return response;

    current = parsePublicHttpsUrl(new URL(location, current).toString());
  }

  throw new Error("TOO_MANY_REDIRECTS");
}

function proxyError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status, headers: buildSecurityHeaders("application/json; charset=utf-8") });
}

export async function GET(request: NextRequest) {
  try {
    assertBasicRateLimit(request, "proxy_page", { max: 60, windowMs: 60_000 });
  } catch {
    return proxyError("Muitas requisições ao proxy. Aguarde alguns minutos.", 429);
  }

  const rawUrl = request.nextUrl.searchParams.get("url");
  const publicToken = request.nextUrl.searchParams.get("token");
  if (!rawUrl) return proxyError("URL não informada.");
  if (!publicToken) return proxyError("Token público não informado.", 401);

  let target: URL;
  try {
    target = parsePublicHttpsUrl(rawUrl);
  } catch (error) {
    if (error instanceof Error && error.message === "HTTPS_REQUIRED") return proxyError("Somente URLs HTTPS são permitidas no proxy seguro.");
    if (error instanceof Error && error.message === "PRIVATE_URL_NOT_ALLOWED") return proxyError("URL interna ou privada não pode ser carregada pelo proxy.");
    return proxyError("URL inválida ou não permitida.");
  }

  if (!isAllowedHost(target.hostname)) {
    return proxyError(`Domínio não liberado para proxy: ${target.hostname}.`, 403);
  }

  const allowedForToken = await isPublicTokenAllowedForExternalSlide({
    publicToken,
    url: target,
    openModes: [SlideOpenMode.PROXY]
  });

  if (!allowedForToken) {
    return proxyError("Este link não pertence a um slide proxy ativo deste player.", 403);
  }

  try {
    const upstream = await fetchAllowedPublicUrl(target);

    const contentType = upstream.headers.get("content-type") || "text/html; charset=utf-8";
    const buffer = await upstream.arrayBuffer();

    if (buffer.byteLength > MAX_HTML_BYTES) {
      return proxyError("Conteúdo muito grande para exibição via proxy.", 413);
    }

    if (!contentType.toLowerCase().includes("text/html")) {
      return new NextResponse(buffer, {
        status: upstream.status,
        headers: buildSecurityHeaders(contentType)
      });
    }

    const html = new TextDecoder("utf-8").decode(buffer);
    const rewritten = rewriteHtml(html, target);

    return new NextResponse(rewritten, {
      status: upstream.ok ? 200 : upstream.status,
      headers: buildSecurityHeaders()
    });
  } catch {
    return proxyError("Não foi possível carregar o conteúdo por proxy.", 502);
  }
}
