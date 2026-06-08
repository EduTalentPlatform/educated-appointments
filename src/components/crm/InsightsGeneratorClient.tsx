'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type InsightStatus = 'draft' | 'published' | 'archived'
type InsightAudience = 'employer' | 'candidate' | 'both'

type Insight = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  body: string
  category: string
  audience: InsightAudience
  status: InsightStatus
  featured: boolean
  target_keyword: string | null
  seo_title: string | null
  seo_description: string | null
  linkedin_post: string | null
  author_name: string | null
  created_at: string
  updated_at: string
  published_at: string | null
}

type FormState = {
  id?: string
  title: string
  slug: string
  excerpt: string
  body: string
  category: string
  audience: InsightAudience
  status: InsightStatus
  featured: boolean
  target_keyword: string
  seo_title: string
  seo_description: string
  linkedin_post: string
  author_name: string
}

type GenerateState = {
  topic: string
  audience: InsightAudience
  category: string
  target_keyword: string
  angle: string
  call_to_action: string
}

const EMPTY_FORM: FormState = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  category: 'hiring_advice',
  audience: 'employer',
  status: 'draft',
  featured: false,
  target_keyword: '',
  seo_title: '',
  seo_description: '',
  linkedin_post: '',
  author_name: 'Joseph Sutton',
}

const EMPTY_GENERATE: GenerateState = {
  topic: '',
  audience: 'employer',
  category: 'hiring_advice',
  target_keyword: '',
  angle: '',
  call_to_action: '',
}

const categories = [
  { value: 'hiring_advice', label: 'Hiring advice' },
  { value: 'candidate_advice', label: 'Candidate advice' },
  { value: 'safer_recruitment', label: 'Safer recruitment' },
  { value: 'sector_updates', label: 'Sector updates' },
  { value: 'interview_tips', label: 'Interview tips' },
  { value: 'market_insight', label: 'Market insight' },
]

function toForm(insight: Insight): FormState {
  return {
    id: insight.id,
    title: insight.title ?? '',
    slug: insight.slug ?? '',
    excerpt: insight.excerpt ?? '',
    body: insight.body ?? '',
    category: insight.category ?? 'hiring_advice',
    audience: insight.audience ?? 'employer',
    status: insight.status ?? 'draft',
    featured: Boolean(insight.featured),
    target_keyword: insight.target_keyword ?? '',
    seo_title: insight.seo_title ?? '',
    seo_description: insight.seo_description ?? '',
    linkedin_post: insight.linkedin_post ?? '',
    author_name: insight.author_name ?? 'Joseph Sutton',
  }
}

