import { useMemo, useState } from 'react'
import AgentPortal from './AgentPortal'
import PropertyIntake from './PropertyIntake'
import './MarketplaceHome.css'

type Stay = {
  id: number
  title: string
  area: string
  city: 'Lagos' | 'Abuja' | 'Ibadan'
  type: string
  price: number
  rating: string
  image: string
  features: string[]
  tag?: string
}

const stays: Stay[] = [
  {
    id: 1,
    title: 'Warm, modern apartment with a city view',
    area: 'Lekki Phase 1',
    city: 'Lagos',
    type: 'Apartments',
    price: 95000,
    rating: 'New',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1100&q=85',
    features: ['2 guests', '1 bedroom', '1 bath'],
    tag: 'Guest favourite style',
  },
  {
    id: 2,
    title: 'Quiet designer stay with a private balcony',
    area: 'Victoria Island',
    city: 'Lagos',
    type: 'Design stays',
    price: 145000,
    rating: 'New',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1100&q=85',
    features: ['2 guests', '1 bedroom', '1 bath'],
    tag: 'Design-led',
  },
  {
    id: 3,
    title: 'Room for everyone in a bright family home',
    area: 'Ikeja GRA',
    city: 'Lagos',
    type: 'Family homes',
    price: 180000,
    rating: 'New',
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1100&q=85',
    features: ['5 guests', '3 bedrooms', '3 baths'],
    tag: 'Made for families',
  },
  {
    id: 4,
    title: 'A calm retreat with thoughtful details',
    area: 'Maitama',
    city: 'Abuja',
    type: 'Design stays',
    price: 125000,
    rating: 'New',
    image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1100&q=85',
    features: ['2 guests', '1 bedroom', '1 bath'],
    tag: 'Calm and considered',
  },
  {
    id: 5,
    title: 'Spacious home for a group weekend',
    area: 'Wuse 2',
    city: 'Abuja',
    type: 'Family homes',
    price: 165000,
    rating: 'New',
    image: 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=1100&q=85',
    features: ['4 guests', '2 bedrooms', '2 baths'],
    tag: 'Group-ready style',
  },
  {
    id: 6,
    title: 'Simple, stylish apartment for a city break',
    area: 'New Bodija',
    city: 'Ibadan',
    type: 'Apartments',
    price: 65000,
    rating: 'New',
    image: 'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=1100&q=85',
    features: ['2 guests', '1 bedroom', '1 bath'],
    tag: 'Easy city stay',
  },
]

const categories = [
  { label: 'All stays', icon: '✦' },
  { label: 'Apartments', icon: '⌂' },
  { label: 'Design stays', icon: '◈' },
  { label: 'Family homes', icon: '⌂' },
]

