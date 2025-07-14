import MeetingView from "@/components/dashboard/meeting/MeetingView";

export default function MeetingPage({
  params,
}: {
  params: { roomId: string };
}) {
  return <MeetingView roomId={params.roomId} />;
}
