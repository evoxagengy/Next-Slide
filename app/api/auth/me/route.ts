import { json, handleApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ user: null });
    return json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        license: {
          id: user.license.id,
          companyName: user.license.companyName,
          plan: user.license.plan,
          status: user.license.status
        }
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
