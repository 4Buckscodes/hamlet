import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabaseClient'
import './AgentPortal.css'

type AgentProfile = {
  role: 'agent' | 'owner' | 'admin'
  display_name: string
  agent_status: 'pending' | 'active' | 'rejected'
  city: string
}

type Listing = {
  id: string
  submitted_by: string
  owner_id: string | null
  title: string
  city: string
  area: string
  property_type: string
  bedrooms: number
  listing_url: string
  listing_status: string
  correction_request: string | null
  nightly_rate: number
}

type Offer = {
  id: string
  property_id: string
  offer_kind: 'agent_payout' | 'owner_net_rate'
  status: string
  current_version_id: string
  property: { title: string; city: string }
  versions: Array<{ id: string; version: number; amount: number; currency: string }>
}

type Earning = {
  booking_id: string
  guest_reference: string
  check_in: string
  check_out: string
  accommodation_total: number
  booking_state: string
  commercial_term_kind: 'agent_payout' | 'owner_net_rate' | null
  commercial_term_amount: number | null
  settlement_state: string
}

type AgentDirectoryEntry = { agent_id: string; display_name: string; city: string }
type ReviewApplication = { id: string; display_name: string; city: string; experience: string; agent_status: 'pending' | 'active' | 'rejected' }
type AgentNotification = {
  id: string
  event_type: string
  message: string
  read_at: string | null
  created_at: string
}

type Dashboard = {
  profile: AgentProfile | null
  listings: Listing[]
  offers: Offer[]
  earnings: Earning[]
  notifications: AgentNotification[]
  agents: AgentDirectoryEntry[]
  applications: ReviewApplication[]
}

const emptyDashboard: Dashboard = {
  profile: null,
  listings: [],
  offers: [],
  earnings: [],
  notifications: [],
  agents: [],
  applications: [],
}

