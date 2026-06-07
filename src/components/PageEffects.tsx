'use client'

import { useEffect } from 'react'

export default function PageEffects() {
  useEffect(() => {
    // ── 1. Frosted glass nav on scroll ──
    const nav = document.querySelector('nav')
    const onScroll = () => {
      nav?.classList.toggle('scrolled', window.scrollY > 80)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    // ── 2. Scroll reveal ──
    const reveals = document.querySelectorAll('.reveal')
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            revealObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    reveals.forEach((el) => revealObserver.observe(el))

    // ── 3. Animated stat counters ──
    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)

    function animateCounter(el: Element) {
      const target = parseInt((el as HTMLElement).dataset.target ?? '0', 10)
      const suffix = (el as HTMLElement).dataset.suffix ?? ''
      const duration = 1600
      const start = performance.now()
      const update = (now: number) => {
        const elapsed = Math.min((now - start) / duration, 1)
        const value = Math.round(easeOutQuart(elapsed) * target)
        el.textContent = value + suffix
        if (elapsed < 1) requestAnimationFrame(update)
        else el.textContent = target + suffix
      }
      requestAnimationFrame(update)
    }

    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.count-up').forEach(animateCounter)
            counterObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.5 }
    )
    document.querySelectorAll('.hero-trust').forEach((el) => counterObserver.observe(el))

    // ── 4. Animated process connector line ──
    const processSteps = document.querySelectorAll('.process-step')
    const lineObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('line-active')
          }
        })
      },
      { threshold: 0.6 }
    )
    processSteps.forEach((step) => lineObserver.observe(step))

    return () => {
      window.removeEventListener('scroll', onScroll)
      revealObserver.disconnect()
      counterObserver.disconnect()
      lineObserver.disconnect()
    }
  }, [])

  return null
}
