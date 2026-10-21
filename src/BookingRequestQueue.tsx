import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './supabaseClient'

type BookingStatus =
  | 'requested'
  | 'availability_confirmed'
  | 'awaiting_payment'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'disputed'
  | 'refunded'

type BookingRequest = {
  id: string
  guest_reference: string
  property_id: string
  guest_name: string
  guest_email: string | null
  guest_phone: string
  check_in: string
  check_out: string
  guest_count: number
  guest_message: string
  accommodation_subtotal: number
  hamlet_service_fee: number
  mandatory_charges: number
  guest_total: number
  status: BookingStatus
  payment_status: string
  payment_deadline: string | null
  created_at: string
}

type BookingRequestQueueProps = {
  role: 'admin' | 'owner' | 'agent'
  partnerActive: boolean
}

const money = (amount: number) => `₦${Number(amount).toLocaleString('en-NG')}`
const dates = (start: string, end: string) => `${start} → ${end}`
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

type BookingRequestsResult = { items: BookingRequest[] | null; error: string }

async function fetchBookingRequests(): Promise<BookingRequestsResult> {
  if (!supabase) return { items: [], error: '' }
  const { data, error } = await supabase
    .from('guest_booking_requests')
    .select('id, guest_reference, property_id, guest_name, guest_email, guest_phone, check_in, check_out, guest_count, guest_message, accommodation_subtotal, hamlet_service_fee, mandatory_charges, guest_total, status, payment_status, payment_deadline, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return { items: null, error: `Unable to load booking requests: ${error.message}` }
  return { items: (data ?? []) as BookingRequest[], error: '' }
}
export default function BookingRequestQueue({ role, partnerActive }: BookingRequestQueueProps) {
  const [items, setItems] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(Boolean(isSupabaseConfigured && supabase))
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [provider, setProvider] = useState('Paystack')
  const [providerReference, setProviderReference] = useState('')
  const [verificationAmount, setVerificationAmount] = useState<Record<string, string>>({})

    const applyResult = useCallback((result: BookingRequestsResult) => {
    if (result.items) {
      setItems(result.items)
      setError('')
    } else {
      setError(result.error)
    }
    setLoading(false)
  }, [])

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    applyResult(await fetchBookingRequests())
  }, [applyResult])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    void fetchBookingRequests().then((result) => {
      if (!cancelled) applyResult(result)
    })
    return () => { cancelled = true }
  }, [applyResult])

  const changeStatus = async (item: BookingRequest, status: 'availability_confirmed' | 'awaiting_payment' | 'cancelled' | 'disputed') => {
    if (!supabase) return
    setBusyId(item.id)
    setError('')
    setMessage('')
    const paymentDeadline = status === 'awaiting_payment' ? hoursFromNow(24) : null
    const { error: actionError } = await supabase.rpc('set_guest_booking_status', {
      p_booking_id: item.id,
      p_status: status,
      p_payment_deadline: paymentDeadline,
    })
    if (actionError) setError(actionError.message)
    else {
      setMessage(status === 'availability_confirmed'
        ? `${item.guest_reference}: availability marked as checked. Admin can now issue the payment step.`
        : status === 'awaiting_payment'
          ? `${item.guest_reference}: payment deadline issued for 24 hours.`
          : `${item.guest_reference}: request marked ${status.replaceAll('_', ' ')}.`)
      await refresh()
    }
    setBusyId(null)
  }

  const verifyPayment = async (item: BookingRequest) => {
    if (!supabase) return
    const reference = providerReference.trim()
    const amount = Number(verificationAmount[item.id] ?? item.guest_total)
    if (provider.trim().length < 2 || reference.length < 3 || !Number.isSafeInteger(amount) || amount !== Number(item.guest_total)) {
      setError('Enter the provider, its transaction reference, and the exact guest total shown for this request.')
      return
    }
    const confirmed = window.confirm(`Confirm you have independently verified payment ${reference} in the ${provider} provider dashboard for ${money(amount)}? This will confirm the booking.`)
    if (!confirmed) return

    setBusyId(item.id)
    setError('')
    setMessage('')
    const { error: verifyError } = await supabase.rpc('admin_mark_booking_payment_verified', {
      p_booking_id: item.id,
      p_provider: provider.trim(),
      p_provider_reference: reference,
      p_amount: amount,
    })
    if (verifyError) setError(verifyError.message)
    else {
      setMessage(`${item.guest_reference}: payment verification recorded and booking confirmed.`)
      setProviderReference('')
      await refresh()
    }
    setBusyId(null)
  }

  return (
    <section className="agent-panel agent-wide-panel hm-booking-queue">
      <div className="agent-panel-heading">
        <div>
          <h3>Booking requests</h3>
          <p>Review guest requests, record availability checks, and keep payment confirmation tied to independently verified provider records. A request is not a confirmed booking until payment is verified.</p>
        </div>
        <button className="agent-secondary" type="button" onClick={() => { setLoading(true); void refresh() }} disabled={loading}>Refresh</button>
      </div>
      {!isSupabaseConfigured && <p className="agent-alert info">Connect Supabase to load real booking requests. This panel does not create demo bookings.</p>}
      {error && <p className="agent-alert error" role="alert">{error}</p>}
      {message && <p className="agent-alert success" role="status">{message}</p>}
      {loading ? <p className="agent-empty">Loading booking requests…</p> : items.length === 0 ? <p className="agent-empty">No booking requests are visible to this account yet.</p> : (
        <div className="agent-record-list">
          {items.map((item) => (
            <article className="agent-record hm-booking-record" key={item.id}>
              <div className="agent-record-title">
                <div>
                  <strong>{item.guest_reference} · {item.guest_name}</strong>
                  <span>{dates(item.check_in, item.check_out)} · {item.guest_count} {item.guest_count === 1 ? 'guest' : 'guests'}</span>
                </div>
                <span className={`agent-status ${item.status}`}>{item.status.replaceAll('_', ' ')}</span>
              </div>
              <div className="hm-booking-record-grid">
                <p><strong>Guest contact</strong><br /><a href={`tel:${item.guest_phone}`}>{item.guest_phone}</a>{item.guest_email && <><br /><a href={`mailto:${item.guest_email}`}>{item.guest_email}</a></>}</p>
                <p><strong>Property reference</strong><br /><code>{item.property_id}</code></p>
                <p><strong>Price snapshot</strong><br />Accommodation: {money(Number(item.accommodation_subtotal))}<br />HAMLET guest fee (3%): {money(Number(item.hamlet_service_fee))}<br /><strong>Guest total: {money(Number(item.guest_total))}</strong></p>
                <p><strong>Payment</strong><br />{item.payment_status.replaceAll('_', ' ')}{item.payment_deadline ? <><br />Deadline: {new Date(item.payment_deadline).toLocaleString('en-NG')}</> : null}</p>
              </div>
              {item.guest_message && <p className="hm-booking-guest-message"><strong>Guest message</strong><br />{item.guest_message}</p>}
              <div className="agent-session-actions hm-booking-actions">
                {item.status === 'requested' && <button className="agent-primary" type="button" disabled={busyId === item.id || (role === 'agent' && !partnerActive)} onClick={() => void changeStatus(item, 'availability_confirmed')}>{busyId === item.id ? 'Saving…' : 'Availability checked'}</button>}
                {item.status === 'availability_confirmed' && role === 'admin' && <button className="agent-primary" type="button" disabled={busyId === item.id} onClick={() => void changeStatus(item, 'awaiting_payment')}>{busyId === item.id ? 'Saving…' : 'Issue 24-hour payment step'}</button>}
                {item.status === 'availability_confirmed' && role !== 'admin' && <span className="agent-empty">Waiting for HAMLET admin to issue the payment step.</span>}
                {item.status === 'awaiting_payment' && role === 'admin' && (
                  <div className="hm-payment-verification">
                    <label className="agent-field"><span>Provider</span><input value={provider} onChange={(event) => setProvider(event.target.value)} /></label>
                    <label className="agent-field"><span>Provider transaction reference</span><input value={providerReference} onChange={(event) => setProviderReference(event.target.value)} required minLength={3} /></label>
                    <label className="agent-field"><span>Verified amount (NGN)</span><input type="number" min={0} step={1} value={verificationAmount[item.id] ?? String(item.guest_total)} onChange={(event) => setVerificationAmount((current) => ({ ...current, [item.id]: event.target.value }))} /></label>
                    <button className="agent-primary" type="button" disabled={busyId === item.id} onClick={() => void verifyPayment(item)}>{busyId === item.id ? 'Verifying…' : 'Confirm verified payment'}</button>
                    <small>Use only after checking the transaction in the provider dashboard. This does not connect a payment provider or verify payments automatically.</small>
                  </div>
                )}
                {['requested', 'availability_confirmed', 'awaiting_payment'].includes(item.status) && <button className="agent-secondary" type="button" disabled={busyId === item.id} onClick={() => void changeStatus(item, 'cancelled')}>Cancel request</button>}
                {['requested', 'availability_confirmed', 'awaiting_payment'].includes(item.status) && <button className="agent-secondary" type="button" disabled={busyId === item.id} onClick={() => void changeStatus(item, 'disputed')}>Flag issue</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
