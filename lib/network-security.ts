import dns from "dns/promises";
import net from "net";

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^0\.0\.0\.0$/,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fd00:/i,
  /^fe80:/i
];

function ipv4ToNumber(value: string) {
  const parts = value.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return null;
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
}

function isPrivateIpv4(value: string) {
  const ip = ipv4ToNumber(value);
  if (ip === null) return false;

  const ranges: Array<[string, string]> = [
    ["0.0.0.0", "0.255.255.255"],
    ["10.0.0.0", "10.255.255.255"],
    ["127.0.0.0", "127.255.255.255"],
    ["169.254.0.0", "169.254.255.255"],
    ["172.16.0.0", "172.31.255.255"],
    ["192.168.0.0", "192.168.255.255"],
    ["224.0.0.0", "239.255.255.255"],
    ["240.0.0.0", "255.255.255.255"]
  ];

  return ranges.some(([start, end]) => {
    const from = ipv4ToNumber(start);
    const to = ipv4ToNumber(end);
    return from !== null && to !== null && ip >= from && ip <= to;
  });
}

export function isPrivateOrLocalHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!normalized) return true;
  if (normalized.endsWith(".local") || normalized.endsWith(".internal") || normalized.endsWith(".localhost")) return true;
  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(normalized))) return true;

  const ipVersion = net.isIP(normalized);
  if (ipVersion === 4) return isPrivateIpv4(normalized);
  if (ipVersion === 6) {
    return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80");
  }

  return false;
}

export function parsePublicHttpsUrl(rawUrl: string) {
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new Error("URL_INVALIDA");
  }

  if (target.protocol !== "https:") throw new Error("HTTPS_REQUIRED");
  if (target.username || target.password) throw new Error("URL_CREDENTIALS_NOT_ALLOWED");
  if (isPrivateOrLocalHostname(target.hostname)) throw new Error("PRIVATE_URL_NOT_ALLOWED");

  target.hash = "";
  return target;
}

export async function assertPublicDnsResolution(hostname: string) {
  if (isPrivateOrLocalHostname(hostname)) throw new Error("PRIVATE_URL_NOT_ALLOWED");

  const addresses = await dns.lookup(hostname, { all: true, verbatim: false });
  if (!addresses.length) throw new Error("DNS_RESOLUTION_FAILED");

  for (const address of addresses) {
    if (isPrivateOrLocalHostname(address.address)) {
      throw new Error("PRIVATE_URL_NOT_ALLOWED");
    }
  }
}

export function sameNormalizedExternalUrl(left: string | null | undefined, right: string | URL) {
  if (!left) return false;
  try {
    const leftUrl = new URL(left);
    const rightUrl = typeof right === "string" ? new URL(right) : right;
    leftUrl.hash = "";
    rightUrl.hash = "";
    return leftUrl.toString() === rightUrl.toString();
  } catch {
    return false;
  }
}
