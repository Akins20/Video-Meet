/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { toast } from 'react-hot-toast'
import { socketClient } from './socket'
import { MEDIA_CONFIG, WS_EVENTS, TIME_CONFIG } from '@/utils/constants'
import { errorUtils, asyncUtils } from '@/utils/helpers'
import type { MediaState, ConnectionQualityInfo } from '@/types/meeting'

// WebRTC configuration
const RTC_CONFIG: RTCConfiguration = {
    iceServers: [
        {
            urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
        },
        {
            urls: process.env.NEXT_PUBLIC_TURN_SERVER || 'turn:localhost:3478',
            username: process.env.NEXT_PUBLIC_TURN_USERNAME || 'videomeet',
            credential: process.env.NEXT_PUBLIC_TURN_PASSWORD || 'secret123',
        },
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
}

// Media constraints for different quality levels
const getVideoConstraints = (quality: 'low' | 'medium' | 'high' | 'auto' = 'high'): MediaTrackConstraints => {
    const constraints = MEDIA_CONFIG.video[quality as keyof typeof MEDIA_CONFIG.video] || MEDIA_CONFIG.video.high

    return {
        width: { ideal: constraints.width, max: constraints.width },
        height: { ideal: constraints.height, max: constraints.height },
        frameRate: { ideal: constraints.frameRate, max: constraints.frameRate },
        facingMode: 'user',
    }
}

const getAudioConstraints = (): MediaTrackConstraints => {
    return {
        sampleRate: MEDIA_CONFIG.audio.sampleRate,
        channelCount: MEDIA_CONFIG.audio.channelCount,
        echoCancellation: MEDIA_CONFIG.audio.echoCancellation,
        noiseSuppression: MEDIA_CONFIG.audio.noiseSuppression,
        autoGainControl: MEDIA_CONFIG.audio.autoGainControl,
    }
}

// Peer connection wrapper class
export class PeerConnection {
    private pc: RTCPeerConnection
    private localStream?: MediaStream
    private remoteStream?: MediaStream
    private dataChannel?: RTCDataChannel
    private participantId: string
    private isHost: boolean
    private connectionStartTime: number
    private qualityMonitorInterval?: NodeJS.Timeout

    // Event handlers
    public onRemoteStream?: (stream: MediaStream) => void
    public onConnectionStateChange?: (state: RTCPeerConnectionState) => void
    public onIceConnectionStateChange?: (state: RTCIceConnectionState) => void
    public onDataChannelMessage?: (data: any) => void
    public onConnectionQuality?: (quality: ConnectionQualityInfo) => void

    constructor(participantId: string, isHost: boolean = false) {
        this.participantId = participantId
        this.isHost = isHost
        this.connectionStartTime = Date.now()

        // Create peer connection
        this.pc = new RTCPeerConnection(RTC_CONFIG)
        this.setupEventHandlers()

        // Create data channel if host
        if (isHost) {
            this.createDataChannel()
        }
    }

    private setupEventHandlers() {
        // Handle remote stream
        this.pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0]
                this.onRemoteStream?.(this.remoteStream)
                console.log('📺 Remote stream received for participant:', this.participantId)
            }
        }

        // Handle connection state changes
        this.pc.onconnectionstatechange = () => {
            const state = this.pc.connectionState
            console.log(`🔗 Connection state changed for ${this.participantId}:`, state)
            this.onConnectionStateChange?.(state)

            if (state === 'connected') {
                this.startQualityMonitoring()
            } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                this.stopQualityMonitoring()
            }
        }

        // Handle ICE connection state changes
        this.pc.oniceconnectionstatechange = () => {
            const state = this.pc.iceConnectionState
            console.log(`🧊 ICE connection state changed for ${this.participantId}:`, state)
            this.onIceConnectionStateChange?.(state)

            if (state === 'failed') {
                this.handleConnectionFailure()
            }
        }

        // Handle ICE candidates
        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                socketClient.sendWebRTCSignal({
                    to: this.participantId,
                    from: 'local-user', // This would come from auth state
                    type: 'ice-candidate',
                    signal: {
                        candidate: event.candidate.candidate,
                        sdpMLineIndex: event.candidate.sdpMLineIndex,
                        sdpMid: event.candidate.sdpMid,
                    },
                })
            }
        }

        // Handle data channel from remote peer
        this.pc.ondatachannel = (event) => {
            const channel = event.channel
            this.setupDataChannelHandlers(channel)
        }
    }

    private createDataChannel() {
        this.dataChannel = this.pc.createDataChannel('data', {
            ordered: true,
        })
        this.setupDataChannelHandlers(this.dataChannel)
    }

    private setupDataChannelHandlers(channel: RTCDataChannel) {
        channel.onopen = () => {
            console.log('📡 Data channel opened for participant:', this.participantId)
        }

        channel.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                this.onDataChannelMessage?.(data)
            } catch (error) {
                console.error('Failed to parse data channel message:', error)
            }
        }

        channel.onerror = (error) => {
            console.error('Data channel error:', error)
        }

        channel.onclose = () => {
            console.log('📡 Data channel closed for participant:', this.participantId)
        }
    }

    // Add local stream to connection
    public async addLocalStream(stream: MediaStream) {
        this.localStream = stream

        // Add tracks to peer connection
        stream.getTracks().forEach(track => {
            this.pc.addTrack(track, stream)
        })

        console.log('📹 Added local stream to peer connection for:', this.participantId)
    }

    // Create and send offer
    public async createOffer(): Promise<void> {
        try {
            const offer = await this.pc.createOffer()
            await this.pc.setLocalDescription(offer)

            socketClient.sendWebRTCSignal({
                to: this.participantId,
                from: 'local-user',
                type: 'offer',
                signal: {
                    sdp: offer.sdp,
                    type: offer.type,
                },
            })

            console.log('📤 Sent offer to participant:', this.participantId)
        } catch (error) {
            console.error('Failed to create offer:', error)
            throw error
        }
    }

    // Handle received offer and create answer
    public async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
        try {
            await this.pc.setRemoteDescription(offer)
            const answer = await this.pc.createAnswer()
            await this.pc.setLocalDescription(answer)

            socketClient.sendWebRTCSignal({
                to: this.participantId,
                from: 'local-user',
                type: 'answer',
                signal: {
                    sdp: answer.sdp,
                    type: answer.type,
                },
            })

            console.log('📤 Sent answer to participant:', this.participantId)
        } catch (error) {
            console.error('Failed to handle offer:', error)
            throw error
        }
    }

    // Handle received answer
    public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        try {
            await this.pc.setRemoteDescription(answer)
            console.log('✅ Set remote description from answer:', this.participantId)
        } catch (error) {
            console.error('Failed to handle answer:', error)
            throw error
        }
    }

    // Handle received ICE candidate
    public async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        try {
            await this.pc.addIceCandidate(new RTCIceCandidate(candidate))
            console.log('🧊 Added ICE candidate for participant:', this.participantId)
        } catch (error) {
            console.error('Failed to add ICE candidate:', error)
            // Don't throw here, ICE candidates can fail sometimes
        }
    }

    // Send data through data channel
    public sendData(data: any): void {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(data))
        }
    }

    // Quality monitoring
    private startQualityMonitoring() {
        this.qualityMonitorInterval = setInterval(async () => {
            try {
                const stats = await this.getConnectionStats()
                if (stats) {
                    this.onConnectionQuality?.(stats)
                }
            } catch (error) {
                console.error('Failed to get connection stats:', error)
            }
        }, TIME_CONFIG.intervals.connectionQuality)
    }

    private stopQualityMonitoring() {
        if (this.qualityMonitorInterval) {
            clearInterval(this.qualityMonitorInterval)
            this.qualityMonitorInterval = undefined
        }
    }

    // Get connection statistics
    public async getConnectionStats(): Promise<ConnectionQualityInfo | null> {
        try {
            const stats = await this.pc.getStats()

            const audioStats = { quality: 'good' as const, codec: '', bitrate: 0, packetLoss: 0 }
            const videoStats = { quality: 'good' as const, codec: '', resolution: '', frameRate: 0, bitrate: 0, packetLoss: 0 }
            const connectionStats = { latency: 0, jitter: 0, packetLoss: 0, bandwidth: { incoming: 0, outgoing: 0, available: 0 } }

            stats.forEach((report) => {
                if (report.type === 'inbound-rtp') {
                    if (report.kind === 'audio') {
                        audioStats.codec = report.codecId || ''
                        audioStats.bitrate = report.bytesReceived || 0
                        audioStats.packetLoss = (report.packetsLost || 0) / (report.packetsReceived || 1) * 100
                    } else if (report.kind === 'video') {
                        videoStats.codec = report.codecId || ''
                        videoStats.resolution = `${report.frameWidth || 0}x${report.frameHeight || 0}`
                        videoStats.frameRate = report.framesPerSecond || 0
                        videoStats.bitrate = report.bytesReceived || 0
                        videoStats.packetLoss = (report.packetsLost || 0) / (report.packetsReceived || 1) * 100
                    }
                } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                    connectionStats.latency = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0
                    connectionStats.bandwidth.incoming = report.availableIncomingBitrate || 0
                    connectionStats.bandwidth.outgoing = report.availableOutgoingBitrate || 0
                }
            })

            // Calculate overall quality
            const latencyScore = connectionStats.latency < 100 ? 4 : connectionStats.latency < 200 ? 3 : connectionStats.latency < 300 ? 2 : 1
            const packetLossScore = connectionStats.packetLoss < 1 ? 4 : connectionStats.packetLoss < 3 ? 3 : connectionStats.packetLoss < 5 ? 2 : 1
            const overallScore = Math.min(latencyScore, packetLossScore)

            const qualityMap = { 1: 'poor', 2: 'fair', 3: 'good', 4: 'excellent' } as const
            const overall = qualityMap[overallScore as keyof typeof qualityMap]

            return {
                overall,
                latency: Math.round(connectionStats.latency),
                jitter: 0, // Would need additional calculation
                packetLoss: Math.round(connectionStats.packetLoss * 100) / 100,
                bandwidth: {
                    incoming: Math.round(connectionStats.bandwidth.incoming / 1000),
                    outgoing: Math.round(connectionStats.bandwidth.outgoing / 1000),
                    available: Math.round((connectionStats.bandwidth.incoming + connectionStats.bandwidth.outgoing) / 1000),
                },
                audio: audioStats,
                video: videoStats,
                connectionType: 'direct', // Would need additional logic to determine
                protocol: 'udp', // Would need additional logic to determine
                lastMeasured: new Date().toISOString(),
                measurementInterval: TIME_CONFIG.intervals.connectionQuality,
            }
        } catch (error) {
            console.error('Failed to get connection stats:', error)
            return null
        }
    }

    // Handle connection failure
    private async handleConnectionFailure() {
        console.warn('🔥 Connection failed for participant:', this.participantId)

        // Try to restart ICE
        try {
            await this.pc.restartIce()
            console.log('🔄 ICE restart initiated for participant:', this.participantId)
        } catch (error) {
            console.error('Failed to restart ICE:', error)
        }
    }

    // Close connection
    public close() {
        this.stopQualityMonitoring()

        if (this.dataChannel) {
            this.dataChannel.close()
        }

        if (this.pc) {
            this.pc.close()
        }

        console.log('🔌 Closed peer connection for participant:', this.participantId)
    }

    // Getters
    public get connectionState(): RTCPeerConnectionState {
        return this.pc.connectionState
    }

    public get iceConnectionState(): RTCIceConnectionState {
        return this.pc.iceConnectionState
    }

    public get localDescription(): RTCSessionDescription | null {
        return this.pc.localDescription
    }

    public get remoteDescription(): RTCSessionDescription | null {
        return this.pc.remoteDescription
    }
}

