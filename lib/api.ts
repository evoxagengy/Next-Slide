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
    if (error.message === "LOGIN_LOCKED") {
      return jsonError("Muitas tentativas inválidas. Tente novamente em alguns minutos.", 429, "LOGIN_LOCKED");
    }
    const known = [
      "Origem da requisição inválida.",
      "URL inválida.",
      "URL deve começar com http:// ou https://."
    ];
    if (known.includes(error.message)) return jsonError(error.message, 400);
  }

  console.error("API_ERROR", error instanceof Error ? error.message : "unknown");
  return jsonError("Não foi possível concluir a operação.", 500, "INTERNAL_ERROR");
}
