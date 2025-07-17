/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";
import { FC, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useAuth } from "@/hooks/useAuth";
import { useMeetingCore } from "@/hooks/meeting/useMeetingCore";
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
  const { meeting } = useMeetingCore();
  const {
    mediaState,
    initializeMedia,
    availableDevices,
    currentDevices,
    switchCamera,
    switchMicrophone,
    switchSpeaker,
    enumerateDevices,
    error: webrtcError
  } = useWebRTC();
  
  // State management
  const [activeCategory, setActiveCategory] = useState("audio-video");
  const [isTestingCamera, setIsTestingCamera] = useState(false);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [videoQuality, setVideoQuality] = useState([720]);
  const [enableNoiseCancellation, setEnableNoiseCancellation] = useState(true);
  const [enableEchoCancellation, setEnableEchoCancellation] = useState(true);
  const [selectedAudio, setSelectedAudio] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");
  
  // Refresh devices function
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);
  const refreshDevices = useCallback(async () => {
    if (isRefreshingDevices) return;
    
    setIsRefreshingDevices(true);
    try {
      await enumerateDevices();
      toast.success('Device list refreshed');
    } catch (error) {
      console.error('Failed to refresh devices:', error);
      toast.error('Failed to refresh device list');
    } finally {
      setIsRefreshingDevices(false);
    }
  }, [enumerateDevices, isRefreshingDevices]);
  
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
    setSelectedVideo(currentDevices.camera || '');
    setSelectedAudio(currentDevices.microphone || '');
    setSelectedSpeaker(currentDevices.speaker || '');
  }, [currentDevices]);

  // Initialize devices on mount and refresh device list
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

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

  // Test speaker functionality
  const testSpeaker = useCallback(async () => {
    if (isTestingSpeaker) return;

    setIsTestingSpeaker(true);
    try {
      // Create a test audio element
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIkBSuS3/PCeiQCKHfH6tiJNwgZaLztu4xZFApFnt/wvmEkBSef3/C9eycEKXfH69uJNwgZaLzty4xZFApFnt/yvmEkBSec3/G9eykEKnfH6tuJOQgVaLrty4xaEglGnt3yvmEjBSed4O++eykEKnbG6tiKOgcVabrqy4xaEQlHntzyv2EjBied3/G7eysEKnbG6tmKOgcVabrqy4xaEQlHntzyv2EjBiWd3++7eysEKnXH6NmKOgcWabrqyotbEAlHoNzxv2IhBiad3++8eisFKnTH59iLOwcVabrpyotbEAlHoNzxwGIhBiad3++8eysFKnTH59iLOwcVabrpyotbEAlHoNzxwGIhBiaaDhGd';
      
      // Set audio output device if supported
      if ('setSinkId' in audio && selectedSpeaker) {
        try {
          await (audio as HTMLAudioElement & { setSinkId: (deviceId: string) => Promise<void> }).setSinkId(selectedSpeaker);
        } catch (error) {
          console.warn('Failed to set audio output device:', error);
        }
      }
      
      audio.volume = 0.5;
      await audio.play();
      
      toast.success('Speaker test played - you should hear a tone');
      
      // Stop test after audio finishes (about 1 second)
      setTimeout(() => {
        setIsTestingSpeaker(false);
      }, 1500);
      
    } catch (error) {
      console.error('Speaker test failed:', error);
      toast.error('Failed to test speaker');
      setIsTestingSpeaker(false);
    }
  }, [isTestingSpeaker, selectedSpeaker]);

  // Handle device changes with real WebRTC functionality
  const handleCameraChange = useCallback(async (deviceId: string) => {
    if (deviceId === selectedVideo) return; // No change needed
    
    setSelectedVideo(deviceId);
    try {
      await switchCamera(deviceId);
      toast.success('Camera switched successfully');
      
      // Restart video preview if testing (without circular dependency)
      if (isTestingCamera) {
        cleanupTestStream();
        // Restart test with new device
        setTimeout(async () => {
          try {
            const constraints: MediaStreamConstraints = {
              video: { deviceId }
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            testStreamRef.current = stream;
            if (videoPreviewRef.current) {
              videoPreviewRef.current.srcObject = stream;
            }
          } catch (error) {
            console.error('Failed to restart camera test:', error);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Failed to switch camera:', error);
      toast.error('Failed to switch camera');
      // Revert selection on error
      setSelectedVideo(currentDevices.camera || '');
    }
  }, [switchCamera, selectedVideo, currentDevices.camera, isTestingCamera, cleanupTestStream]);

  const handleMicrophoneChange = useCallback(async (deviceId: string) => {
    if (deviceId === selectedAudio) return; // No change needed
    
    setSelectedAudio(deviceId);
    try {
      await switchMicrophone(deviceId);
      toast.success('Microphone switched successfully');
      
      // Restart microphone test if testing (without circular dependency)
      if (isTestingMic) {
        cleanupTestStream();
        // Restart test with new device
        setTimeout(async () => {
          try {
            const constraints: MediaStreamConstraints = {
              audio: { deviceId }
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            testStreamRef.current = stream;
            
            // Restart audio level monitoring
            audioContextRef.current = new AudioContext();
            const analyser = audioContextRef.current.createAnalyser();
            const microphone = audioContextRef.current.createMediaStreamSource(stream);
            microphone.connect(analyser);
            analyser.fftSize = 256;
            
            const updateLevel = () => {
              if (!isTestingMic) return;
              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(dataArray);
              const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
              setMicLevel(average);
              requestAnimationFrame(updateLevel);
            };
            updateLevel();
          } catch (error) {
            console.error('Failed to restart microphone test:', error);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Failed to switch microphone:', error);
      toast.error('Failed to switch microphone');
      // Revert selection on error
      setSelectedAudio(currentDevices.microphone || '');
    }
  }, [switchMicrophone, selectedAudio, currentDevices.microphone, isTestingMic, cleanupTestStream]);

  const handleSpeakerChange = useCallback(async (deviceId: string) => {
    if (deviceId === selectedSpeaker) return; // No change needed
    
    setSelectedSpeaker(deviceId);
    try {
      await switchSpeaker(deviceId);
      toast.success('Speaker switched successfully');
    } catch (error) {
      console.error('Failed to switch speaker:', error);
      toast.error('Failed to switch speaker');
      // Revert selection on error
      setSelectedSpeaker(currentDevices.speaker || '');
    }
  }, [switchSpeaker, selectedSpeaker, currentDevices.speaker]);

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
      {/* Device Refresh Section */}
      <SettingCard 
        title="Device Management" 
        description="Refresh device list and manage available devices"
        icon={<Settings className="w-4 h-4 text-slate-400" />}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-300">
              Detected {videoDevices.length} camera(s), {audioDevices.length} microphone(s), {speakerDevices.length} speaker(s)
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Refresh if you&apos;ve connected new devices
            </p>
          </div>
          <Button
            onClick={refreshDevices}
            disabled={isRefreshingDevices}
            size="sm"
            variant="outline"
            className="bg-slate-600/50 border-slate-500 text-slate-200"
          >
            {isRefreshingDevices ? (
              <>
                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 mr-2" />
                Refresh Devices
              </>
            )}
          </Button>
        </div>
      </SettingCard>

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
                    <div className="flex items-center justify-between w-full">
                      <span>{device.label}</span>
                      {device.deviceId === currentDevices.camera && (
                        <span className="text-green-400 text-xs">Current</span>
                      )}
                    </div>
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
                    <div className="flex items-center justify-between w-full">
                      <span>{device.label}</span>
                      {device.deviceId === currentDevices.microphone && (
                        <span className="text-green-400 text-xs">Current</span>
                      )}
                    </div>
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
                  <div className="flex items-center justify-between w-full">
                    <span>{device.label}</span>
                    {device.deviceId === currentDevices.speaker && (
                      <span className="text-green-400 text-xs">Current</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2 mt-4">
            <Button
              onClick={testSpeaker}
              disabled={isTestingSpeaker || speakerDevices.length === 0}
              size="sm"
              variant="outline"
              className="bg-slate-600/50 border-slate-500 text-slate-200"
            >
              {isTestingSpeaker ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="w-3 h-3 mr-2" />
                  Test Speaker
                </>
              )}
            </Button>
          </div>
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