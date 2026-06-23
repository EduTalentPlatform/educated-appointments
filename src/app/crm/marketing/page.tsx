import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function MarketingPage() {
  const supabase = getServiceClient()

  const [
    { count: campaignCount },
    { count: clientContactCount },
    { count: leadContactCount },
    { count: suppressedCount },
  ] = await Promise.all([
    supabase
      .from('marketing_campaigns')
      .select('*', { count: 'exact', head: true }),

    supabase
      .from('client_contacts')
      .select('*', { count: 'exact', head: true })
      .not('email', 'is', null),

    supabase
      .from('lead_contacts')
      .select('*', { count: 'exact', head: true })
      .not('email', 'is', null),

    supabase
      .from('marketing_suppression_list')
      .select('*', { count: 'exact', head: true }),
  ])

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Marketing</h1>
          <p className="crm-page-sub">
            Build campaign audiences safely before sending anything.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="crm-card">
          <p className="crm-small-label">Campaigns</p>
          <h2 style={{ margin: '8px 0 0' }}>{campaignCount ?? 0}</h2>
        </div>

        <div className="crm-card">
          <p className="crm-small-label">Client contacts with email</p>
          <h2 style={{ margin: '8px 0 0' }}>{clientContactCount ?? 0}</h2>
        </div>

        <div className="crm-card">
          <p className="crm-small-label">Lead contacts with email</p>
          <h2 style={{ margin: '8px 0 0' }}>{leadContactCount ?? 0}</h2>
        </div>

        <div className="crm-card">
          <p className="crm-small-label">Suppressed emails</p>
          <h2 style={{ margin: '8px 0 0' }}>{suppressedCount ?? 0}</h2>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        <Link href="/crm/marketing/audience" className="crm-card" style={{ textDecoration: 'none' }}>
          <h2 style={{ marginTop: 0 }}>Audience Preview</h2>
          <p className="crm-page-sub">
            Check who would be included or excluded before creating a campaign.
          </p>
          <span className="crm-btn-primary" style={{ display: 'inline-flex', marginTop: 12 }}>
            Open audience
          </span>
        </Link>

        <Link href="/crm/email-templates" className="crm-card" style={{ textDecoration: 'none' }}>
          <h2 style={{ marginTop: 0 }}>Email Templates</h2>
          <p className="crm-page-sub">
            Reuse your existing CRM email templates for future marketing campaigns.
          </p>
          <span className="crm-btn-secondary" style={{ display: 'inline-flex', marginTop: 12 }}>
            Manage templates
          </span>
        </Link>

        <Link href="/crm/marketing/suppression" className="crm-card" style={{ textDecoration: 'none' }}>
          <h2 style={{ marginTop: 0 }}>Suppression List</h2>
          <p className="crm-page-sub">
            Manage people who must not receive marketing emails.
          </p>
          <span className="crm-btn-secondary" style={{ display: 'inline-flex', marginTop: 12 }}>
            View suppression
          </span>
        </Link>
      </div>
    </div>
  )
}