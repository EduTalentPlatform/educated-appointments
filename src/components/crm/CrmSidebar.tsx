'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const nav = [
  {
    label: 'Overview',
    items: [{ href: '/crm', label: 'Dashboard', icon: '◈' }],
  },
  {
    label: 'Business Development',
    items: [
      { href: '/crm/leads/job-search', label: 'Job Search', icon: '🔍' },
      { href: '/crm/leads', label: 'Leads', icon: '◎' },
      { href: '/crm/clients', label: 'Clients', icon: '◉' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/crm/marketing', label: 'Campaigns', icon: '✉' },
      { href: '/crm/marketing/audience', label: 'Audience', icon: '◎' },
      { href: '/crm/marketing/suppression', label: 'Suppression', icon: '⊘' },
    ],
  },
  {
    label: 'Recruitment',
    items: [
      { href: '/crm/vacancies', label: 'Vacancies', icon: '◫' },
      { href: '/crm/applications', label: 'Applications', icon: '◈' },
      { href: '/crm/placements', label: 'Placements', icon: '✓' },
      { href: '/crm/speculations', label: 'Speculation', icon: '◇' },
      { href: '/crm/provider-standard-import', label: 'Provider Data', icon: '▤' },
      { href: '/crm/candidates', label: 'Candidates', icon: '◔' },
    ],
  },
  {
    label: 'Website',
    items: [
      {
        href: '/crm/website-recommendations',
        label: 'Recommendations',
        icon: '★',
      },
      {
        href: '/crm/insights',
        label: 'Insights',
        icon: '✍',
      },
    ],
  },
    {
    label: 'Admin',
    items: [
      { href: '/crm/email-templates', label: 'Email Templates', icon: '✉' },
      { href: '/crm/role-settings', label: 'Role Settings', icon: '▦' },
      { href: '/crm/portal-users', label: 'Portal Users', icon: '◉' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/crm/reports', label: 'Reports', icon: '▣' },
      { href: '/crm/analytics', label: 'Analytics', icon: '◌' },
    ],
  },
]

export default function CrmSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/crm/login')
  }

  function isActive(href: string) {
  if (href === '/crm') {
    return pathname === '/crm'
  }

  if (href === '/crm/leads/job-search') {
    return pathname === '/crm/leads/job-search'
  }

  if (href === '/crm/leads') {
    return (
      pathname === '/crm/leads' ||
      (
        pathname.startsWith('/crm/leads/') &&
        !pathname.startsWith('/crm/leads/job-search')
      )
    )
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      background: '#1a1a2e',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      zIndex: 9999,
    }}>

      {/* Logo */}
      <div className="crm-sidebar-logo">
        <div className="crm-sidebar-logo-mark">EA</div>
        <div>
          <p className="crm-sidebar-logo-title">EA CRM</p>
          <p className="crm-sidebar-logo-sub">Educated Appointments</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="crm-sidebar-nav">
        {nav.map(section => (
          <div key={section.label} className="crm-sidebar-section">
            <p className="crm-sidebar-section-label">{section.label}</p>
            {section.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`crm-sidebar-link${isActive(item.href) ? ' active' : ''}`}
              >
                <span className="crm-sidebar-link-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="crm-sidebar-footer">
        <Link href="/" target="_blank" className="crm-sidebar-footer-link">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          View website
        </Link>
        <button onClick={handleLogout} className="crm-sidebar-logout">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  )
}