const formatNaira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`

const developmentSnapshot = {
  listing: 'DEVELOPMENT SAMPLE · Lekki serviced apartment · Correction requested',
  offer: 'DEVELOPMENT SAMPLE · Fixed agent payout · NGN 45,000 · Terms v2',
  booking: 'DEVELOPMENT SAMPLE · BK-DEV-003 · Booking requested · Settlement not integrated',
  notification: 'DEVELOPMENT SAMPLE · Owner requested an updated property walkthrough.',
}

export default function AgentPortal() {
  const [session, setSession] = useState<Session | null>(null)
  const [dashboard, setDashboard] = useState<Dashboard>(emptyDashboard)
  const [loading, setLoading] = useState(Boolean(isSupabaseConfigured))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'sign_in' | 'register'>('register')
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    displayName: '',
    phone: '',
    city: 'Lagos',
    experience: '',
  })
  const [propertyForm, setPropertyForm] = useState({
    title: '', city: 'Lagos', area: '', propertyType: 'Apartment', bedrooms: '1', nightlyRate: '', listingUrl: '',
  })
  const [correctionId, setCorrectionId] = useState<string | null>(null)
  const [correctionForm, setCorrectionForm] = useState({ title: '', city: '', area: '', propertyType: '', bedrooms: '', nightlyRate: '', listingUrl: '' })

  const loadDashboard = useCallback(async (userId: string) => {
    if (!supabase) return

    const [profileResult, listingsResult, offersResult, earningsResult, notificationsResult] = await Promise.all([
      supabase.from('profiles').select('role, display_name, agent_status, city, experience').eq('id', userId).single(),
      supabase.from('properties').select('id, submitted_by, owner_id, title, city, area, property_type, bedrooms, listing_url, listing_status, correction_request, nightly_rate').order('updated_at', { ascending: false }),
      supabase.from('agent_offers').select('id, property_id, offer_kind, status, current_version_id, property:properties(title, city)').order('created_at', { ascending: false }),
      supabase.from('agent_earnings_view').select('*').order('check_in', { ascending: false }),
      supabase.from('agent_notifications').select('id, event_type, message, read_at, created_at').order('created_at', { ascending: false }).limit(30),
    ])

    const firstError = profileResult.error ?? listingsResult.error ?? offersResult.error ?? earningsResult.error ?? notificationsResult.error
    if (firstError) throw firstError

    const rawOffers = offersResult.data ?? []
    const offerIds = rawOffers.map((offer) => offer.id)
    const versionsResult = offerIds.length
      ? await supabase.from('agent_offer_versions').select('id, offer_id, version, amount, currency').in('offer_id', offerIds)
      : { data: [], error: null }
    if (versionsResult.error) throw versionsResult.error
    const versionsByOffer = new Map<string, Offer['versions']>()
    for (const version of versionsResult.data ?? []) {
      versionsByOffer.set(version.offer_id, [...(versionsByOffer.get(version.offer_id) ?? []), version])
    }

    setDashboard({
      profile: profileResult.data as AgentProfile,
      listings: (listingsResult.data ?? []) as Listing[],
      offers: rawOffers.map((offer) => ({ ...offer, versions: versionsByOffer.get(offer.id) ?? [] })) as unknown as Offer[],
      earnings: (earningsResult.data ?? []) as Earning[],
      notifications: (notificationsResult.data ?? []) as AgentNotification[],
      agents: [],
      applications: [],
    })
    if (profileResult.data?.role === 'admin') {
      const { data: applicationData, error: applicationError } = await supabase.from('profiles').select('id, display_name, city, experience, agent_status').eq('role', 'agent').eq('agent_status', 'pending')
      if (applicationError) throw applicationError
      setDashboard((current) => ({ ...current, applications: (applicationData ?? []) as ReviewApplication[] }))
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    let alive = true
    void supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!alive) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      if (data.session?.user.id) {
        try {
          await loadDashboard(data.session.user.id)
        } catch (loadError) {
          if (alive) setError(loadError instanceof Error ? loadError.message : 'Unable to load the agent workspace.')
        }
      }
      if (alive) setLoading(false)
    })

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) {
        setDashboard(emptyDashboard)
        setLoading(false)
      }
    })

    return () => {
      alive = false
      authSubscription.subscription.unsubscribe()
    }
  }, [loadDashboard])

  const refresh = async () => {
    if (!session?.user.id) return
    await loadDashboard(session.user.id)
  }

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'register') {
        const { data, error: signupError } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: {
            data: {
              display_name: authForm.displayName,
              phone: authForm.phone,
              city: authForm.city,
              experience: authForm.experience,
              service_areas: [authForm.city],
            },
          },
        })
        if (signupError) throw signupError
        if (data.session?.user.id) await loadDashboard(data.session.user.id)
        else setMessage('Registration received. Verify your email, then sign in to continue onboarding.')
      } else {
        const { data, error: signinError } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password })
        if (signinError) throw signinError
        if (data.user?.id) await loadDashboard(data.user.id)
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to authenticate.')
    } finally {
      setBusy(false)
    }
  }

  const handlePropertySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !session?.user.id) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { data, error: insertError } = await supabase.from('properties').insert({
        submitted_by: session.user.id,
        title: propertyForm.title,
        city: propertyForm.city,
        area: propertyForm.area,
        property_type: propertyForm.propertyType,
        bedrooms: Number(propertyForm.bedrooms),
        nightly_rate: Number(propertyForm.nightlyRate),
        listing_url: propertyForm.listingUrl,
        listing_status: 'draft',
      }).select('id').single()
      if (insertError) throw insertError

      const { error: submitError } = await supabase.from('properties').update({ listing_status: 'submitted' }).eq('id', data.id)
      if (submitError) throw submitError
      setMessage('Property submitted for review.')
      setPropertyForm({ title: '', city: 'Lagos', area: '', propertyType: 'Apartment', bedrooms: '1', nightlyRate: '', listingUrl: '' })
      await refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit property.')
    } finally {
      setBusy(false)
    }
  }

  const acceptOffer = async (offer: Offer) => {
    if (!supabase) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { error: acceptError } = await supabase.rpc('accept_agent_offer', {
        p_offer_id: offer.id,
        p_version_id: offer.current_version_id,
      })
      if (acceptError) throw acceptError
      setMessage('Offer accepted at the displayed terms version.')
      await refresh()
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : 'Unable to accept this offer.')
    } finally {
      setBusy(false)
    }
  }

  const beginCorrection = (listing: Listing) => {
    setCorrectionId(listing.id)
    setCorrectionForm({
      title: listing.title,
      city: listing.city,
      area: listing.area,
      propertyType: listing.property_type,
      bedrooms: String(listing.bedrooms),
      nightlyRate: String(listing.nightly_rate),
      listingUrl: listing.listing_url,
    })
  }

  const resubmitCorrection = async (event: FormEvent<HTMLFormElement>, listingId: string) => {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { error: resubmitError } = await supabase.rpc('resubmit_corrected_listing', {
        p_property_id: listingId,
        p_title: correctionForm.title,
        p_city: correctionForm.city,
        p_area: correctionForm.area,
        p_property_type: correctionForm.propertyType,
        p_bedrooms: Number(correctionForm.bedrooms),
        p_nightly_rate: Number(correctionForm.nightlyRate),
        p_listing_url: correctionForm.listingUrl,
      })
      if (resubmitError) throw resubmitError
      setCorrectionId(null)
      setMessage('Corrected listing resubmitted for review.')
      await refresh()
    } catch (resubmitError) {
      setError(resubmitError instanceof Error ? resubmitError.message : 'Unable to resubmit corrections.')
    } finally {
      setBusy(false)
    }
  }

  const markNotificationRead = async (notificationId: string) => {
    if (!supabase) return
    const { error: updateError } = await supabase.rpc('mark_agent_notification_read', { p_notification_id: notificationId })
    if (updateError) setError(updateError.message)
    else await refresh()
  }

  const handleSignOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setMessage('Signed out.')
  }

  const requestCorrection = async (propertyId: string, correction: string) => {
    if (!supabase) return
    const { error: correctionError } = await supabase.rpc('request_listing_correction', { p_property_id: propertyId, p_message: correction })
    if (correctionError) setError(correctionError.message)
    else { setMessage('Correction request sent to the listing agent.'); await refresh() }
  }

  const reviewListing = async (propertyId: string, status: 'approved' | 'rejected') => {
    if (!supabase) return
    const { error: reviewError } = await supabase.rpc('review_agent_listing', { p_property_id: propertyId, p_status: status })
    if (reviewError) setError(reviewError.message)
    else { setMessage(`Listing ${status}.`); await refresh() }
  }

  const reviewApplication = async (agentId: string, status: 'active' | 'rejected') => {
    if (!supabase) return
    const { error: reviewError } = await supabase.rpc('review_agent_application', { p_agent_id: agentId, p_status: status })
    if (reviewError) setError(reviewError.message)
    else { setMessage(`Agent application ${status}.`); await refresh() }
  }

  const loadAgentsForProperty = async (propertyId: string) => {
    if (!supabase) return
    const { data, error: agentsError } = await supabase.rpc('list_property_agents', { p_property_id: propertyId })
    if (agentsError) setError(agentsError.message)
    else setDashboard((current) => ({ ...current, agents: (data ?? []) as AgentDirectoryEntry[] }))
  }

  const assignAgent = async (propertyId: string, agentId: string) => {
    if (!supabase) return
    const { error: assignError } = await supabase.rpc('assign_property_agent', { p_property_id: propertyId, p_agent_id: agentId })
    if (assignError) setError(assignError.message)
    else { setMessage('Agent assignment recorded.'); await refresh() }
  }

  const submitOffer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    const offerForm = event.currentTarget
    const values = new FormData(offerForm)
    const { error: offerError } = await supabase.rpc('publish_agent_offer', {
      p_property_id: String(values.get('property_id')),
      p_agent_id: String(values.get('agent_id')),
      p_offer_kind: String(values.get('offer_kind')),
      p_amount: Number(values.get('amount')),
    })
    if (offerError) setError(offerError.message)
    else { setMessage('Commercial offer published with version 1 terms.'); offerForm.reset(); await refresh() }
  }

  const reviseOffer = async (offerId: string) => {
    if (!supabase) return
    const rawAmount = window.prompt('Enter the revised NGN amount. A new immutable version will be created.')
    if (rawAmount === null) return
    const amount = Number(rawAmount)
    if (!Number.isSafeInteger(amount) || amount < 0) { setError('Enter a valid whole-naira amount.'); return }
    const { error: reviseError } = await supabase.rpc('revise_agent_offer', { p_offer_id: offerId, p_amount: amount })
    if (reviseError) setError(reviseError.message)
    else { setMessage('New commercial terms version created.'); await refresh() }
  }

  return (
    <section className="agent-portal" id="agent-workspace">
      <div className="agent-portal-heading">
        <div>
          <p className="agent-eyebrow">HAMLET OPERATIONS</p>
          <h2>Agent workspace</h2>
          <p>Listings, authorised assignments, deal terms, and booking visibility in one place.</p>
        </div>
        <a className="agent-text-link" href="#hosts">Founding host information</a>
      </div>

      {!isSupabaseConfigured && import.meta.env.DEV ? (
        <div className="agent-demo-layout">
          <div className="agent-demo-banner" role="status">
            <strong>DEVELOPMENT PREVIEW</strong>
            <span>Sample records only. Supabase is not configured, so sign-in, writes, offer acceptance, and permissions are disabled.</span>
          </div>
          <div className="agent-workspace-grid">
            <article className="agent-panel">
              <h3>Registration and onboarding</h3>
              <p>Connect a Supabase project to register an agent, capture service area and experience, and submit the application for review.</p>
              <label className="agent-field"><span>Email</span><input disabled placeholder="agent@example.com" /></label>
              <button className="agent-primary" type="button" disabled>Supabase not configured</button>
            </article>
            <article className="agent-panel">
              <h3>My listings</h3>
              <p>{developmentSnapshot.listing}</p>
              <span className="agent-status correction_requested">Correction requested</span>
              <p>Sample correction: add a current property walkthrough link.</p>
            </article>
            <article className="agent-panel">
              <h3>Agent Deal Board</h3>
              <p>{developmentSnapshot.offer}</p>
              <button className="agent-secondary" type="button" disabled>Accept disabled in preview</button>
            </article>
            <article className="agent-panel">
              <h3>Bookings and earnings visibility</h3>
              <p>{developmentSnapshot.booking}</p>
              <p>Agreed payout: sample only. No funds have moved; settlement integration is not connected.</p>
            </article>
            <article className="agent-panel">
              <h3>Agent notification centre</h3>
              <p>{developmentSnapshot.notification}</p>
              <p>Development sample notifications are not delivered or saved.</p>
            </article>
          </div>
          <p className="agent-setup-note">To enable protected workflows, configure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then apply the migration in <code>supabase/migrations</code>.</p>
        </div>
      ) : !isSupabaseConfigured ? (
        <div className="agent-alert info">Agent sign-in is unavailable because the server connection is not configured.</div>
      ) : loading ? (
        <div className="agent-panel" role="status">Loading agent workspace…</div>
      ) : !session ? (
        <div className="agent-auth-layout">
          <aside className="agent-auth-intro">
            <span className="agent-status development">Applications reviewed by HAMLET</span>
            <h3>Build a trusted local property network.</h3>
            <p>Agent accounts begin pending. Assignments and commercial offers appear only after the account is approved and a property is authorised for you.</p>
          </aside>
          <form className="agent-panel agent-auth-form" onSubmit={handleAuth}>
            <div className="agent-mode-switch" role="group" aria-label="Agent account action">
              <button type="button" className={mode === 'register' ? 'selected' : ''} onClick={() => setMode('register')}>Register</button>
              <button type="button" className={mode === 'sign_in' ? 'selected' : ''} onClick={() => setMode('sign_in')}>Sign in</button>
            </div>
            <h3>{mode === 'register' ? 'Agent registration' : 'Agent sign in'}</h3>
            {mode === 'register' && <>
              <label className="agent-field"><span>Full name</span><input required autoComplete="name" value={authForm.displayName} onChange={(event) => setAuthForm({ ...authForm, displayName: event.target.value })} /></label>
              <label className="agent-field"><span>Phone</span><input required autoComplete="tel" value={authForm.phone} onChange={(event) => setAuthForm({ ...authForm, phone: event.target.value })} /></label>
              <label className="agent-field"><span>Primary city</span><select value={authForm.city} onChange={(event) => setAuthForm({ ...authForm, city: event.target.value })}><option>Lagos</option><option>Abuja</option><option>Ibadan</option></select></label>
              <label className="agent-field"><span>Shortlet experience</span><input required placeholder="e.g. 2 years" value={authForm.experience} onChange={(event) => setAuthForm({ ...authForm, experience: event.target.value })} /></label>
            </>}
            <label className="agent-field"><span>Email</span><input required type="email" autoComplete="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} /></label>
            <label className="agent-field"><span>Password</span><input required type="password" minLength={8} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} /></label>
            {error && <p className="agent-alert error">{error}</p>}
            {message && <p className="agent-alert success">{message}</p>}
            <button className="agent-primary" type="submit" disabled={busy}>{busy ? 'Working…' : mode === 'register' ? 'Submit agent application' : 'Sign in'}</button>
          </form>
        </div>
      ) : (
        <div className="agent-authenticated">
          <div className="agent-session-bar">
            <div><strong>{dashboard.profile?.display_name || session.user.email}</strong><span>{session.user.email}</span></div>
            <div className="agent-session-actions"><span className={`agent-status ${dashboard.profile?.role === 'agent' ? dashboard.profile.agent_status : 'active'}`}>{dashboard.profile?.role === 'agent' ? `${dashboard.profile.agent_status} agent` : dashboard.profile?.role}</span><button className="agent-secondary" type="button" onClick={handleSignOut}>Sign out</button></div>
          </div>
          {dashboard.profile?.role === 'agent' && dashboard.profile.agent_status !== 'active' && <div className="agent-alert info">Your application is {dashboard.profile.agent_status}. Property submission, offer acceptance, and assigned workflows become available after HAMLET approval.</div>}
          {error && <p className="agent-alert error">{error}</p>}
          {message && <p className="agent-alert success">{message}</p>}

          <div className="agent-workspace-grid">
            {dashboard.profile?.role === 'admin' && <section className="agent-panel agent-wide-panel">
              <h3>Agent applications review</h3>
              <p>Admin-only approvals are enforced by the review RPC, not by this interface.</p>
              {dashboard.applications.length === 0 ? <p className="agent-empty">No pending applications.</p> : <div className="agent-record-list">{dashboard.applications.map((application) => <article className="agent-record agent-record-title" key={application.id}><div><strong>{application.display_name}</strong><span>{application.city} · {application.experience}</span></div><div className="agent-session-actions"><button className="agent-primary" type="button" onClick={() => void reviewApplication(application.id, 'active')}>Approve</button><button className="agent-secondary" type="button" onClick={() => void reviewApplication(application.id, 'rejected')}>Reject</button></div></article>)}</div>}
            </section>}

            {dashboard.profile?.role === 'agent' && <form className="agent-panel" onSubmit={handlePropertySubmit}>
              <h3>Submit a property</h3>
              <p>New listings enter review. Only the submitting agent and authorised assignees can access them.</p>
              <label className="agent-field"><span>Property title</span><input required disabled={dashboard.profile?.agent_status !== 'active'} value={propertyForm.title} onChange={(event) => setPropertyForm({ ...propertyForm, title: event.target.value })} /></label>
              <div className="agent-fields-row">
                <label className="agent-field"><span>City</span><select disabled={dashboard.profile?.agent_status !== 'active'} value={propertyForm.city} onChange={(event) => setPropertyForm({ ...propertyForm, city: event.target.value })}><option>Lagos</option><option>Abuja</option><option>Ibadan</option></select></label>
                <label className="agent-field"><span>Area</span><input required disabled={dashboard.profile?.agent_status !== 'active'} value={propertyForm.area} onChange={(event) => setPropertyForm({ ...propertyForm, area: event.target.value })} /></label>
              </div>
              <div className="agent-fields-row">
                <label className="agent-field"><span>Property type</span><select disabled={dashboard.profile?.agent_status !== 'active'} value={propertyForm.propertyType} onChange={(event) => setPropertyForm({ ...propertyForm, propertyType: event.target.value })}><option>Apartment</option><option>Duplex</option><option>Villa</option><option>Townhouse</option></select></label>
                <label className="agent-field"><span>Bedrooms</span><input required min="1" type="number" disabled={dashboard.profile?.agent_status !== 'active'} value={propertyForm.bedrooms} onChange={(event) => setPropertyForm({ ...propertyForm, bedrooms: event.target.value })} /></label>
              </div>
              <label className="agent-field"><span>Indicative nightly rate (NGN)</span><input required min="0" type="number" disabled={dashboard.profile?.agent_status !== 'active'} value={propertyForm.nightlyRate} onChange={(event) => setPropertyForm({ ...propertyForm, nightlyRate: event.target.value })} /></label>
              <label className="agent-field"><span>Listing / walkthrough URL</span><input type="url" disabled={dashboard.profile?.agent_status !== 'active'} value={propertyForm.listingUrl} onChange={(event) => setPropertyForm({ ...propertyForm, listingUrl: event.target.value })} /></label>
              <button className="agent-primary" type="submit" disabled={busy || dashboard.profile?.agent_status !== 'active'}>Submit for review</button>
            </form>}

            <section className="agent-panel">
              <div className="agent-panel-heading"><div><h3>My listings and assignments</h3><p>Status changes and correction requests are controlled by authorised reviewers.</p></div><button className="agent-secondary" type="button" onClick={() => void refresh()}>Refresh</button></div>
              <div className="agent-record-list">
                {dashboard.listings.length === 0 ? <p className="agent-empty">No listings or assigned properties are visible to this account yet.</p> : dashboard.listings.map((listing) => (
                  <article className="agent-record" key={listing.id}>
                    <div className="agent-record-title"><div><strong>{listing.title}</strong><span>{listing.area}, {listing.city} · {formatNaira(listing.nightly_rate)} / night</span></div><span className={`agent-status ${listing.listing_status}`}>{listing.listing_status.replace('_', ' ')}</span></div>
                    {listing.correction_request && <p className="agent-correction"><strong>Requested correction:</strong> {listing.correction_request}</p>}
                    {listing.listing_status === 'correction_requested' && listing.submitted_by === session.user.id && correctionId !== listing.id && <button className="agent-secondary" type="button" onClick={() => beginCorrection(listing)}>Edit and resubmit</button>}
                    {correctionId === listing.id && <form className="agent-correction-form" onSubmit={(event) => void resubmitCorrection(event, listing.id)}>
                      <label className="agent-field"><span>Title</span><input required value={correctionForm.title} onChange={(event) => setCorrectionForm({ ...correctionForm, title: event.target.value })} /></label>
                      <div className="agent-fields-row">
                        <label className="agent-field"><span>City</span><input required value={correctionForm.city} onChange={(event) => setCorrectionForm({ ...correctionForm, city: event.target.value })} /></label>
                        <label className="agent-field"><span>Area</span><input required value={correctionForm.area} onChange={(event) => setCorrectionForm({ ...correctionForm, area: event.target.value })} /></label>
                      </div>
                      <div className="agent-fields-row">
                        <label className="agent-field"><span>Property type</span><input required value={correctionForm.propertyType} onChange={(event) => setCorrectionForm({ ...correctionForm, propertyType: event.target.value })} /></label>
                        <label className="agent-field"><span>Bedrooms</span><input required min="1" type="number" value={correctionForm.bedrooms} onChange={(event) => setCorrectionForm({ ...correctionForm, bedrooms: event.target.value })} /></label>
                      </div>
                      <label className="agent-field"><span>Nightly rate (NGN)</span><input required min="0" type="number" value={correctionForm.nightlyRate} onChange={(event) => setCorrectionForm({ ...correctionForm, nightlyRate: event.target.value })} /></label>
                      <label className="agent-field"><span>Listing / walkthrough URL</span><input type="url" value={correctionForm.listingUrl} onChange={(event) => setCorrectionForm({ ...correctionForm, listingUrl: event.target.value })} /></label>
                      <div className="agent-session-actions"><button className="agent-secondary" type="button" onClick={() => setCorrectionId(null)}>Cancel</button><button className="agent-primary" type="submit" disabled={busy}>Resubmit for review</button></div>
                    </form>}
                    {(dashboard.profile?.role === 'owner' || dashboard.profile?.role === 'admin') && <div className="agent-session-actions">
                      {(listing.listing_status === 'submitted' || listing.listing_status === 'approved') && <button className="agent-secondary" type="button" onClick={() => {
                        const correction = window.prompt('Describe the specific correction required for this listing.')
                        if (correction?.trim()) void requestCorrection(listing.id, correction)
                      }}>Request correction</button>}
                      {dashboard.profile?.role === 'admin' && listing.listing_status === 'submitted' && <><button className="agent-primary" type="button" onClick={() => void reviewListing(listing.id, 'approved')}>Approve listing</button><button className="agent-secondary" type="button" onClick={() => void reviewListing(listing.id, 'rejected')}>Reject listing</button></>}
                    </div>}
                  </article>
                ))}
              </div>
            </section>

            {(dashboard.profile?.role === 'owner' || dashboard.profile?.role === 'admin') && <section className="agent-panel agent-wide-panel">
              <h3>Authorised assignments and owner terms</h3>
              <p>Choose a property you own, load active agents, assign access, and publish fixed terms. Database checks remain authoritative for every action.</p>
              <div className="agent-owner-controls">
                <label className="agent-field"><span>Property</span><select id="owner-property-id" onChange={(event) => void loadAgentsForProperty(event.target.value)}><option value="">Choose a property</option>{dashboard.listings.filter((listing) => listing.owner_id === session.user.id || listing.submitted_by === session.user.id || dashboard.profile?.role === 'admin').map((listing) => <option key={listing.id} value={listing.id}>{listing.title} · {listing.city}</option>)}</select></label>
                <label className="agent-field"><span>Active agent</span><select id="owner-agent-id"><option value="">Load agents for selected property</option>{dashboard.agents.map((agent) => <option key={agent.agent_id} value={agent.agent_id}>{agent.display_name} · {agent.city}</option>)}</select></label>
                <button className="agent-secondary" type="button" onClick={() => {
                  const propertyId = (document.getElementById('owner-property-id') as HTMLSelectElement | null)?.value
                  const agentId = (document.getElementById('owner-agent-id') as HTMLSelectElement | null)?.value
                  if (propertyId && agentId) void assignAgent(propertyId, agentId)
                  else setError('Choose a property and active agent first.')
                }}>Assign agent</button>
              </div>
              <form className="agent-owner-controls" onSubmit={submitOffer}>
                <label className="agent-field"><span>Offer property</span><select name="property_id" required onChange={(event) => void loadAgentsForProperty(event.target.value)}>{dashboard.listings.filter((listing) => listing.owner_id === session.user.id || listing.submitted_by === session.user.id || dashboard.profile?.role === 'admin').map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}</select></label>
                <label className="agent-field"><span>Assigned agent</span><select name="agent_id" required>{dashboard.agents.map((agent) => <option key={agent.agent_id} value={agent.agent_id}>{agent.display_name}</option>)}</select></label>
                <label className="agent-field"><span>Commercial term</span><select name="offer_kind"><option value="agent_payout">Fixed agent payout</option><option value="owner_net_rate">Owner net-rate offer</option></select></label>
                <label className="agent-field"><span>Amount (NGN)</span><input name="amount" type="number" min="0" step="1" required /></label>
                <button className="agent-primary" type="submit">Publish terms v1</button>
              </form>
              <p className="agent-muted">Owner net rate is commercial guidance only and does not indicate a collected or settled payment.</p>
            </section>}

            {dashboard.profile?.role === 'agent' && <section className="agent-panel agent-wide-panel">
              <div className="agent-panel-heading"><div><h3>Agent Deal Board</h3><p>Accepting an offer records acceptance of the exact displayed terms version.</p></div></div>
              <div className="agent-record-list">
                {dashboard.offers.filter((offer) => offer.status === 'open').length === 0 ? <p className="agent-empty">No open offers for your authorised properties.</p> : dashboard.offers.filter((offer) => offer.status === 'open').map((offer) => {
                  const currentVersion = offer.versions?.find((version) => version.id === offer.current_version_id)
                  return <article className="agent-offer" key={offer.id}>
                    <div><span className="agent-eyebrow">{offer.offer_kind === 'agent_payout' ? 'FIXED AGENT PAYOUT' : 'OWNER NET-RATE OFFER'}</span><h4>{offer.property?.title ?? 'Assigned property'}</h4><p>{offer.property?.city ?? ''} · Version {currentVersion?.version ?? '?'}</p></div>
                    <div className="agent-offer-terms"><strong>{currentVersion ? formatNaira(currentVersion.amount) : 'Terms unavailable'}</strong><span>{offer.offer_kind === 'agent_payout' ? 'agreed agent fee' : 'owner net rate'} · NGN</span><button className="agent-primary" type="button" disabled={busy || !currentVersion || dashboard.profile?.agent_status !== 'active'} onClick={() => void acceptOffer(offer)}>Accept v{currentVersion?.version ?? '?'}</button></div>
                  </article>
                })}
              </div>
              <p className="agent-muted">Terms are versioned and acceptance is checked by the database. A revised or withdrawn offer cannot be accepted using a stale version.</p>
            </section>}

            {(dashboard.profile?.role === 'owner' || dashboard.profile?.role === 'admin') && <section className="agent-panel agent-wide-panel">
              <h3>Published commercial terms</h3>
              <div className="agent-record-list">{dashboard.offers.length === 0 ? <p className="agent-empty">No commercial offers published.</p> : dashboard.offers.map((offer) => {
                const currentVersion = offer.versions?.find((version) => version.id === offer.current_version_id)
                return <article className="agent-record-title agent-record" key={offer.id}><div><strong>{offer.property?.title ?? 'Assigned property'}</strong><span>{offer.offer_kind.replace('_', ' ')} · {offer.status} · v{currentVersion?.version ?? '?'}</span></div><div className="agent-session-actions"><strong>{currentVersion ? formatNaira(currentVersion.amount) : 'No terms'}</strong>{offer.status === 'open' && <button className="agent-secondary" type="button" onClick={() => void reviseOffer(offer.id)}>Revise terms</button>}</div></article>
              })}</div>
            </section>}

            <section className="agent-panel agent-wide-panel">
              <h3>Bookings and earnings visibility</h3>
              <p>These figures show booking state and agreed terms only. HAMLET has no settlement integration here; no payout or settlement is represented as completed.</p>
              {dashboard.earnings.length === 0 ? <p className="agent-empty">No assigned booking records are visible yet.</p> : <div className="agent-table-wrap"><table className="agent-table"><thead><tr><th>Reference</th><th>Dates</th><th>Booking</th><th>Accommodation</th><th>Accepted commercial term</th><th>Settlement</th></tr></thead><tbody>{dashboard.earnings.map((earning) => <tr key={earning.booking_id}><td>{earning.guest_reference}</td><td>{earning.check_in} to {earning.check_out}</td><td>{earning.booking_state}</td><td>{formatNaira(earning.accommodation_total)}</td><td>{earning.commercial_term_amount === null ? 'Not recorded' : `${earning.commercial_term_kind === 'agent_payout' ? 'Agent payout' : 'Owner net rate'}: ${formatNaira(earning.commercial_term_amount)}`}</td><td>{earning.settlement_state.replaceAll('_', ' ')}</td></tr>)}</tbody></table></div>}
            </section>

            <section className="agent-panel agent-wide-panel">
              <div className="agent-panel-heading"><div><h3>Notification centre</h3><p>Assignment, correction, and commercial-term notices for this account.</p></div><span className="agent-status development">{dashboard.notifications.filter((notification) => !notification.read_at).length} unread</span></div>
              <div className="agent-record-list">{dashboard.notifications.length === 0 ? <p className="agent-empty">No agent notifications yet.</p> : dashboard.notifications.map((notification) => <article className={`agent-notification ${notification.read_at ? 'read' : ''}`} key={notification.id}><div><span>{notification.event_type.replaceAll('_', ' ')}</span><p>{notification.message}</p><time>{notification.created_at.slice(0, 16).replace('T', ' ')} UTC</time></div>{!notification.read_at && <button className="agent-text-link" type="button" onClick={() => void markNotificationRead(notification.id)}>Mark read</button>}</article>)}</div>
            </section>
          </div>
        </div>
      )}
    </section>
  )
}