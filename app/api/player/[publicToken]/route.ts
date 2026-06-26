import { json, handleApiError } from "@/lib/api";
import { getPlayerModule } from "@/lib/player";

type Ctx = { params: Promise<{ publicToken: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const { publicToken } = await ctx.params;
    const state = await getPlayerModule(publicToken);
    return json(state);
  } catch (error) {
    return handleApiError(error);
  }
}
