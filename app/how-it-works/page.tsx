import type { Metadata } from 'next'
import MarketplaceHome from '../../src/MarketplaceHome'

export const metadata: Metadata = {
  title: 'How HAMLET works',
  description: 'Learn how HAMLET property discovery and request-to-book works, including what happens before a stay is confirmed.',
  alternates: { canonical: '/how-it-works' },
}

export default function HowItWorksPage() {
  return <MarketplaceHome page="how-it-works" />
}
