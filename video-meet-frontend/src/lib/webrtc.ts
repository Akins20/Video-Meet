/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { toast } from "react-hot-toast";
import { WS_EVENTS } from "@/utils/constants";
import type {
  MediaState,
  ConnectionQualityInfo,
  ConnectionQuality,
  MediaQuality,
} from "@/types/meeting";

// WebRTC configuration
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302"] },
    {
      urls: process.env.NEXT_PUBLIC_TURN_SERVER || "turn:localhost:3478",
      username: process.env.NEXT_PUBLIC_TURN_USERNAME || "videomeet",
      credential: process.env.NEXT_PUBLIC_TURN_PASSWORD || "secret123",
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

// Simplified peer connection class
export class PeerConnection {
  private pc: RTCPeerConnection;
  private participantId: string;
  private isInitiator: boolean;

  // Event handlers
  public onRemoteStream?: (stream: MediaStream) => void;
  public onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  public onConnectionQuality?: (quality: ConnectionQualityInfo) => void;

  constructor(participantId: string, isInitiator: boolean = false) {
    this.participantId = participantId;
    this.isInitiator = isInitiator;
    this.pc = new RTCPeerConnection(RTC_CONFIG);
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Handle remote stream
    this.pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.onRemoteStream?.(event.streams[0]);
      }
    };

    // Handle connection state changes
    this.pc.onconnectionstatechange = () => {
      this.onConnectionStateChange?.(this.pc.connectionState);
    };

    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        // This would be handled by the socket emission in the manager
        webrtcManager.handleIceCandidate(this.participantId, event.candidate);
      }
    };
  }

  public async addLocalStream(stream: MediaStream) {
    stream.getTracks().forEach((track) => {
      this.pc.addTrack(track, stream);
    });
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  public async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  public async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(offer);
  }

  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(answer);
  }

  public async handleIceCandidate(
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Failed to add ICE candidate:", error);
    }
  }

  public close() {
    this.pc.close();
  }

  public get connectionState(): RTCPeerConnectionState {
    return this.pc.connectionState;
  }
}

// Device information interface
export interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

// Simplified WebRTC manager class
export class WebRTCManager {
  private localStream?: MediaStream;
  private peerConnections = new Map<string, PeerConnection>();
  private isInitialized = false;
  private signalEmitter: ((to: string, signal: any, type: string) => void) | null = null;
  private connectionTimeouts = new Map<string, NodeJS.Timeout>();
  private connectionRetries = new Map<string, number>();
  
  // Device management
  private availableDevices: DeviceInfo[] = [];
  private currentDevices = {
    camera: '',
    microphone: '',
    speaker: ''
  };
  
  // Connection quality monitoring
  private statsMonitoringInterval?: NodeJS.Timeout;
  private participantStats = new Map<string, any>();
  
  // Connection configuration
  private readonly CONNECTION_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_RETRIES = 3;

  // Current media state - matching exact MediaState interface
  private currentMediaState: MediaState = {
    audioEnabled: true,
    videoEnabled: true,
    audioMuted: false,
    speaking: false,
    screenSharing: false,
    screenShareType: undefined,
    backgroundBlur: false,
    virtualBackground: undefined,
    noiseCancellation: true,
    echoCancellation: true,
    autoGainControl: true,
    resolution: "1280x720",
    frameRate: 30,
    bitrate: 1000,
    adaptiveQuality: true,
    currentQuality: "high",
    targetQuality: "high",
  };

  // Event handlers
  public onLocalStream?: (stream: MediaStream) => void;
  public onRemoteStream?: (participantId: string, stream: MediaStream) => void;
  public onConnectionStateChange?: (participantId: string, state: RTCPeerConnectionState) => void;
  public onConnectionQuality?: (participantId: string, quality: ConnectionQualityInfo) => void;
  public onDevicesChanged?: (devices: DeviceInfo[]) => void;
  public onError?: (error: Error) => void;

  constructor() {
    this.initializeDeviceMonitoring();
  }

