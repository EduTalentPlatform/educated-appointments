'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ROLE_TYPE_HIERARCHY, MAIN_ROLE_TYPES } from '@/lib/crm-data'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Candidate = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  job_title: string | null
  seeking_role_type: string | null
  main_role_type: string | null
  sub_role_type: string | null
  can_deliver: string | null
  preferred_location: string | null
  postcode?: string | null
  source: string | null
  linkedin?: string | null
  actively_looking: boolean
  work_type_pref?: string | null
  status?: string | null
  created_at: string
  applications?: any[]
    looking_for_roles?: string[] | string | null
  qualifications?: string | null
  notes?: string | null
  town_city?: string | null
  county?: string | null
  lat?: number | string | null
  lng?: number | string | null
  latitude?: number | string | null
  longitude?: number | string | null
  postcode_normalised?: string | null
  postcode_geocoded_at?: string | null
  distance_miles?: number | null
}

type ClientRef = {
  id?: string
  company_name?: string | null
}

type VacancyOption = {
  id: string
  title: string
  status?: string | null
  location?: string | null
  region?: string | null
  clients?: ClientRef | ClientRef[] | null
}

const SOURCES = [
  '',
  'LinkedIn',
  'Job Board',
  'Referral',
  'Direct approach',
  'Website registration',
  'Indeed',
  'Reed',
  'CV Library',
  'Other',
]

const REGIONS = [
  '',
  'East of England',
  'East Midlands',
  'West Midlands',
  'North West',
  'North East',
  'Yorkshire & Humber',
  'South East',
  'South West',
  'London',
  'Wales',
  'Scotland',
  'Northern Ireland',
  'Remote / Flexible',
]

const WORK_TYPES = [
  { value: 'all', label: 'All work types' },
  { value: 'office', label: 'Office / On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name_az', label: 'Name A–Z' },
  { value: 'name_za', label: 'Name Z–A' },
  { value: 'looking_for_az', label: 'Looking for A–Z' },
  { value: 'role_type_az', label: 'Role type A–Z' },
  { value: 'location_az', label: 'Location A–Z' },
  { value: 'applications_high', label: 'Most applications' },
  { value: 'applications_low', label: 'Fewest applications' },
]

interface Props {
  initialCandidates: Candidate[]
  totalCandidatesCount: number
  activelyLookingCandidatesCount: number
}

