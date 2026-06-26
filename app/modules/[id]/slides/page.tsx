import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function ModuleSlidesPage({ params }: Props) {
  const { id } = await params;
  redirect(`/modules/${id}`);
}
