/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'react-hot-toast'
import { useAuth } from './useAuth'
import { useAuthState } from '@/store/hooks'
import { WS_EVENTS, ENV_CONFIG, TIME_CONFIG } from '@/utils/constants'

// Socket connection states
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

// WebSocket event handler types
type EventHandler<T = any> = (data: T) => void
type EventMap = Record<string, EventHandler>

// Socket hook return interface
interface UseSocketReturn {
    // Connection state
    socket: Socket | null
    isConnected: boolean
    connectionStatus: ConnectionStatus
    connectionError: string | null
    reconnectAttempts: number

    // Core methods
    connect: () => void
    disconnect: () => void
    emit: <T = any>(event: string, data?: T) => void

    // Event management
    on: <T = any>(event: string, handler: EventHandler<T>) => () => void
    off: (event: string, handler?: EventHandler) => void
    once: <T = any>(event: string, handler: EventHandler<T>) => void

    // Utility methods
    joinRoom: (roomId: string) => void
    leaveRoom: (roomId: string) => void
    sendMessage: (roomId: string, message: any) => void

    // Connection health
    ping: () => Promise<number>
    getConnectionQuality: () => 'poor' | 'fair' | 'good' | 'excellent'
}

// Hook configuration options
interface SocketOptions {
    autoConnect?: boolean
    reconnection?: boolean
    maxReconnectAttempts?: number
    reconnectDelay?: number
    namespace?: string
}