export default function CandidatesList({
  initialCandidates,
  totalCandidatesCount,
  activelyLookingCandidatesCount,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [candidates, setCandidates] = useState(initialCandidates)

    const [radiusKeyword, setRadiusKeyword] = useState('')
  const [radiusPostcode, setRadiusPostcode] = useState('')
  const [radiusMiles, setRadiusMiles] = useState('15')
  const [radiusStatus, setRadiusStatus] = useState('any')
  const [radiusSearching, setRadiusSearching] = useState(false)
  const [radiusSearchError, setRadiusSearchError] = useState<string | null>(null)
  const [radiusSearchSummary, setRadiusSearchSummary] = useState<string | null>(null)
  const [radiusSearchResults, setRadiusSearchResults] = useState<Candidate[] | null>(null)

  const [search, setSearch] = useState('')
  const [mainRoleFilter, setMainRoleFilter] = useState('all')
  const [specificRoleFilter, setSpecificRoleFilter] = useState('all')
  const [standardFilter, setStandardFilter] = useState('')
  const [standardOptionSearch, setStandardOptionSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [workTypeFilter, setWorkTypeFilter] = useState('all')
  const [lookingFilter, setLookingFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [cvParsing, setCvParsing] = useState(false)
  const [cvParseError, setCvParseError] = useState<string | null>(null)
  const [cvParsed, setCvParsed] = useState(false)
  const [dragOverCv, setDragOverCv] = useState(false)
  const [cvFileName, setCvFileName] = useState<string | null>(null)
  const [cvFile, setCvFile] = useState<File | null>(null)

  const [vacancyOptions, setVacancyOptions] = useState<VacancyOption[]>([])
  const [vacanciesLoaded, setVacanciesLoaded] = useState(false)
  const [vacanciesLoading, setVacanciesLoading] = useState(false)
  const [vacanciesError, setVacanciesError] = useState<string | null>(null)

  const cvRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    linkedin: '',
    add_to_vacancy_id: '',
    source: '',
    postcode: '',
    actively_looking: true,
  })

  useEffect(() => {
    if (!showForm || vacanciesLoaded || vacanciesLoading) return

    void loadVacancyOptions()
  }, [showForm, vacanciesLoaded, vacanciesLoading])

  async function loadVacancyOptions() {
    setVacanciesLoading(true)
    setVacanciesError(null)

    let { data, error } = await supabase
      .from('vacancies')
      .select('id, title, status, location, region, clients(id, company_name)')
      .order('created_at', { ascending: false })
      .limit(250)

    if (error) {
      const fallback = await supabase
        .from('vacancies')
        .select('id, title, status, location, region')
        .order('created_at', { ascending: false })
        .limit(250)

      data = (fallback.data ?? []).map(vacancy => ({
  ...vacancy,
  clients: [],
}))
error = fallback.error
    }

    if (error) {
      setVacanciesError(error.message)
      setVacanciesLoading(false)
      setVacanciesLoaded(true)
      return
    }

    const closedStatuses = new Set([
      'closed',
      'lost',
      'filled',
      'placed',
      'archived',
      'cancelled',
      'canceled',
      'inactive',
    ])

    const liveVacancies = (data || [])
      .filter(vacancy => {
        const status = String(vacancy.status || '').toLowerCase().trim()
        return !status || !closedStatuses.has(status)
      })
      .map(vacancy => vacancy as VacancyOption)

    setVacancyOptions(liveVacancies)
    setVacanciesLoaded(true)
    setVacanciesLoading(false)
  }

    async function runRadiusSearch(event?: FormEvent) {
    event?.preventDefault()

    if (!radiusPostcode.trim()) {
      setRadiusSearchError('Please enter a postcode.')
      return
    }

    setRadiusSearching(true)
    setRadiusSearchError(null)
    setRadiusSearchSummary(null)

    try {
      const res = await fetch('/api/crm/candidate-radius-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: radiusKeyword,
          postcode: radiusPostcode,
          radius_miles: Number(radiusMiles || 15),
          status: radiusStatus,
        }),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || 'Could not search candidates.')
      }

      const rows = Array.isArray(json?.results) ? json.results : []

      setRadiusSearchResults(rows)
      setSearch('')
      setRadiusSearchSummary(
        `${rows.length} candidate${rows.length === 1 ? '' : 's'} found within ${
          json?.search?.radius_miles || radiusMiles
        } miles of ${json?.search?.postcode || radiusPostcode}.`,
      )
    } catch (error: any) {
      setRadiusSearchError(error?.message || 'Could not search candidates.')
    } finally {
      setRadiusSearching(false)
    }
  }

  function clearRadiusSearch() {
    setRadiusSearchResults(null)
    setRadiusSearchSummary(null)
    setRadiusSearchError(null)
    setRadiusKeyword('')
    setRadiusPostcode('')
    setRadiusMiles('15')
    setRadiusStatus('any')
  }

  const mainRoleOptions = useMemo(() => {
    const fromCandidates = candidates
      .map(c => c.main_role_type)
      .filter(Boolean) as string[]

    return Array.from(new Set([...MAIN_ROLE_TYPES, ...fromCandidates])).sort()
  }, [candidates])

  const specificRoleOptions = useMemo(() => {
    const fromCandidates = candidates
      .map(c => c.sub_role_type || c.seeking_role_type)
      .filter(Boolean) as string[]

    return Array.from(new Set(fromCandidates)).sort()
  }, [candidates])

  const standardOptions = useMemo(() => {
  const standards = candidates.flatMap(candidate =>
    (candidate.can_deliver || '')
      .split(',')
      .map(standard => standard.trim())
      .filter(Boolean),
  )

  return Array.from(new Set(standards)).sort()
}, [candidates])

