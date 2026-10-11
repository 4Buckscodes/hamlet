import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { calculateHamletPrice } from './hamletCore'
import { isSupabaseConfigured, supabase } from './supabaseClient'
import './BookingRequestModal.css'

type BookingStay = {
  id: string
  title: string
  area: string
  price: number
  maxGuests: number
}

type BookingRequestModalProps = {
  stay: BookingStay | null
  onClose: () => void
}

type BookingResult = {
  booking_id: string
  guest_reference: string
  accommodation_subtotal: number
  hamlet_service_fee: number
  guest_total: number
}

const localDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatNaira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`

export default function BookingRequestModal({ stay, onClose }: BookingRequestModalProps) {
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guestCount, setGuestCount] = useState(1)
  const [guestMessage, setGuestMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<BookingResult | null>(null)

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0
    const start = new Date(`${checkIn}T00:00:00Z`).getTime()
    const end = new Date(`${checkOut}T00:00:00Z`).getTime()
    const difference = (end - start) / 86400000
    return Number.isInteger(difference) && difference > 0 ? difference : 0
  }, [checkIn, checkOut])

  const estimate = useMemo(() => {
    if (!stay || nights <= 0) return null
    return calculateHamletPrice({ accommodationSubtotal: stay.price * nights })
  }, [stay, nights])

  if (!stay) return null

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!supabase || !isSupabaseConfigured) {
      setError('Booking requests are not connected on this deployment yet. No request has been saved.')
      return
    }
    if (nights <= 0) {
      setError('Choose a check-out date after your check-in date.')
      return
    }

    setBusy(true)
    try {
      const { data, error: requestError } = await supabase.rpc('submit_guest_booking_request', {
        p_property_id: stay.id,
        p_guest_name: guestName.trim(),
        p_guest_email: guestEmail.trim() || null,
        p_guest_phone: guestPhone.trim(),
        p_check_in: checkIn,
        p_check_out: checkOut,
        p_guest_count: guestCount,
        p_guest_message: guestMessage.trim(),
      })
      if (requestError) throw requestError

      const row = (Array.isArray(data) ? data[0] : data) as BookingResult | null
      if (!row?.guest_reference) throw new Error('The request response was incomplete. Please contact HAMLET before submitting again.')
      setResult(row)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'We could not submit your booking request.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="hm-booking-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section className="hm-booking-modal" role="dialog" aria-modal="true" aria-labelledby="hm-booking-title">
        <button className="hm-booking-close" type="button" aria-label="Close booking request" onClick={onClose} disabled={busy}>×</button>
        {result ? (
          <div className="hm-booking-success" role="status">
            <span className="hm-booking-success-mark">✓</span>
            <span className="hm-booking-kicker">REQUEST RECEIVED</span>
            <h2 id="hm-booking-title">Let's confirm your stay.</h2>
            <p>Your request for <strong>{stay.title}</strong> is recorded. This is not yet a confirmed booking, and no payment has been collected.</p>
            <div className="hm-booking-reference"><span>Booking reference</span><strong>{result.guest_reference}</strong></div>
            <div className="hm-booking-price-row"><span>Estimated total including HAMLET's 3% fee</span><strong>{formatNaira(Number(result.guest_total))}</strong></div>
            <p className="hm-booking-note">HAMLET will confirm availability and the final payable amount before payment. Payment-provider processing-fee treatment has not yet been finalised.</p>
            <button className="hm-booking-submit" type="button" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <span className="hm-booking-kicker">REQUEST TO BOOK · LAGOS</span>
            <h2 id="hm-booking-title">Request this stay.</h2>
            <p className="hm-booking-property">{stay.title}<span>{stay.area}, Lagos</span></p>
            <p className="hm-booking-intro">Send your dates and contact details. HAMLET will check availability with the responsible property partner. Your stay is not confirmed until you receive confirmation.</p>
            <form className="hm-booking-form" onSubmit={submit}>
              <div className="hm-booking-fields">
                <label>Full name *<input required minLength={2} maxLength={120} autoComplete="name" value={guestName} onChange={(event) => setGuestName(event.target.value)} /></label>
                <label>Phone / WhatsApp *<input required type="tel" minLength={7} maxLength={40} autoComplete="tel" value={guestPhone} onChange={(event) => setGuestPhone(event.target.value)} placeholder="+234..." /></label>
                <label>Email (optional)<input type="email" maxLength={180} autoComplete="email" value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} /></label>
                <label>Guests *<input required type="number" min={1} max={stay.maxGuests} value={guestCount} onChange={(event) => setGuestCount(Number(event.target.value))} /></label>
                <label>Check-in *<input required type="date" min={localDate()} value={checkIn} onChange={(event) => setCheckIn(event.target.value)} /></label>
                <label>Check-out *<input required type="date" min={checkIn || localDate()} value={checkOut} onChange={(event) => setCheckOut(event.target.value)} /></label>
                <label className="hm-booking-full">Anything the host should know? (optional)<textarea rows={3} maxLength={2000} value={guestMessage} onChange={(event) => setGuestMessage(event.target.value)} placeholder="Arrival time, accessibility needs, or a question about the stay" /></label>
              </div>

              {estimate && (
                <div className="hm-booking-estimate">
                  <div><span>{nights} {nights === 1 ? 'night' : 'nights'} · accommodation</span><strong>{formatNaira(estimate.accommodationSubtotal)}</strong></div>
                  <div><span>HAMLET service fee (3%)</span><strong>{formatNaira(estimate.serviceFee)}</strong></div>
                  <div className="hm-booking-total"><span>Estimated total</span><strong>{formatNaira(estimate.guestTotal)}</strong></div>
                  <small>No payment is collected with this request. Final payable amount is shown before you pay.</small>
                </div>
              )}

              {error && <p className="hm-booking-error" role="alert">{error}</p>}
              <button className="hm-booking-submit" type="submit" disabled={busy || nights <= 0}>{busy ? 'Sending request…' : 'Send booking request'}</button>
              <p className="hm-booking-terms">By sending this request, you agree that HAMLET may use these details to follow up about this booking request. See the privacy notice for details.</p>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
