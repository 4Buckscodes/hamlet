import MarketplaceHome from './MarketplaceHome'
import AgentPortal from './AgentPortal'
import './App.css'

function PageShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="hm-page-shell">
      <header className="hm-page-header">
        <a className="hm-page-brand" href="/">HAMLET</a>
        <nav aria-label="Page navigation">
          <a href="/explore">Explore stays</a>
          <a href="/how-it-works">How HAMLET works</a>
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

const legacyHashRoutes: Record<string, string> = { '#explore': '/explore', '#how-it-works': '/how-it-works' }

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'

  // Old bookmarks like /#explore now go to their own pages
  const legacyRoute = path === '/' ? legacyHashRoutes[window.location.hash] : undefined
  if (legacyRoute) {
    window.location.replace(legacyRoute)
    return null
  }

  if (path === '/partners/join') return <PageShell title="Join the partner network" description="Create your partner account. HAMLET reviews new applications before access is approved."><AgentPortal view="join" /></PageShell>
  if (path === '/partners/workspace') return <PageShell title="Partner workspace" description="Sign in to manage your authorised listings, assignments, reviews and partner activity."><AgentPortal view="workspace" /></PageShell>
  if (path === '/explore') return <MarketplaceHome page="explore" />
  if (path === '/how-it-works') return <MarketplaceHome page="how-it-works" />
  return <MarketplaceHome />
}