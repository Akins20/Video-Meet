import MeetingView from "@/components/dashboard/meeting/MeetingView";

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <MeetingView roomId={roomId} />;
}
