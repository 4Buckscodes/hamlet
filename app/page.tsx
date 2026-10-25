import MarketplaceHome from '../src/MarketplaceHome'

export const metadata = {
  title: 'Find a shortlet that feels right',
  description: 'Explore HAMLET shortlets in Lagos with clear property information, transparent guest pricing and a request-to-book process.',
  alternates: { canonical: '/' },
}

export default function HomePage() {
  return <MarketplaceHome page="home" />
}
