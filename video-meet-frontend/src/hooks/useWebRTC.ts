/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { useSocket } from './useSocket'
import { webrtcManager, PeerConnection } from '@/lib/webrtc'
import { WS_EVENTS, MEDIA_CONFIG } from '@/utils/constants'
import type { MediaState, ConnectionQualityInfo } from '@/types/meeting'

// Media device info
interface MediaDevice {
    deviceId: string
    label: string
    kind: 'audioinput' | 'videoinput' | 'audiooutput'
}

// Screen share config
interface ScreenShareConfig {
    video: boolean
    audio: boolean
    displaySurface?: 'monitor' | 'window' | 'application'
}

// Hook return interface
interface UseWebRTCReturn {
    // Local media
    localStream: MediaStream | null
    isLocalAudioEnabled: boolean
    isLocalVideoEnabled: boolean
    isScreenSharing: boolean

    // Peers and connections
    participants: Map<string, {
        stream: MediaStream | null
        connection: PeerConnection | null
        connectionState: RTCPeerConnectionState
        quality: ConnectionQualityInfo | null
    }>

    // Media controls
    toggleAudio: () => Promise<boolean>
    toggleVideo: () => Promise<boolean>
    startScreenShare: (config?: ScreenShareConfig) => Promise<boolean>
    stopScreenShare: () => Promise<boolean>

    // Device management
    availableDevices: MediaDevice[]
    currentDevices: {
        camera: string | null
        microphone: string | null
        speaker: string | null
    }
    switchCamera: (deviceId: string) => Promise<boolean>
    switchMicrophone: (deviceId: string) => Promise<boolean>
    switchSpeaker: (deviceId: string) => Promise<boolean>

    // Connection management
    initializeMedia: (videoQuality?: 'low' | 'medium' | 'high' | 'auto') => Promise<boolean>
    connectToPeer: (participantId: string, isHost?: boolean) => Promise<boolean>
    disconnectFromPeer: (participantId: string) => void
    disconnectAll: () => void

    // State
    isInitialized: boolean
    isInitializing: boolean
    error: string | null
    mediaState: MediaState
    supportedFeatures: {
        camera: boolean
        microphone: boolean
        screenShare: boolean
        dataChannel: boolean
    }
}

