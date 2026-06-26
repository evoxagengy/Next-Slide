import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";

const SESSION_SECRET_MIN_LENGTH = 32;
const PASSWORD_ROUNDS = 12;

export const SESSION_COOKIE = "next_slide_session";

export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < SESSION_SECRET_MIN_LENGTH) {
    throw new Error("SESSION_SECRET ausente ou fraco. Use pelo menos 32 caracteres aleatórios.");
  }
  return secret;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function validateStrongPassword(password: string) {
  const errors: string[] = [];
  if (password.length < 8) errors.push("mínimo 8 caracteres");
  if (!/[A-Z]/.test(password)) errors.push("uma letra maiúscula");
  if (!/[a-z]/.test(password)) errors.push("uma letra minúscula");
  if (!/[0-9]/.test(password)) errors.push("um número");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("um caractere especial");
  return errors;
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function encryptionKey() {
  return crypto.createHash("sha256").update(getSessionSecret()).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: `${encrypted.toString("base64url")}.${tag.toString("base64url")}`,
    iv: iv.toString("base64url")
  };
}

export function decryptSecret(encryptedValue: string, ivValue: string) {
  const [encrypted, tag] = encryptedValue.split(".");
  if (!encrypted || !tag) throw new Error("Token criptografado inválido.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

export function createPublicTokenPayload() {
  const token = randomToken(40);
  const encrypted = encryptSecret(token);
  return {
    token,
    tokenHash: sha256(token),
    encrypted: encrypted.encrypted,
    iv: encrypted.iv
  };
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  return forwarded || real || "unknown";
}

export function getUserAgent(request: Request) {
  return request.headers.get("user-agent")?.slice(0, 500) || "unknown";
}

export function sanitizeText(value: string, maxLength = 500) {
  return value
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeOptionalText(value?: string | null, maxLength = 500) {
  if (!value) return null;
  const sanitized = sanitizeText(value, maxLength);
  return sanitized.length > 0 ? sanitized : null;
}

export function normalizeUrl(value: string) {
  const parsed = z.string().url().safeParse(value);
  if (!parsed.success) throw new Error("URL inválida.");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("URL deve começar com http:// ou https://.");
  }
  return url.toString();
}


export function normalizeContentUrl(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("/api/assets/")) return trimmed;
  return normalizeUrl(trimmed);
}

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function assertSameOrigin(request: Request) {
  const method = request.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return;
  const origin = request.headers.get("origin");
  if (!origin) return;
  const requestUrl = new URL(request.url);
  if (new URL(origin).host !== requestUrl.host) {
    throw new Error("Origem da requisição inválida.");
  }
}
