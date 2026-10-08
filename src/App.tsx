import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEYS = {
  host: 'hamlet-host-leads',
  guest: 'hamlet-guest-leads',
  research: 'hamlet-research-responses',
  events: 'hamlet-analytics-events',
}

const prompts = [
  "I'm visiting Lagos for work next week...",
  'I need a two-bedroom in Lekki for a family visit...',
  'Looking for somewhere quiet in Abuja this weekend...',
  'I need a nice place for me and my wife...',
]

const intentData = {
  Party: {
    title: 'Looking for a stay that keeps you close to the action?',
    cta: 'Find Party-Friendly Stays',
  },
  Owambe: {
    title: 'Need a place that works for a big celebration and easy guest flow?',
    cta: 'Find Owambe-Ready Stays',
  },
  Couple: {
    title: 'Looking for something quiet, comfortable and easy to settle into?',
    cta: 'Find Couple-Friendly Stays',
  },
  Family: {
    title: 'Need room for everyone without the usual stress?',
    cta: 'Find Family-Friendly Stays',
  },
  'Coming Home': {
    title: 'Looking for a stay that feels like a comfortable landing place?',
    cta: 'Find Homecoming Stays',
  },
  Business: {
    title: 'Need dependable, efficient accommodation for work and travel?',
    cta: 'Find Business Stays',
  },
  Getaway: {
    title: 'Want a getaway that feels restorative and easy?',
    cta: 'Find Getaway Stays',
  },
  'I just need somewhere nice': {
    title: 'Looking for a simple, good place that feels right from the start?',
    cta: 'Find a Nice Place',
  },
} as const

const researchOptions = {
  userType: ['Owner', 'Manager', 'Investor', 'Guest', 'Other'],
  cities: ['Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Other'],
}

const WhatsAppNumber = import.meta.env.VITE_WHATSAPP_NUMBER || ''

const toWhatsAppLink = (message: string) => {
  const text = encodeURIComponent(message)
  if (WhatsAppNumber) {
    return `https://wa.me/${WhatsAppNumber}?text=${text}`
  }

  return `https://wa.me/?text=${text}`
}

const trackEvent = (eventName: string, metadata: Record<string, unknown> = {}) => {
  if (typeof window === 'undefined') return

  const current = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.events) ?? '[]')
  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    event_name: eventName,
    metadata,
    timestamp: new Date().toISOString(),
  }

  current.push(entry)
  window.localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(current))
}

const initialGuestForm = {
  name: '',
  whatsapp: '',
  city: '',
  dates: '',
  guests: '2',
  budget: '',
  stayType: '',
  preferences: '',
}

const initialResearchForm = {
  userType: 'Owner',
  city: 'Lagos',
  experience: '1-2 years',
  propertyCount: '1',
  bookingBehavior: 'Direct booking + Airbnb',
  biggestProblems: '',
  existingTools: '',
  existingPlatforms: '',
  wantsBetter: '',
  mainFrustration: '',
  interview: 'Yes',
  contact: '',
}

