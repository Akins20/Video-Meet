// import MeetingHeader from "@/components/meeting/MeetingHeader";
// import VideoGrid from "@/components/meeting/VideoGrid";
// import MeetingControls from "@/components/meeting/MeetingControls";
// import ChatPanel from "@/components/meeting/ChatPanel";
// import SettingsPanel from "@/components/meeting/SettingsPanel";
// import NotificationToast from "@/components/common/NotificationToast";
// import MeetingEndModal from "@/components/meeting/MeetingEndModal";
// import ParticipantList from "@/components/meeting/ParticipantList";
// import MeetingRecordingIndicator from "@/components/meeting/MeetingRecordingIndicator";
// import MeetingTimer from "@/components/meeting/MeetingTimer";

// export default async function MeetingRoomPage({ params }) {
//     return (
//         <div className="flex flex-col h-screen">
//             <MeetingHeader onLeave={() => console.log("leave")} />
//             <div className="flex flex-1 overflow-hidden">
//                 {/* video + participants */}
//                 <div className="flex-1 flex flex-col">
//                     <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50 dark:bg-gray-800">
//                         <MeetingRecordingIndicator />
//                         <MeetingTimer />
//                     </div>
//                     <VideoGrid />
//                     <MeetingControls />
//                 </div>
//                 {/* chat + participants */}
//                 <aside className="w-80 border-l overflow-y-auto flex flex-col">
//                     <ChatPanel />
//                     <ParticipantList />
//                     <SettingsPanel />
//                 </aside>
//             </div>
//             <MeetingEndModal onConfirmLeave={() => console.log("confirmed leave")} />
//             <NotificationToast />
//         </div>
//     );
// }
