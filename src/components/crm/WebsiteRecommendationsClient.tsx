'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type RecommendationTag = 'candidate' | 'employer'

type Recommendation = {
  id: string
  first_name: string
  initials: string | null
  role: string | null
  body: string
  tag: RecommendationTag
  featured: boolean
  show_on_website: boolean
  display_order: number
  created_at: string
}

type FormState = {
  id?: string
  first_name: string
  initials: string
  role: string
  body: string
  tag: RecommendationTag
  featured: boolean
  show_on_website: boolean
  display_order: string
}

const EMPTY_FORM: FormState = {
  first_name: '',
  initials: '',
  role: '',
  body: '',
  tag: 'candidate',
  featured: false,
  show_on_website: true,
  display_order: '0',
}

function getInitials(firstName: string) {
  return firstName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')
}

export default function WebsiteRecommendationsClient({
  initialRecommendations,
}: {
  initialRecommendations: Recommendation[]
}) {
  const router = useRouter()

  const [recommendations, setRecommendations] = useState(initialRecommendations)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | RecommendationTag>('all')

  const editing = Boolean(form.id)

  const filteredRecommendations = useMemo(() => {
    return recommendations
      .filter(item => filter === 'all' || item.tag === filter)
      .sort((a, b) => {
        if (a.display_order !== b.display_order) {
          return a.display_order - b.display_order
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [recommendations, filter])

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(current => ({
      ...current,
      [key]: value,
      ...(key === 'first_name' && !current.initials
        ? { initials: getInitials(String(value)) }
        : {}),
    }))
  }

  function startEdit(item: Recommendation) {
    setMessage(null)

    setForm({
      id: item.id,
      first_name: item.first_name ?? '',
      initials: item.initials ?? '',
      role: item.role ?? '',
      body: item.body ?? '',
      tag: item.tag,
      featured: item.featured,
      show_on_website: item.show_on_website,
      display_order: String(item.display_order ?? 0),
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setMessage(null)
  }

  async function saveRecommendation() {
    if (!form.first_name.trim()) {
      setMessage('Please add a first name.')
      return
    }

    if (!form.body.trim()) {
      setMessage('Please add the recommendation text.')
      return
    }

    setSaving(true)
    setMessage(null)

    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch('/api/crm/website-recommendations', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        initials: form.initials || getInitials(form.first_name),
        display_order: Number(form.display_order || 0),
      }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      setMessage(data?.error || 'Could not save recommendation.')
      setSaving(false)
      return
    }

    if (data?.recommendation) {
      setRecommendations(current => {
        const exists = current.some(item => item.id === data.recommendation.id)

        if (exists) {
          return current.map(item =>
            item.id === data.recommendation.id ? data.recommendation : item,
          )
        }

        return [data.recommendation, ...current]
      })
    }

    setForm(EMPTY_FORM)
    setMessage(editing ? 'Recommendation updated.' : 'Recommendation added.')
    setSaving(false)
    router.refresh()
  }

  async function deleteRecommendation(id: string) {
    const confirmed = window.confirm(
      'Delete this recommendation? This cannot be undone.',
    )

    if (!confirmed) return

    const res = await fetch('/api/crm/website-recommendations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      setMessage(data?.error || 'Could not delete recommendation.')
      return
    }

    setRecommendations(current => current.filter(item => item.id !== id))
    setMessage('Recommendation deleted.')
    router.refresh()
  }

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Website recommendations</h1>
          <p className="crm-page-sub">
            Add, edit and choose which testimonials appear on the public website.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div className="crm-card">
          <h2 className="crm-card-title">
            {editing ? 'Edit recommendation' : 'Add recommendation'}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            <div className="crm-field">
              <label className="crm-label">First name</label>
              <input
                className="crm-input"
                value={form.first_name}
                onChange={e => updateForm('first_name', e.target.value)}
                placeholder="e.g. Lyn"
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Initials</label>
              <input
                className="crm-input"
                value={form.initials}
                onChange={e => updateForm('initials', e.target.value)}
                placeholder="e.g. LN"
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Role / descriptor</label>
              <input
                className="crm-input"
                value={form.role}
                onChange={e => updateForm('role', e.target.value)}
                placeholder="e.g. Placed Candidate"
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Recommendation</label>
              <textarea
                className="crm-input"
                rows={7}
                value={form.body}
                onChange={e => updateForm('body', e.target.value)}
                placeholder="Paste the recommendation here..."
                style={{ lineHeight: 1.6 }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <div className="crm-field">
                <label className="crm-label">Type</label>
                <select
                  className="crm-input"
                  value={form.tag}
                  onChange={e =>
                    updateForm('tag', e.target.value as RecommendationTag)
                  }
                >
                  <option value="candidate">Candidate</option>
                  <option value="employer">Employer</option>
                </select>
              </div>

              <div className="crm-field">
                <label className="crm-label">Order</label>
                <input
                  className="crm-input"
                  type="number"
                  value={form.display_order}
                  onChange={e => updateForm('display_order', e.target.value)}
                />
              </div>
            </div>

            <label
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                fontSize: 13,
                fontWeight: 800,
                color: 'var(--text-dark)',
              }}
            >
              <input
                type="checkbox"
                checked={form.featured}
                onChange={e => updateForm('featured', e.target.checked)}
              />
              Featured recommendation
            </label>

            <label
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                fontSize: 13,
                fontWeight: 800,
                color: 'var(--text-dark)',
              }}
            >
              <input
                type="checkbox"
                checked={form.show_on_website}
                onChange={e => updateForm('show_on_website', e.target.checked)}
              />
              Show on website
            </label>

            {message && (
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color:
                    message.includes('Could') || message.includes('Please')
                      ? '#e53e3e'
                      : '#217822',
                }}
              >
                {message}
              </p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="crm-btn-primary"
                onClick={saveRecommendation}
                disabled={saving}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {saving
                  ? 'Saving...'
                  : editing
                    ? 'Update recommendation'
                    : 'Add recommendation'}
              </button>

              {editing && (
                <button
                  className="crm-btn-ghost"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="crm-card">
          <div className="crm-card-header">
            <h2 className="crm-card-title">Current recommendations</h2>

            <div className="crm-status-filters">
              {(['all', 'candidate', 'employer'] as const).map(item => (
                <button
                  key={item}
                  className={`crm-status-filter${filter === item ? ' active' : ''}`}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredRecommendations.map(item => (
              <div
                key={item.id}
                className="crm-list-row"
                style={{ alignItems: 'flex-start' }}
              >
                <div className="crm-list-row-info">
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <p className="crm-list-row-title">{item.first_name}</p>

                    {item.featured && (
                      <span
                        className="crm-badge"
                        style={{ background: '#fffbeb', color: '#d97706' }}
                      >
                        Featured
                      </span>
                    )}

                    {!item.show_on_website && (
                      <span
                        className="crm-badge"
                        style={{ background: '#f0f0f2', color: '#737373' }}
                      >
                        Hidden
                      </span>
                    )}

                    <span className={`tc-tag ${item.tag}`}>
                      {item.tag.charAt(0).toUpperCase() + item.tag.slice(1)}
                    </span>
                  </div>

                  <p className="crm-list-row-sub">
                    {item.role || 'No role added'} · Order {item.display_order}
                  </p>

                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--text-dark)',
                      lineHeight: 1.6,
                      marginTop: 8,
                    }}
                  >
                    {item.body}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    className="crm-btn-ghost crm-btn-sm"
                    onClick={() => startEdit(item)}
                  >
                    Edit
                  </button>

                  <button
                    className="crm-btn-ghost crm-btn-sm"
                    onClick={() => deleteRecommendation(item.id)}
                    style={{ color: '#e53e3e' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {filteredRecommendations.length === 0 && (
              <p className="crm-empty">No recommendations added yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}