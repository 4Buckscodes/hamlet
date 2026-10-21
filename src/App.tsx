import MarketplaceHome from './MarketplaceHome'
import AgentPortal from './AgentPortal'
import './App.css'

function PageShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="hm-page-shell">
      <header className="hm-page-header">
        <a className="hm-page-brand" href="/">HAMLET</a>
        <nav aria-label="Page navigation">
          <a href="/">Explore stays</a>
          <a href="/partners/join">Join as a partner</a><a href="/partners/workspace">Partner workspace</a>
        </nav>
      </header>
      <main className="hm-page-main">
        <div className="hm-page-intro"><p className="hm-page-eyebrow">HAMLET · YOUR STAY, SORTED</p><h1>{title}</h1><p>{description}</p></div>
        {children}
      </main>
      <footer className="hm-page-footer"><a href="/">← Back to HAMLET</a><span>Better stays. Brighter returns.</span></footer>
    </div>
  )
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  if (path === '/partners/join') return <PageShell title="Join the partner network" description="Create your partner account. HAMLET reviews new applications before access is approved."><AgentPortal view="join" /></PageShell>
  if (path === '/partners/workspace') return <PageShell title="Partner workspace" description="Sign in to manage your authorised listings, assignments, reviews and partner activity."><AgentPortal view="workspace" /></PageShell>
  if (path === '/list-property') return <PageShell title="Property submission is inside your workspace" description="To protect property owners and listing details, property submissions are available only to signed-in, authorised partners."><p className="hm-locked-intake-copy">Sign in to your partner workspace to submit a property using the complete intake form. If you do not have an account yet, join the HAMLET partner network first.</p><p><a className="hm-primary-button" href="/partners/workspace">Open partner workspace ↗</a></p><p><a href="/partners/join">New to HAMLET? Join the partner network</a></p></PageShell>
  return <MarketplaceHome />
}