const visibleStandardOptions = useMemo(() => {
  const term = standardOptionSearch.toLowerCase().trim()

  if (!term) return standardOptions.slice(0, 12)

  return standardOptions
    .filter(standard => standard.toLowerCase().includes(term))
    .slice(0, 12)
}, [standardOptions, standardOptionSearch])

  const locationOptions = useMemo(() => {
    const fromCandidates = candidates
      .map(c => c.preferred_location)
      .filter(Boolean) as string[]

    return Array.from(new Set(fromCandidates)).sort()
  }, [candidates])

  const sourceOptions = useMemo(() => {
    const fromCandidates = candidates
      .map(c => c.source)
      .filter(Boolean) as string[]

    return Array.from(new Set(fromCandidates)).sort()
  }, [candidates])

    const candidateRows = radiusSearchResults ?? candidates

  const filtered = candidateRows
  .filter(c => {
    const searchTerm = search.toLowerCase().trim()

    const candidateName = `${c.first_name} ${c.last_name}`.toLowerCase()
    const lookingFor = (c.sub_role_type || c.seeking_role_type || '').toLowerCase()
    const mainRole = (c.main_role_type || '').toLowerCase()
    const standards = (c.can_deliver || '').toLowerCase()
    const location = (c.preferred_location || '').toLowerCase()
    const source = (c.source || '').toLowerCase()

    const matchSearch =
      !searchTerm ||
      candidateName.includes(searchTerm) ||
      lookingFor.includes(searchTerm) ||
      mainRole.includes(searchTerm) ||
      standards.includes(searchTerm) ||
      location.includes(searchTerm) ||
      source.includes(searchTerm)

    const matchMainRole =
      mainRoleFilter === 'all' || c.main_role_type === mainRoleFilter

    const matchSpecificRole =
      specificRoleFilter === 'all' ||
      c.sub_role_type === specificRoleFilter ||
      c.seeking_role_type === specificRoleFilter

    const matchStandard =
      !standardFilter.trim() ||
      standards.includes(standardFilter.toLowerCase().trim())

    const matchLocation =
      locationFilter === 'all' || c.preferred_location === locationFilter

    const matchSource =
      sourceFilter === 'all' || c.source === sourceFilter

    const matchWorkType =
      workTypeFilter === 'all' || c.work_type_pref === workTypeFilter

    const matchLooking =
      lookingFilter === 'all' ||
      (lookingFilter === 'looking' ? c.actively_looking : !c.actively_looking)

    return (
      matchSearch &&
      matchMainRole &&
      matchSpecificRole &&
      matchStandard &&
      matchLocation &&
      matchSource &&
      matchWorkType &&
      matchLooking
    )
  })
  .sort((a, b) => {
    const aName = `${a.first_name} ${a.last_name}`.trim()
    const bName = `${b.first_name} ${b.last_name}`.trim()
    const aLookingFor = a.sub_role_type || a.seeking_role_type || ''
    const bLookingFor = b.sub_role_type || b.seeking_role_type || ''
    const aMainRole = a.main_role_type || ''
    const bMainRole = b.main_role_type || ''
    const aLocation = a.preferred_location || ''
    const bLocation = b.preferred_location || ''
    const aApps = a.applications?.length ?? 0
    const bApps = b.applications?.length ?? 0

    switch (sortBy) {
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()

      case 'name_az':
        return aName.localeCompare(bName)

      case 'name_za':
        return bName.localeCompare(aName)

      case 'looking_for_az':
        return aLookingFor.localeCompare(bLookingFor)

      case 'role_type_az':
        return aMainRole.localeCompare(bMainRole)

      case 'location_az':
        return aLocation.localeCompare(bLocation)

      case 'applications_high':
        return bApps - aApps

      case 'applications_low':
        return aApps - bApps

      case 'newest':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  const hasActiveFilters =
  search ||
  mainRoleFilter !== 'all' ||
  specificRoleFilter !== 'all' ||
  standardFilter ||
  locationFilter !== 'all' ||
  sourceFilter !== 'all' ||
  workTypeFilter !== 'all' ||
  lookingFilter !== 'all'

  function clearFilters() {
  setSearch('')
  setMainRoleFilter('all')
  setSpecificRoleFilter('all')
  setStandardFilter('')
  setStandardOptionSearch('')
  setLocationFilter('all')
  setSourceFilter('all')
  setWorkTypeFilter('all')
  setLookingFilter('all')
}

  function getLookingFor(c: Candidate) {
    return c.sub_role_type || c.seeking_role_type || '—'
  }

  function getMainRole(c: Candidate) {
    return c.main_role_type || '—'
  }

  function getWorkTypeLabel(value?: string | null) {
    if (!value) return '—'
    if (value === 'office') return 'Office / On-site'
    if (value === 'hybrid') return 'Hybrid'
    if (value === 'remote') return 'Remote'
    return value
  }

  async function parseCv(file: File) {
    setCvParsing(true)
    setCvParseError(null)
    setCvParsed(false)
    setCvFileName(file.name)
    setCvFile(file)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/crm/parse-cv-basic', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.result) {
        setCvParseError(
          data?.error ||
            'The CV has been attached, but the free parser could not read enough detail. You can still enter the details manually.',
        )
        setCvParsing(false)
        return
      }

      const r = data.result

      setForm(f => ({
        ...f,
        first_name: r.first_name ?? f.first_name,
        last_name: r.last_name ?? f.last_name,
        email: r.email ?? f.email,
        phone: r.phone ?? f.phone,
        linkedin: r.linkedin ?? f.linkedin,
        postcode: r.postcode ?? f.postcode,
      }))

      setCvParsed(true)
    } catch (error: any) {
      setCvParseError(
        error?.message ||
          'The CV has been attached, but the free parser could not read enough detail.',
      )
    }

    setCvParsing(false)
  }

  async function saveParsedCvDocument(candidateId: string) {
  if (!cvFile) return null

  const formData = new FormData()
  formData.append('candidate_id', candidateId)
  formData.append('name', 'CV')
  formData.append('doc_type', 'cv')
  formData.append('file', cvFile)

  const res = await fetch('/api/crm/candidate-document-upload', {
    method: 'POST',
    body: formData,
  })

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(json?.error || 'Could not upload CV document.')
  }

  return json?.data ?? null
}

  function resetAddCandidateForm() {
    setForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      linkedin: '',
      add_to_vacancy_id: '',
      source: '',
      postcode: '',
      actively_looking: true,
    })

    setCvFile(null)
    setCvFileName(null)
    setCvParsed(false)
    setCvParseError(null)
    setSaveError(null)
    setDragOverCv(false)
  }

  function closeAddCandidateModal() {
    setShowForm(false)
    resetAddCandidateForm()
  }

  function getClient(clientField: ClientRef | ClientRef[] | null | undefined) {
    if (Array.isArray(clientField)) return clientField[0] ?? null
    return clientField ?? null
  }

  function getVacancyLabel(vacancy: VacancyOption) {
    const client = getClient(vacancy.clients)
    const clientName = client?.company_name ? ` — ${client.company_name}` : ''
    const location = vacancy.location || vacancy.region ? ` (${vacancy.location || vacancy.region})` : ''

    return `${vacancy.title}${clientName}${location}`
  }

  async function createApplicationForCandidate(candidateId: string, vacancyId: string) {
    const res = await fetch('/api/crm/vacancies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addCandidate: true,
        candidateId,
        vacancyId,
        initialStatus: 'screening',
      }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      throw new Error(data?.error || 'Candidate saved, but could not be added to the selected job.')
    }

    return data?.application || null
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()

    setSaving(true)
    setSaveError(null)

    const addToVacancyId = form.add_to_vacancy_id

    const res = await fetch('/api/crm/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || null,
        phone: form.phone || null,
        linkedin: form.linkedin || null,
        source: form.source || 'crm',
        postcode: form.postcode || null,
        status: 'active',
        actively_looking: true,
      }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok || data?.error) {
      setSaveError(data?.error || 'Could not create candidate.')
      setSaving(false)
      return
    }

    const candidate = data?.data

    if (!candidate?.id) {
      setSaveError('Candidate was not returned after saving.')
      setSaving(false)
      return
    }

    if (data.duplicate && !addToVacancyId) {
      setSaveError(
        'This candidate already exists in the CRM, so a duplicate has not been created.',
      )
      setSaving(false)
      return
    }

    try {
      if (cvFile && !data.duplicate) {
        await saveParsedCvDocument(candidate.id)
      }

      if (addToVacancyId) {
        const application = await createApplicationForCandidate(candidate.id, addToVacancyId)

        if (application?.id) {
          router.push(`/crm/applications/${application.id}`)
          return
        }
      }

      if (!data.duplicate) {
        setCandidates(prev => [candidate, ...prev])
      }

      closeAddCandidateModal()
      router.refresh()
    } catch (error: any) {
      setSaveError(error?.message || 'Candidate saved, but something went wrong afterwards.')
    }

    setSaving(false)
  }

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Candidates</h1>
          <p className="crm-page-sub">
  {Math.max(totalCandidatesCount, candidates.length).toLocaleString('en-GB')} on file ·{' '}
  {Math.max(
    activelyLookingCandidatesCount,
    candidates.filter(c => c.actively_looking).length,
  ).toLocaleString('en-GB')}{' '}
  actively looking
