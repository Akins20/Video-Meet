/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";
import { FC, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useAuth } from "@/hooks/useAuth";
import { useMeeting } from "@/hooks/useMeeting";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "react-hot-toast";
import { 
  Camera,
  Mic,
  Volume2,
  Monitor,
  Settings,
  Bell,
  Shield,
  Wifi,
  TestTube,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Loader2
} from "lucide-react";

interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface SettingsCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 10
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25
    }
  }
};

const tabVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: { duration: 0.2 }
  }
};

const SettingsPanel: FC = () => {
  // Hooks
  const { user, updatePreferences } = useAuth();
  const { meeting } = useMeeting();
  const {
    availableDevices,
    currentDevices,
    switchCamera,
    switchMicrophone,
    switchSpeaker,
    mediaState,
    initializeMedia,
    error: webrtcError
  } = useWebRTC();
  
  // State management
  const [activeCategory, setActiveCategory] = useState("audio-video");
  const [isTestingCamera, setIsTestingCamera] = useState(false);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [videoQuality, setVideoQuality] = useState([720]);
  const [enableNoiseCancellation, setEnableNoiseCancellation] = useState(true);
  const [enableEchoCancellation, setEnableEchoCancellation] = useState(true);
  const [selectedAudio, setSelectedAudio] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");
  
  // Refs
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const testStreamRef = useRef<MediaStream | null>(null);

  const categories: SettingsCategory[] = [
    {
      id: "audio-video",
      label: "Audio & Video",
      icon: <Camera className="w-4 h-4" />,
      description: "Configure your camera and microphone settings"
    },
    {
      id: "meeting",
      label: "Meeting",
      icon: <Settings className="w-4 h-4" />,
      description: "Default meeting preferences and behaviors"
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell className="w-4 h-4" />,
      description: "Manage notification preferences"
    },
    {
      id: "privacy",
      label: "Privacy",
      icon: <Shield className="w-4 h-4" />,
      description: "Privacy and security settings"
    },
    {
      id: "network",
      label: "Network",
      icon: <Wifi className="w-4 h-4" />,
      description: "Connection and bandwidth settings"
    }
  ];

  // Initialize settings from user preferences and current devices
  useEffect(() => {
    if (user?.preferences?.meeting) {
      // Use available properties from the preferences interface
      const quality = user.preferences.meeting.preferredQuality;
      const qualityMap = { low: 480, medium: 720, high: 1080, auto: 720 };
      setVideoQuality([qualityMap[quality] || 720]);
    }
  }, [user]);

  // Update selected devices when current devices change
  useEffect(() => {
    if (currentDevices.camera) setSelectedVideo(currentDevices.camera);
    if (currentDevices.microphone) setSelectedAudio(currentDevices.microphone);
    if (currentDevices.speaker) setSelectedSpeaker(currentDevices.speaker);
  }, [currentDevices]);

  // Get device arrays from availableDevices
  const audioDevices = availableDevices.filter(device => device.kind === 'audioinput');
  const videoDevices = availableDevices.filter(device => device.kind === 'videoinput');
  const speakerDevices = availableDevices.filter(device => device.kind === 'audiooutput');

  // Cleanup function for test streams
  const cleanupTestStream = useCallback(() => {
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach(track => track.stop());
      testStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  }, []);

  // Test camera functionality
  const testCamera = useCallback(async () => {
    if (isTestingCamera) return;

    setIsTestingCamera(true);
    cleanupTestStream();

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedVideo ? { deviceId: selectedVideo } : true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      testStreamRef.current = stream;
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      
      // Auto-stop test after 5 seconds
      setTimeout(() => {
        cleanupTestStream();
        setIsTestingCamera(false);
      }, 5000);

      toast.success('Camera test started - will stop automatically in 5 seconds');
    } catch (error) {
      console.error('Camera test failed:', error);
      toast.error('Failed to test camera');
      setIsTestingCamera(false);
    }
  }, [isTestingCamera, selectedVideo, cleanupTestStream]);

  // Test microphone functionality
  const testMicrophone = useCallback(async () => {
    if (isTestingMic) return;

    setIsTestingMic(true);
    cleanupTestStream();

    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedAudio ? { deviceId: selectedAudio } : true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      testStreamRef.current = stream;
      
      // Create audio context for level monitoring
      audioContextRef.current = new AudioContext();
      const analyser = audioContextRef.current.createAnalyser();
      const microphone = audioContextRef.current.createMediaStreamSource(stream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      microphone.connect(analyser);
      analyser.fftSize = 256;
      
      const updateLevel = () => {
        if (!isTestingMic) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setMicLevel(average);
        
        requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
      
      // Auto-stop test after 5 seconds
      setTimeout(() => {
        cleanupTestStream();
        setIsTestingMic(false);
        setMicLevel(0);
      }, 5000);

      toast.success('Microphone test started - speak to see audio levels');
    } catch (error) {
      console.error('Microphone test failed:', error);
      toast.error('Failed to test microphone');
      setIsTestingMic(false);
    }
  }, [isTestingMic, selectedAudio, cleanupTestStream]);

  // Handle device changes
  const handleCameraChange = useCallback(async (deviceId: string) => {
    setSelectedVideo(deviceId);
    try {
      await switchCamera(deviceId);
      toast.success('Camera switched successfully');
    } catch (error) {
      console.error('Failed to switch camera:', error);
      toast.error('Failed to switch camera');
    }
  }, [switchCamera]);

  const handleMicrophoneChange = useCallback(async (deviceId: string) => {
    setSelectedAudio(deviceId);
    try {
      await switchMicrophone(deviceId);
      toast.success('Microphone switched successfully');
    } catch (error) {
      console.error('Failed to switch microphone:', error);
      toast.error('Failed to switch microphone');
    }
  }, [switchMicrophone]);

  const handleSpeakerChange = useCallback(async (deviceId: string) => {
    setSelectedSpeaker(deviceId);
    try {
      await switchSpeaker(deviceId);
      toast.success('Speaker switched successfully');
    } catch (error) {
      console.error('Failed to switch speaker:', error);
      toast.error('Failed to switch speaker');
    }
  }, [switchSpeaker]);

  // Save settings
  const saveSettings = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      // Convert video quality back to preference format
      const qualityValue = videoQuality[0];
      let preferredQuality: 'low' | 'medium' | 'high' | 'auto' = 'medium';
      if (qualityValue <= 480) preferredQuality = 'low';
      else if (qualityValue <= 720) preferredQuality = 'medium';
      else if (qualityValue <= 1080) preferredQuality = 'high';

      // Update user preferences with available properties
      await updatePreferences({
        meeting: {
          ...user?.preferences?.meeting,
          preferredQuality,
          defaultMicMuted: !enableNoiseCancellation, // Map to available property
          defaultVideoOff: !enableEchoCancellation,  // Map to available property
        }
      });

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    updatePreferences,
    user?.preferences?.meeting,
    enableNoiseCancellation,
    enableEchoCancellation,
    videoQuality
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupTestStream();
    };
  }, [cleanupTestStream]);

  const SettingCard: FC<{ 
    title: string; 
    description?: string; 
    children: React.ReactNode;
    icon?: React.ReactNode;
  }> = ({ title, description, children, icon }) => (
    <motion.div
      variants={itemVariants}
      className="p-4 rounded-xl bg-slate-700/30 backdrop-blur-sm border border-slate-600/50"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-slate-600/50 flex items-center justify-center">
              {icon}
            </div>
          )}
          <div>
            <h4 className="text-sm font-medium text-white">{title}</h4>
            {description && (
              <p className="text-xs text-slate-400 mt-1">{description}</p>
            )}
          </div>
        </div>
      </div>
      {children}
    </motion.div>
  );

  const AudioVideoSettings = () => (
    <motion.div
      key="audio-video"
      variants={tabVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-4"
    >
      {/* WebRTC Error Display */}
      {webrtcError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-200">{webrtcError}</span>
        </motion.div>
      )}

      {/* Camera Settings */}
      <SettingCard 
        title="Camera" 
        description="Select and test your camera"
        icon={<Camera className="w-4 h-4 text-blue-400" />}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Camera Device
            </label>
            <Select 
              value={selectedVideo} 
              onValueChange={handleCameraChange}
              disabled={videoDevices.length === 0}
            >
              <SelectTrigger className="bg-slate-600/50 border-slate-500">
                <SelectValue placeholder={
                  videoDevices.length === 0 ? "No cameras found" : "Select camera"
                } />
              </SelectTrigger>
              <SelectContent>
                {videoDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={testCamera}
              disabled={isTestingCamera || videoDevices.length === 0}
              size="sm"
              variant="outline"
              className="bg-slate-600/50 border-slate-500 text-slate-200"
            >
              {isTestingCamera ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="w-3 h-3 mr-2" />
                  Test Camera
                </>
              )}
            </Button>
          </div>

          {/* Camera Preview */}
          <div className="relative w-full h-32 bg-slate-800 rounded-lg overflow-hidden">
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!isTestingCamera && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                Camera preview will appear here during test
              </div>
            )}
          </div>

          {/* Video Quality */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Video Quality: {videoQuality[0]}p
            </label>
            <Slider
              value={videoQuality}
              onValueChange={setVideoQuality}
              max={1080}
              min={480}
              step={240}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>480p</span>
              <span>720p</span>
              <span>1080p</span>
            </div>
          </div>
        </div>
      </SettingCard>

      {/* Microphone Settings */}
      <SettingCard 
        title="Microphone" 
        description="Configure your audio input"
        icon={<Mic className="w-4 h-4 text-green-400" />}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Microphone Device
            </label>
            <Select 
              value={selectedAudio} 
              onValueChange={handleMicrophoneChange}
              disabled={audioDevices.length === 0}
            >
              <SelectTrigger className="bg-slate-600/50 border-slate-500">
                <SelectValue placeholder={
                  audioDevices.length === 0 ? "No microphones found" : "Select microphone"
                } />
              </SelectTrigger>
              <SelectContent>
                {audioDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={testMicrophone}
              disabled={isTestingMic || audioDevices.length === 0}
              size="sm"
              variant="outline"
              className="bg-slate-600/50 border-slate-500 text-slate-200"
            >
              {isTestingMic ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="w-3 h-3 mr-2" />
                  Test Microphone
                </>
              )}
            </Button>
          </div>

          {/* Microphone Level */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Microphone Level
            </label>
            <div className="w-full h-2 bg-slate-600 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-green-400"
                animate={{ width: `${(micLevel / 255) * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            {isTestingMic && (
              <p className="text-xs text-slate-400 mt-1">
                Speak into your microphone to see audio levels
              </p>
            )}
          </div>

          {/* Audio Processing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-300">Noise Cancellation</p>
                <p className="text-xs text-slate-400">Reduce background noise</p>
              </div>
              <Switch
                checked={enableNoiseCancellation}
                onCheckedChange={setEnableNoiseCancellation}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-300">Echo Cancellation</p>
                <p className="text-xs text-slate-400">Prevent audio feedback</p>
              </div>
              <Switch
                checked={enableEchoCancellation}
                onCheckedChange={setEnableEchoCancellation}
              />
            </div>
          </div>
        </div>
      </SettingCard>

      {/* Speaker Settings */}
      <SettingCard 
        title="Speakers" 
        description="Configure your audio output"
        icon={<Volume2 className="w-4 h-4 text-purple-400" />}
      >
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Speaker Device
          </label>
          <Select 
            value={selectedSpeaker} 
            onValueChange={handleSpeakerChange}
            disabled={speakerDevices.length === 0}
          >
            <SelectTrigger className="bg-slate-600/50 border-slate-500">
              <SelectValue placeholder={
                speakerDevices.length === 0 ? "No speakers found" : "Select speakers"
              } />
            </SelectTrigger>
            <SelectContent>
              {speakerDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SettingCard>
    </motion.div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-800/30 backdrop-blur-sm">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between p-4 border-b border-slate-700/50"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="font-semibold text-white">Settings</h3>
        <Button
          onClick={saveSettings}
          disabled={isSaving}
          size="sm"
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          {isSaving ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Check className="w-3 h-3 mr-1" />
          )}
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </motion.div>

      <div className="flex flex-1 overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-48 border-r border-slate-700/50 p-2 space-y-1">
          {categories.map((category) => (
            <motion.button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                activeCategory === category.id
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                {category.icon}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{category.label}</p>
                </div>
                <ChevronRight className="w-3 h-3 opacity-50" />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="wait">
              {activeCategory === "audio-video" && <AudioVideoSettings />}
              {activeCategory === "meeting" && (
                <motion.div
                  key="meeting"
                  variants={tabVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="text-center py-8 text-slate-400"
                >
                  Meeting settings coming soon...
                </motion.div>
              )}
              {activeCategory === "notifications" && (
                <motion.div
                  key="notifications"
                  variants={tabVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="text-center py-8 text-slate-400"
                >
                  Notification settings coming soon...
                </motion.div>
              )}
              {activeCategory === "privacy" && (
                <motion.div
                  key="privacy"
                  variants={tabVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="text-center py-8 text-slate-400"
                >
                  Privacy settings coming soon...
                </motion.div>
              )}
              {activeCategory === "network" && (
                <motion.div
                  key="network"
                  variants={tabVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="text-center py-8 text-slate-400"
                >
                  Network settings coming soon...
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;