  // Initialize device monitoring
  private async initializeDeviceMonitoring() {
    try {
      // Listen for device changes
      navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange);
      
      // Initial device enumeration
      await this.enumerateDevices();
    } catch (error) {
      console.error('Failed to initialize device monitoring:', error);
    }
  }

  // Enumerate available devices
  public async enumerateDevices(): Promise<DeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `${device.kind} (${device.deviceId.slice(0, 8)}...)`,
        kind: device.kind
      }));
      
      // Set default devices if none selected
      if (!this.currentDevices.camera) {
        const camera = this.availableDevices.find(d => d.kind === 'videoinput');
        if (camera) this.currentDevices.camera = camera.deviceId;
      }
      
      if (!this.currentDevices.microphone) {
        const microphone = this.availableDevices.find(d => d.kind === 'audioinput');
        if (microphone) this.currentDevices.microphone = microphone.deviceId;
      }
      
      if (!this.currentDevices.speaker) {
        const speaker = this.availableDevices.find(d => d.kind === 'audiooutput');
        if (speaker) this.currentDevices.speaker = speaker.deviceId;
      }
      
      this.onDevicesChanged?.(this.availableDevices);
      return this.availableDevices;
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      this.onError?.(error as Error);
      return [];
    }
  }

  // Handle device changes
  private handleDeviceChange = async () => {
    await this.enumerateDevices();
  };

  // Get available devices by type
  public getDevicesByType(type: MediaDeviceKind): DeviceInfo[] {
    return this.availableDevices.filter(device => device.kind === type);
  }

  // Get current devices
  public getCurrentDevices() {
    return { ...this.currentDevices };
  }

  // Switch camera
  public async switchCamera(deviceId: string): Promise<void> {
    try {
      this.currentDevices.camera = deviceId;
      
      // If we have a local stream, restart it with the new camera
      if (this.localStream) {
        await this.restartLocalStream();
      }
      
      toast.success('Camera switched successfully');
    } catch (error) {
      console.error('Failed to switch camera:', error);
      toast.error('Failed to switch camera');
      throw error;
    }
  }

  // Switch microphone
  public async switchMicrophone(deviceId: string): Promise<void> {
    try {
      this.currentDevices.microphone = deviceId;
      
      // If we have a local stream, restart it with the new microphone
      if (this.localStream) {
        await this.restartLocalStream();
      }
      
      toast.success('Microphone switched successfully');
    } catch (error) {
      console.error('Failed to switch microphone:', error);
      toast.error('Failed to switch microphone');
      throw error;
    }
  }

  // Switch speaker (if supported)
  public async switchSpeaker(deviceId: string): Promise<void> {
    try {
      this.currentDevices.speaker = deviceId;
      
      // Apply to all audio elements if possible
      const audioElements = document.querySelectorAll('audio, video');
      const promises = Array.from(audioElements).map(async (element) => {
        const audioElement = element as HTMLAudioElement;
        if (audioElement.setSinkId) {
          try {
            await audioElement.setSinkId(deviceId);
          } catch (error) {
            console.warn('Failed to set sink ID for element:', error);
          }
        }
      });
      
      await Promise.allSettled(promises);
      toast.success('Speaker switched successfully');
    } catch (error) {
      console.error('Failed to switch speaker:', error);
      toast.error('Failed to switch speaker');
      throw error;
    }
  }

  // Restart local stream with current device settings
  private async restartLocalStream(): Promise<void> {
    if (this.localStream) {
      // Stop existing stream
      this.localStream.getTracks().forEach(track => track.stop());
    }
    
    // Create new stream with current device settings
    const constraints: MediaStreamConstraints = {
      video: this.currentMediaState.videoEnabled ? {
        deviceId: this.currentDevices.camera ? { exact: this.currentDevices.camera } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      } : false,
      audio: this.currentMediaState.audioEnabled ? {
        deviceId: this.currentDevices.microphone ? { exact: this.currentDevices.microphone } : undefined,
        echoCancellation: this.currentMediaState.echoCancellation,
        noiseSuppression: this.currentMediaState.noiseCancellation,
        autoGainControl: this.currentMediaState.autoGainControl
      } : false
    };
    
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Update all peer connections with new stream
    this.peerConnections.forEach((peerConnection, participantId) => {
      this.replaceStreamInPeerConnection(peerConnection, this.localStream!);
    });
    
    // Notify about new local stream
    this.onLocalStream?.(this.localStream);
  }

  // Replace stream in peer connection
  private replaceStreamInPeerConnection(peerConnection: PeerConnection, newStream: MediaStream) {
    try {
      const pc = (peerConnection as any).pc as RTCPeerConnection;
      const senders = pc.getSenders();
      
      newStream.getTracks().forEach(track => {
        const sender = senders.find(s => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          pc.addTrack(track, newStream);
        }
      });
    } catch (error) {
      console.error('Failed to replace stream in peer connection:', error);
    }
  }

  // Get all available devices
  public getAvailableDevices(): DeviceInfo[] {
    return [...this.availableDevices];
  }

  // Clean up device monitoring
  public cleanup() {
    navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChange);
  }

  /**
   * Set signal emitter function
   */
  public setSignalEmitter(emitter: (to: string, signal: any, type: string) => void): void {
    this.signalEmitter = emitter;
  }

  /**
   * Initialize WebRTC manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (!this.isWebRTCSupported()) {
        throw new Error("WebRTC is not supported in this browser");
      }

      await this.getUserMedia();
      this.isInitialized = true;
    } catch (error) {
      this.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Check WebRTC support
   */
  public isWebRTCSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      window.RTCPeerConnection &&
      window.RTCSessionDescription &&
      window.RTCIceCandidate
    );
  }

  /**
   * Get user media
   */
  public async getUserMedia(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      this.localStream = stream;
      this.onLocalStream?.(stream);
      return stream;
    } catch (error) {
      this.handleMediaError(error as Error);
      throw error;
    }
  }

  /**
   * Create peer connection
   */
  public async createPeerConnection(
    participantId: string,
    isInitiator: boolean
  ): Promise<boolean> {
    try {
      const peerConnection = new PeerConnection(participantId, isInitiator);

      // Set up event handlers
      peerConnection.onRemoteStream = (stream) => {
        this.clearConnectionTimeout(participantId);
        this.onRemoteStream?.(participantId, stream);
      };

      peerConnection.onConnectionStateChange = (state) => {
        this.handleConnectionStateChange(participantId, state);
        this.onConnectionStateChange?.(participantId, state);
      };

      // Add local stream if available
      if (this.localStream) {
        await peerConnection.addLocalStream(this.localStream);
      }

      this.peerConnections.set(participantId, peerConnection);
      
      // Set up connection timeout
      this.setupConnectionTimeout(participantId, isInitiator);
      
      // Start quality monitoring if this is the first connection
      if (this.peerConnections.size === 1) {
        this.startQualityMonitoring();
      }
      
      // If this is the initiator, automatically create and send offer
      if (isInitiator) {
        const offer = await peerConnection.createOffer();
        this.emitSignal(participantId, offer, "offer");
      }
      
      return true;
    } catch (error) {
      this.onError?.(error as Error);
      return false;
    }
  }

  /**
   * Remove peer connection
   */
  public removePeerConnection(participantId: string): void {
    const peerConnection = this.peerConnections.get(participantId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(participantId);
    }
    
    // Clear timeout and retry count
    this.clearConnectionTimeout(participantId);
    this.connectionRetries.delete(participantId);
    
    // Remove participant stats
    this.participantStats.delete(participantId);
    
    // Stop quality monitoring if no more connections
    if (this.peerConnections.size === 0) {
      this.stopQualityMonitoring();
    }
  }

  /**
   * Handle signaling data
   */
  public async handleSignalingData(
    fromId: string,
    data: any,
    type: string
  ): Promise<void> {
    const peerConnection = this.peerConnections.get(fromId);
    if (!peerConnection) return;

    try {
      switch (type) {
        case "offer":
          await peerConnection.handleOffer(data);
          const answer = await peerConnection.createAnswer();
          // Emit answer back through socket
          this.emitSignal(fromId, answer, "answer");
          break;
        case "answer":
          await peerConnection.handleAnswer(data);
          break;
        case "ice-candidate":
          await peerConnection.handleIceCandidate(data);
          break;
      }
    } catch (error) {
      this.onError?.(error as Error);
    }
  }

  /**
   * Handle ICE candidate
   */
  public handleIceCandidate(
    participantId: string,
    candidate: RTCIceCandidate
  ): void {
    // Emit ICE candidate through socket
    this.emitSignal(
      participantId,
      {
        candidate: candidate.candidate,
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid,
      },
      "ice-candidate"
    );
  }

  /**
   * Initiate connection with a participant (as caller)
   */
  public async initiateConnection(participantId: string): Promise<boolean> {
    return await this.createPeerConnection(participantId, true);
  }

  /**
   * Accept connection from a participant (as callee)
   */
  public async acceptConnection(participantId: string): Promise<boolean> {
    return await this.createPeerConnection(participantId, false);
  }

  /**
   * Set up connection timeout
   */
  private setupConnectionTimeout(participantId: string, isInitiator: boolean): void {
    const timeout = setTimeout(() => {
      this.handleConnectionTimeout(participantId, isInitiator);
    }, this.CONNECTION_TIMEOUT);
    
    this.connectionTimeouts.set(participantId, timeout);
  }

  /**
   * Clear connection timeout
   */
  private clearConnectionTimeout(participantId: string): void {
    const timeout = this.connectionTimeouts.get(participantId);
    if (timeout) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(participantId);
    }
  }

  /**
   * Handle connection timeout
   */
  private async handleConnectionTimeout(participantId: string, isInitiator: boolean): Promise<void> {
    console.warn(`Connection timeout for participant ${participantId}`);
    
    const retryCount = this.connectionRetries.get(participantId) || 0;
    
    if (retryCount < this.MAX_RETRIES) {
      console.log(`Retrying connection to ${participantId} (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
      
      // Increment retry count
      this.connectionRetries.set(participantId, retryCount + 1);
      
      // Remove existing connection
      this.removePeerConnection(participantId);
      
      // Retry connection
      await this.createPeerConnection(participantId, isInitiator);
    } else {
      console.error(`Max retries reached for participant ${participantId}`);
      this.connectionRetries.delete(participantId);
      this.removePeerConnection(participantId);
      this.onError?.(new Error(`Failed to connect to participant ${participantId} after ${this.MAX_RETRIES} attempts`));
    }
  }

  /**
   * Handle connection state changes
   */
  private handleConnectionStateChange(participantId: string, state: RTCPeerConnectionState): void {
    switch (state) {
      case "connected":
        console.log(`Successfully connected to participant ${participantId}`);
        this.clearConnectionTimeout(participantId);
        this.connectionRetries.delete(participantId);
        break;
      case "disconnected":
        console.warn(`Disconnected from participant ${participantId}`);
        break;
      case "failed":
        console.error(`Connection failed for participant ${participantId}`);
        this.clearConnectionTimeout(participantId);
        this.handleConnectionTimeout(participantId, false); // Retry as non-initiator
        break;
      case "closed":
        console.log(`Connection closed for participant ${participantId}`);
        this.clearConnectionTimeout(participantId);
        this.connectionRetries.delete(participantId);
        break;
    }
  }

  /**
   * Emit signal to remote participant
   */
  private emitSignal(to: string, signal: any, type: string): void {
    if (this.signalEmitter) {
      this.signalEmitter(to, signal, type);
      console.log("Emitted signal:", { to, type, signal });
    } else {
      console.warn("Signal emitter not set, cannot emit signal:", { to, type, signal });
    }
  }

  /**
   * Toggle audio
   */
  public toggleAudio(): boolean {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.currentMediaState.audioEnabled = audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  /**
   * Toggle video
   */
  public toggleVideo(): boolean {
    if (!this.localStream) return false;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      this.currentMediaState.videoEnabled = videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
  }

  /**
   * Start screen sharing
   */
  public async startScreenShare(): Promise<void> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const videoTrack = screenStream.getVideoTracks()[0];
      if (!videoTrack) throw new Error("No video track in screen share");

      // Replace video track in all peer connections
      for (const [participantId, peerConnection] of this.peerConnections) {
        const pc = (peerConnection as any).pc as RTCPeerConnection;
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }

      // Handle screen share ending
      videoTrack.onended = () => {
        this.stopScreenShare();
      };

      this.currentMediaState.screenSharing = true;
      this.currentMediaState.screenShareType = "screen";
    } catch (error) {
      this.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  public async stopScreenShare(): Promise<void> {
    try {
      if (!this.localStream) return;

      const videoTrack = this.localStream.getVideoTracks()[0];
      if (!videoTrack) return;

      // Replace screen share track with camera track
      for (const [participantId, peerConnection] of this.peerConnections) {
        const pc = (peerConnection as any).pc as RTCPeerConnection;
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }

      this.currentMediaState.screenSharing = false;
      this.currentMediaState.screenShareType = undefined;
    } catch (error) {
      this.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Get current media state
   */
  public getMediaState(): MediaState {
    return { ...this.currentMediaState };
  }

  /**
   * Handle media errors
   */
  private handleMediaError(error: Error): void {
    if (error.name === "NotAllowedError") {
      toast.error("Camera and microphone access denied");
    } else if (error.name === "NotFoundError") {
      toast.error("No camera or microphone found");
    } else if (error.name === "NotReadableError") {
      toast.error("Camera or microphone is already in use");
    } else {
      toast.error("Failed to access media devices");
    }
  }

  /**
   * Start connection quality monitoring
   */
  public startQualityMonitoring(): void {
    if (this.statsMonitoringInterval) {
      clearInterval(this.statsMonitoringInterval);
    }

    this.statsMonitoringInterval = setInterval(async () => {
      for (const [participantId] of this.peerConnections) {
        try {
          const quality = await this.getConnectionQuality(participantId);
          if (quality) {
            this.onConnectionQuality?.(participantId, quality);
          }
        } catch (error) {
          console.warn(`Failed to get connection quality for ${participantId}:`, error);
        }
      }
    }, 5000); // Monitor every 5 seconds
  }

  /**
   * Stop connection quality monitoring
   */
  public stopQualityMonitoring(): void {
    if (this.statsMonitoringInterval) {
      clearInterval(this.statsMonitoringInterval);
      this.statsMonitoringInterval = undefined;
    }
  }

  /**
   * Get connection quality for a specific participant
   */
  public async getConnectionQuality(participantId: string): Promise<ConnectionQualityInfo | null> {
    const peerConnection = this.peerConnections.get(participantId);
    if (!peerConnection) return null;

    try {
      const pc = (peerConnection as any).pc as RTCPeerConnection;
      const stats = await pc.getStats();
      return this.calculateConnectionQuality(participantId, stats);
    } catch (error) {
      console.error(`Failed to get stats for participant ${participantId}:`, error);
      return null;
    }
  }

  /**
   * Calculate connection quality from RTCStatsReport
   */
  private calculateConnectionQuality(participantId: string, stats: RTCStatsReport): ConnectionQualityInfo {
    const bandwidth = { incoming: 0, outgoing: 0, available: 1000 };
    let latency = 0;
    let packetLoss = 0;
    const jitter = 0;
    let audioQuality: ConnectionQuality = 'good';
    let videoQuality: ConnectionQuality = 'good';
    const audioStats = { codec: 'opus', bitrate: 0, packetLoss: 0 };
    const videoStats = { codec: 'vp8', resolution: '1280x720', frameRate: 30, bitrate: 0, packetLoss: 0 };

    // Parse RTCStatsReport
    stats.forEach((report: any) => {
      switch (report.type) {
        case 'inbound-rtp':
          if (report.mediaType === 'audio') {
            audioStats.bitrate = report.bytesReceived || 0;
            audioStats.packetLoss = this.calculatePacketLoss(report);
          } else if (report.mediaType === 'video') {
            videoStats.bitrate = report.bytesReceived || 0;
            videoStats.packetLoss = this.calculatePacketLoss(report);
            if (report.frameWidth && report.frameHeight) {
              videoStats.resolution = `${report.frameWidth}x${report.frameHeight}`;
            }
            if (report.framesPerSecond) {
              videoStats.frameRate = report.framesPerSecond;
            }
          }
          bandwidth.incoming += (report.bytesReceived || 0) * 8 / 1000; // Convert to kbps
          break;

        case 'outbound-rtp':
          if (report.mediaType === 'audio') {
            audioStats.bitrate = Math.max(audioStats.bitrate, report.bytesSent || 0);
          } else if (report.mediaType === 'video') {
            videoStats.bitrate = Math.max(videoStats.bitrate, report.bytesSent || 0);
          }
          bandwidth.outgoing += (report.bytesSent || 0) * 8 / 1000; // Convert to kbps
          break;

        case 'candidate-pair':
          if (report.state === 'succeeded' && report.nominated) {
            latency = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
            bandwidth.available = report.availableOutgoingBitrate || 1000;
          }
          break;

        case 'media-source':
          if (report.kind === 'audio' && report.audioLevel !== undefined) {
            // Audio quality assessment based on audio level
            audioQuality = report.audioLevel > 0.1 ? 'good' : 'fair';
          }
          break;
      }
    });

    // Calculate overall packet loss
    packetLoss = Math.max(audioStats.packetLoss, videoStats.packetLoss);

    // Determine video quality based on metrics
    if (videoStats.frameRate < 15 || videoStats.bitrate < 100) {
      videoQuality = 'poor';
    } else if (videoStats.frameRate < 24 || videoStats.bitrate < 500) {
      videoQuality = 'fair';
    } else if (videoStats.frameRate < 30 || videoStats.bitrate < 1000) {
      videoQuality = 'good';
    } else {
      videoQuality = 'excellent';
    }

    // Determine audio quality
    if (audioStats.bitrate < 32) {
      audioQuality = 'poor';
    } else if (audioStats.bitrate < 64) {
      audioQuality = 'fair';
    } else if (audioStats.bitrate < 128) {
      audioQuality = 'good';
    } else {
      audioQuality = 'excellent';
    }

    // Calculate overall quality
    const overall = this.determineOverallQuality(latency, packetLoss, bandwidth.incoming);

    // Store stats for comparison
    this.participantStats.set(participantId, {
      timestamp: Date.now(),
      bandwidth,
      latency,
      packetLoss,
      jitter
    });

    return {
      overall,
      latency,
      jitter,
      packetLoss,
      bandwidth,
      audio: {
        quality: audioQuality,
        codec: audioStats.codec,
        bitrate: audioStats.bitrate,
        packetLoss: audioStats.packetLoss,
      },
      video: {
        quality: videoQuality,
        codec: videoStats.codec,
        resolution: videoStats.resolution,
        frameRate: videoStats.frameRate,
        bitrate: videoStats.bitrate,
        packetLoss: videoStats.packetLoss,
      },
      connectionType: 'direct', // Could be enhanced to detect actual connection type
      protocol: 'udp', // Default, could be enhanced
      lastMeasured: new Date().toISOString(),
      measurementInterval: 5000,
    };
  }

  /**
   * Calculate packet loss percentage
   */
  private calculatePacketLoss(report: any): number {
    const packetsLost = report.packetsLost || 0;
    const packetsReceived = report.packetsReceived || 0;
    const totalPackets = packetsLost + packetsReceived;
    
    if (totalPackets === 0) return 0;
    return (packetsLost / totalPackets) * 100;
  }

  /**
   * Determine overall connection quality based on key metrics
   */
  private determineOverallQuality(latency: number, packetLoss: number, bandwidth: number): ConnectionQuality {
    // Poor quality thresholds
    if (latency > 300 || packetLoss > 5 || bandwidth < 100) {
      return 'poor';
    }
    
    // Fair quality thresholds
    if (latency > 150 || packetLoss > 2 || bandwidth < 500) {
      return 'fair';
    }
    
    // Good quality thresholds
    if (latency > 50 || packetLoss > 0.5 || bandwidth < 1000) {
      return 'good';
    }
    
    // Excellent quality
    return 'excellent';
  }

  /**
   * Destroy manager
   */
  public destroy(): void {
    // Stop quality monitoring
    this.stopQualityMonitoring();

    // Close all peer connections
    for (const [participantId, peerConnection] of this.peerConnections) {
      peerConnection.close();
    }
    this.peerConnections.clear();

    // Clear all timeouts and retry counts
    for (const [participantId, timeout] of this.connectionTimeouts) {
      clearTimeout(timeout);
    }
    this.connectionTimeouts.clear();
    this.connectionRetries.clear();

    // Clear participant stats
    this.participantStats.clear();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = undefined;
    }

    this.isInitialized = false;
  }
}

// Create singleton instance
export const webrtcManager = new WebRTCManager();
export default webrtcManager;
