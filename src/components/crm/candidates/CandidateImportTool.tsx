'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

type ImportRow = {
  rowNumber: number
  original: Record<string, any>
  selected: boolean
  error: string | null
  imported: boolean
  importError: string | null
}

type MappingState = {
  first_name: string
  last_name: string
  email: string
  phone: string
  linkedin: string
  job_title: string
  postcode: string
  town_city: string
  county: string
  notes: string
  qualifications: string
}

const EMPTY_MAPPING: MappingState = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  linkedin: '',
  job_title: '',
  postcode: '',
  town_city: '',
  county: '',
  notes: '',
  qualifications: '',
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function splitName(fullName: string) {
  const parts = clean(fullName).split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return { first_name: '', last_name: '' }
  }

  if (parts.length === 1) {
    return { first_name: parts[0], last_name: '' }
  }

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' '),
  }
}

function normaliseHeader(value: string) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function guessMapping(headers: string[]): MappingState {
  const normalised = headers.map(header => ({
    header,
    key: normaliseHeader(header),
  }))

  function find(...terms: string[]) {
    const exact = normalised.find(item => terms.includes(item.key))
    if (exact) return exact.header

    const partial = normalised.find(item =>
      terms.some(term => item.key.includes(term)),
    )

    return partial?.header || ''
  }

  return {
    first_name: find('first_name', 'firstname', 'forename'),
    last_name: find('last_name', 'lastname', 'surname'),
    email: find('email', 'email_address'),
    phone: find('phone', 'telephone', 'mobile', 'mobile_number', 'contact_number'),
    linkedin: find('linkedin', 'linkedin_url'),
    job_title: find('job_title', 'current_job_title', 'role', 'current_role'),
    postcode: find('postcode', 'post_code', 'zip'),
    town_city: find('town_city', 'town', 'city', 'location'),
    county: find('county'),
    notes: find('notes', 'comments', 'summary'),
    qualifications: find('qualifications', 'certificates', 'awards'),
  }
}

function valueFrom(row: ImportRow, column: string) {
  if (!column) return ''
  return clean(row.original[column])
}

function hasContactMethod(row: ImportRow, mapping: MappingState) {
  return Boolean(
    valueFrom(row, mapping.email) ||
      valueFrom(row, mapping.phone) ||
      valueFrom(row, mapping.linkedin),
  )
}

function getMappedCandidate(
  row: ImportRow,
  mapping: MappingState,
  defaults: {
    status: string
    source: string
    actively_looking: boolean
    main_role_type: string
    specific_roles: string
    can_deliver: string
    work_type_pref: string
  },
) {
  let firstName = valueFrom(row, mapping.first_name)
  let lastName = valueFrom(row, mapping.last_name)

  if (!firstName && !lastName) {
    const possibleName =
      clean(row.original.name) ||
      clean(row.original.Name) ||
      clean(row.original.full_name) ||
      clean(row.original['Full Name'])

    const split = splitName(possibleName)

    firstName = split.first_name
    lastName = split.last_name
  }

  const specificRoles = defaults.specific_roles
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)

  const primarySpecificRole =
    specificRoles[0] ||
    valueFrom(row, mapping.job_title) ||
    null

  return {
    first_name: firstName,
    last_name: lastName,
    email: valueFrom(row, mapping.email) || null,
    phone: valueFrom(row, mapping.phone) || null,
    linkedin: valueFrom(row, mapping.linkedin) || null,
    job_title: valueFrom(row, mapping.job_title) || null,
    postcode: valueFrom(row, mapping.postcode) || null,
    town_city: valueFrom(row, mapping.town_city) || null,
    county: valueFrom(row, mapping.county) || null,
    notes: valueFrom(row, mapping.notes) || null,
    qualifications: valueFrom(row, mapping.qualifications) || null,

    source: defaults.source || 'Spreadsheet import',
    status: defaults.status || 'passive',
    actively_looking: defaults.actively_looking,
    main_role_type: defaults.main_role_type || null,
    sub_role_type: primarySpecificRole,
    seeking_role_type: primarySpecificRole,
    looking_for_roles: specificRoles,
    can_deliver: defaults.can_deliver || null,
    work_type_pref: defaults.work_type_pref || null,
  }
}

