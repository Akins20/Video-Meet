import type { Metadata } from 'next'
import { Inter, Fira_Code } from 'next/font/google'
import './globals.css'

// Redux provider
import { Providers } from '@/providers/Providers'

// react-hot-toast
import { Toaster } from 'react-hot-toast'

// Font configuration
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

// Metadata
export const metadata: Metadata = {
  title: {
    template: '%s | Video Meet',
    default: 'Video Meet - Connect Anywhere, Anytime',
  },
  description:
    'Professional video calling platform with advanced features for teams and individuals.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Video Meet - Connect Anywhere, Anytime',
    description:
      'Professional video calling platform with advanced features for teams and individuals.',
    siteName: 'Video Meet',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Video Meet',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Video Meet - Connect Anywhere, Anytime',
    description:
      'Professional video calling platform with advanced features for teams and individuals.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
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
      <body
        className="
          min-h-screen 
          font-sans 
          antialiased 
          bg-background 
          text-foreground
        "
      >
        <Providers>
          <main className="relative min-h-screen">{children}</main>
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
            }}
          />
          <div id="modal-root" />
        </Providers>
      </body>
    </html>
  )
}
