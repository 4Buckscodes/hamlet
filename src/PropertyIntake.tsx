import { useState } from 'react'
import type { FormEvent } from 'react'
import { isSupabaseConfigured, supabase } from './supabaseClient'
import './PropertyIntake.css'

const amenityOptions = ['Air conditioning', 'Reliable power', 'Backup generator / inverter', 'Wi-Fi', 'Swimming pool', 'Parking', 'Kitchen', 'Washing machine', 'Security', 'Workspace', 'Balcony', 'Family-friendly']

const initialForm = {
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  submitterRole: 'Owner',
  propertyTitle: '',
  city: 'Lagos',
  area: '',
  propertyType: 'Apartment',
  bedrooms: '1',
  bathrooms: '1',
  maxGuests: '2',
  nightlyRate: '',
  listingUrl: '',
  photosUrl: '',
  availability: 'Confirm with me',
  availableFrom: '',
  amenities: [] as string[],
  hasApprovedBuildingPlan: false,
  hasCofo: false,
  hasGovernorsConsent: false,
  hasOtherDocuments: false,
  confirmsAuthorityToSubmit: false,
}

type IntakeForm = typeof initialForm

const fieldValue = (value: string) => value.trim()

export default function PropertyIntake() {
  const [form, setForm] = useState<IntakeForm>(initialForm)
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [fallbackLink, setFallbackLink] = useState('')

  const update = <K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const makeWhatsAppLink = () => {
    const summary = [
      'Hello HAMLET, I want to submit a shortlet property for onboarding.',
      '',
      `Contact: ${fieldValue(form.contactName)}`,
      `Phone: ${fieldValue(form.contactPhone)}`,
      `Email: ${fieldValue(form.contactEmail) || 'Not provided'}`,
      `Role: ${form.submitterRole}`,
      `Property: ${fieldValue(form.propertyTitle)}`,
      `Location: ${form.area}, ${form.city}`,
      `Type: ${form.propertyType}`,
      `Bedrooms / bathrooms: ${form.bedrooms} / ${form.bathrooms}`,
      `Max guests: ${form.maxGuests}`,
      `Nightly rate: NGN ${form.nightlyRate}`,
      `Availability: ${form.availability}${form.availableFrom ? ` from ${form.availableFrom}` : ''}`,
      `Listing link: ${fieldValue(form.listingUrl) || 'Not provided'}`,
      `Photos / walkthrough: ${fieldValue(form.photosUrl) || 'Not provided'}`,
      `Amenities: ${form.amenities.join(', ') || 'Not specified'}`,
      `Approved building plan: ${form.hasApprovedBuildingPlan ? 'Yes' : 'Not confirmed'}`,
      `COFO: ${form.hasCofo ? 'Yes' : 'Not confirmed'}`,
      `Governor's consent: ${form.hasGovernorsConsent ? 'Yes' : 'Not confirmed'}`,
      `Other documents: ${form.hasOtherDocuments ? 'Yes' : 'Not confirmed'}`,
    ].join('\n')
    const phone = import.meta.env.VITE_WHATSAPP_NUMBER || ''
    return `https://wa.me/${phone}?text=${encodeURIComponent(summary)}`.replace('wa.me/?', 'wa.me/?')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setFallbackLink('')

    if (!form.confirmsAuthorityToSubmit) {
      setError('Please confirm that you own the property or have permission to submit it.')
      return
    }

    if (!supabase || !isSupabaseConfigured) {
      setError('Online property intake is not connected on this deployment. Your details have not been saved.')
      setFallbackLink(makeWhatsAppLink())
      return
    }

    setBusy(true)
    try {
      const { error: insertError } = await supabase.from('property_intake_submissions').insert({
        contact_name: fieldValue(form.contactName),
        contact_phone: fieldValue(form.contactPhone),
        contact_email: fieldValue(form.contactEmail),
        submitter_role: form.submitterRole,
        property_title: fieldValue(form.propertyTitle),
        city: form.city,
        area: fieldValue(form.area),
        property_type: form.propertyType,
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        max_guests: Number(form.maxGuests),
        nightly_rate: Number(form.nightlyRate),
        listing_url: fieldValue(form.listingUrl),
        photos_url: fieldValue(form.photosUrl),
        availability: form.availability,
        available_from: form.availableFrom || null,
        amenities: form.amenities,
        has_approved_building_plan: form.hasApprovedBuildingPlan,
        has_cofo: form.hasCofo,
        has_governors_consent: form.hasGovernorsConsent,
        has_other_documents: form.hasOtherDocuments,
        confirms_authority_to_submit: form.confirmsAuthorityToSubmit,
      })
      if (insertError) throw insertError
      setSubmitted(true)
      setForm(initialForm)
    } catch (submitError) {
      setError(submitError instanceof Error ? `We couldn't save this submission online: ${submitError.message}` : 'We could not save this submission online.')
      setFallbackLink(makeWhatsAppLink())
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="hm-intake" id="property-intake">
      <div className="hm-intake-intro">
        <span className="hm-eyebrow">FOUNDING INVENTORY · HAMLET PARTNER NETWORK</span>
        <h2>Have a good shortlet?<br /><em>Let's get it listed.</em></h2>
        <p>Share the basics. Our team will review the details and contact you about the next steps. Submitting a property does not publish it or mean it has been verified.</p>
        <div className="hm-intake-promise"><span>✓</span><div><strong>One simple intake</strong><small>Tell us about the property, share its photos and availability, and note which documents you have.</small></div></div>
        <div className="hm-intake-promise"><span>✓</span><div><strong>Review before publishing</strong><small>We will follow up to confirm details and checks. Document checkboxes are self-reported, not verification.</small></div></div>
      </div>

      <div className="hm-intake-form-wrap">
        {submitted ? (
          <div className="hm-intake-success" role="status">
            <span className="hm-intake-success-icon">✓</span>
            <h3>We've received your property details.</h3>
            <p>Your submission is awaiting review. HAMLET will need to confirm the information and property status before any listing is published.</p>
            <button type="button" onClick={() => setSubmitted(false)}>Submit another property</button>
          </div>
        ) : (
          <form className="hm-intake-form" onSubmit={submit}>
            <div className="hm-intake-form-heading"><span>PROPERTY INTAKE</span><small>Fields marked * are required</small></div>

            <fieldset>
              <legend>1. Your contact details</legend>
              <div className="hm-intake-fields">
                <label>Full name *<input required minLength={2} maxLength={120} autoComplete="name" value={form.contactName} onChange={(event) => update('contactName', event.target.value)} placeholder="Name of contact person" /></label>
                <label>WhatsApp / phone *<input required type="tel" minLength={7} maxLength={40} autoComplete="tel" value={form.contactPhone} onChange={(event) => update('contactPhone', event.target.value)} placeholder="+234..." /></label>
                <label>Email (optional)<input type="email" maxLength={180} autoComplete="email" value={form.contactEmail} onChange={(event) => update('contactEmail', event.target.value)} placeholder="you@example.com" /></label>
                <label>Your role *<select value={form.submitterRole} onChange={(event) => update('submitterRole', event.target.value)}><option>Owner</option><option>Property manager</option><option>Agent</option><option>Shortlet operator</option><option>Co-host / hospitality operator</option><option>Referral partner</option><option>Other authorised partner</option></select></label>
              </div>
            </fieldset>

            <fieldset>
              <legend>2. Property details</legend>
              <div className="hm-intake-fields">
                <label className="hm-intake-full">Property name / short description *<input required minLength={3} maxLength={180} value={form.propertyTitle} onChange={(event) => update('propertyTitle', event.target.value)} placeholder="e.g. 2-bedroom serviced apartment" /></label>
                <label>City *<select value={form.city} onChange={(event) => update('city', event.target.value)}><option>Lagos</option><option>Abuja</option><option>Ibadan</option><option>Other</option></select></label>
                <label>Neighbourhood / area *<input required minLength={2} maxLength={120} value={form.area} onChange={(event) => update('area', event.target.value)} placeholder="e.g. Lekki Phase 1" /></label>
                <label>Property type *<select value={form.propertyType} onChange={(event) => update('propertyType', event.target.value)}><option>Apartment</option><option>Duplex</option><option>Villa</option><option>Townhouse</option><option>Studio</option><option>Other</option></select></label>
                <label>Bedrooms *<input required type="number" min="1" max="30" value={form.bedrooms} onChange={(event) => update('bedrooms', event.target.value)} /></label>
                <label>Bathrooms *<input required type="number" min="1" max="30" value={form.bathrooms} onChange={(event) => update('bathrooms', event.target.value)} /></label>
                <label>Maximum guests *<input required type="number" min="1" max="100" value={form.maxGuests} onChange={(event) => update('maxGuests', event.target.value)} /></label>
                <label>Nightly rate (₦) *<input required type="number" min="0" max="1000000000" step="1" value={form.nightlyRate} onChange={(event) => update('nightlyRate', event.target.value)} placeholder="e.g. 85000" /></label>
                <label>Availability *<select value={form.availability} onChange={(event) => update('availability', event.target.value)}><option>Confirm with me</option><option>Available now</option><option>Available from a date</option></select></label>
                {form.availability === 'Available from a date' && <label>Available from *<input required type="date" value={form.availableFrom} onChange={(event) => update('availableFrom', event.target.value)} /></label>}
                <label className="hm-intake-full">Existing listing link (optional)<input type="url" maxLength={1000} value={form.listingUrl} onChange={(event) => update('listingUrl', event.target.value)} placeholder="Airbnb, Instagram, website or other listing URL" /></label>
                <label className="hm-intake-full">Property photos / walkthrough link *<input required type="url" maxLength={1000} value={form.photosUrl} onChange={(event) => update('photosUrl', event.target.value)} placeholder="Google Drive, Instagram, video link, etc." /><small>Use a link we can open. Do not share private access codes or identity documents here.</small></label>
              </div>
            </fieldset>

            <fieldset>
              <legend>3. Amenities</legend>
              <p className="hm-intake-help">Select what the property actually provides.</p>
              <div className="hm-amenity-grid">
                {amenityOptions.map((amenity) => <label key={amenity}><input type="checkbox" checked={form.amenities.includes(amenity)} onChange={(event) => update('amenities', event.target.checked ? [...form.amenities, amenity] : form.amenities.filter((item) => item !== amenity))} /><span>{amenity}</span></label>)}
              </div>
            </fieldset>

            <fieldset>
              <legend>4. Property documents</legend>
              <p className="hm-intake-help">Tick documents you currently have available. HAMLET will review them separately before making any verification claim.</p>
              <div className="hm-doc-grid">
                <label><input type="checkbox" checked={form.hasApprovedBuildingPlan} onChange={(event) => update('hasApprovedBuildingPlan', event.target.checked)} /><span>Approved building plan</span></label>
                <label><input type="checkbox" checked={form.hasCofo} onChange={(event) => update('hasCofo', event.target.checked)} /><span>Certificate of Occupancy (C of O)</span></label>
                <label><input type="checkbox" checked={form.hasGovernorsConsent} onChange={(event) => update('hasGovernorsConsent', event.target.checked)} /><span>Governor's consent</span></label>
                <label><input type="checkbox" checked={form.hasOtherDocuments} onChange={(event) => update('hasOtherDocuments', event.target.checked)} /><span>Other property documents</span></label>
              </div>
            </fieldset>

            <label className="hm-intake-consent"><input type="checkbox" required checked={form.confirmsAuthorityToSubmit} onChange={(event) => update('confirmsAuthorityToSubmit', event.target.checked)} /><span>I confirm that I own this property or have the owner's permission to submit it to HAMLET for review.</span></label>

            {error && <div className="hm-intake-error" role="alert">{error}</div>}
            {fallbackLink && <a className="hm-intake-whatsapp" href={fallbackLink} target="_blank" rel="noreferrer">Continue via WhatsApp ↗</a>}
            <button className="hm-intake-submit" type="submit" disabled={busy}>{busy ? 'Submitting property…' : 'Submit property for review'} <span>↗</span></button>
            <p className="hm-intake-privacy">Your submission is for onboarding and review. It does not reserve a stay, guarantee publication, or confirm document verification.</p>
          </form>
        )}
      </div>
    </section>
  )
}
