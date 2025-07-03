'use client'

import React, { useEffect, useState } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor, initializeStore } from '@/store'
import { ThemeProvider } from 'next-themes'

// Loading component for initialization
const InitializationLoader = () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
            {/* Loading spinner */}
            <div className="relative">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-primary/40 rounded-full animate-spin animation-delay-150" />
            </div>

            {/* Loading text */}
            <div className="text-center">
                <h2 className="text-lg font-semibold text-foreground mb-1">
                    Starting Video Meet
                </h2>
                <p className="text-sm text-muted-foreground">
                    Initializing secure connection...
                </p>
            </div>
        </div>
    </div>
)

// Error boundary for Redux errors
class ReduxErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: Error }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Redux Provider Error:', error, errorInfo)

        // In production, you might want to send this to an error reporting service
        if (process.env.NODE_ENV === 'production') {
            // Example: Sentry.captureException(error, { contexts: { errorInfo } })
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <div className="text-center space-y-4 max-w-md">
                        <div className="text-destructive text-4xl mb-4">⚠️</div>
                        <h2 className="text-xl font-semibold text-foreground">
                            Something went wrong
                        </h2>
                        <p className="text-muted-foreground">
                            There was an error initializing the application. Please refresh the page to try again.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

// Redux Provider with error handling
const ReduxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isStoreReady, setIsStoreReady] = useState(false)

    useEffect(() => {
        const setupStore = async () => {
            try {
                await initializeStore()
                setIsStoreReady(true)
            } catch (error) {
                console.error('Failed to initialize store:', error)
                // Fallback: mark as ready anyway to prevent infinite loading
                setIsStoreReady(true)
            }
        }

        setupStore()
    }, [])

    // if (!isStoreReady) {
    //     return <InitializationLoader />
    // }

    return (
        <ReduxErrorBoundary>
            <Provider store={store}>
                <PersistGate
                    loading={<InitializationLoader />}
                    persistor={persistor}
                    onBeforeLift={() => {
                        // Any pre-lift actions can go here
                        console.log('Redux store rehydrated successfully')
                    }}
                >
                    {children}
                </PersistGate>
            </Provider>
        </ReduxErrorBoundary>
    )
}

// Theme Provider wrapper
const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="videomeet-theme"
        themes={['light', 'dark', 'system']}
    >
        {children}
    </ThemeProvider>
)

// Performance monitoring (optional)
const PerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useEffect(() => {
        // Performance monitoring in development
        if (process.env.NODE_ENV === 'development') {
            let renderStart = performance.now()

            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.entryType === 'measure') {
                        console.log(`🚀 ${entry.name}: ${entry.duration.toFixed(2)}ms`)
                    }
                })
            })

            observer.observe({ entryTypes: ['measure'] })

            // Mark render start
            performance.mark('app-render-start')

            return () => {
                observer.disconnect()
                performance.mark('app-render-end')
                performance.measure('app-render-duration', 'app-render-start', 'app-render-end')
            }
        }
    }, [])

    return <>{children}</>
}

// Network status provider (for offline detection)
const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useEffect(() => {
        const handleOnline = () => {
            console.log('🌐 Network: Online')
            // Dispatch action to update network status if needed
        }

        const handleOffline = () => {
            console.log('📡 Network: Offline')
            // Dispatch action to update network status if needed
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    return <>{children}</>
}

// Auth initialization provider
const AuthInitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthInitialized, setIsAuthInitialized] = useState(false)

    useEffect(() => {
        // Initialize authentication state
        const initAuth = async () => {
            try {
                // Give store time to rehydrate
                setTimeout(() => {
                    store.dispatch({ type: 'auth/initializeAuth' })
                    setIsAuthInitialized(true)
                }, 100)
            } catch (error) {
                console.error('Auth initialization error:', error)
                setIsAuthInitialized(true) // Continue anyway
            }
        }

        initAuth()
    }, [])

    // if (!isAuthInitialized) {
    //     return <InitializationLoader />
    // }

    return <>{children}</>
}

// Main Providers component
export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <AppThemeProvider>
            <ReduxProvider>
                <AuthInitProvider>
                    <NetworkProvider>
                        <PerformanceProvider>
                            {children}
                        </PerformanceProvider>
                    </NetworkProvider>
                </AuthInitProvider>
            </ReduxProvider>
        </AppThemeProvider>
    )
}

// Individual provider exports for testing
export {
    ReduxProvider,
    AppThemeProvider,
    PerformanceProvider,
    NetworkProvider,
    AuthInitProvider,
    InitializationLoader,
}

// Provider composition helper for testing
export const createTestProviders = (options?: {
    theme?: string
    initialState?: any
}) => {
    return ({ children }: { children: React.ReactNode }) => (
        <AppThemeProvider>
            <ReduxProvider>
                {children}
            </ReduxProvider>
        </AppThemeProvider>
    )
}

export default Providers