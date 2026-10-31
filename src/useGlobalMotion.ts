import { useEffect } from 'react'

/**
 * Site-wide progressive scroll reveals.
 * Content is visible by default; the observer only adds animation to
 * elements after hydration and when the user has not requested reduced motion.
 */
export function useGlobalMotion() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches || !('IntersectionObserver' in window)) return

    const selector = [
      '.hm-hero-copy',
      '.hm-hero-image',
      '.hm-search-wrap',
      '.hm-section-heading',
      '.hm-stay-card',
      '.hm-trust-intro',
      '.hm-trust-points > article',
      '.hm-owner-copy',
      '.hm-owner-visual',
      '.hm-page-intro',
      '.hm-page-main > :not(.hm-page-intro)',
      '.hm-page-footer',
      '.section-shell',
      '.hero-section',
      '.final-cta-box',
      '.research-layout',
      '.guest-layout',
      '.hosts-section',
      '.horatio-grid',
      '.hm-footer'
    ].join(',')

    const targets = Array.from(document.querySelectorAll<HTMLElement>(selector))
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const element = entry.target as HTMLElement
        element.dataset.hmReveal = 'visible'
        currentObserver.unobserve(element)
      })
    }, {
      root: null,
      rootMargin: '0px 0px -48px 0px',
      threshold: 0.08,
    })

    targets.forEach((element) => {
      if (element.dataset.hmReveal === 'visible') return
      element.dataset.hmReveal = 'pending'
      if (element.matches('.hm-trust-points > article')) {
        const siblings = Array.from(element.parentElement?.children ?? [])
        const index = siblings.indexOf(element)
        if (index >= 0 && index < 4) element.dataset.hmRevealDelay = String(index + 1)
      }
      if (element.matches('.hm-stay-card')) {
        const siblings = Array.from(element.parentElement?.children ?? [])
        const index = siblings.indexOf(element)
        if (index >= 0 && index < 4) element.dataset.hmRevealDelay = String(index + 1)
      }
      observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])
}
