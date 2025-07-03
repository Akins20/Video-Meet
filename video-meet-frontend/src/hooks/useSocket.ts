import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'react-hot-toast'
import { useAuth } from './useAuth'
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

    // Configuration with defaults
    const config = {
        autoConnect: true,
        reconnection: true,
        maxReconnectAttempts: 5,
        reconnectDelay: 1000,
        namespace: '',
        ...options
    }

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

    // Get current connection status
    const isConnected = connectionStatus === 'connected'

    /**
     * Initialize socket connection
     */
    const initializeSocket = useCallback(() => {
        if (!isAuthenticated || !user) {
            console.log('🔌 Socket: Not authenticated, skipping connection')
            return
        }

        if (socketRef.current?.connected) {
            console.log('🔌 Socket: Already connected')
            return
        }

        try {
            setConnectionStatus('connecting')
            setConnectionError(null)

            console.log('🔌 Socket: Initializing connection...')

            // Create socket instance
            const socket = io(ENV_CONFIG.wsUrl + config.namespace, {
                auth: {
                    token: localStorage.getItem('access_token') || sessionStorage.getItem('access_token'),
                    userId: user.id,
                    username: user.username
                },
                transports: ['websocket', 'polling'],
                upgrade: true,
                rememberUpgrade: true,
                autoConnect: false,
                reconnection: config.reconnection,
                reconnectionAttempts: config.maxReconnectAttempts,
                reconnectionDelay: config.reconnectDelay,
                reconnectionDelayMax: 5000,
                timeout: TIME_CONFIG.timeouts.webrtcConnection,
                forceNew: false,
            })

            // Store socket reference
            socketRef.current = socket

            // Set up connection event handlers
            setupConnectionHandlers(socket)

            // Connect to server
            socket.connect()

        } catch (error) {
            console.error('🔌 Socket: Initialization failed:', error)
            setConnectionStatus('error')
            setConnectionError('Failed to initialize socket connection')
        }
    }, [isAuthenticated, user, config])

    /**
     * Setup connection event handlers
     */
    const setupConnectionHandlers = useCallback((socket: Socket) => {
        // Connection established
        socket.on(WS_EVENTS.CONNECT, () => {
            console.log('🔌 Socket: Connected successfully')
            setConnectionStatus('connected')
            setConnectionError(null)
            setReconnectAttempts(0)

            // Start heartbeat
            startHeartbeat()

            // Re-register event handlers
            Object.entries(eventHandlersRef.current).forEach(([event, handler]) => {
                socket.on(event, handler)
            })

            toast.success('Connected to server', { duration: 2000 })
        })

        // Connection failed
        socket.on('connect_error', (error) => {
            console.error('🔌 Socket: Connection error:', error)
            setConnectionStatus('error')
            setConnectionError(error.message || 'Connection failed')

            // Clear heartbeat
            stopHeartbeat()

            toast.error('Connection failed', { duration: 3000 })
        })

        // Disconnection
        socket.on(WS_EVENTS.DISCONNECT, (reason) => {
            console.log('🔌 Socket: Disconnected:', reason)
            setConnectionStatus('disconnected')

            // Clear heartbeat
            stopHeartbeat()

            // Handle different disconnect reasons
            if (reason === 'io server disconnect') {
                // Server initiated disconnect - don't reconnect automatically
                setConnectionError('Disconnected by server')
                toast.error('Disconnected by server')
            } else if (reason === 'io client disconnect') {
                // Client initiated disconnect - normal
                setConnectionError(null)
            } else {
                // Network issues - will attempt to reconnect
                setConnectionError('Connection lost')
                toast.error('Connection lost - attempting to reconnect...')
            }
        })

        // Reconnection attempt
        socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔌 Socket: Reconnection attempt ${attemptNumber}`)
            setConnectionStatus('reconnecting')
            setReconnectAttempts(attemptNumber)
        })

        // Reconnection successful
        socket.on('reconnect', (attemptNumber) => {
            console.log(`🔌 Socket: Reconnected after ${attemptNumber} attempts`)
            setConnectionStatus('connected')
            setConnectionError(null)
            setReconnectAttempts(0)

            toast.success('Reconnected to server', { duration: 2000 })
        })

        // Reconnection failed
        socket.on('reconnect_failed', () => {
            console.error('🔌 Socket: Reconnection failed')
            setConnectionStatus('error')
            setConnectionError('Failed to reconnect to server')

            toast.error('Failed to reconnect. Please refresh the page.', { duration: 5000 })
        })

        // Handle authentication errors
        socket.on('auth_error', (error) => {
            console.error('🔌 Socket: Authentication error:', error)
            setConnectionStatus('error')
            setConnectionError('Authentication failed')

            // Disconnect and don't reconnect
            socket.disconnect()

            toast.error('Authentication failed. Please login again.')
        })

        // Handle server errors
        socket.on(WS_EVENTS.ERROR, (error) => {
            console.error('🔌 Socket: Server error:', error)
            toast.error(error.message || 'Server error occurred')
        })

        // Heartbeat/ping response
        socket.on('pong', (timestamp) => {
            const now = Date.now()
            const pingTime = now - timestamp
            setLastPingTime(pingTime)

            // Reset heartbeat timeout
            resetHeartbeatTimeout()
        })

    }, [])

    /**
     * Start heartbeat mechanism
     */
    const startHeartbeat = useCallback(() => {
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current)
        }

        // Send ping every 30 seconds
        pingIntervalRef.current = setInterval(() => {
            if (socketRef.current?.connected) {
                socketRef.current.emit('ping', Date.now())
            }
        }, TIME_CONFIG.intervals.heartbeat)

        // Set initial heartbeat timeout
        resetHeartbeatTimeout()
    }, [])

    /**
     * Stop heartbeat mechanism
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
     * Reset heartbeat timeout
     */
    const resetHeartbeatTimeout = useCallback(() => {
        if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current)
        }

        // If no pong received within 1 minute, consider connection dead
        heartbeatTimeoutRef.current = setTimeout(() => {
            console.warn('🔌 Socket: Heartbeat timeout - forcing reconnection')
            if (socketRef.current) {
                socketRef.current.disconnect()
                socketRef.current.connect()
            }
        }, 60000)
    }, [])

    /**
     * Connect to socket server
     */
    const connect = useCallback(() => {
        if (!isAuthenticated) {
            console.log('🔌 Socket: Cannot connect - not authenticated')
            return
        }

        if (socketRef.current?.connected) {
            console.log('🔌 Socket: Already connected')
            return
        }

        initializeSocket()
    }, [isAuthenticated, initializeSocket])

    /**
     * Disconnect from socket server
     */
    const disconnect = useCallback(() => {
        console.log('🔌 Socket: Disconnecting...')

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
            if (handler) {
                socketRef.current.off(event, handler)
            } else {
                socketRef.current.off(event)
            }
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
        emit(WS_EVENTS.CHAT_MESSAGE, { roomId, ...message })
    }, [emit])

    /**
     * Ping server and measure latency
     */
    const ping = useCallback((): Promise<number> => {
        return new Promise((resolve, reject) => {
            if (!socketRef.current?.connected) {
                reject(new Error('Not connected'))
                return
            }

            const startTime = Date.now()

            socketRef.current.emit('ping', startTime)

            const timeout = setTimeout(() => {
                reject(new Error('Ping timeout'))
            }, 5000)

            socketRef.current.once('pong', (timestamp) => {
                clearTimeout(timeout)
                const pingTime = Date.now() - timestamp
                resolve(pingTime)
            })
        })
    }, [])

    /**
     * Get connection quality based on ping
     */
    const getConnectionQuality = useCallback((): 'poor' | 'fair' | 'good' | 'excellent' => {
        if (!isConnected) return 'poor'

        if (lastPingTime === 0) return 'good' // Default when no ping data

        if (lastPingTime < 50) return 'excellent'
        if (lastPingTime < 150) return 'good'
        if (lastPingTime < 300) return 'fair'
        return 'poor'
    }, [isConnected, lastPingTime])

    // Auto-connect when authenticated
    useEffect(() => {
        if (isAuthenticated && config.autoConnect) {
            connect()
        } else if (!isAuthenticated) {
            disconnect()
        }

        return () => {
            disconnect()
        }
    }, [isAuthenticated, config.autoConnect, connect, disconnect])

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