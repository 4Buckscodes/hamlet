import type { Metadata, Viewport } from 'next'
import '../src/index.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hamlet.rest'),
  title: {
    default: 'HAMLET.REST — Your stay, sorted.',
    template: '%s | HAMLET.REST',
  },
  description: 'Find a shortlet that fits your plans, your people and your budget. Explore HAMLET stays and request your booking with clear expectations.',
  applicationName: 'HAMLET.REST',
  openGraph: {
    type: 'website',
    siteName: 'HAMLET.REST',
    title: 'HAMLET.REST — Your stay, sorted.',
    description: 'Find a shortlet that fits your plans, your people and your budget.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HAMLET.REST — Your stay, sorted.',
    description: 'Find a shortlet that fits your plans, your people and your budget.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f5f1e9',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NG">
      <body>{children}</body>
    </html>
  )
}
