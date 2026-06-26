import { TVPlayer } from "@/components/player/TVPlayer";

type Props = { params: Promise<{ publicToken: string }> };

export default async function PlayPage({ params }: Props) {
  const { publicToken } = await params;
  return <TVPlayer publicToken={publicToken} />;
}
