/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { toast } from "react-hot-toast";
import { WS_EVENTS } from "@/utils/constants";
import type {
  MediaState,
  ConnectionQualityInfo,
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

// Simplified WebRTC manager class
export class WebRTCManager {
  private localStream?: MediaStream;
  private peerConnections = new Map<string, PeerConnection>();
  private isInitialized = false;
  private signalEmitter: ((to: string, signal: any, type: string) => void) | null = null;
  private connectionTimeouts = new Map<string, NodeJS.Timeout>();
  private connectionRetries = new Map<string, number>();
  
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
  public onConnectionStateChange?: (
    participantId: string,
    state: RTCPeerConnectionState
  ) => void;
  public onConnectionQuality?: (
    participantId: string,
    quality: ConnectionQualityInfo
  ) => void;
  public onError?: (error: Error) => void;

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
   * Destroy manager
   */
  public destroy(): void {
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
