import type { Metadata } from 'next'
import MarketplaceHome from '../../src/MarketplaceHome'

export const metadata: Metadata = {
  title: 'Explore shortlets in Lagos',
  description: 'Explore available HAMLET shortlets in Lagos. Review property details and pricing before requesting a stay.',
  alternates: { canonical: '/explore' },
}

export default function ExplorePage() {
  return <MarketplaceHome page="explore" />
}