export default function InsightsGeneratorClient({
  initialInsights,
}: {
  initialInsights: Insight[]
}) {
  const router = useRouter()

  const [insights, setInsights] = useState<Insight[]>(initialInsights)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [generateForm, setGenerateForm] = useState<GenerateState>(EMPTY_GENERATE)
  const [filter, setFilter] = useState<'all' | InsightStatus>('all')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

  const editing = Boolean(form.id)

  const filteredInsights = useMemo(() => {
    return insights.filter(item => filter === 'all' || item.status === filter)
  }, [insights, filter])

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(current => ({ ...current, [key]: value }))
  }

  function updateGenerate<K extends keyof GenerateState>(
    key: K,
    value: GenerateState[K],
  ) {
    setGenerateForm(current => ({ ...current, [key]: value }))
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setMessage(null)
  }

  async function generateInsight() {
    if (!generateForm.topic.trim()) {
      setMessage('Please add a topic first.')
      return
    }

    setGenerating(true)
    setMessage(null)

    const res = await fetch('/api/crm/insights/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(generateForm),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      setMessage(data?.error || 'Could not generate insight.')
      setGenerating(false)
      return
    }

    if (data?.article) {
      setForm({
        ...EMPTY_FORM,
        ...data.article,
        status: 'draft',
        featured: false,
        author_name: 'Joseph Sutton',
      })

      setMessage('Insight draft generated. Review it before saving or publishing.')
    }

    setGenerating(false)
  }

  async function saveInsight() {
    if (!form.title.trim()) {
      setMessage('Title is required.')
      return
    }

    if (!form.body.trim()) {
      setMessage('Article body is required.')
      return
    }

    setSaving(true)
    setMessage(null)

    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch('/api/crm/insights', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      setMessage(data?.error || 'Could not save insight.')
      setSaving(false)
      return
    }

    if (data?.insight) {
      setInsights(current => {
        const exists = current.some(item => item.id === data.insight.id)

        if (exists) {
          return current.map(item =>
            item.id === data.insight.id ? data.insight : item,
          )
        }

        return [data.insight, ...current]
      })

      setForm(toForm(data.insight))
      setMessage(
        data.insight.status === 'published'
          ? 'Insight saved and published.'
          : 'Insight saved as draft.',
      )
    }

    setSaving(false)
    router.refresh()
  }

  async function deleteInsight(id: string) {
    const confirmed = window.confirm('Delete this insight? This cannot be undone.')

    if (!confirmed) return

    const res = await fetch('/api/crm/insights', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      setMessage(data?.error || 'Could not delete insight.')
      return
    }

    setInsights(current => current.filter(item => item.id !== id))

    if (form.id === id) {
      resetForm()
    }

    setMessage('Insight deleted.')
    router.refresh()
  }

  async function copyLinkedInPost() {
    if (!form.linkedin_post.trim()) {
      setMessage('There is no LinkedIn post to copy.')
      return
    }

    const url =
      form.slug && form.status === 'published'
        ? `\n\nRead it here: ${window.location.origin}/insights/${form.slug}`
        : ''

    await navigator.clipboard.writeText(`${form.linkedin_post}${url}`)
    setMessage('LinkedIn post copied.')
  }

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Insights Generator</h1>
          <p className="crm-page-sub">
            Generate, edit and publish website insights, then copy a LinkedIn post
            to drive traffic back to the website.
          </p>
        </div>

        <Link href="/insights" target="_blank" className="crm-btn-ghost">
          View public insights →
        </Link>
      </div>

      {message && (
        <div
          style={{
            marginBottom: 14,
            padding: 12,
            borderRadius: 12,
            background: '#eef2ff',
            border: '1px solid #c7d2fe',
            color: '#3730a3',
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="crm-card">
            <h2 className="crm-card-title">Generate article draft</h2>

            <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              <div className="crm-field">
                <label className="crm-label">Topic</label>
                <input
                  className="crm-input"
                  value={generateForm.topic}
                  onChange={e => updateGenerate('topic', e.target.value)}
                  placeholder="e.g. How training providers can reduce interview drop-outs"
                />
              </div>

              <div className="crm-field">
                <label className="crm-label">Audience</label>
                <select
                  className="crm-select"
                  value={generateForm.audience}
                  onChange={e =>
                    updateGenerate('audience', e.target.value as InsightAudience)
                  }
                >
                  <option value="employer">Employer</option>
                  <option value="candidate">Candidate</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div className="crm-field">
                <label className="crm-label">Category</label>
                <select
                  className="crm-select"
                  value={generateForm.category}
                  onChange={e => updateGenerate('category', e.target.value)}
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="crm-field">
                <label className="crm-label">Target keyword</label>
                <input
                  className="crm-input"
                  value={generateForm.target_keyword}
                  onChange={e => updateGenerate('target_keyword', e.target.value)}
                  placeholder="e.g. apprenticeship assessor recruitment"
                />
              </div>

              <div className="crm-field">
                <label className="crm-label">Angle / notes</label>
                <textarea
                  className="crm-input"
                  rows={4}
                  value={generateForm.angle}
                  onChange={e => updateGenerate('angle', e.target.value)}
                  placeholder="Any points you want it to cover..."
                />
              </div>

              <div className="crm-field">
                <label className="crm-label">Call to action</label>
                <textarea
                  className="crm-input"
                  rows={3}
                  value={generateForm.call_to_action}
                  onChange={e => updateGenerate('call_to_action', e.target.value)}
                  placeholder="e.g. Speak to Educated Appointments if you need support hiring assessors, tutors or skills coaches."
                />
              </div>

              <button
                type="button"
                className="crm-btn-ai"
                onClick={generateInsight}
                disabled={generating}
                style={{ justifyContent: 'center' }}
              >
                {generating ? '✦ Generating...' : '✦ Generate insight with Claude'}
              </button>
            </div>
          </div>

          <div className="crm-card">
            <h2 className="crm-card-title">Saved insights</h2>

            <div style={{ display: 'flex', gap: 8, marginTop: 14, marginBottom: 14 }}>
              {(['all', 'draft', 'published', 'archived'] as const).map(item => (
                <button
                  key={item}
                  type="button"
                  className={`crm-status-filter${filter === item ? ' active' : ''}`}
                  onClick={() => setFilter(item)}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {filteredInsights.map(insight => (
                <button
                  key={insight.id}
                  type="button"
                  onClick={() => {
                    setForm(toForm(insight))
                    setMessage(null)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  style={{
                    textAlign: 'left',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    background: form.id === insight.id ? '#eef2ff' : '#ffffff',
                    padding: 12,
                    cursor: 'pointer',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: 'var(--text-dark)',
                      fontSize: 13,
                      fontWeight: 900,
                      lineHeight: 1.35,
                    }}
                  >
                    {insight.title}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      marginTop: 5,
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {insight.status} · {insight.category}
                  </p>
                </button>
              ))}

              {filteredInsights.length === 0 && (
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
                  No insights found.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="crm-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h2 className="crm-card-title">
              {editing ? 'Edit insight' : 'New insight'}
            </h2>

            <button type="button" className="crm-btn-ghost" onClick={resetForm}>
              New
            </button>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <div className="crm-field">
              <label className="crm-label">Title</label>
              <input
                className="crm-input"
                value={form.title}
                onChange={e => updateForm('title', e.target.value)}
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Slug</label>
              <input
                className="crm-input"
                value={form.slug}
                onChange={e => updateForm('slug', e.target.value)}
                placeholder="auto-created if left blank"
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 10,
              }}
            >
              <div className="crm-field">
                <label className="crm-label">Status</label>
                <select
                  className="crm-select"
                  value={form.status}
                  onChange={e => updateForm('status', e.target.value as InsightStatus)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="crm-field">
                <label className="crm-label">Audience</label>
                <select
                  className="crm-select"
                  value={form.audience}
                  onChange={e =>
                    updateForm('audience', e.target.value as InsightAudience)
                  }
                >
                  <option value="employer">Employer</option>
                  <option value="candidate">Candidate</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div className="crm-field">
                <label className="crm-label">Category</label>
                <select
                  className="crm-select"
                  value={form.category}
                  onChange={e => updateForm('category', e.target.value)}
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
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
              Featured article
            </label>

            <div className="crm-field">
              <label className="crm-label">Excerpt</label>
              <textarea
                className="crm-input"
                rows={3}
                value={form.excerpt}
                onChange={e => updateForm('excerpt', e.target.value)}
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Article body</label>
              <textarea
                className="crm-input"
                rows={16}
                value={form.body}
                onChange={e => updateForm('body', e.target.value)}
                style={{ lineHeight: 1.65 }}
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">SEO title</label>
              <input
                className="crm-input"
                value={form.seo_title}
                onChange={e => updateForm('seo_title', e.target.value)}
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">SEO description</label>
              <textarea
                className="crm-input"
                rows={2}
                value={form.seo_description}
                onChange={e => updateForm('seo_description', e.target.value)}
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">LinkedIn post</label>
              <textarea
                className="crm-input"
                rows={8}
                value={form.linkedin_post}
                onChange={e => updateForm('linkedin_post', e.target.value)}
                style={{ lineHeight: 1.6 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="crm-btn-primary"
                onClick={saveInsight}
                disabled={saving}
              >
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Save insight'}
              </button>

              <button
                type="button"
                className="crm-btn-ghost"
                onClick={copyLinkedInPost}
              >
                Copy LinkedIn post
              </button>

              {form.status === 'published' && form.slug && (
                <Link
                  href={`/insights/${form.slug}`}
                  target="_blank"
                  className="crm-btn-ghost"
                >
                  Open public article →
                </Link>
              )}

              {editing && form.id && (
                <button
                  type="button"
                  className="crm-btn-danger"
                  onClick={() => deleteInsight(form.id!)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}