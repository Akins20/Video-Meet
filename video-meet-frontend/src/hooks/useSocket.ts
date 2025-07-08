/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'react-hot-toast'
import { useAuth } from './useAuth'
import { useAuthState } from '@/store/hooks'
import { WS_EVENTS, ENV_CONFIG, TIME_CONFIG } from '@/utils/constants'

// Socket connection states
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'disabled'

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
    
    // Control methods
    enableSocket: () => void
    disableSocket: () => void
    resetConnection: () => void
}

// Hook configuration options
interface SocketOptions {
    autoConnect?: boolean
    maxReconnectAttempts?: number
}

export const useSocket = (options: SocketOptions = {}): UseSocketReturn => {
    const { user, isAuthenticated } = useAuth()
    const { accessToken } = useAuthState()

    // Configuration
    const maxReconnectAttempts = options.maxReconnectAttempts || 3
    const autoConnect = options.autoConnect !== false // Default true

    // State management
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
    const [connectionError, setConnectionError] = useState<string | null>(null)
    const [reconnectAttempts, setReconnectAttempts] = useState(0)
    const [isSocketEnabled, setIsSocketEnabled] = useState(true)

    // Refs
    const socketRef = useRef<Socket | null>(null)
    const eventHandlersRef = useRef<EventMap>({})
    const isConnectingRef = useRef(false)
    const hasAttemptedConnection = useRef(false)

    // Get current connection status
    const isConnected = connectionStatus === 'connected'

    /**
     * Enhanced logging
     */
    const log = useCallback((action: string, data?: any) => {
        console.log(`🔌 Socket [${action}]:`, {
            status: connectionStatus,
            attempts: reconnectAttempts,
            isConnecting: isConnectingRef.current,
            isEnabled: isSocketEnabled,
            isAuthenticated,
            hasAttempted: hasAttemptedConnection.current,
            ...data
        })
    }, [connectionStatus, reconnectAttempts, isSocketEnabled, isAuthenticated])

    /**
     * Get WebSocket URL - FIXED to always use backend URL
     */
    const getSocketUrl = useCallback(() => {
        // Always use ENV_CONFIG.wsUrl - it handles the logic correctly
        const wsUrl = ENV_CONFIG.wsUrl
        
        log('URL_CHECK', { 
            wsUrl,
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            host: window.location.host
        })
        
        return wsUrl
    }, [log])

    /**
     * Initialize socket connection
     */
    const initializeSocket = useCallback(() => {
        if (isConnectingRef.current || socketRef.current?.connected) {
            log('INIT_SKIPPED', { reason: 'already_connecting_or_connected' })
            return
        }

        if (!isAuthenticated || !user) {
            log('INIT_SKIPPED', { reason: 'not_authenticated' })
            return
        }

        if (!isSocketEnabled) {
            log('INIT_SKIPPED', { reason: 'socket_disabled' })
            return
        }

        log('INIT_START')
        isConnectingRef.current = true
        setConnectionStatus('connecting')
        setConnectionError(null)

        try {
            const socketUrl = getSocketUrl()
            
            const socket = io(socketUrl, {
                auth: {
                    token: accessToken || '',
                    userId: user.id,
                },
                transports: ['websocket', 'polling'],
                timeout: 5000, // 5 second timeout
                forceNew: true,
                reconnection: false, // We handle our own reconnection
            })

            socketRef.current = socket

            // Set up connection timeout
            const connectionTimeout = setTimeout(() => {
                if (isConnectingRef.current) {
                    log('INIT_TIMEOUT')
                    socket.disconnect()
                    isConnectingRef.current = false
                    setConnectionStatus('error')
                    setConnectionError('Connection timeout - WebSocket server may not be running')
                    
                    // Try to reconnect if we haven't hit max attempts
                    if (reconnectAttempts < maxReconnectAttempts) {
                        setTimeout(() => {
                            setReconnectAttempts(prev => prev + 1)
                            initializeSocket()
                        }, 2000 * (reconnectAttempts + 1)) // Exponential backoff
                    } else {
                        log('MAX_ATTEMPTS_REACHED')
                        setIsSocketEnabled(false)
                        setConnectionError('WebSocket server unavailable. Continuing without real-time features.')
                    }
                }
            }, 6000)

            socket.on('connect', () => {
                clearTimeout(connectionTimeout)
                log('INIT_SUCCESS')
                
                isConnectingRef.current = false
                setConnectionStatus('connected')
                setConnectionError(null)
                setReconnectAttempts(0)

                // Re-register event handlers
                Object.entries(eventHandlersRef.current).forEach(([event, handler]) => {
                    socket.on(event, handler)
                })

                if (reconnectAttempts > 0) {
                    toast.success('Connection restored')
                }
            })

            socket.on('disconnect', (reason) => {
                clearTimeout(connectionTimeout)
                log('DISCONNECT', { reason })
                isConnectingRef.current = false
                setConnectionStatus('disconnected')

                if (reason !== 'io server disconnect' && isSocketEnabled && reconnectAttempts < maxReconnectAttempts) {
                    setTimeout(() => {
                        setReconnectAttempts(prev => prev + 1)
                        initializeSocket()
                    }, 2000 * (reconnectAttempts + 1))
                }
            })

            socket.on('connect_error', (error) => {
                clearTimeout(connectionTimeout)
                log('CONNECT_ERROR', { error: error.message })
                isConnectingRef.current = false
                setConnectionStatus('error')
                setConnectionError(error.message)

                if (reconnectAttempts < maxReconnectAttempts && isSocketEnabled) {
                    setTimeout(() => {
                        setReconnectAttempts(prev => prev + 1)
                        initializeSocket()
                    }, 2000 * (reconnectAttempts + 1))
                } else {
                    log('GIVING_UP')
                    setIsSocketEnabled(false)
                    setConnectionError('Unable to connect to WebSocket server. App will work without real-time features.')
                }
            })

        } catch (error: any) {
            log('INIT_EXCEPTION', { error: error.message })
            isConnectingRef.current = false
            setConnectionStatus('error')
            setConnectionError('Failed to initialize socket')
        }
    }, [isAuthenticated, user, accessToken, isSocketEnabled, reconnectAttempts, maxReconnectAttempts, getSocketUrl, log])

    /**
     * Connect to socket server
     */
    const connect = useCallback(() => {
        if (!isSocketEnabled) {
            log('CONNECT_SKIPPED', { reason: 'socket_disabled' })
            return
        }

        log('CONNECT_START')
        hasAttemptedConnection.current = true
        initializeSocket()
    }, [isSocketEnabled, initializeSocket, log])

    /**
     * Disconnect from socket server
     */
    const disconnect = useCallback(() => {
        log('DISCONNECT_START')
        isConnectingRef.current = false
        
        if (socketRef.current) {
            socketRef.current.disconnect()
            socketRef.current = null
        }

        setConnectionStatus('disconnected')
        setConnectionError(null)
        eventHandlersRef.current = {}
    }, [log])

    /**
     * Enable socket connections
     */
    const enableSocket = useCallback(() => {
        log('ENABLE_SOCKET')
        setIsSocketEnabled(true)
        setConnectionError(null)
        setReconnectAttempts(0)
        hasAttemptedConnection.current = false
        
        if (isAuthenticated && user) {
            connect()
        }
    }, [isAuthenticated, user, connect, log])

    /**
     * Disable socket connections
     */
    const disableSocket = useCallback(() => {
        log('DISABLE_SOCKET')
        setIsSocketEnabled(false)
        disconnect()
        setConnectionStatus('disabled')
    }, [disconnect, log])

    /**
     * Reset connection state
     */
    const resetConnection = useCallback(() => {
        log('RESET_CONNECTION')
        disconnect()
        setReconnectAttempts(0)
        setConnectionError(null)
        hasAttemptedConnection.current = false
        
        if (isSocketEnabled && isAuthenticated && user) {
            setTimeout(() => connect(), 1000)
        }
    }, [disconnect, connect, isSocketEnabled, isAuthenticated, user, log])

    /**
     * Emit event to server
     */
    const emit = useCallback(<T = any>(event: string, data?: T) => {
        if (!socketRef.current?.connected) {
            log('EMIT_FAILED', { event, reason: 'not_connected' })
            return
        }

        try {
            socketRef.current.emit(event, data)
            log('EMIT_SUCCESS', { event })
        } catch (error: any) {
            log('EMIT_ERROR', { event, error: error.message })
        }
    }, [log])

    /**
     * Listen for events
     */
    const on = useCallback(<T = any>(event: string, handler: EventHandler<T>) => {
        eventHandlersRef.current[event] = handler

        if (socketRef.current?.connected) {
            socketRef.current.on(event, handler)
        }

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
        if (!socketRef.current?.connected) {
            return
        }
        socketRef.current.once(event, handler)
    }, [])

    /**
     * Join a room
     */
    const joinRoom = useCallback((roomId: string) => {
        log('JOIN_ROOM', { roomId })
        emit(WS_EVENTS.JOIN_MEETING, { roomId })
    }, [emit, log])

    /**
     * Leave a room
     */
    const leaveRoom = useCallback((roomId: string) => {
        log('LEAVE_ROOM', { roomId })
        emit(WS_EVENTS.LEAVE_MEETING, { roomId })
    }, [emit, log])

    /**
     * Send message to room
     */
    const sendMessage = useCallback((roomId: string, message: any) => {
        log('SEND_MESSAGE', { roomId })
        emit(WS_EVENTS.CHAT_MESSAGE, { roomId, message })
    }, [emit, log])

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
            socketRef.current.emit('ping', startTime)
            
            const timeout = setTimeout(() => {
                reject(new Error('Ping timeout'))
            }, 5000)

            socketRef.current.once('pong', () => {
                clearTimeout(timeout)
                const pingTime = Date.now() - startTime
                resolve(pingTime)
            })
        })
    }, [])

    /**
     * Get connection quality
     */
    const getConnectionQuality = useCallback((): 'poor' | 'fair' | 'good' | 'excellent' => {
        if (!isConnected) return 'poor'
        return 'good' // Simplified for now
    }, [isConnected])

    // Auto-connect effect - SIMPLIFIED and SAFE
    useEffect(() => {
        log('AUTO_CONNECT_CHECK', { 
            shouldTryConnect: autoConnect && isAuthenticated && !hasAttemptedConnection.current && isSocketEnabled 
        })

        // Only try to connect once when the user is authenticated
        if (autoConnect && isAuthenticated && !hasAttemptedConnection.current && isSocketEnabled) {
            log('AUTO_CONNECT_TRIGGERING')
            connect()
        }
    }, [autoConnect, isAuthenticated, isSocketEnabled]) // Minimal dependencies to prevent loops

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            log('CLEANUP_ON_UNMOUNT')
            disconnect()
        }
    }, []) // Empty dependency array to only run on unmount

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

        // Control methods
        enableSocket,
        disableSocket,
        resetConnection,
    }
}

export default useSocket