function App() {
  const [promptIndex, setPromptIndex] = useState(0)
  const [showHeroPrompt, setShowHeroPrompt] = useState(false)
  const [stayQuery, setStayQuery] = useState('')
  const [selectedIntent, setSelectedIntent] = useState<keyof typeof intentData>('Party')
  const [selectedCity, setSelectedCity] = useState('Lagos')
  const [guestForm, setGuestForm] = useState(initialGuestForm)
  const [guestSubmitted, setGuestSubmitted] = useState(false)
  const [hostSubmitted, setHostSubmitted] = useState(false)
  const [researchSubmitted, setResearchSubmitted] = useState(false)
  const [researchForm, setResearchForm] = useState(initialResearchForm)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    problem: false,
    ecosystem: false,
    horatio: false,
    launch: false,
    validation: false,
    research: false,
    guest: false,
    hosts: false,
  })
  const [hostStep, setHostStep] = useState(0)
  const [hostForm, setHostForm] = useState({
    name: '',
    whatsapp: '',
    email: '',
    city: '',
    propertyCount: '1',
    propertyType: 'Apartment',
    area: '',
    bedrooms: '1',
    channels: 'Airbnb',
    hardestPart: 'Getting bookings',
    details: '',
    decemberAvailable: 'Yes',
    dates: '',
    nightlyPrice: '',
    propertyLink: '',
    interview: 'Yes',
  })

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPromptIndex((current) => (current + 1) % prompts.length)
    }, 2400)

    return () => window.clearInterval(timer)
  }, [])

  const selectedIntentDetails = useMemo(
    () => intentData[selectedIntent],
    [selectedIntent],
  )

  const handleGuestUpdate = (field: keyof typeof initialGuestForm, value: string) => {
    setGuestForm((current) => ({ ...current, [field]: value }))
  }

  const handleResearchUpdate = (field: keyof typeof initialResearchForm, value: string) => {
    setResearchForm((current) => ({ ...current, [field]: value }))
  }

  const handleHostUpdate = (field: string, value: string) => {
    setHostForm((current) => ({ ...current, [field]: value }))
  }

  const handleGuestSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = { ...guestForm, source: 'homepage_guest_interest' }
    if (typeof window !== 'undefined') {
      const current = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.guest) ?? '[]')
      current.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, ...payload, created_at: new Date().toISOString() })
      window.localStorage.setItem(STORAGE_KEYS.guest, JSON.stringify(current))
    }

    trackEvent('guest_interest_completed', {
      city: payload.city,
      tripType: payload.stayType,
      budget: payload.budget,
    })
    setGuestSubmitted(true)
  }

  const handleHostSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = { ...hostForm, status: 'New', created_at: new Date().toISOString() }
    if (typeof window !== 'undefined') {
      const current = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.host) ?? '[]')
      current.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, ...payload })
      window.localStorage.setItem(STORAGE_KEYS.host, JSON.stringify(current))
    }

    trackEvent('founding_host_completed', {
      city: payload.city,
      propertyCount: payload.propertyCount,
      interview: payload.interview,
    })
    setHostSubmitted(true)
  }

  const toggleSection = (section: string) => {
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }))
  }

  const handleResearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = { ...researchForm, created_at: new Date().toISOString() }
    if (typeof window !== 'undefined') {
      const current = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.research) ?? '[]')
      current.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, ...payload })
      window.localStorage.setItem(STORAGE_KEYS.research, JSON.stringify(current))
    }

    trackEvent('research_completed', {
      userType: payload.userType,
      city: payload.city,
      mainFrustration: payload.mainFrustration,
    })
    setResearchSubmitted(true)
  }

  const hostSteps = [
    {
      title: 'About you',
      fields: [
        { label: 'Full name', key: 'name', type: 'text', placeholder: 'Your full name' },
        { label: 'WhatsApp number', key: 'whatsapp', type: 'tel', placeholder: '+234...' },
        { label: 'Email', key: 'email', type: 'email', placeholder: 'you@example.com' },
        { label: 'City', key: 'city', type: 'text', placeholder: 'Lagos' },
      ],
    },
    {
      title: 'Your properties',
      fields: [
        { label: 'Number of properties', key: 'propertyCount', type: 'number', placeholder: '1' },
        { label: 'Property type', key: 'propertyType', type: 'text', placeholder: 'Apartment' },
        { label: 'Area', key: 'area', type: 'text', placeholder: 'Lekki' },
        { label: 'Number of bedrooms', key: 'bedrooms', type: 'number', placeholder: '2' },
        { label: 'Current booking channels', key: 'channels', type: 'text', placeholder: 'Airbnb, Booking.com' },
      ],
    },
    {
      title: 'Your business',
      fields: [
        { label: 'What is currently the hardest part of running your shortlet?', key: 'hardestPart', type: 'select', options: ['Getting bookings', 'Managing availability', 'Guest communication', 'Guest verification', 'Payments', 'Cleaning', 'Maintenance', 'Pricing', 'Managing multiple properties', 'Tracking income', 'Other'] },
        { label: 'Tell us more.', key: 'details', type: 'textarea', placeholder: 'Tell us what is making your shortlet business harder than it should be.' },
      ],
    },
    {
      title: 'December',
      fields: [
        { label: 'Will the property be available in December?', key: 'decemberAvailable', type: 'select', options: ['Yes', 'Maybe', 'No'] },
        { label: 'Which dates?', key: 'dates', type: 'text', placeholder: 'e.g. 10-25 Dec' },
        { label: 'Approximate nightly price', key: 'nightlyPrice', type: 'text', placeholder: '₦ 80,000' },
        { label: 'Property listing/link if available', key: 'propertyLink', type: 'url', placeholder: 'https://' },
      ],
    },
    {
      title: 'Final',
      fields: [
        { label: 'Would you be willing to have a 15-minute conversation with the HAMLET team?', key: 'interview', type: 'select', options: ['Yes', 'No'] },
      ],
    },
  ]

  const currentStep = hostSteps[hostStep]

  const submitHost = () => {
    trackEvent('founding_host_started', { step: hostStep })
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <a className="brand-link" href="/" aria-label="HAMLET home">
          <img className="brand-logo" src="/hamlet-logo.svg" alt="HAMLET: Better stays. Brighter returns." />
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          <a href="#trust">Why HAMLET</a>
          <a href="#december">Detty December</a>
          <a href="#hosts">Founding Hosts</a>
          <a href="#research">Research</a>
        </nav>

        <a
          className="btn btn-secondary small"
          href={toWhatsAppLink('Hi HAMLET, I want to talk about a shortlet stay.')}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackEvent('whatsapp_clicked', { source: 'header' })}
        >
          Talk to HAMLET
        </a>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <h1>WHERE ARE YOU STAYING?</h1>
            <p className="hero-kicker">Shortlets for every season, every reason.</p>
            <p className="lead">
              From work trips and weekend escapes to Detty December and homecomings, HAMLET is here before, during and after December.
            </p>

            <div className="cta-row">
              <a
                className="btn btn-primary"
                href="#stay-finder"
                onClick={() => trackEvent('explore_stays_clicked')}
              >
                Explore Stays
              </a>
              <a
                className="btn btn-secondary"
                href="#hosts"
                onClick={() => trackEvent('list_property_clicked')}
              >
                List Your Property
              </a>
            </div>

            <div className={`hero-prompt-reveal ${showHeroPrompt ? 'expanded' : ''}`}>
              <button
                type="button"
                className="prompt-reveal-trigger"
                aria-expanded={showHeroPrompt}
                onClick={() => setShowHeroPrompt((current) => !current)}
              >
                <span>Ask Horatio to find a stay</span>
                <span aria-hidden="true">{showHeroPrompt ? '−' : '+'}</span>
              </button>
              <div className="prompt-reveal-body">
                <div className="prompt-box" aria-label="Stay assistant">
                  <textarea
                    value={stayQuery}
                    onChange={(event) => setStayQuery(event.target.value)}
                    placeholder={prompts[promptIndex]}
                  />
                  <div className="prompt-row">
                    <div className="prompt-meta">
                      <span>{selectedCity}</span>
                      <span>•</span>
                      <span>Your dates</span>
                      <span>•</span>
                      <span>4 guests</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary compact"
                      onClick={() => trackEvent('hero_cta_clicked', { query: stayQuery || prompts[promptIndex] })}
                    >
                      Search stay
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-label="HAMLET stay preview">
            <div className="image-card large-card">
              <div className="image-surface" />
              <div className="overlay-panel">
                <p>Stay well, all year</p>
                <h3>Find a place you can trust, whenever life takes you there.</h3>
                <div className="info-row">
                  <span>Curated homes</span>
                  <span>Verified details</span>
                </div>
              </div>
            </div>
            <div className="mini-panel">
              <div>
                <strong>3 bed</strong>
                <span>Lekki Phase 1</span>
              </div>
              <div>
                <strong>₦120k</strong>
                <span>nightly</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell december-section" id="december">
          <div className="december-copy">
            <h2>DETTY DECEMBER. SORTED.</h2>
            <p>From Lagos nights and owambes to weddings, reunions and homecomings, make the stay part of the good memories.</p>
            <div className="occasion-list" aria-label="December occasions">
              <span>Lagos nights</span>
              <span>Owambe</span>
              <span>Weddings</span>
              <span>Homecoming</span>
            </div>
            <a className="btn btn-primary" href="#stay-finder">
              Find My Detty December Stay
            </a>
          </div>
          <div className="december-visual" role="img" aria-label="A warmly lit celebration table set for a December gathering">
            <span className="december-location">LAGOS · ABUJA · HOME</span>
          </div>
        </section>

        <section className="section-shell" id="stay-finder">
          <div className="section-header split-header">
            <div>
              <h2>FIND A STAY THAT FITS YOUR PLANS</h2>
            </div>
            <div className="city-picker" aria-label="Choose city">
              {['Lagos', 'Abuja', 'Ibadan'].map((city) => (
                <button
                  key={city}
                  type="button"
                  className={city === selectedCity ? 'city-pill active' : 'city-pill'}
                  onClick={() => {
                    setSelectedCity(city)
                    trackEvent('city_selected', { city })
                  }}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          <div className="intent-grid">
            {(Object.keys(intentData) as Array<keyof typeof intentData>).map((intent) => (
              <button
                key={intent}
                type="button"
                className={selectedIntent === intent ? 'intent-card selected' : 'intent-card'}
                onClick={() => {
                  setSelectedIntent(intent)
                  trackEvent('december_intent_selected', { intent })
                }}
              >
                <span>{
                  intent === 'Party' ? '🎉' :
                  intent === 'Owambe' ? '💍' :
                  intent === 'Couple' ? '❤️' :
                  intent === 'Family' ? '👨‍👩‍👧' :
                  intent === 'Coming Home' ? '✈️' :
                  intent === 'Business' ? '💼' :
                  intent === 'Getaway' ? '🌴' : '😂'
                }</span>
                <strong>{intent}</strong>
              </button>
            ))}
          </div>

          <div className="finder-panel">
            <div>
              <h3>{selectedIntentDetails.title}</h3>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => trackEvent('december_finder_started', { intent: selectedIntent, city: selectedCity })}
            >
              {selectedIntentDetails.cta}
            </button>
          </div>
        </section>

        <section className="section-shell trust-section" id="trust">
          <div className="section-header center-header">
            <h2>SHORTLETS, WITH ACCOUNTABILITY.</h2>
          </div>

          <div className="trust-grid">
            <article className="info-card dark-card">
              <h3>VERIFIED WHERE IT MATTERS</h3>
              <p>We work to ensure the information that matters is reliable.</p>
            </article>
            <article className="info-card light-card">
              <h3>PRIVATE WHERE IT SHOULD BE</h3>
              <p>Guests shouldn't have to expose sensitive personal information just to book a stay.</p>
            </article>
            <article className="info-card dark-card">
              <h3>ACCOUNTABLE WHEN IT COUNTS</h3>
              <p>When something goes wrong, there should be a responsible platform and a traceable transaction.</p>
            </article>
          </div>
        </section>

        <div className={`collapsible-shell ${expandedSections.problem ? 'expanded' : ''}`}>
          <button type="button" className="collapsible-trigger" onClick={() => toggleSection('problem')} aria-expanded={expandedSections.problem}>
            <strong>THE PROBLEM WITH THE WAY THINGS WORK TODAY</strong>
          </button>

          <div className="collapsible-body">
            <section className="section-shell problem-section">
              <div className="problem-stack">
                <div className="problem-box">“Is it actually available?”</div>
                <div className="problem-box">“Is the price still the same?”</div>
                <div className="problem-box">“Who am I sending this money to?”</div>
                <div className="problem-box">“What happens if something goes wrong?”</div>
                <div className="problem-box">“Who handles the guest?”</div>
                <div className="problem-box">“Who handles the property?”</div>
              </div>

              <div className="solution-banner">
                <h3>HAMLET IS BUILDING THE ANSWER.</h3>
              </div>
            </section>
          </div>
        </div>

        <div className={`collapsible-shell ${expandedSections.ecosystem ? 'expanded' : ''}`}>
          <button type="button" className="collapsible-trigger" onClick={() => toggleSection('ecosystem')} aria-expanded={expandedSections.ecosystem}>
            <strong>THE HAMLET ECOSYSTEM</strong>
          </button>

          <div className="collapsible-body">
            <section className="section-shell ecosystem-section">
              <div className="ecosystem-grid">
                <article className="actor-card">
                  <div className="actor-icon">G</div>
                  <h3>GUEST</h3>
                  <p>Finds → compares → books → stays → reviews</p>
                </article>
                <article className="actor-card">
                  <div className="actor-icon">O</div>
                  <h3>OWNER</h3>
                  <p>Lists → manages → receives bookings → earns</p>
                </article>
                <article className="actor-card">
                  <div className="actor-icon">H</div>
                  <h3>HAMLET</h3>
                  <p>Verifies → facilitates → protects → learns</p>
                </article>
              </div>
            </section>
          </div>
        </div>

        <div className={`collapsible-shell ${expandedSections.horatio ? 'expanded' : ''}`}>
          <button type="button" className="collapsible-trigger" onClick={() => toggleSection('horatio')} aria-expanded={expandedSections.horatio}>
            <strong>MEET HORATIO.</strong>
          </button>

          <div className="collapsible-body">
            <section className="section-shell horatio-section">
              <div className="horatio-grid">
                <div>
                  <p className="lead-small">
                    Your intelligent companion for finding and running shortlets.
                  </p>
                  <ul className="check-list">
                    <li>Tell Horatio what you&apos;re looking for.</li>
                    <li>Or let Horatio help turn your property information into a better listing.</li>
                  </ul>
                </div>
                <div className="horatio-panel">
                  <div className="chat-bubble guest-bubble">
                    “I need a three-bedroom in Lekki for four friends.”
                  </div>
                  <div className="chat-bubble owner-bubble">
                    “Here&apos;s the information for my apartment. Turn it into a listing.”
                  </div>
                  <p className="footnote">
                    Horatio only works with known information and asks when details are missing.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className={`collapsible-shell ${expandedSections.launch ? 'expanded' : ''}`}>
          <button type="button" className="collapsible-trigger" onClick={() => toggleSection('launch')} aria-expanded={expandedSections.launch}>
            <strong>READY FOR THE FIRST WAVE.</strong>
          </button>

          <div className="collapsible-body">
            <section className="section-shell launch-assets-section">
              <div className="launch-assets-grid">
                <div className="launch-copy">
                  <article className="asset-card">
                    <span className="asset-kicker">Homepage</span>
                    <h3>Premium brand front door</h3>
                    <p>Clear value proposition, founder honesty, and trust-first messaging for Nigeria's shortlet market.</p>
                  </article>

                  <article className="asset-card">
                    <span className="asset-kicker">Lead capture</span>
                    <h3>Supply + demand in one funnel</h3>
                    <p>Founding host applications and guest early-access flows capture signal before the broader platform is live.</p>
                  </article>

                  <article className="asset-card">
                    <span className="asset-kicker">Market learning</span>
                    <h3>Research that shapes the roadmap</h3>
                    <p>Every answer tells us where trust breaks down, what owners need, and what guests actually care about.</p>
                  </article>
                </div>

                <div className="device-frame" aria-label="HAMLET product screenshot mockup">
                  <div className="device-header">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>

                  <div className="device-screen">
                    <div className="screen-topbar">
                      <span>HAMLET</span>
                      <span>Founding phase</span>
                    </div>

                    <div className="screen-hero">
                      <strong>WHERE ARE YOU STAYING?</strong>
                      <p>Find a place you can trust.</p>
                    </div>

                    <div className="screen-actions">
                      <span>Explore Stays</span>
                      <span>List Your Property</span>
                    </div>

                    <div className="screen-card">
                      <div>
                        <small>Stays, all year</small>
                        <strong>Quiet stays. Real accountability.</strong>
                      </div>
                    </div>

                    <div className="screen-grid">
                      <div />
                      <div />
                      <div />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className={`collapsible-shell ${expandedSections.validation ? 'expanded' : ''}`}>
          <button type="button" className="collapsible-trigger" onClick={() => toggleSection('validation')} aria-expanded={expandedSections.validation}>
            <strong>HELP US BUILD IT RIGHT.</strong>
          </button>

          <div className="collapsible-body">
            <section className="section-shell validation-section">
              <div className="validation-grid">
                <article className="mini-card">
                  <h3>I OWN A SHORTLET</h3>
                  <p>Tell us how you operate.</p>
                </article>
                <article className="mini-card">
                  <h3>I MANAGE SHORTLETS</h3>
                  <p>Tell us what happens behind the scenes.</p>
                </article>
                <article className="mini-card">
                  <h3>I BOOK SHORTLETS</h3>
                  <p>Tell us what makes you trust a stay.</p>
                </article>
              </div>
            </section>
          </div>
        </div>

        <div className={`collapsible-shell ${expandedSections.research ? 'expanded' : ''}`}>
          <button type="button" className="collapsible-trigger" onClick={() => toggleSection('research')} aria-expanded={expandedSections.research}>
            <strong>HELP US BUILD HAMLET AROUND REAL BUSINESS REALITY.</strong>
          </button>

          <div className="collapsible-body">
            <section className="section-shell research-section" id="research">
              <div className="research-layout">
                <div className="research-copy">
                  <p>
                    We&apos;re building HAMLET for the people who actually live and work in the shortlet industry.
                  </p>
                  <p>
                    If you own, manage, invest in, or regularly book shortlets in Nigeria, we&apos;d like to hear from you.
                  </p>
                </div>

                <form className="research-form" onSubmit={handleResearchSubmit}>
                  {researchSubmitted ? (
                    <div className="success-box">
                      <h3>THANK YOU FOR HELPING US BUILD IT RIGHT.</h3>
                      <p>Your answers will directly influence what HAMLET builds next.</p>
                    </div>
                  ) : (
                    <>
                      <div className="form-grid">
                        <label className="field">
                          <span>User type</span>
                          <select value={researchForm.userType} onChange={(event) => handleResearchUpdate('userType', event.target.value)}>
                            {researchOptions.userType.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>

                        <label className="field">
                          <span>City</span>
                          <select value={researchForm.city} onChange={(event) => handleResearchUpdate('city', event.target.value)}>
                            {researchOptions.cities.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>

                        <label className="field">
                          <span>Experience</span>
                          <input value={researchForm.experience} onChange={(event) => handleResearchUpdate('experience', event.target.value)} placeholder="1-2 years" />
                        </label>

                        <label className="field">
                          <span>Number of properties</span>
                          <input value={researchForm.propertyCount} onChange={(event) => handleResearchUpdate('propertyCount', event.target.value)} placeholder="1" />
                        </label>

                        <label className="field full-width">
                          <span>Booking behaviour</span>
                          <input value={researchForm.bookingBehavior} onChange={(event) => handleResearchUpdate('bookingBehavior', event.target.value)} placeholder="Direct booking + Airbnb" />
                        </label>

                        <label className="field full-width">
                          <span>Biggest problems</span>
                          <textarea value={researchForm.biggestProblems} onChange={(event) => handleResearchUpdate('biggestProblems', event.target.value)} placeholder="What is causing friction in your shortlet business?" />
                        </label>

                        <label className="field full-width">
                          <span>Existing tools</span>
                          <input value={researchForm.existingTools} onChange={(event) => handleResearchUpdate('existingTools', event.target.value)} placeholder="What tools or systems do you use today?" />
                        </label>

                        <label className="field full-width">
                          <span>Existing platforms</span>
                          <input value={researchForm.existingPlatforms} onChange={(event) => handleResearchUpdate('existingPlatforms', event.target.value)} placeholder="Airbnb, booking apps, spreadsheets, WhatsApp..." />
                        </label>

                        <label className="field full-width">
                          <span>What they wish worked better</span>
                          <textarea value={researchForm.wantsBetter} onChange={(event) => handleResearchUpdate('wantsBetter', event.target.value)} placeholder="What would make the experience easier or more trustworthy?" />
                        </label>

                        <label className="field full-width">
                          <span>Biggest frustration</span>
                          <textarea value={researchForm.mainFrustration} onChange={(event) => handleResearchUpdate('mainFrustration', event.target.value)} placeholder="What drives you mad about the current setup?" />
                        </label>

                        <label className="field full-width">
                          <span>What&apos;s the one thing you wish someone would fix about the shortlet business?</span>
                          <textarea value={researchForm.mainFrustration} onChange={(event) => handleResearchUpdate('mainFrustration', event.target.value)} placeholder="The one thing that matters most..." />
                        </label>

                        <label className="field">
                          <span>Willingness to participate in a 15-minute interview</span>
                          <select value={researchForm.interview} onChange={(event) => handleResearchUpdate('interview', event.target.value)}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </label>

                        <label className="field">
                          <span>WhatsApp / email</span>
                          <input value={researchForm.contact} onChange={(event) => handleResearchUpdate('contact', event.target.value)} placeholder="+234... or email" />
                        </label>
                      </div>

                      <button type="submit" className="btn btn-primary submit-btn" onClick={() => trackEvent('research_started')}>
                        Share your perspective
                      </button>
                    </>
                  )}
                </form>
              </div>
            </section>
          </div>
        </div>

        <div className={`collapsible-shell ${expandedSections.guest ? 'expanded' : ''}`}>
          <button type="button" className="collapsible-trigger" onClick={() => toggleSection('guest')} aria-expanded={expandedSections.guest}>
            <strong>LOOKING FOR A SHORTLET STAY?</strong>
          </button>

          <div className="collapsible-body">
            <section className="section-shell guest-section">
              <div className="guest-layout">
                <div className="guest-copy">
                  <p>Tell us where you&apos;re going and what you&apos;re looking for.</p>
                </div>

                <form className="guest-form" onSubmit={handleGuestSubmit}>
                  {guestSubmitted ? (
                    <div className="success-box">
                      <h3>YOU&apos;RE ON THE LIST.</h3>
                      <p>We&apos;ll use what you&apos;ve told us to help match you with suitable HAMLET stays as they become available.</p>
                    </div>
                  ) : (
                    <>
                      <div className="form-grid">
                        <label className="field">
                          <span>Name</span>
                          <input value={guestForm.name} onChange={(event) => handleGuestUpdate('name', event.target.value)} placeholder="Your name" />
                        </label>

                        <label className="field">
                          <span>WhatsApp</span>
                          <input value={guestForm.whatsapp} onChange={(event) => handleGuestUpdate('whatsapp', event.target.value)} placeholder="+234..." />
                        </label>

                        <label className="field">
                          <span>City</span>
                          <input value={guestForm.city} onChange={(event) => handleGuestUpdate('city', event.target.value)} placeholder="Lagos" />
                        </label>

                        <label className="field">
                          <span>Dates</span>
                          <input value={guestForm.dates} onChange={(event) => handleGuestUpdate('dates', event.target.value)} placeholder="12-18 Dec" />
                        </label>

                        <label className="field">
                          <span>Guests</span>
                          <input value={guestForm.guests} onChange={(event) => handleGuestUpdate('guests', event.target.value)} placeholder="2" />
                        </label>

                        <label className="field">
                          <span>Budget</span>
                          <input value={guestForm.budget} onChange={(event) => handleGuestUpdate('budget', event.target.value)} placeholder="₦120,000" />
                        </label>

                        <label className="field">
                          <span>Stay type</span>
                          <input value={guestForm.stayType} onChange={(event) => handleGuestUpdate('stayType', event.target.value)} placeholder="Couple / Family / Business" />
                        </label>

                        <label className="field full-width">
                          <span>Preferences</span>
                          <textarea value={guestForm.preferences} onChange={(event) => handleGuestUpdate('preferences', event.target.value)} placeholder="Quiet, close to the airport, pool, parking, family-friendly..." />
                        </label>
                      </div>

                      <button type="submit" className="btn btn-primary submit-btn" onClick={() => trackEvent('guest_interest_started')}>
                        Help Me Find a Stay
                      </button>
                    </>
                  )}
                </form>
              </div>
            </section>
          </div>
        </div>

        <div className={`collapsible-shell ${expandedSections.hosts ? 'expanded' : ''}`}>
          <button type="button" className="collapsible-trigger" onClick={() => toggleSection('hosts')} aria-expanded={expandedSections.hosts}>
            <strong>OWN OR MANAGE A SHORTLET?</strong>
          </button>

          <div className="collapsible-body">
            <section className="section-shell hosts-section" id="hosts">
              <div className="hosts-copy">
                <p>
                  HAMLET is building a better way for Nigerian shortlet owners to list, manage and grow their properties.
                </p>
                <p className="strong-line">Become one of our Founding Hosts.</p>
                <ul className="benefits-list">
                  <li>Early access</li>
                  <li>Priority onboarding</li>
                  <li>Founding Host recognition</li>
                  <li>Launch visibility</li>
                  <li>Early product access</li>
                  <li>Potential founding-period commercial incentives</li>
                </ul>
              </div>

              <form className="host-form" onSubmit={handleHostSubmit}>
                {hostSubmitted ? (
                  <div className="success-box large-success">
                    <h3>YOU&apos;RE IN THE FOUNDING CIRCLE.</h3>
                    <p>We&apos;ll be in touch to learn about your property and help you get ready for HAMLET.</p>
                  </div>
                ) : (
                  <>
                    <div className="stepper" aria-label="Founding host steps">
                      {hostSteps.map((step, index) => (
                        <button
                          key={step.title}
                          type="button"
                          className={hostStep === index ? 'step-badge active' : 'step-badge'}
                          onClick={() => setHostStep(index)}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>

                    <h3 className="step-title">{currentStep.title}</h3>

                    <div className="form-grid">
                      {currentStep.fields.map((field) => (
                        <label key={field.key} className={field.type === 'textarea' || field.key === 'details' ? 'field full-width' : 'field'}>
                          <span>{field.label}</span>
                          {field.type === 'textarea' ? (
                            <textarea
                              value={hostForm[field.key as keyof typeof hostForm] as string}
                              onChange={(event) => handleHostUpdate(field.key, event.target.value)}
                              placeholder={field.placeholder}
                            />
                          ) : field.type === 'select' ? (
                            <select
                              value={hostForm[field.key as keyof typeof hostForm] as string}
                              onChange={(event) => handleHostUpdate(field.key, event.target.value)}
                            >
                              {field.options?.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type}
                              value={hostForm[field.key as keyof typeof hostForm] as string}
                              onChange={(event) => handleHostUpdate(field.key, event.target.value)}
                              placeholder={field.placeholder}
                            />
                          )}
                        </label>
                      ))}
                    </div>

                    <div className="host-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={hostStep === 0}
                        onClick={() => setHostStep((current) => Math.max(0, current - 1))}
                      >
                        Back
                      </button>

                      {hostStep < hostSteps.length - 1 ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            trackEvent('founding_host_started', { step: hostStep + 1 })
                            setHostStep((current) => Math.min(hostSteps.length - 1, current + 1))
                          }}
                        >
                          Next
                        </button>
                      ) : (
                        <button type="submit" className="btn btn-primary" onClick={submitHost}>
                          Become a Founding Host
                        </button>
                      )}
                    </div>
                  </>
                )}
              </form>
            </section>
          </div>
        </div>

        <section className="section-shell final-cta-section">
          <div className="final-cta-box">
            <h2>THE NEXT GREAT STAY STARTS WITH KNOWING WHERE YOU&apos;RE GOING.</h2>
            <div className="cta-row center-row">
              <a className="btn btn-primary" href="#stay-finder">Find a Stay</a>
              <a className="btn btn-secondary" href="#hosts">List Your Property</a>
              <a className="btn btn-secondary" href="#research">Help Us Build HAMLET</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand-link" href="/" aria-label="HAMLET home">
          <img className="brand-logo" src="/hamlet-logo.svg" alt="HAMLET: Better stays. Brighter returns." />
        </a>
        <div className="footer-links">
          <a href="#trust">Why HAMLET</a>
          <a href="#december">Detty December</a>
          <a href="#hosts">Founding Hosts</a>
          <a href={toWhatsAppLink('Hi HAMLET, I want to learn more.')}>WhatsApp</a>
        </div>
      </footer>
    </div>
  )
}

export default App
