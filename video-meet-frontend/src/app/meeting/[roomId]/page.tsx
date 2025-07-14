import { Metadata } from 'next';
import MeetingRoomPage from '@/components/meeting/MeetingRoomPage';

interface PageProps {
  params: Promise<{
    roomId: string;
  }>;
}

// Generate metadata for the meeting page
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { roomId } = await params;
  
  return {
    title: `Meeting ${roomId} - Video Meet`,
    description: `Join meeting room ${roomId} on Video Meet`,
    robots: {
      index: false, // Don't index meeting pages
      follow: false,
    },
  };
}

// Server component - no hooks or client directives allowed
export default async function MeetingRoom({ params }: PageProps) {
  const { roomId } = await params;
  // Call this in your app initialization to debug WebSocket issues
  
  // You can do server-side data fetching here if needed
  // For example, validate the room exists, get initial meeting data, etc.
  
  return <MeetingRoomPage roomId={roomId} />;
}