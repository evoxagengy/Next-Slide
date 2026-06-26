import { json, handleApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireApiUser();
    const [users, modules] = await Promise.all([
      prisma.user.count({ where: { licenseId: user.licenseId } }),
      prisma.slideModule.count({ where: { licenseId: user.licenseId } })
    ]);
    return json({ license: user.license, usage: { users, modules } });
  } catch (error) {
    return handleApiError(error);
  }
}