export default function CandidateImportTool() {
  const router = useRouter()

  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<ImportRow[]>([])
  const [mapping, setMapping] = useState<MappingState>(EMPTY_MAPPING)

  const [defaults, setDefaults] = useState({
    status: 'passive',
    source: 'Spreadsheet import',
    actively_looking: false,
    main_role_type: '',
    specific_roles: '',
    can_deliver: '',
    work_type_pref: '',
  })

  const [skipNoPostcode, setSkipNoPostcode] = useState(true)
  const [skipNoPhone, setSkipNoPhone] = useState(false)
  const [skipNoEmail, setSkipNoEmail] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<string | null>(null)

  const selectedRows = rows.filter(row => row.selected)
  const importableRows = selectedRows.filter(row => !row.error && !row.imported)

  const previewRows = useMemo(() => {
    return rows.map(row => {
      const candidate = getMappedCandidate(row, mapping, defaults)

      let error: string | null = null

      if (!candidate.first_name || !candidate.last_name) {
        error = 'Missing first name or last name'
      } else if (!hasContactMethod(row, mapping)) {
        error = 'Missing contact method'
      } else if (skipNoPostcode && !candidate.postcode) {
        error = 'Missing postcode'
      } else if (skipNoPhone && !candidate.phone) {
        error = 'Missing phone'
      } else if (skipNoEmail && !candidate.email) {
        error = 'Missing email'
      }

      return {
        ...row,
        candidate,
        error,
      }
    })
  }, [rows, mapping, defaults, skipNoPostcode, skipNoPhone, skipNoEmail])

  async function handleFile(file: File) {
    setFileName(file.name)
    setImportSummary(null)

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: '',
    })

    const detectedHeaders = Array.from(
      new Set(jsonRows.flatMap(row => Object.keys(row))),
    )

    setHeaders(detectedHeaders)
    setMapping(guessMapping(detectedHeaders))
    setRows(
      jsonRows.map((row, index) => ({
        rowNumber: index + 2,
        original: row,
        selected: true,
        error: null,
        imported: false,
        importError: null,
      })),
    )
  }

  function updateMapping(key: keyof MappingState, value: string) {
    setMapping(current => ({
      ...current,
      [key]: value,
    }))
  }

  function toggleRow(rowNumber: number) {
    setRows(current =>
      current.map(row =>
        row.rowNumber === rowNumber
          ? { ...row, selected: !row.selected }
          : row,
      ),
    )
  }

  function deselectInvalidRows() {
    const invalidRowNumbers = new Set(
      previewRows.filter(row => row.error).map(row => row.rowNumber),
    )

    setRows(current =>
      current.map(row =>
        invalidRowNumbers.has(row.rowNumber)
          ? { ...row, selected: false }
          : row,
      ),
    )
  }

  async function importCandidates() {
    setImporting(true)
    setImportSummary(null)

    let imported = 0
    let skipped = 0
    let failed = 0

    const nextRows = [...rows]

    for (const previewRow of previewRows) {
      const rowIndex = nextRows.findIndex(
        row => row.rowNumber === previewRow.rowNumber,
      )

      if (!previewRow.selected || previewRow.error || previewRow.imported) {
        skipped += 1
        continue
      }

      try {
        const res = await fetch('/api/crm/candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(previewRow.candidate),
        })

        const json = await res.json().catch(() => null)

        if (!res.ok || json?.error) {
          throw new Error(json?.error || 'Could not import candidate')
        }

        if (json?.duplicate) {
          nextRows[rowIndex] = {
            ...nextRows[rowIndex],
            imported: false,
            importError: `Duplicate found: ${json?.match?.matchedOn || 'existing candidate'}`,
          }
          skipped += 1
        } else {
          nextRows[rowIndex] = {
            ...nextRows[rowIndex],
            imported: true,
            importError: null,
          }
          imported += 1
        }
      } catch (error: any) {
        nextRows[rowIndex] = {
          ...nextRows[rowIndex],
          imported: false,
          importError: error?.message || 'Import failed',
        }
        failed += 1
      }
    }

    setRows(nextRows)
    setImportSummary(
      `Import complete: ${imported} imported, ${skipped} skipped, ${failed} failed.`,
    )
    setImporting(false)
  }

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <div className="crm-breadcrumb">
            <Link href="/crm/candidates" className="crm-breadcrumb-link">
              Candidates
            </Link>
            <span>/</span>
            <span>Import</span>
          </div>

          <h1 className="crm-page-title">Candidate Import</h1>
          <p className="crm-page-sub">
            Upload a spreadsheet, clean the rows, set defaults and import approved candidates into the CRM.
          </p>
        </div>

        <Link href="/crm/candidates" className="crm-btn-ghost">
          Back to candidates
        </Link>
      </div>

      <div className="crm-card" style={{ padding: 18, marginBottom: 16 }}>
        <h2 className="crm-card-title">1. Upload spreadsheet</h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          Supports .xlsx, .xls and .csv files. The first sheet will be used.
        </p>

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="crm-input"
          onChange={event => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />

        {fileName && (
          <p style={{ marginTop: 10, fontSize: 12, fontWeight: 800 }}>
            Loaded: {fileName} · {rows.length} rows
          </p>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <div className="crm-card" style={{ padding: 18, marginBottom: 16 }}>
            <h2 className="crm-card-title">2. Map columns</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Match spreadsheet columns to CRM fields. Guesses have been made automatically where possible.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: 10,
              }}
            >
              {Object.entries(mapping).map(([key, value]) => (
                <label key={key} style={{ display: 'grid', gap: 6 }}>
                  <span className="crm-label">{key.replace(/_/g, ' ')}</span>
                  <select
                    className="crm-select"
                    value={value}
                    onChange={event =>
                      updateMapping(key as keyof MappingState, event.target.value)
                    }
                  >
                    <option value="">Not mapped</option>
                    {headers.map(header => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="crm-card" style={{ padding: 18, marginBottom: 16 }}>
            <h2 className="crm-card-title">3. Bulk defaults and clean-up rules</h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <label style={{ display: 'grid', gap: 6 }}>
                <span className="crm-label">Status</span>
                <select
                  className="crm-select"
                  value={defaults.status}
                  onChange={event =>
                    setDefaults(current => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="passive">Passive</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span className="crm-label">Source</span>
                <input
                  className="crm-input"
                  value={defaults.source}
                  onChange={event =>
                    setDefaults(current => ({
                      ...current,
                      source: event.target.value,
                    }))
                  }
                  placeholder="CV Library"
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span className="crm-label">Main role type</span>
                <input
                  className="crm-input"
                  value={defaults.main_role_type}
                  onChange={event =>
                    setDefaults(current => ({
                      ...current,
                      main_role_type: event.target.value,
                    }))
                  }
                  placeholder="Delivery"
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span className="crm-label">Specific roles</span>
                <input
                  className="crm-input"
                  value={defaults.specific_roles}
                  onChange={event =>
                    setDefaults(current => ({
                      ...current,
                      specific_roles: event.target.value,
                    }))
                  }
                  placeholder="Assessor, Skills Coach, Tutor/Trainer"
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span className="crm-label">Standards / can deliver</span>
                <input
                  className="crm-input"
                  value={defaults.can_deliver}
                  onChange={event =>
                    setDefaults(current => ({
                      ...current,
                      can_deliver: event.target.value,
                    }))
                  }
                  placeholder="Accountancy or Taxation Professional"
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span className="crm-label">Work type</span>
                <select
                  className="crm-select"
                  value={defaults.work_type_pref}
                  onChange={event =>
                    setDefaults(current => ({
                      ...current,
                      work_type_pref: event.target.value,
                    }))
                  }
                >
                  <option value="">Not set</option>
                  <option value="office">Office / On-site</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="remote">Remote</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <label className="crm-badge" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={skipNoPostcode}
                  onChange={event => setSkipNoPostcode(event.target.checked)}
                  style={{ marginRight: 6 }}
                />
                Skip rows without postcode
              </label>

              <label className="crm-badge" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={skipNoPhone}
                  onChange={event => setSkipNoPhone(event.target.checked)}
                  style={{ marginRight: 6 }}
                />
                Skip rows without phone
              </label>

              <label className="crm-badge" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={skipNoEmail}
                  onChange={event => setSkipNoEmail(event.target.checked)}
                  style={{ marginRight: 6 }}
                />
                Skip rows without email
              </label>

              <button
                type="button"
                className="crm-btn-ghost crm-btn-sm"
                onClick={deselectInvalidRows}
              >
                Deselect invalid rows
              </button>
            </div>
          </div>

          <div className="crm-card crm-table-card" style={{ marginBottom: 16 }}>
            <div
              style={{
                padding: 14,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2 className="crm-card-title">4. Preview import</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {selectedRows.length} selected · {importableRows.length} ready to import ·{' '}
                  {previewRows.filter(row => row.error).length} invalid
                </p>
              </div>

              <button
                type="button"
                className="crm-btn-primary"
                onClick={importCandidates}
                disabled={importing || importableRows.length === 0}
              >
                {importing ? 'Importing...' : `Import ${importableRows.length} candidates`}
              </button>
            </div>

            {importSummary && (
              <p
                style={{
                  margin: '0 14px 14px',
                  padding: 10,
                  borderRadius: 10,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {importSummary}
              </p>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Import</th>
                    <th>Row</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Postcode</th>
                    <th>Status</th>
                    <th>Defaults</th>
                    <th>Issue</th>
                  </tr>
                </thead>

                <tbody>
                  {previewRows.slice(0, 500).map(row => {
                    const candidate = row.candidate

                    return (
                      <tr key={row.rowNumber}>
                        <td>
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => toggleRow(row.rowNumber)}
                            disabled={row.imported}
                          />
                        </td>
                        <td>{row.rowNumber}</td>
                        <td>
                          {candidate.first_name} {candidate.last_name}
                        </td>
                        <td>{candidate.email || '—'}</td>
                        <td>{candidate.phone || '—'}</td>
                        <td>{candidate.postcode || '—'}</td>
                        <td>{candidate.status}</td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {candidate.main_role_type && (
                              <span className="crm-badge">{candidate.main_role_type}</span>
                            )}
                            {candidate.sub_role_type && (
                              <span className="crm-badge crm-badge-blue">
                                {candidate.sub_role_type}
                              </span>
                            )}
                            {candidate.can_deliver && (
                              <span className="crm-badge">{candidate.can_deliver}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {row.imported ? (
                            <span style={{ color: '#217822', fontWeight: 800 }}>
                              Imported
                            </span>
                          ) : row.importError ? (
                            <span style={{ color: '#d97706', fontWeight: 800 }}>
                              {row.importError}
                            </span>
                          ) : row.error ? (
                            <span style={{ color: '#e53e3e', fontWeight: 800 }}>
                              {row.error}
                            </span>
                          ) : (
                            <span style={{ color: '#217822', fontWeight: 800 }}>
                              Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}