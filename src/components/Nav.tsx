'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export default function Nav() {
  const [open, setOpen] = useState(false)

  const links = [
  { href: '/jobs', label: 'Live Jobs' },
  { href: '/employer', label: 'Employers' },
  { href: '/candidate', label: 'Candidates' },
  { href: '/about', label: 'About' },
  { href: '/policies', label: 'Policies' },
  { href: '/contact', label: 'Contact' },
]

  return (
    <>
      <nav>
        <div className="nav-inner">
          <Link href="/" className="nav-logo" onClick={() => setOpen(false)}>
            <Image src="/logo.svg" alt="Educated Appointments" width={32} height={33} className="logo-svg" />
            <div className="logo-text">
              Educated Appointments
              <span>FE &amp; Skills Recruitment</span>
            </div>
          </Link>

          {/* Desktop links */}
          <ul className="nav-links">
            {links.map(l => (
              <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
            ))}
          </ul>

          {/* Desktop actions */}
          <div className="nav-actions">
            <div className="nav-divider" />
            <Link href="/employer-portal/login" className="btn-nav-portal">
  <div className="portal-dot" />
  Employer Portal
</Link>
            <Link href="/contact" className="btn-nav-primary">
              Book a Call →
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="nav-hamburger"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="nav-mobile-overlay" onClick={() => setOpen(false)}>
          <div className="nav-mobile-drawer" onClick={e => e.stopPropagation()}>
            <div className="nav-mobile-links">
              {links.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="nav-mobile-link"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <div className="nav-mobile-actions">
              <Link
  href="/employer-portal/login"
  className="nav-mobile-portal"
  onClick={() => setOpen(false)}
>
  <div className="portal-dot" />
  Employer Portal
</Link>
              <Link
                href="/contact"
                className="btn-nav-primary"
                style={{ textAlign: 'center', display: 'block' }}
                onClick={() => setOpen(false)}
              >
                Book a Call →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}