// WebRTC manager class
export class WebRTCManager {
    private localStream?: MediaStream
    private peerConnections = new Map<string, PeerConnection>()
    private isInitialized = false
    private currentMediaState: MediaState = {
        audioEnabled: true,
        videoEnabled: true,
        audioMuted: false,
        screenSharing: false,
        backgroundBlur: false,
        noiseCancellation: true,
        echoCancellation: true,
        autoGainControl: true,
        resolution: '1280x720',
        frameRate: 30,
        bitrate: 1000,
        adaptiveQuality: true,
        currentQuality: 'high',
        targetQuality: 'high',
    }

    // Event handlers
    public onLocalStream?: (stream: MediaStream) => void
    public onRemoteStream?: (participantId: string, stream: MediaStream) => void
    public onParticipantConnected?: (participantId: string) => void
    public onParticipantDisconnected?: (participantId: string) => void
    public onConnectionQuality?: (participantId: string, quality: ConnectionQualityInfo) => void
    public onError?: (error: Error) => void

    // Initialize WebRTC manager
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.log('WebRTC manager already initialized')
            return
        }

        try {
            // Check WebRTC support
            if (!this.isWebRTCSupported()) {
                throw new Error('WebRTC is not supported in this browser')
            }

            // Get user media
            await this.getUserMedia()

            this.isInitialized = true
            console.log('✅ WebRTC manager initialized successfully')
        } catch (error) {
            console.error('Failed to initialize WebRTC manager:', error)
            this.onError?.(error as Error)
            throw error
        }
    }

    // Check WebRTC browser support
    public isWebRTCSupported(): boolean {
        return !!(
            navigator.mediaDevices &&
            window.RTCPeerConnection &&
            window.RTCSessionDescription &&
            window.RTCIceCandidate
        )
    }

    // Get user media (camera and microphone)
    public async getUserMedia(videoQuality: 'low' | 'medium' | 'high' | 'auto' = 'high'): Promise<MediaStream> {
        try {
            const constraints: MediaStreamConstraints = {
                audio: getAudioConstraints(),
                video: getVideoConstraints(videoQuality),
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            this.localStream = stream
            this.onLocalStream?.(stream)

            console.log('📹 Got user media:', {
                audio: stream.getAudioTracks().length > 0,
                video: stream.getVideoTracks().length > 0,
            })

            return stream
        } catch (error) {
            console.error('Failed to get user media:', error)

            // Provide user-friendly error messages
            if (error instanceof Error) {
                if (error.name === 'NotAllowedError') {
                    toast.error('Camera and microphone access denied. Please enable permissions and try again.')
                } else if (error.name === 'NotFoundError') {
                    toast.error('No camera or microphone found. Please connect a device and try again.')
                } else if (error.name === 'NotReadableError') {
                    toast.error('Camera or microphone is already in use by another application.')
                } else {
                    toast.error('Failed to access camera and microphone.')
                }
            }

            throw error
        }
    }

    // Get screen sharing stream
    public async getDisplayMedia(): Promise<MediaStream> {
        try {
            if (!navigator.mediaDevices.getDisplayMedia) {
                throw new Error('Screen sharing is not supported in this browser')
            }

            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: MEDIA_CONFIG.screenShare.video,
                audio: MEDIA_CONFIG.screenShare.audio,
            })

            console.log('🖥️ Got display media for screen sharing')
            return stream
        } catch (error) {
            console.error('Failed to get display media:', error)

            if (error instanceof Error && error.name === 'NotAllowedError') {
                toast.error('Screen sharing permission denied.')
            } else {
                toast.error('Failed to start screen sharing.')
            }

            throw error
        }
    }

    // Create peer connection for participant
    public createPeerConnection(participantId: string, isHost: boolean = false): PeerConnection {
        const peerConnection = new PeerConnection(participantId, isHost)

        // Setup event handlers
        peerConnection.onRemoteStream = (stream) => {
            this.onRemoteStream?.(participantId, stream)
        }

        peerConnection.onConnectionStateChange = (state) => {
            if (state === 'connected') {
                this.onParticipantConnected?.(participantId)
            } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                this.onParticipantDisconnected?.(participantId)
                this.peerConnections.delete(participantId)
            }
        }

        peerConnection.onConnectionQuality = (quality) => {
            this.onConnectionQuality?.(participantId, quality)
        }

        // Add local stream if available
        if (this.localStream) {
            peerConnection.addLocalStream(this.localStream)
        }

        this.peerConnections.set(participantId, peerConnection)
        return peerConnection
    }

    // Get peer connection for participant
    public getPeerConnection(participantId: string): PeerConnection | undefined {
        return this.peerConnections.get(participantId)
    }

    // Remove peer connection
    public removePeerConnection(participantId: string): void {
        const peerConnection = this.peerConnections.get(participantId)
        if (peerConnection) {
            peerConnection.close()
            this.peerConnections.delete(participantId)
        }
    }

    // Toggle audio
    public toggleAudio(): boolean {
        if (!this.localStream) return false

        const audioTracks = this.localStream.getAudioTracks()
        const enabled = !this.currentMediaState.audioEnabled

        audioTracks.forEach(track => {
            track.enabled = enabled
        })

        this.currentMediaState.audioEnabled = enabled
        console.log('🎤 Audio toggled:', enabled ? 'ON' : 'OFF')

        return enabled
    }

    // Toggle video
    public toggleVideo(): boolean {
        if (!this.localStream) return false

        const videoTracks = this.localStream.getVideoTracks()
        const enabled = !this.currentMediaState.videoEnabled

        videoTracks.forEach(track => {
            track.enabled = enabled
        })

        this.currentMediaState.videoEnabled = enabled
        console.log('📹 Video toggled:', enabled ? 'ON' : 'OFF')

        return enabled
    }

    // Start screen sharing
    public async startScreenShare(): Promise<void> {
        try {
            const screenStream = await this.getDisplayMedia()
            const videoTrack = screenStream.getVideoTracks()[0]

            if (!videoTrack) {
                throw new Error('No video track in screen share stream')
            }

            // Replace video track in all peer connections
            for (const [participantId, peerConnection] of this.peerConnections) {
                const pc = (peerConnection as any).pc as RTCPeerConnection
                const sender = pc.getSenders().find(s => s.track?.kind === 'video')

                if (sender) {
                    await sender.replaceTrack(videoTrack)
                }
            }

            // Handle screen share ending
            videoTrack.onended = () => {
                this.stopScreenShare()
            }

            this.currentMediaState.screenSharing = true
            console.log('🖥️ Screen sharing started')
        } catch (error) {
            console.error('Failed to start screen sharing:', error)
            throw error
        }
    }

    // Stop screen sharing
    public async stopScreenShare(): Promise<void> {
        try {
            if (!this.localStream) return

            const videoTrack = this.localStream.getVideoTracks()[0]
            if (!videoTrack) return

            // Replace screen share track with camera track in all peer connections
            for (const [participantId, peerConnection] of this.peerConnections) {
                const pc = (peerConnection as any).pc as RTCPeerConnection
                const sender = pc.getSenders().find(s => s.track?.kind === 'video')

                if (sender) {
                    await sender.replaceTrack(videoTrack)
                }
            }

            this.currentMediaState.screenSharing = false
            console.log('🖥️ Screen sharing stopped')
        } catch (error) {
            console.error('Failed to stop screen sharing:', error)
            throw error
        }
    }

    // Get current media state
    public getMediaState(): MediaState {
        return { ...this.currentMediaState }
    }

    // Get available media devices
    public async getMediaDevices(): Promise<{
        cameras: MediaDeviceInfo[]
        microphones: MediaDeviceInfo[]
        speakers: MediaDeviceInfo[]
    }> {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices()

            return {
                cameras: devices.filter(device => device.kind === 'videoinput'),
                microphones: devices.filter(device => device.kind === 'audioinput'),
                speakers: devices.filter(device => device.kind === 'audiooutput'),
            }
        } catch (error) {
            console.error('Failed to get media devices:', error)
            return { cameras: [], microphones: [], speakers: [] }
        }
    }

    // Switch camera device
    public async switchCamera(deviceId: string): Promise<void> {
        try {
            const constraints: MediaStreamConstraints = {
                video: {
                    deviceId: { exact: deviceId },
                    ...getVideoConstraints(this.currentMediaState.currentQuality),
                },
                audio: false, // Don't change audio
            }

            const newStream = await navigator.mediaDevices.getUserMedia(constraints)
            const newVideoTrack = newStream.getVideoTracks()[0]

            if (!newVideoTrack) {
                throw new Error('No video track in new stream')
            }

            // Replace video track in all peer connections
            for (const [participantId, peerConnection] of this.peerConnections) {
                const pc = (peerConnection as any).pc as RTCPeerConnection
                const sender = pc.getSenders().find(s => s.track?.kind === 'video')

                if (sender) {
                    await sender.replaceTrack(newVideoTrack)
                }
            }

            // Stop old video track and update local stream
            if (this.localStream) {
                const oldVideoTrack = this.localStream.getVideoTracks()[0]
                if (oldVideoTrack) {
                    oldVideoTrack.stop()
                    this.localStream.removeTrack(oldVideoTrack)
                }
                this.localStream.addTrack(newVideoTrack)
            }

            console.log('📹 Switched to camera:', deviceId)
        } catch (error) {
            console.error('Failed to switch camera:', error)
            throw error
        }
    }

    // Clean up resources
    public destroy(): void {
        console.log('🧹 Destroying WebRTC manager...')

        // Close all peer connections
        for (const [participantId, peerConnection] of this.peerConnections) {
            peerConnection.close()
        }
        this.peerConnections.clear()

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop())
            this.localStream = undefined
        }

        this.isInitialized = false
        console.log('✅ WebRTC manager destroyed')
    }
}

// Create singleton instance
export const webrtcManager = new WebRTCManager()

// Export default
export default webrtcManager