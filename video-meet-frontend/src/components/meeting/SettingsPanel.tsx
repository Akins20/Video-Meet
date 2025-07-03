"use client";
import { FC, useEffect, useState } from "react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useDispatch } from "react-redux";
import { updateSettings } from "@/store/meetingSlice"; // assuming such an action

const SettingsPanel: FC = () => {
    const { getAvailableDevices } = useWebRTC();
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedAudio, setSelectedAudio] = useState<string>("");
    const [selectedVideo, setSelectedVideo] = useState<string>("");
    const dispatch = useDispatch();

    useEffect(() => {
        const loadDevices = async () => {
            const { audio, video } = await getAvailableDevices();
            setAudioDevices(audio);
            setVideoDevices(video);
            setSelectedAudio(audio[0]?.deviceId || "");
            setSelectedVideo(video[0]?.deviceId || "");
        };
        loadDevices();
    }, [getAvailableDevices]);

    const saveSettings = () => {
        dispatch(updateSettings({
            audioDeviceId: selectedAudio,
            videoDeviceId: selectedVideo,
        }));
    };

    return (
        <div className="space-y-4 p-4">
            <h3 className="text-lg font-semibold">Audio / Video Settings</h3>

            <div>
                <label className="block text-sm font-medium">Audio Input</label>
                <Select value={selectedAudio} onValueChange={setSelectedAudio}>
                    {audioDevices.map((device) => (
                        <Select.Item key={device.deviceId} value={device.deviceId}>
                            {device.label || "Unknown audio device"}
                        </Select.Item>
                    ))}
                </Select>
            </div>

            <div>
                <label className="block text-sm font-medium">Video Input</label>
                <Select value={selectedVideo} onValueChange={setSelectedVideo}>
                    {videoDevices.map((device) => (
                        <Select.Item key={device.deviceId} value={device.deviceId}>
                            {device.label || "Unknown video device"}
                        </Select.Item>
                    ))}
                </Select>
            </div>

            <Button onClick={saveSettings}>Save Settings</Button>
        </div>
    );
};

export default SettingsPanel;
