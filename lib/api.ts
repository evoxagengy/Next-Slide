import crypto from "crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError(error.issues[0]?.message || "Dados inválidos.", 422, "VALIDATION_ERROR");
  }

  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return jsonError("Sessão inválida ou expirada.", 401, "UNAUTHORIZED");
    if (error.message === "PERMISSION_DENIED") return jsonError("Você não tem permissão para esta ação.", 403, "PERMISSION_DENIED");
    if (error.message === "LOGIN_LOCKED") return jsonError("Muitas tentativas inválidas. Tente novamente em alguns minutos.", 429, "LOGIN_LOCKED");
    if (error.message === "RATE_LIMITED") return jsonError("Muitas requisições em pouco tempo. Aguarde alguns minutos e tente novamente.", 429, "RATE_LIMITED");
    if (error.message === "HTTPS_REQUIRED") return jsonError("Use apenas URLs HTTPS.", 400, "HTTPS_REQUIRED");
    if (error.message === "PRIVATE_URL_NOT_ALLOWED") return jsonError("URLs internas ou privadas não são permitidas.", 400, "PRIVATE_URL_NOT_ALLOWED");
    if (error.message === "URL_CREDENTIALS_NOT_ALLOWED") return jsonError("URLs com usuário ou senha não são permitidas.", 400, "URL_CREDENTIALS_NOT_ALLOWED");
    if (error.message === "URL_INVALIDA") return jsonError("URL inválida.", 400, "INVALID_URL");

    const known = [
      "Origem da requisição inválida.",
      "URL inválida.",
      "URL deve começar com http:// ou https://.",
      "URL deve usar HTTPS em produção."
    ];
    if (known.includes(error.message)) return jsonError(error.message, 400);
  }

  const errorId = crypto.randomUUID();
  console.error("API_ERROR", { errorId, type: error instanceof Error ? error.name : typeof error });
  return jsonError(`Não foi possível concluir a operação. Código: ${errorId}`, 500, "INTERNAL_ERROR");
}
