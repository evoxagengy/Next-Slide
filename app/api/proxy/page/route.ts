import { NextRequest, NextResponse } from "next/server";

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
    "Content-Security-Policy": [
      "default-src 'self' https: http: data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:",
      "style-src 'self' 'unsafe-inline' https: http:",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data: https: http:",
      "connect-src 'self' https: http:",
      "frame-src 'self' https: http: data: blob:",
      "frame-ancestors 'self'",
      "base-uri https: http:",
      "form-action 'self' https: http:"
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

  const origin = target.origin;
  output = output.replace(/\b(src|href|action)=(["'])\/(?!\/)/gi, (_match, attr: string, quote: string) => `${attr}=${quote}${origin}/`);
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

function proxyError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: buildSecurityHeaders("application/json; charset=utf-8") });
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) return proxyError("URL não informada.");

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return proxyError("URL inválida.");
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return proxyError("Somente URLs http ou https são permitidas.");
  }

  if (!isAllowedHost(target.hostname)) {
    return proxyError(`Domínio não liberado para proxy: ${target.hostname}.`, 403);
  }

  try {
    const upstream = await fetch(target.toString(), {
      redirect: "follow",
      cache: "no-store",
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "NextSlideTVProxy/1.0"
      }
    });

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
