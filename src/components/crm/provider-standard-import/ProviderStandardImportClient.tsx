'use client'

import { useState } from 'react'
import Link from 'next/link'

const TEMPLATE = `provider_name,ukprn,website,standard_name,standard_reference,sector,route,regions,delivery_modes,source,source_url
Example Training Ltd,12345678,https://www.exampletraining.co.uk,Installation and Maintenance Electrician,ST0152,Construction and the built environment,Construction,National; West Midlands,Online; Workplace,manual,https://findapprenticeshiptraining.apprenticeships.education.gov.uk/`

type PreviewRow = {
  row_number: number
  valid: boolean
  warnings: string[]
  provider_name: string | null
  website: string | null
  standard_name: string | null
  standard_reference: string | null
  matched_standard_name: string | null
  matched_standard_reference: string | null
  match_status: string
  client_id: string | null
  client_name: string | null
  lead_id: string | null
  lead_name: string | null
  regions: string[]
  delivery_modes: string[]
}

type Summary = {
  rows_received: number
  rows_valid: number
  rows_imported?: number
  rows_skipped?: number
  rows_with_warnings?: number
  matched_clients: number
  matched_leads: number
}

export default function ProviderStandardImportClient() {
  const [csvText, setCsvText] = useState('')
  const [sourceName, setSourceName] = useState('Provider standard CSV import')
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importComplete, setImportComplete] = useState(false)

  async function runPreview() {
    setLoading(true)
    setError(null)
    setImportComplete(false)

    const res = await fetch('/api/crm/provider-standard-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'preview',
        csvText,
        source_name: sourceName,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Could not preview import.')
      setLoading(false)
      return
    }

    setRows(data.rows || [])
    setSummary(data.summary || null)
    setLoading(false)
  }

  async function runImport() {
    setImporting(true)
    setError(null)

    const res = await fetch('/api/crm/provider-standard-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'import',
        csvText,
        source_name: sourceName,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Could not import provider standard data.')
      setImporting(false)
      return
    }

    setRows(data.rows || [])
    setSummary(data.summary || null)
    setImportComplete(true)
    setImporting(false)
  }

  function useTemplate() {
    setCsvText(TEMPLATE)
    setRows([])
    setSummary(null)
    setError(null)
    setImportComplete(false)
  }

  const validRows = rows.filter(row => row.valid)
  const invalidRows = rows.filter(row => !row.valid)

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <div className="crm-breadcrumb">
            <Link href="/crm" className="crm-breadcrumb-link">
              CRM
            </Link>
            <span>/</span>
            <span>Provider standard import</span>
          </div>

          <h1 className="crm-page-title">Provider Standard Import</h1>
          <p className="crm-page-sub">
            Import evidence of which providers deliver which apprenticeship standards.
            This powers evidence-based Speculation searches.
          </p>
        </div>

        <Link href="/crm/speculations" className="crm-btn-ghost">
          Back to Speculation
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
        <div className="crm-card">
          <h2 className="crm-card-title" style={{ marginBottom: 12 }}>
            Import CSV
          </h2>

          <div className="crm-field" style={{ marginBottom: 12 }}>
            <label className="crm-label">Source name</label>
            <input
              className="crm-input"
              value={sourceName}
              onChange={event => setSourceName(event.target.value)}
              placeholder="e.g. GOV.UK provider delivery import"
            />
          </div>

          <div className="crm-field" style={{ marginBottom: 12 }}>
            <label className="crm-label">CSV data</label>
            <textarea
              className="crm-input"
              rows={16}
              value={csvText}
              onChange={event => {
                setCsvText(event.target.value)
                setImportComplete(false)
              }}
              placeholder="Paste CSV data here..."
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="crm-btn-ghost"
              onClick={useTemplate}
            >
              Use template
            </button>

            <button
              type="button"
              className="crm-btn-ghost"
              onClick={runPreview}
              disabled={loading || !csvText.trim()}
            >
              {loading ? 'Previewing...' : 'Preview'}
            </button>

            <button
              type="button"
              className="crm-btn-primary"
              onClick={runImport}
              disabled={importing || !csvText.trim() || validRows.length === 0}
            >
              {importing ? 'Importing...' : 'Import valid rows'}
            </button>
          </div>

          {error && (
            <p
              style={{
                marginTop: 12,
                fontSize: 12,
                color: '#e53e3e',
                fontWeight: 700,
              }}
            >
              {error}
            </p>
          )}

          {importComplete && (
            <p
              style={{
                marginTop: 12,
                fontSize: 12,
                color: '#217822',
                fontWeight: 800,
              }}
            >
              Import complete.
            </p>
          )}

          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 12,
              background: 'var(--light-bg)',
              border: '1px solid var(--border-light)',
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>
              Accepted headers
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              provider_name, ukprn, website, standard_name, standard_reference,
              sector, route, regions, delivery_modes, source, source_url
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {summary && (
            <div className="crm-stats-grid">
              <MiniStat label="Rows received" value={summary.rows_received} />
              <MiniStat label="Valid rows" value={summary.rows_valid} tone="green" />
              <MiniStat label="Warnings" value={summary.rows_with_warnings ?? invalidRows.length} tone="amber" />
              <MiniStat label="Matched clients" value={summary.matched_clients} tone="blue" />
              <MiniStat label="Matched leads" value={summary.matched_leads} tone="blue" />
              {summary.rows_imported !== undefined && (
                <MiniStat label="Imported" value={summary.rows_imported} tone="green" />
              )}
            </div>
          )}

          <div className="crm-card crm-table-card">
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <div>
                <h2 className="crm-card-title">Preview</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  Review matched standards and CRM links before importing.
                </p>
              </div>

              <span className="crm-badge crm-badge-blue">
                {rows.length} rows
              </span>
            </div>

            <table className="crm-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Provider</th>
                  <th>Standard matched</th>
                  <th>CRM match</th>
                  <th>Regions</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {rows.slice(0, 100).map(row => (
                  <tr key={row.row_number}>
                    <td>{row.row_number}</td>

                    <td>
                      <p className="crm-table-main">
                        {row.provider_name || 'Missing provider'}
                      </p>
                      <p className="crm-table-sub">
                        {row.website || 'No website'}
                      </p>
                    </td>

                    <td>
                      <p className="crm-table-main">
                        {row.matched_standard_name || row.standard_name || 'No standard'}
                      </p>
                      <p className="crm-table-sub">
                        {row.matched_standard_reference || row.standard_reference || 'No reference'}
                      </p>
                    </td>

                    <td>
                      {row.client_id ? (
                        <span className="crm-badge" style={{ background: '#e8f5e8', color: '#217822' }}>
                          Client: {row.client_name}
                        </span>
                      ) : row.lead_id ? (
                        <span className="crm-badge crm-badge-blue">
                          Lead: {row.lead_name}
                        </span>
                      ) : (
                        <span className="crm-badge" style={{ background: '#f0f0f2', color: '#737373' }}>
                          New provider
                        </span>
                      )}
                    </td>

                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {row.regions?.length ? row.regions.join(', ') : '—'}
                      </span>
                    </td>

                    <td>
                      {row.valid ? (
                        <span className="crm-badge" style={{ background: '#e8f5e8', color: '#217822' }}>
                          Valid
                        </span>
                      ) : (
                        <span className="crm-badge" style={{ background: '#fef2f2', color: '#e53e3e' }}>
                          Needs review
                        </span>
                      )}

                      {row.warnings?.length > 0 && (
                        <p style={{ fontSize: 11, color: '#d97706', marginTop: 5 }}>
                          {row.warnings.join(', ')}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {rows.length === 0 && (
              <p className="crm-empty crm-empty-table">
                Paste CSV data and click Preview.
              </p>
            )}

            {rows.length > 100 && (
              <p style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                Showing first 100 rows.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'green' | 'blue' | 'amber'
}) {
  const colour =
    tone === 'green'
      ? '#217822'
      : tone === 'blue'
        ? '#0B72B8'
        : tone === 'amber'
          ? '#d97706'
          : 'var(--primary)'

  return (
    <div className="crm-stat-card">
      <p className="crm-stat-label">{label}</p>
      <p className="crm-stat-value" style={{ color: colour }}>
        {value}
      </p>
    </div>
  )
}