export const useSocket = (options: SocketOptions = {}): UseSocketReturn => {
    const { user, isAuthenticated } = useAuth()
    const { accessToken } = useAuthState() // Get access token from Redux auth state

    // Configuration with defaults
    const config = useRef({
        autoConnect: true,
        reconnection: true,
        maxReconnectAttempts: 5,
        reconnectDelay: 1000,
        namespace: '',
        ...options
    })

    // State management
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
    const [connectionError, setConnectionError] = useState<string | null>(null)
    const [reconnectAttempts, setReconnectAttempts] = useState(0)
    const [lastPingTime, setLastPingTime] = useState<number>(0)

    // Refs for socket and event handlers
    const socketRef = useRef<Socket | null>(null)
    const eventHandlersRef = useRef<EventMap>({})
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isConnectingRef = useRef(false)

    // Get current connection status
    const isConnected = connectionStatus === 'connected'

    /**
     * Start heartbeat ping
     */
    const startHeartbeat = useCallback(() => {
        // Clear existing heartbeat
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current)
        }
        if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current)
        }

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
            if (socketRef.current?.connected) {
                const startTime = Date.now()
                
                socketRef.current.emit('ping', startTime, (response: number) => {
                    const pingTime = Date.now() - startTime
                    setLastPingTime(pingTime)
                })

                // Set timeout for heartbeat response
                heartbeatTimeoutRef.current = setTimeout(() => {
                    console.warn('🔌 Socket: Heartbeat timeout')
                    setConnectionError('Heartbeat timeout')
                }, TIME_CONFIG.timeouts.webrtcConnection || 10000)
            }
        }, TIME_CONFIG.intervals.heartbeat || 30000)
    }, [])

    /**
     * Stop heartbeat ping
     */
    const stopHeartbeat = useCallback(() => {
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current)
            pingIntervalRef.current = null
        }
        if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current)
            heartbeatTimeoutRef.current = null
        }
    }, [])

    /**
     * Handle reconnection logic
     */
    const handleReconnect = useCallback(() => {
        if (reconnectAttempts >= config.current.maxReconnectAttempts) {
            console.error('🔌 Socket: Max reconnection attempts reached')
            setConnectionStatus('error')
            setConnectionError('Maximum reconnection attempts exceeded')
            return
        }

        if (!config.current.reconnection) {
            return
        }

        const delay = config.current.reconnectDelay * Math.pow(2, reconnectAttempts)
        console.log(`🔌 Socket: Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1})`)

        setConnectionStatus('reconnecting')
        setReconnectAttempts(prev => prev + 1)

        reconnectTimeoutRef.current = setTimeout(() => {
            if (isAuthenticated && user) {
                initializeSocket()
            }
        }, delay)
    }, [reconnectAttempts, isAuthenticated, user])

    /**
     * Initialize socket connection
     */
    const initializeSocket = useCallback(() => {
        // Prevent multiple simultaneous connection attempts
        if (isConnectingRef.current || socketRef.current?.connected) {
            return
        }

        if (!isAuthenticated || !user) {
            console.log('🔌 Socket: Not authenticated, skipping connection')
            return
        }

        console.log('🔌 Socket: Initializing connection...')
        isConnectingRef.current = true
        setConnectionStatus('connecting')
        setConnectionError(null)

        try {
            // Create socket instance
            const socketUrl = ENV_CONFIG.wsUrl || `${window.location.protocol}//${window.location.host}`
            const socket = io(socketUrl + config.current.namespace, {
                auth: {
                    token: accessToken || '',
                    userId: user.id,
                },
                transports: ['websocket', 'polling'],
                timeout: TIME_CONFIG.timeouts.webrtcConnection || 10000,
                forceNew: true,
            })

            // Set socket reference
            socketRef.current = socket

            // Connection event handlers
            socket.on('connect', () => {
                console.log('🔌 Socket: Connected successfully')
                isConnectingRef.current = false
                setConnectionStatus('connected')
                setConnectionError(null)
                setReconnectAttempts(0)
                startHeartbeat()

                // Re-register event handlers
                Object.entries(eventHandlersRef.current).forEach(([event, handler]) => {
                    socket.on(event, handler)
                })
            })

            socket.on('disconnect', (reason) => {
                console.log('🔌 Socket: Disconnected:', reason)
                isConnectingRef.current = false
                setConnectionStatus('disconnected')
                stopHeartbeat()

                // Handle automatic reconnection
                if (reason === 'io server disconnect') {
                    // Server initiated disconnect - don't auto-reconnect
                    setConnectionError('Server disconnected')
                } else if (isAuthenticated && config.current.reconnection) {
                    // Client-side disconnect - attempt reconnection
                    handleReconnect()
                }
            })

            socket.on('connect_error', (error) => {
                console.error('🔌 Socket: Connection error:', error.message)
                isConnectingRef.current = false
                setConnectionStatus('error')
                setConnectionError(error.message)

                if (isAuthenticated && config.current.reconnection) {
                    handleReconnect()
                }
            })

            socket.on('error', (error) => {
                console.error('🔌 Socket: Socket error:', error)
                setConnectionError(error.message || 'Socket error')
            })

            // Handle pong response
            socket.on('pong', () => {
                if (heartbeatTimeoutRef.current) {
                    clearTimeout(heartbeatTimeoutRef.current)
                    heartbeatTimeoutRef.current = null
                }
            })

        } catch (error) {
            console.error('🔌 Socket: Failed to initialize:', error)
            isConnectingRef.current = false
            setConnectionStatus('error')
            setConnectionError('Failed to initialize socket connection')
        }
    }, [isAuthenticated, user, accessToken, startHeartbeat, stopHeartbeat, handleReconnect])

    /**
     * Connect to socket server
     */
    const connect = useCallback(() => {
        if (!isAuthenticated || !user) {
            console.log('🔌 Socket: Cannot connect - not authenticated')
            return
        }

        if (socketRef.current?.connected) {
            console.log('🔌 Socket: Already connected')
            return
        }

        initializeSocket()
    }, [isAuthenticated, user, initializeSocket])

    /**
     * Disconnect from socket server
     */
    const disconnect = useCallback(() => {
        console.log('🔌 Socket: Disconnecting...')
        isConnectingRef.current = false

        // Stop heartbeat
        stopHeartbeat()

        // Clear reconnection timeout
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
        }

        // Disconnect socket
        if (socketRef.current) {
            socketRef.current.disconnect()
            socketRef.current = null
        }

        // Reset state
        setConnectionStatus('disconnected')
        setConnectionError(null)
        setReconnectAttempts(0)

        // Clear event handlers
        eventHandlersRef.current = {}
    }, [stopHeartbeat])

    /**
     * Emit event to server
     */
    const emit = useCallback(<T = any>(event: string, data?: T) => {
        if (!socketRef.current?.connected) {
            console.warn(`🔌 Socket: Cannot emit ${event} - not connected`)
            return
        }

        try {
            socketRef.current.emit(event, data)
        } catch (error) {
            console.error(`🔌 Socket: Failed to emit ${event}:`, error)
        }
    }, [])

    /**
     * Listen for events
     */
    const on = useCallback(<T = any>(event: string, handler: EventHandler<T>) => {
        // Store handler reference
        eventHandlersRef.current[event] = handler

        // Add listener if socket is connected
        if (socketRef.current) {
            socketRef.current.on(event, handler)
        }

        // Return cleanup function
        return () => {
            delete eventHandlersRef.current[event]
            if (socketRef.current) {
                socketRef.current.off(event, handler)
            }
        }
    }, [])

    /**
     * Remove event listeners
     */
    const off = useCallback((event: string, handler?: EventHandler) => {
        if (handler) {
            delete eventHandlersRef.current[event]
        }

        if (socketRef.current) {
            socketRef.current.off(event, handler)
        }
    }, [])

    /**
     * Listen for event once
     */
    const once = useCallback(<T = any>(event: string, handler: EventHandler<T>) => {
        if (!socketRef.current) {
            console.warn(`🔌 Socket: Cannot listen for ${event} - not connected`)
            return
        }

        socketRef.current.once(event, handler)
    }, [])

    /**
     * Join a room
     */
    const joinRoom = useCallback((roomId: string) => {
        emit(WS_EVENTS.JOIN_MEETING, { roomId })
    }, [emit])

    /**
     * Leave a room
     */
    const leaveRoom = useCallback((roomId: string) => {
        emit(WS_EVENTS.LEAVE_MEETING, { roomId })
    }, [emit])

    /**
     * Send message to room
     */
    const sendMessage = useCallback((roomId: string, message: any) => {
        emit(WS_EVENTS.CHAT_MESSAGE, { roomId, message })
    }, [emit])

    /**
     * Ping server
     */
    const ping = useCallback((): Promise<number> => {
        return new Promise((resolve, reject) => {
            if (!socketRef.current?.connected) {
                reject(new Error('Socket not connected'))
                return
            }

            const startTime = Date.now()
            
            socketRef.current.emit('ping', startTime, (response: number) => {
                const pingTime = Date.now() - startTime
                resolve(pingTime)
            })

            // Timeout after 5 seconds
            setTimeout(() => {
                reject(new Error('Ping timeout'))
            }, 5000)
        })
    }, [])

    /**
     * Get connection quality based on ping
     */
    const getConnectionQuality = useCallback((): 'poor' | 'fair' | 'good' | 'excellent' => {
        if (!isConnected) return 'poor'
        if (lastPingTime === 0) return 'good' // Default until first ping
        if (lastPingTime < 50) return 'excellent'
        if (lastPingTime < 150) return 'good'
        if (lastPingTime < 300) return 'fair'
        return 'poor'
    }, [isConnected, lastPingTime])

    // Auto-connect when authenticated - FIXED: Use ref for config to prevent recreation
    useEffect(() => {
        const shouldConnect = isAuthenticated && config.current.autoConnect
        const shouldDisconnect = !isAuthenticated

        if (shouldConnect && connectionStatus === 'disconnected' && !isConnectingRef.current) {
            connect()
        } else if (shouldDisconnect && connectionStatus !== 'disconnected') {
            disconnect()
        }
    }, [isAuthenticated, connectionStatus, connect, disconnect])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect()
        }
    }, [disconnect])

    return {
        // Connection state
        socket: socketRef.current,
        isConnected,
        connectionStatus,
        connectionError,
        reconnectAttempts,

        // Core methods
        connect,
        disconnect,
        emit,

        // Event management
        on,
        off,
        once,

        // Utility methods
        joinRoom,
        leaveRoom,
        sendMessage,

        // Connection health
        ping,
        getConnectionQuality,
    }
}

export default useSocket