import type { Metadata } from 'next'
import { Inter, Fira_Code } from 'next/font/google'
import './globals.css'

// Redux Provider
import { Providers } from '@/components/providers/Providers'

// Toast notifications
import { Toaster } from 'react-hot-toast'

// Font configurations
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Video Meet',
    default: 'Video Meet - Connect Anywhere, Anytime',
  },
  description: 'Professional video calling platform with advanced features for teams and individuals. Connect with crystal clear video and audio quality.',
  keywords: ['video call', 'online meeting', 'webrtc', 'video conference', 'remote work'],
  authors: [{ name: 'Video Meet Team' }],
  creator: 'Video Meet',
  publisher: 'Video Meet',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Video Meet - Connect Anywhere, Anytime',
    description: 'Professional video calling platform with advanced features for teams and individuals.',
    siteName: 'Video Meet',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Video Meet - Professional Video Calling',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Video Meet - Connect Anywhere, Anytime',
    description: 'Professional video calling platform with advanced features for teams and individuals.',
    images: ['/og-image.png'],
    creator: '@videomeet',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${firaCode.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Viewport meta tag for responsive design */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />

        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#3b82f6" />
        <meta name="msapplication-TileColor" content="#3b82f6" />

        {/* PWA meta tags */}
        <meta name="application-name" content="Video Meet" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Video Meet" />

        {/* Performance hints */}
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL} />
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL} />
      </head>
      <body
        className={`
          min-h-screen 
          font-sans 
          antialiased 
          bg-background 
          text-foreground
          selection:bg-primary/20 
          selection:text-primary-foreground
        `}
        suppressHydrationWarning
      >
        {/* Redux and other providers */}
        <Providers>
          {/* Main application content */}
          <div id="root" className="relative min-h-screen">
            {children}
          </div>

          {/* Global toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'calc(var(--radius) - 2px)',
                fontSize: '14px',
                maxWidth: '400px',
              },
              success: {
                iconTheme: {
                  primary: 'hsl(var(--primary))',
                  secondary: 'hsl(var(--primary-foreground))',
                },
              },
              error: {
                iconTheme: {
                  primary: 'hsl(var(--destructive))',
                  secondary: 'hsl(var(--destructive-foreground))',
                },
              },
            }}
          />

          {/* Portal root for modals and overlays */}
          <div id="modal-root" />
        </Providers>

        {/* Development tools */}
        {process.env.NODE_ENV === 'development' && (
          <div id="dev-tools" />
        )}
      </body>
    </html>
  )
}