const naira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`

function AppLogo() {
  return (
    <a className="hm-brand" href="#home" aria-label="HAMLET home">
      <span className="hm-brand-mark">h</span>
      <span className="hm-brand-word">HAMLET</span>
    </a>
  )
}

export default function MarketplaceHome() {
  const [city, setCity] = useState('Anywhere')
  const [category, setCategory] = useState('All stays')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recommended')
  const [saved, setSaved] = useState<number[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const visibleStays = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase()
    const result = stays.filter((stay) => {
      const matchesCity = city === 'Anywhere' || stay.city === city
      const matchesCategory = category === 'All stays' || stay.type === category
      const matchesQuery = !normalisedQuery || [stay.title, stay.area, stay.city, stay.type].some((value) => value.toLowerCase().includes(normalisedQuery))
      return matchesCity && matchesCategory && matchesQuery
    })

    if (sort === 'price-low') result.sort((a, b) => a.price - b.price)
    if (sort === 'price-high') result.sort((a, b) => b.price - a.price)
    return result
  }, [city, category, query, sort])

  const enquire = (stay: Stay) => {
    const message = encodeURIComponent(`Hi HAMLET, I'd like to enquire about this sample stay: ${stay.title} in ${stay.area}, ${stay.city}. Please share how I can find verified, available properties like this.`)
    const number = import.meta.env.VITE_WHATSAPP_NUMBER
    window.open(number ? `https://wa.me/${number}?text=${message}` : `https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer')
  }

  const toggleSaved = (id: number) => {
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  return (
    <div className="hm-app" id="home">
      <div className="hm-preview-notice">
        <span className="hm-notice-dot" />
        Marketplace UI preview · Sample listings only — live availability and verification are not connected yet
      </div>

      <header className="hm-header">
        <AppLogo />
        <nav className={mobileMenuOpen ? 'hm-nav hm-nav-open' : 'hm-nav'} aria-label="Main navigation">
          <a href="#explore" onClick={() => setMobileMenuOpen(false)}>Explore stays</a>
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How HAMLET works</a>
          <a href="#property-intake" onClick={() => setMobileMenuOpen(false)}>List a property</a>
        </nav>
        <div className="hm-header-actions">
          <a className="hm-host-link" href="#property-intake">List your property</a>
          <a className="hm-profile-button" href="#owners" aria-label="Owner and agent workspace">↗</a>
        </div>
        <button className="hm-menu-toggle" type="button" aria-label="Toggle navigation" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>☰</button>
      </header>

      <main>
        <section className="hm-hero">
          <div className="hm-hero-copy">
            <span className="hm-eyebrow"><span /> BETTER STAYS. REAL ACCOUNTABILITY.</span>
            <h1>Feel at home.<br /><em>Stay with confidence.</em></h1>
            <p>Discover shortlets across Nigeria with clearer information, accountable people, and a better way to find your next stay.</p>
          </div>
          <div className="hm-hero-image" role="img" aria-label="Sunlit contemporary living room">
            <div className="hm-image-caption">
              <span className="hm-caption-kicker">YOUR NEXT STAY, THOUGHTFULLY FOUND</span>
              <strong>Good spaces.<br />Clear expectations.</strong>
            </div>
          </div>
        </section>

        <section className="hm-search-wrap" aria-label="Find a stay">
          <form className="hm-search" onSubmit={(event) => { event.preventDefault(); document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' }) }}>
            <label className="hm-search-field hm-destination">
              <span>Where</span>
              <select value={city} onChange={(event) => setCity(event.target.value)} aria-label="Choose city">
                <option>Anywhere</option>
                <option>Lagos</option>
                <option>Abuja</option>
                <option>Ibadan</option>
              </select>
            </label>
            <label className="hm-search-field hm-search-text">
              <span>Neighbourhood or stay</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Lekki, Maitama..." aria-label="Search neighbourhood or stay" />
            </label>
            <label className="hm-search-field hm-guests">
              <span>Who is coming?</span>
              <select aria-label="Choose guest group" defaultValue="Any group">
                <option>Any group</option>
                <option>Solo traveller</option>
                <option>Couple</option>
                <option>Family</option>
                <option>Friends</option>
                <option>Business</option>
              </select>
            </label>
            <button className="hm-search-submit" type="submit"><span>⌕</span><span className="hm-search-button-text">Find a stay</span></button>
          </form>
          <div className="hm-search-footnote"><span>✦</span> Search the way you travel. Choose the stay that fits your plans.</div>
        </section>

        <section className="hm-explore section-anchor" id="explore">
          <div className="hm-section-heading">
            <div>
              <span className="hm-eyebrow">MADE FOR YOUR KIND OF STAY</span>
              <h2>Find your kind of place.</h2>
              <p>From a quick city break to a home for the whole crew.</p>
            </div>
            <button className={showFilters ? 'hm-filter-button active' : 'hm-filter-button'} type="button" onClick={() => setShowFilters((show) => !show)}><span>☷</span> Filters</button>
          </div>

          {showFilters && (
            <div className="hm-filter-panel">
              <label>Destination
                <select value={city} onChange={(event) => setCity(event.target.value)}>
                  <option>Anywhere</option><option>Lagos</option><option>Abuja</option><option>Ibadan</option>
                </select>
              </label>
              <label>Sort by
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="recommended">Recommended</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option>
                </select>
              </label>
              <button type="button" className="hm-clear-filters" onClick={() => { setCity('Anywhere'); setCategory('All stays'); setQuery(''); setSort('recommended') }}>Clear all</button>
            </div>
          )}

          <div className="hm-category-row" role="group" aria-label="Filter by stay type">
            {categories.map((item) => (
              <button type="button" key={item.label} className={category === item.label ? 'hm-category active' : 'hm-category'} onClick={() => setCategory(item.label)}>
                <span className="hm-category-icon">{item.icon}</span><span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="hm-results-meta"><span>{visibleStays.length} preview {visibleStays.length === 1 ? 'stay' : 'stays'}</span><span>Illustrative listings · not bookable yet</span></div>
          {visibleStays.length > 0 ? (
            <div className="hm-stay-grid">
              {visibleStays.map((stay) => (
                <article className="hm-stay-card" key={stay.id}>
                  <div className="hm-stay-image-wrap">
                    <img className="hm-stay-image" src={stay.image} alt={stay.title} loading="lazy" />
                    <span className="hm-preview-tag">Preview</span>
                    <button className={saved.includes(stay.id) ? 'hm-save-button saved' : 'hm-save-button'} type="button" onClick={() => toggleSaved(stay.id)} aria-label={saved.includes(stay.id) ? 'Remove from saved stays' : 'Save stay'} aria-pressed={saved.includes(stay.id)}>{saved.includes(stay.id) ? '♥' : '♡'}</button>
                  </div>
                  <div className="hm-stay-card-content">
                    <div className="hm-stay-location"><strong>{stay.area}, {stay.city}</strong><span>✦ {stay.rating}</span></div>
                    <h3>{stay.title}</h3>
                    <p className="hm-stay-features">{stay.features.join(' · ')}</p>
                    <div className="hm-stay-bottom"><p><strong>{naira(stay.price)}</strong> <span>/ night (illustrative)</span></p><button type="button" onClick={() => enquire(stay)}>Enquire ↗</button></div>
                    <div className="hm-stay-tagline">{stay.tag}</div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="hm-empty-state"><span>⌕</span><h3>No preview stays match that search.</h3><p>Try another neighbourhood or clear your filters.</p><button type="button" onClick={() => { setCity('Anywhere'); setCategory('All stays'); setQuery('') }}>Show all stays</button></div>
          )}
        </section>

        <section className="hm-trust-band" id="how-it-works">
          <div className="hm-trust-intro"><span className="hm-eyebrow">WHY HAMLET</span><h2>Booking a stay should feel simple.<br /><em>Trust should come standard.</em></h2></div>
          <div className="hm-trust-points">
            <article><span className="hm-trust-icon">⌕</span><h3>Know what you're booking</h3><p>Clear property details and expectations, before you commit.</p></article>
            <article><span className="hm-trust-icon">✓</span><h3>Checks with meaning</h3><p>Verification should reflect checks actually completed — never just a badge.</p></article>
            <article><span className="hm-trust-icon">↗</span><h3>People stay accountable</h3><p>A better-connected network of owners and agents, with clearer responsibilities.</p></article>
          </div>
        </section>

        <section className="hm-owner-cta" id="owners">
          <div className="hm-owner-copy"><span className="hm-eyebrow">FOR OWNERS, MANAGERS & AGENTS</span><h2>Your network is valuable.<br /><em>Let it work better.</em></h2><p>HAMLET is building a more accountable way to bring good properties and the right guests together — with a clear role for the people who make the connection.</p><a className="hm-primary-button" href="#property-intake">Submit a property <span>↗</span></a></div>
          <div className="hm-owner-visual"><div className="hm-owner-stat"><span>BUILT AROUND REAL PEOPLE</span><strong>Better stays.<br />Brighter returns.</strong><p>For guests, property owners and the agent network.</p></div></div>
        </section>

        <PropertyIntake />

        <section className="hm-workspace" id="agent-workspace">
          <div className="hm-workspace-heading"><span className="hm-eyebrow">OWNER & AGENT TOOLS</span><h2>One place to move the work forward.</h2><p>The existing HAMLET workspace is retained below. Live access depends on Supabase configuration.</p></div>
          <AgentPortal />
        </section>
      </main>

      <footer className="hm-footer"><AppLogo /><span>Better stays. Brighter returns.</span><div><a href="#explore">Explore stays</a><a href="#how-it-works">Our promise</a><a href="#property-intake">List a property</a></div><small>© 2026 HAMLET · Made for the way Nigeria stays.</small></footer>
    </div>
  )
}
