import { json, handleApiError } from "@/lib/api";
import { destroyCurrentSession } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await destroyCurrentSession();
    return json({ ok: true, redirectTo: "/login" });
  } catch (error) {
    return handleApiError(error);
  }
}
