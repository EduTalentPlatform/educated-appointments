export default function MarketingAudiencePage() {
  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Audience Preview</h1>
          <p className="crm-page-sub">
            This will show eligible client and lead contacts before any campaign is sent.
          </p>
        </div>
      </div>

      <div className="crm-card">
        <h2 style={{ marginTop: 0 }}>Coming next</h2>
        <p>
          The next build step is to show eligible contacts, excluded contacts,
          suppression reasons, consent status and duplicate email protection.
        </p>
      </div>
    </div>
  )
}