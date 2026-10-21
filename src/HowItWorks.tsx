const guestSteps = [
  { title: 'Browse approved listings', text: 'Only properties HAMLET has reviewed and approved are shown to guests.' },
  { title: 'Send a booking request', text: 'HAMLET uses request-to-book. Sending a request does not confirm a stay.' },
  { title: 'Availability and terms are checked', text: 'HAMLET and the property’s authorised partner confirm the dates and terms with you.' },
  { title: 'Accept and pay by the deadline', text: 'You see the full total before you commit. HAMLET’s 3% guest service fee is included in the displayed price.' },
  { title: 'Booking confirmed', text: 'A stay is confirmed only after payment is verified and availability is rechecked.' },
]

const partnerSteps = [
  { title: 'Join the partner network', text: 'Owners, agents and property managers register once. New applications are reviewed before access is approved.' },
  { title: 'Submit a property', text: 'Share the listing facts, photos, pricing and your authority to list the property.' },
  { title: 'HAMLET reviews it', text: 'Each submission is reviewed manually and marked as needs correction, approved, rejected or suspended.' },
  { title: 'Approved listings go public', text: 'Only approved, non-suspended listings can be found by guests. You see only the properties you are authorised for.' },
]

export default function HowItWorks() {
  return (
    <>
      <section className="hm-hiw-intro">
        <span className="hm-eyebrow"><span /> HOW HAMLET WORKS</span>
        <h1>A clearer way to book<br /><em>a Lagos shortlet.</em></h1>
        <p>HAMLET is in its founding phase. Here is how booking is designed to work, and what is not connected yet.</p>
        <div className="hm-hiw-actions">
          <a className="hm-primary-button" href="/explore">Explore stays <span>↗</span></a>
          <a className="hm-text-link" href="/partners/join">Join as a partner →</a>
        </div>
      </section>

      <section className="hm-hiw-block" aria-labelledby="hiw-guests">
        <h2 id="hiw-guests">For guests</h2>
        <ol className="hm-hiw-steps">
          {guestSteps.map((step) => (
            <li key={step.title}><h3>{step.title}</h3><p>{step.text}</p></li>
          ))}
        </ol>
      </section>

      <section className="hm-hiw-block" aria-labelledby="hiw-partners">
        <h2 id="hiw-partners">For owners, managers and agents</h2>
        <ol className="hm-hiw-steps">
          {partnerSteps.map((step) => (
            <li key={step.title}><h3>{step.title}</h3><p>{step.text}</p></li>
          ))}
        </ol>
      </section>

      <section className="hm-hiw-note" aria-labelledby="hiw-today">
        <h2 id="hiw-today">Where we are today</h2>
        <p>Live payments and live availability are not connected yet. Sample listings are labelled as previews, and a verification label only appears once the checks behind it have actually been completed.</p>
      </section>
    </>
  )
}