</p>
        </div>

              <form
        onSubmit={runRadiusSearch}
        className="crm-card"
        style={{
          padding: 18,
          marginBottom: 16,
          border: '1px solid rgba(53,45,235,0.14)',
          background:
            'linear-gradient(135deg, rgba(53,45,235,0.06), #ffffff)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 14,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            marginBottom: 14,
          }}
        >
          <div>
            <p className="crm-card-title">Candidate radius search</p>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 12,
                color: 'var(--text-muted)',
                lineHeight: 1.45,
              }}
            >
              Search by role or keyword within a distance of a postcode.
            </p>
          </div>

          {radiusSearchResults && (
            <button
              type="button"
              className="crm-btn-ghost crm-btn-sm"
              onClick={clearRadiusSearch}
            >
              Clear radius search
            </button>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(220px, 1.4fr) minmax(140px, 0.7fr) minmax(120px, 0.5fr) minmax(160px, 0.7fr) auto',
            gap: 10,
            alignItems: 'end',
          }}
        >
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="crm-label">Keyword / role</span>
            <input
              className="crm-input"
              value={radiusKeyword}
              onChange={event => setRadiusKeyword(event.target.value)}
              placeholder="Business Development Manager"
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span className="crm-label">Postcode</span>
            <input
              className="crm-input"
              value={radiusPostcode}
              onChange={event => setRadiusPostcode(event.target.value)}
              placeholder="DE24 8AA"
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span className="crm-label">Miles</span>
            <input
              className="crm-input"
              type="number"
              min={1}
              max={250}
              value={radiusMiles}
              onChange={event => setRadiusMiles(event.target.value)}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span className="crm-label">Status</span>
            <select
              className="crm-select"
              value={radiusStatus}
              onChange={event => setRadiusStatus(event.target.value)}
            >
              <option value="any">Any status</option>
              <option value="actively_looking">Actively looking</option>
              <option value="active">Active</option>
              <option value="passive">Passive</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <button
            type="submit"
            className="crm-btn-primary"
            disabled={radiusSearching}
            style={{ whiteSpace: 'nowrap' }}
          >
            {radiusSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {radiusSearchSummary && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 10,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {radiusSearchSummary}
          </div>
        )}

        {radiusSearchError && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 10,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {radiusSearchError}
          </div>
        )}
      </form>

        <button className="crm-btn-primary" onClick={() => setShowForm(true)}>
          + Add Candidate
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
  <div
    className="crm-filters-bar"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
    }}
  >
    <div
      className="crm-search-wrap"
      style={{
        minWidth: 280,
        maxWidth: 460,
        flex: '1 1 360px',
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>

      <input
        className="crm-search"
        placeholder="Search candidates..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
    </div>

    <div
      className="crm-status-filters"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
      }}
    >
      <button
        className={`crm-status-filter${lookingFilter === 'all' ? ' active' : ''}`}
        onClick={() => setLookingFilter('all')}
      >
        All
      </button>

      <button
        className={`crm-status-filter${lookingFilter === 'looking' ? ' active' : ''}`}
        onClick={() => setLookingFilter('looking')}
      >
        Actively looking
      </button>

      <button
        className={`crm-status-filter${lookingFilter === 'passive' ? ' active' : ''}`}
        onClick={() => setLookingFilter('passive')}
      >
        Passive
      </button>

      <button
        className={`crm-status-filter${showAdvancedFilters ? ' active' : ''}`}
        onClick={() => setShowAdvancedFilters(v => !v)}
      >
        Filters
        {hasActiveFilters && (
          <span
            style={{
              marginLeft: 6,
              background: 'var(--primary)',
              color: '#fff',
              borderRadius: 999,
              padding: '1px 6px',
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            on
          </span>
        )}
      </button>

      <select
  className="crm-select crm-select-sm"
  value={sortBy}
  onChange={e => setSortBy(e.target.value)}
  style={{ minWidth: 170 }}
>
  {SORT_OPTIONS.map(option => (
    <option key={option.value} value={option.value}>
      Sort: {option.label}
    </option>
  ))}
</select>
      
      {hasActiveFilters && (
        <button
          className="crm-btn-ghost crm-btn-sm"
          onClick={clearFilters}
        >
          Clear
        </button>
      )}
    </div>
  </div>

  {showAdvancedFilters && (
    <div
      className="crm-card"
      style={{
        padding: 14,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 10,
        marginBottom: 0,
      }}
    >
      <select
        className="crm-select crm-select-sm"
        value={mainRoleFilter}
        onChange={e => setMainRoleFilter(e.target.value)}
      >
        <option value="all">All role types</option>
        {mainRoleOptions.map(role => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>

      <select
        className="crm-select crm-select-sm"
        value={specificRoleFilter}
        onChange={e => setSpecificRoleFilter(e.target.value)}
      >
        <option value="all">All specific roles</option>
        {specificRoleOptions.map(role => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>

      <div
  style={{
    gridColumn: '1 / -1',
    border: '1px solid var(--border-light)',
    borderRadius: 10,
    padding: 12,
    background: 'var(--light-bg)',
  }}
>
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 10,
    }}
  >
    <div>
      <p
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: 'var(--text-dark)',
          marginBottom: 2,
        }}
      >
        Standards candidates can deliver
      </p>

      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        Showing standards already registered against candidates.
      </p>
    </div>

    {standardFilter && (
      <button
        type="button"
        className="crm-btn-ghost crm-btn-sm"
        onClick={() => {
          setStandardFilter('')
          setStandardOptionSearch('')
        }}
      >
        Clear standard
      </button>
    )}
  </div>

  <div className="crm-search-wrap" style={{ marginBottom: 10 }}>
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>

    <input
      className="crm-search"
      placeholder="Type to narrow standards..."
      value={standardOptionSearch}
      onChange={e => setStandardOptionSearch(e.target.value)}
    />
  </div>

  {standardOptions.length > 0 ? (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {visibleStandardOptions.map(standard => (
        <button
          key={standard}
          type="button"
          className={`crm-status-filter${standardFilter === standard ? ' active' : ''}`}
          onClick={() => setStandardFilter(standard)}
          style={{
            fontSize: 11,
            whiteSpace: 'nowrap',
          }}
        >
          {standard}
        </button>
      ))}

      {visibleStandardOptions.length === 0 && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          No matching standards found.
        </span>
      )}

      {!standardOptionSearch && standardOptions.length > 12 && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
          +{standardOptions.length - 12} more — type to narrow
        </span>
      )}
    </div>
  ) : (
    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
      No standards recorded against candidates yet.
    </p>
  )}
</div>

      <select
        className="crm-select crm-select-sm"
        value={locationFilter}
        onChange={e => setLocationFilter(e.target.value)}
      >
        <option value="all">All locations</option>
        {locationOptions.map(location => (
          <option key={location} value={location}>
            {location}
          </option>
        ))}
      </select>

      <select
        className="crm-select crm-select-sm"
        value={workTypeFilter}
        onChange={e => setWorkTypeFilter(e.target.value)}
      >
        {WORK_TYPES.map(type => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>

      <select
        className="crm-select crm-select-sm"
        value={sourceFilter}
        onChange={e => setSourceFilter(e.target.value)}
      >
        <option value="all">All sources</option>
        {sourceOptions.map(source => (
          <option key={source} value={source}>
            {source}
          </option>
        ))}
      </select>
    </div>
  )}
</div>

      <div className="crm-card crm-table-card">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Looking for</th>
              <th>Role type</th>
              <th>Standards</th>
              <th>Location</th>
              <th>Work type</th>
              <th>Status</th>
              <th>Applications</th>
              <th>Source</th>
              <th>Added</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map(c => (
              <tr
                key={c.id}
                onClick={() => router.push(`/crm/candidates/${c.id}`)}
                className="crm-table-row-clickable"
              >
                <td>
                  <p className="crm-table-main">
                    {c.first_name} {c.last_name}
                  </p>

                  <p className="crm-table-sub">
                    {c.phone || 'No phone recorded'}
                  </p>
                </td>

                <td>
                  <p className="crm-table-main">
                    {getLookingFor(c)}
                  </p>
                </td>

                <td>
  {c.main_role_type ? (
    <span
      className="crm-badge"
      style={{
        background: 'var(--primary-light)',
        color: 'var(--primary)',
        fontSize: 10,
      }}
    >
      {getMainRole(c)}
    </span>
  ) : (
    <span style={{ color: 'var(--text-muted)' }}>—</span>
  )}
</td>

<td>
  {c.can_deliver ? (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {c.can_deliver
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 2)
        .map(standard => (
          <span
            key={standard}
            className="crm-badge crm-badge-blue"
            style={{ fontSize: 9 }}
          >
            {standard}
          </span>
        ))}

      {c.can_deliver.split(',').filter(Boolean).length > 2 && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          +{c.can_deliver.split(',').filter(Boolean).length - 2}
        </span>
      )}
    </div>
  ) : (
    <span style={{ color: 'var(--text-muted)' }}>—</span>
  )}
</td>

                <td>{c.preferred_location || '—'}</td>

                <td>{getWorkTypeLabel(c.work_type_pref)}</td>

                <td>
                  <span
                    className="crm-badge"
                    style={{
                      background: c.actively_looking ? '#e8f5e8' : '#f0f0f2',
                      color: c.actively_looking ? '#217822' : '#737373',
                    }}
                  >
                    {c.actively_looking ? 'Actively looking' : 'Passive'}
                  </span>
                </td>

                <td>
                  <span className="crm-badge crm-badge-blue">
                    {c.applications?.length ?? 0}
                  </span>
                </td>

                <td>
                  <span
                    className="crm-badge"
                    style={{
                      background: '#f0f0f2',
                      color: '#737373',
                      fontSize: 10,
                    }}
                  >
                    {c.source || 'direct'}
                  </span>
                </td>

                <td>{new Date(c.created_at).toLocaleDateString('en-GB')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="crm-empty crm-empty-table">No candidates found.</p>
        )}
      </div>

      {/* New candidate modal */}
      {showForm && (
        <>
          <div className="crm-modal-backdrop" onClick={closeAddCandidateModal} />

          <div className="crm-modal crm-modal-wide">
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">Add Candidate</h2>
              <button className="crm-modal-close" onClick={closeAddCandidateModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="crm-modal-form">
              <div
                style={{
                  border: `2px dashed ${
                    cvParsed
                      ? '#217822'
                      : dragOverCv
                        ? 'var(--primary)'
                        : 'var(--border)'
                  }`,
                  borderRadius: 10,
                  padding: '22px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: cvParsed
                    ? '#f0fdf4'
                    : dragOverCv
                      ? 'var(--primary-light)'
                      : 'var(--light-bg)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
                onClick={() => cvRef.current?.click()}
                onDragOver={e => {
                  e.preventDefault()
                  setDragOverCv(true)
                }}
                onDragLeave={() => setDragOverCv(false)}
                onDrop={e => {
                  e.preventDefault()
                  setDragOverCv(false)

                  const f = e.dataTransfer.files?.[0]
                  if (f) parseCv(f)
                }}
              >
                <input
                  ref={cvRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) parseCv(f)
                  }}
                />

                {cvParsing ? (
                  <>
                    <span style={{ fontSize: 20 }}>⏳</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Reading CV...</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Free text parser is checking for name, email, phone and LinkedIn
                    </span>
                  </>
                ) : cvParsed ? (
                  <>
                    <span style={{ fontSize: 20 }}>✅</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#217822' }}>
                      CV attached — {cvFileName}
                    </span>
                    <span style={{ fontSize: 11, color: '#217822' }}>
                      Basic fields filled where found — review before saving
                    </span>
                  </>
                ) : cvFileName ? (
                  <>
                    <span style={{ fontSize: 20 }}>📎</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      CV attached — {cvFileName}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Complete the details below before saving
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 24 }}>📄</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      Drop CV here or click to upload
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      PDF, DOCX or TXT — free parser, no AI cost
                    </span>
                  </>
                )}
              </div>

              {cvParseError && (
                <p style={{ fontSize: 12, color: '#d97706', fontWeight: 700 }}>
                  {cvParseError}
                </p>
              )}

              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">First name *</label>
                  <input
                    className="crm-input"
                    required
                    value={form.first_name}
                    onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label">Last name *</label>
                  <input
                    className="crm-input"
                    required
                    value={form.last_name}
                    onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">Email</label>
                  <input
                    className="crm-input"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label">Phone</label>
                  <input
                    className="crm-input"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="crm-field">
                <label className="crm-label">LinkedIn</label>
                <input
                  className="crm-input"
                  placeholder="https://www.linkedin.com/in/..."
                  value={form.linkedin}
                  onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))}
                />
              </div>

              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">Add to job</label>
                  <select
                    className="crm-select"
                    value={form.add_to_vacancy_id}
                    onChange={e =>
                      setForm(f => ({ ...f, add_to_vacancy_id: e.target.value }))
                    }
                  >
                    <option value="">
                      {vacanciesLoading ? 'Loading jobs...' : 'Do not add to a job yet'}
                    </option>

                    {vacancyOptions.map(vacancy => (
                      <option key={vacancy.id} value={vacancy.id}>
                        {getVacancyLabel(vacancy)}
                      </option>
                    ))}
                  </select>

                  {vacanciesError && (
                    <p style={{ marginTop: 6, fontSize: 11, color: '#d97706', fontWeight: 700 }}>
                      Jobs could not be loaded: {vacanciesError}
                    </p>
                  )}
                </div>

                <div className="crm-field">
                  <label className="crm-label">Source</label>
                  <select
                    className="crm-select"
                    value={form.source}
                    onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  >
                    {SOURCES.map(source => (
                      <option key={source} value={source}>
                        {source || 'Select source...'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {saveError && (
                <p style={{ fontSize: 12, color: '#e53e3e', fontWeight: 700 }}>
                  {saveError}
                </p>
              )}

              <div className="crm-modal-footer">
                <button
                  type="button"
                  className="crm-btn-ghost"
                  onClick={closeAddCandidateModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button type="submit" className="crm-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Add candidate'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}