export const useWebRTC = (roomId?: string): UseWebRTCReturn => {
    const { socket, isConnected, emit, on } = useSocket()

    // State management
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [isLocalAudioEnabled, setIsLocalAudioEnabled] = useState(true)
    const [isLocalVideoEnabled, setIsLocalVideoEnabled] = useState(true)
    const [isScreenSharing, setIsScreenSharing] = useState(false)
    const [isInitialized, setIsInitialized] = useState(false)
    const [isInitializing, setIsInitializing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [availableDevices, setAvailableDevices] = useState<MediaDevice[]>([])
    const [currentDevices, setCurrentDevices] = useState({
        camera: null as string | null,
        microphone: null as string | null,
        speaker: null as string | null,
    })

    // Participants map with connection info
    const [participants, setParticipants] = useState<Map<string, {
        stream: MediaStream | null
        connection: PeerConnection | null
        connectionState: RTCPeerConnectionState
        quality: ConnectionQualityInfo | null
    }>>(new Map())

    // Current media state
    const [mediaState, setMediaState] = useState<MediaState>({
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
    })

    // Check WebRTC support
    const supportedFeatures = {
        camera: webrtcManager.isWebRTCSupported(),
        microphone: webrtcManager.isWebRTCSupported(),
        screenShare: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
        dataChannel: !!window.RTCPeerConnection,
    }

    /**
     * Enumerate available media devices
     */
    const enumerateDevices = useCallback(async () => {
        try {
            const devices = await webrtcManager.getMediaDevices()
            const allDevices: MediaDevice[] = [
                ...devices.cameras.map(d => ({ deviceId: d.deviceId, label: d.label, kind: 'videoinput' as const })),
                ...devices.microphones.map(d => ({ deviceId: d.deviceId, label: d.label, kind: 'audioinput' as const })),
                ...devices.speakers.map(d => ({ deviceId: d.deviceId, label: d.label, kind: 'audiooutput' as const })),
            ]

            setAvailableDevices(allDevices)

            // Set default devices if not already set
            if (!currentDevices.camera && devices.cameras.length > 0) {
                setCurrentDevices(prev => ({ ...prev, camera: devices.cameras[0].deviceId }))
            }
            if (!currentDevices.microphone && devices.microphones.length > 0) {
                setCurrentDevices(prev => ({ ...prev, microphone: devices.microphones[0].deviceId }))
            }
            if (!currentDevices.speaker && devices.speakers.length > 0) {
                setCurrentDevices(prev => ({ ...prev, speaker: devices.speakers[0].deviceId }))
            }
        } catch (error) {
            console.error('Failed to enumerate devices:', error)
        }
    }, [currentDevices])

    /**
     * Initialize local media stream
     */
    const initializeMedia = useCallback(async (videoQuality: 'low' | 'medium' | 'high' | 'auto' = 'high'): Promise<boolean> => {
        try {
            setIsInitializing(true)
            setError(null)

            // Initialize WebRTC manager
            await webrtcManager.initialize()

            // Get user media with specified quality
            const stream = await webrtcManager.getUserMedia(videoQuality)

            setLocalStream(stream)
            setIsInitialized(true)
            setIsInitializing(false)

            // Update media state
            const audioTrack = stream.getAudioTracks()[0]
            const videoTrack = stream.getVideoTracks()[0]

            setIsLocalAudioEnabled(audioTrack?.enabled || false)
            setIsLocalVideoEnabled(videoTrack?.enabled || false)

            setMediaState(prev => ({
                ...prev,
                audioEnabled: audioTrack?.enabled || false,
                videoEnabled: videoTrack?.enabled || false,
                currentQuality: videoQuality,
            }))

            // Enumerate devices after getting media
            await enumerateDevices()

            console.log('📹 WebRTC: Local media initialized')
            return true

        } catch (error: any) {
            console.error('Failed to initialize media:', error)
            setIsInitializing(false)
            setError(error.message || 'Failed to access camera/microphone')
            return false
        }
    }, [enumerateDevices])

    /**
     * Connect to a peer participant
     */
    const connectToPeer = useCallback(async (participantId: string, isHost: boolean = false): Promise<boolean> => {
        try {
            // Create peer connection
            const peerConnection = webrtcManager.createPeerConnection(participantId, isHost)

            // Update participants map
            setParticipants(prev => new Map(prev.set(participantId, {
                stream: null,
                connection: peerConnection,
                connectionState: peerConnection.connectionState,
                quality: null,
            })))

            // Set up event handlers
            peerConnection.onConnectionStateChange = (state) => {
                setParticipants(prev => {
                    const updated = new Map(prev)
                    const participant = updated.get(participantId)
                    if (participant) {
                        participant.connectionState = state
                        updated.set(participantId, participant)
                    }
                    return updated
                })
            }

            peerConnection.onConnectionQuality = (quality) => {
                setParticipants(prev => {
                    const updated = new Map(prev)
                    const participant = updated.get(participantId)
                    if (participant) {
                        participant.quality = quality
                        updated.set(participantId, participant)
                    }
                    return updated
                })
            }

            // If host, create and send offer
            if (isHost) {
                await peerConnection.createOffer()
            }

            return true
        } catch (error) {
            console.error('Failed to connect to peer:', error)
            return false
        }
    }, [])

    /**
     * Disconnect from a peer
     */
    const disconnectFromPeer = useCallback((participantId: string) => {
        webrtcManager.removePeerConnection(participantId)
        setParticipants(prev => {
            const updated = new Map(prev)
            updated.delete(participantId)
            return updated
        })
    }, [])

    /**
     * Disconnect from all peers
     */
    const disconnectAll = useCallback(() => {
        participants.forEach((_, participantId) => {
            disconnectFromPeer(participantId)
        })
    }, [participants, disconnectFromPeer])

    /**
     * Toggle local audio
     */
    const toggleAudio = useCallback(async (): Promise<boolean> => {
        try {
            const enabled = webrtcManager.toggleAudio()
            setIsLocalAudioEnabled(enabled)
            setMediaState(prev => ({ ...prev, audioEnabled: enabled }))

            // Emit media state change to other participants
            if (roomId && socket) {
                emit(WS_EVENTS.MEDIA_STATE_CHANGE, {
                    roomId,
                    audioEnabled: enabled,
                    videoEnabled: isLocalVideoEnabled,
                })
            }

            return enabled
        } catch (error) {
            console.error('Failed to toggle audio:', error)
            return isLocalAudioEnabled
        }
    }, [isLocalVideoEnabled, roomId, socket, emit])

    /**
     * Toggle local video
     */
    const toggleVideo = useCallback(async (): Promise<boolean> => {
        try {
            const enabled = webrtcManager.toggleVideo()
            setIsLocalVideoEnabled(enabled)
            setMediaState(prev => ({ ...prev, videoEnabled: enabled }))

            // Emit media state change to other participants
            if (roomId && socket) {
                emit(WS_EVENTS.MEDIA_STATE_CHANGE, {
                    roomId,
                    audioEnabled: isLocalAudioEnabled,
                    videoEnabled: enabled,
                })
            }

            return enabled
        } catch (error) {
            console.error('Failed to toggle video:', error)
            return isLocalVideoEnabled
        }
    }, [isLocalAudioEnabled, roomId, socket, emit])

    /**
     * Start screen sharing
     */
    const startScreenShare = useCallback(async (config?: ScreenShareConfig): Promise<boolean> => {
        try {
            await webrtcManager.startScreenShare()
            setIsScreenSharing(true)
            setMediaState(prev => ({ ...prev, screenSharing: true }))

            // Emit screen share start to other participants
            if (roomId && socket) {
                emit(WS_EVENTS.SCREEN_SHARE_START, { roomId })
            }

            toast.success('Screen sharing started')
            return true
        } catch (error) {
            console.error('Failed to start screen sharing:', error)
            toast.error('Failed to start screen sharing')
            return false
        }
    }, [roomId, socket, emit])

    /**
     * Stop screen sharing
     */
    const stopScreenShare = useCallback(async (): Promise<boolean> => {
        try {
            await webrtcManager.stopScreenShare()
            setIsScreenSharing(false)
            setMediaState(prev => ({ ...prev, screenSharing: false }))

            // Emit screen share stop to other participants
            if (roomId && socket) {
                emit(WS_EVENTS.SCREEN_SHARE_STOP, { roomId })
            }

            toast.success('Screen sharing stopped')
            return true
        } catch (error) {
            console.error('Failed to stop screen sharing:', error)
            return false
        }
    }, [roomId, socket, emit])

    /**
     * Switch camera device
     */
    const switchCamera = useCallback(async (deviceId: string): Promise<boolean> => {
        try {
            await webrtcManager.switchCamera(deviceId)
            setCurrentDevices(prev => ({ ...prev, camera: deviceId }))
            return true
        } catch (error) {
            console.error('Failed to switch camera:', error)
            toast.error('Failed to switch camera')
            return false
        }
    }, [])

    /**
     * Switch microphone device
     */
    const switchMicrophone = useCallback(async (deviceId: string): Promise<boolean> => {
        try {
            // This would need to be implemented in webrtcManager
            setCurrentDevices(prev => ({ ...prev, microphone: deviceId }))
            return true
        } catch (error) {
            console.error('Failed to switch microphone:', error)
            toast.error('Failed to switch microphone')
            return false
        }
    }, [])

    /**
     * Switch speaker device
     */
    const switchSpeaker = useCallback(async (deviceId: string): Promise<boolean> => {
        try {
            // This would need to be implemented in webrtcManager
            setCurrentDevices(prev => ({ ...prev, speaker: deviceId }))
            return true
        } catch (error) {
            console.error('Failed to switch speaker:', error)
            toast.error('Failed to switch speaker')
            return false
        }
    }, [])

    // Set up WebRTC event handlers from webrtcManager
    useEffect(() => {
        if (!webrtcManager) return

        // Handle local stream
        webrtcManager.onLocalStream = (stream) => {
            setLocalStream(stream)
        }

        // Handle remote streams
        webrtcManager.onRemoteStream = (participantId, stream) => {
            setParticipants(prev => {
                const updated = new Map(prev)
                const participant = updated.get(participantId)
                if (participant) {
                    participant.stream = stream
                    updated.set(participantId, participant)
                }
                return updated
            })
        }

        // Handle participant disconnection
        webrtcManager.onParticipantDisconnected = (participantId) => {
            setParticipants(prev => {
                const updated = new Map(prev)
                updated.delete(participantId)
                return updated
            })
        }

        // Handle errors
        webrtcManager.onError = (error) => {
            setError(error.message)
            toast.error(error.message)
        }

        return () => {
            // Cleanup event handlers
            webrtcManager.onLocalStream = undefined
            webrtcManager.onRemoteStream = undefined
            webrtcManager.onParticipantDisconnected = undefined
            webrtcManager.onError = undefined
        }
    }, [])

    // Set up socket event handlers for WebRTC signaling
    useEffect(() => {
        if (!socket || !isConnected) return

        // Handle WebRTC offer
        const handleOffer = on(WS_EVENTS.WEBRTC_OFFER, async (data: any) => {
            const { from, signal } = data
            const peerConnection = webrtcManager.getPeerConnection(from)
            if (peerConnection) {
                await peerConnection.handleOffer(signal)
            }
        })

        // Handle WebRTC answer
        const handleAnswer = on(WS_EVENTS.WEBRTC_ANSWER, async (data: any) => {
            const { from, signal } = data
            const peerConnection = webrtcManager.getPeerConnection(from)
            if (peerConnection) {
                await peerConnection.handleAnswer(signal)
            }
        })

        // Handle ICE candidates
        const handleIceCandidate = on(WS_EVENTS.WEBRTC_ICE_CANDIDATE, async (data: any) => {
            const { from, signal } = data
            const peerConnection = webrtcManager.getPeerConnection(from)
            if (peerConnection) {
                await peerConnection.handleIceCandidate(signal)
            }
        })

        // Handle media state changes from other participants
        const handleMediaStateChange = on(WS_EVENTS.MEDIA_STATE_CHANGE, (data: any) => {
            const { participantId, audioEnabled, videoEnabled } = data
            // Update participant's media state in UI
            console.log(`Participant ${participantId} media state:`, { audioEnabled, videoEnabled })
        })

        return () => {
            handleOffer()
            handleAnswer()
            handleIceCandidate()
            handleMediaStateChange()
        }
    }, [socket, isConnected, on])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            webrtcManager.destroy()
        }
    }, [])

    return {
        // Local media
        localStream,
        isLocalAudioEnabled,
        isLocalVideoEnabled,
        isScreenSharing,

        // Peers and connections
        participants,

        // Media controls
        toggleAudio,
        toggleVideo,
        startScreenShare,
        stopScreenShare,

        // Device management
        availableDevices,
        currentDevices,
        switchCamera,
        switchMicrophone,
        switchSpeaker,

        // Connection management
        initializeMedia,
        connectToPeer,
        disconnectFromPeer,
        disconnectAll,

        // State
        isInitialized,
        isInitializing,
        error,
        mediaState,
        supportedFeatures,
    }
}

export default useWebRTC