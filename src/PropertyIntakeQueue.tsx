import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './supabaseClient'

type IntakeSubmission = {
  id: string
  contact_name: string
  contact_phone: string
  contact_email: string
  submitter_role: string
  property_title: string
  city: string
  area: string
  property_type: string
  bedrooms: number
  bathrooms: number
  max_guests: number
  nightly_rate: number
  listing_url: string
  photos_url: string
  availability: string
  available_from: string | null
  amenities: string[]
  has_approved_building_plan: boolean
  has_cofo: boolean
  has_governors_consent: boolean
  has_other_documents: boolean
  status: 'pending' | 'contacted' | 'accepted' | 'rejected'
  review_notes: string
  created_at: string
  converted_property_id: string | null
}

const money = (amount: number) => `₦${amount.toLocaleString('en-NG')}`
const documents = (item: IntakeSubmission) => [
  item.has_approved_building_plan ? 'Approved building plan' : null,
  item.has_cofo ? 'C of O' : null,
  item.has_governors_consent ? "Governor's consent" : null,
  item.has_other_documents ? 'Other documents' : null,
].filter(Boolean)

export default function PropertyIntakeQueue() {
  const [items, setItems] = useState<IntakeSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false)
      setError('Supabase is not configured.')
      return
    }
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('property_intake_submissions')
      .select('id, contact_name, contact_phone, contact_email, submitter_role, property_title, city, area, property_type, bedrooms, bathrooms, max_guests, nightly_rate, listing_url, photos_url, availability, available_from, amenities, has_approved_building_plan, has_cofo, has_governors_consent, has_other_documents, status, review_notes, created_at, converted_property_id')
      .order('created_at', { ascending: false })
      .limit(100)
    if (loadError) setError(`Unable to load property intake queue: ${loadError.message}`)
    else {
      setItems((data ?? []) as IntakeSubmission[])
      setError('')
    }
    setLoading(false)
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const updateStatus = async (item: IntakeSubmission, status: 'contacted' | 'rejected') => {
    if (!supabase) return
    setBusyId(item.id)
    setError('')
    setMessage('')
    const { error: updateError } = await supabase.from('property_intake_submissions').update({
      status,
      reviewed_at: new Date().toISOString(),
    }).eq('id', item.id)
    if (updateError) setError(updateError.message)
    else {
      setMessage(status === 'contacted' ? 'Submission marked as contacted.' : 'Submission marked as rejected.')
      await refresh()
    }
    setBusyId(null)
  }

  const convert = async (item: IntakeSubmission) => {
    if (!supabase) return
    setBusyId(item.id)
    setError('')
    setMessage('')
    const { data, error: convertError } = await supabase.rpc('convert_property_intake_to_listing', { p_intake_id: item.id })
    if (convertError) setError(convertError.message)
    else {
      setMessage(`Created listing ${String(data)} in the existing review queue. It still needs admin review before publication.`)
      await refresh()
    }
    setBusyId(null)
  }

  return (
    <section className="agent-panel agent-wide-panel hm-intake-admin">
      <div className="agent-panel-heading">
        <div><h3>Founding property intake</h3><p>Public submissions are private to admins. Review the contact and evidence, then convert suitable submissions into the existing listing review queue.</p></div>
        <button className="agent-secondary" type="button" onClick={() => void refresh()} disabled={loading}>Refresh</button>
      </div>
      {error && <p className="agent-alert error">{error}</p>}
      {message && <p className="agent-alert success">{message}</p>}
      {loading ? <p className="agent-empty">Loading submissions…</p> : items.length === 0 ? <p className="agent-empty">No property submissions yet. New entries from the public intake form will appear here after the intake migration is applied.</p> : (
        <div className="agent-record-list">
          {items.map((item) => (
            <article className="agent-record hm-intake-admin-record" key={item.id}>
              <div className="agent-record-title">
                <div><strong>{item.property_title}</strong><span>{item.area}, {item.city} · {money(item.nightly_rate)} / night · Received {new Date(item.created_at).toLocaleDateString('en-NG')}</span></div>
                <span className={`agent-status ${item.status}`}>{item.status}</span>
              </div>
              <div className="hm-intake-admin-grid">
                <p><strong>Contact</strong><br />{item.contact_name} · {item.submitter_role}<br /><a href={`https://wa.me/${item.contact_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">{item.contact_phone} ↗</a>{item.contact_email && <><br /><a href={`mailto:${item.contact_email}`}>{item.contact_email}</a></>}</p>
                <p><strong>Property</strong><br />{item.property_type} · {item.bedrooms} bed · {item.bathrooms} bath · up to {item.max_guests} guests<br />Availability: {item.availability}{item.available_from ? ` · from ${item.available_from}` : ''}</p>
                <p><strong>Links</strong><br />{item.listing_url ? <><a href={item.listing_url} target="_blank" rel="noreferrer">Existing listing ↗</a><br /></> : null}{item.photos_url ? <a href={item.photos_url} target="_blank" rel="noreferrer">Photos / walkthrough ↗</a> : 'No media link supplied'}</p>
                <p><strong>Documents reported</strong><br />{documents(item).length ? documents(item).join(', ') : 'None selected'}<br /><small>Self-reported only — verify separately.</small></p>
                <p className="hm-intake-admin-wide"><strong>Amenities</strong><br />{item.amenities?.length ? item.amenities.join(' · ') : 'Not specified'}</p>
              </div>
              {item.converted_property_id && <p className="agent-alert info">Converted to listing ID: <code>{item.converted_property_id}</code>. Review and approve the listing in the existing listing queue.</p>}
              <div className="agent-session-actions hm-intake-admin-actions">
                {item.status === 'pending' && <button className="agent-secondary" type="button" disabled={busyId === item.id} onClick={() => void updateStatus(item, 'contacted')}>Mark contacted</button>}
                {(item.status === 'pending' || item.status === 'contacted') && <button className="agent-primary" type="button" disabled={busyId === item.id} onClick={() => void convert(item)}>{busyId === item.id ? 'Working…' : 'Convert to listing review'}</button>}
                {(item.status === 'pending' || item.status === 'contacted') && <button className="agent-secondary" type="button" disabled={busyId === item.id} onClick={() => void updateStatus(item, 'rejected')}>Reject</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
