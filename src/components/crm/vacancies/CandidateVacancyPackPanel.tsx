'use client'

import { useEffect, useState } from 'react'

type Props = {
  vacancyId: string
  initialPackText?: string | null
  initialGeneratedAt?: string | null
  onGenerated?: (updatedVacancy: any) => void
}

export default function CandidateVacancyPackPanel({
  vacancyId,
  initialPackText = '',
  initialGeneratedAt = null,
  onGenerated,
}: Props) {
  const [packText, setPackText] = useState(initialPackText || '')
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setPackText(initialPackText || '')
    setGeneratedAt(initialGeneratedAt)
  }, [initialPackText, initialGeneratedAt])

  async function generatePack() {
    setGenerating(true)

    const res = await fetch(`/api/crm/vacancies/${vacancyId}/candidate-pack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.error || 'Could not generate candidate vacancy pack.')
      setGenerating(false)
      return
    }

    setPackText(data.pack_text || '')
    setGeneratedAt(
      data.vacancy?.candidate_pack_generated_at || new Date().toISOString(),
    )

    if (data.vacancy && onGenerated) {
      onGenerated(data.vacancy)
    }

    setGenerating(false)
  }

  async function copyPack() {
    await navigator.clipboard.writeText(packText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="crm-card" style={{ marginTop: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'center',
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p className="crm-card-title">Candidate vacancy pack</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            Confidential, employer-anonymous vacancy pack for candidates.
            {generatedAt
              ? ` Last generated ${new Date(generatedAt).toLocaleDateString(
                  'en-GB',
                )}.`
              : ''}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="crm-btn-ai crm-btn-sm"
            onClick={generatePack}
            disabled={generating}
          >
            {generating
              ? '✦ Generating...'
              : packText
                ? '✦ Regenerate pack'
                : '✦ Generate pack'}
          </button>

          {packText && (
            <>
              <button
                type="button"
                className="crm-btn-ghost crm-btn-sm"
                onClick={copyPack}
              >
                {copied ? '✓ Copied' : 'Copy text'}
              </button>

              <a
                href={`/api/crm/vacancies/${vacancyId}/candidate-pack/pdf`}
                className="crm-btn-primary crm-btn-sm"
                style={{ textDecoration: 'none' }}
              >
                Download PDF
              </a>
            </>
          )}
        </div>
      </div>

      {packText ? (
        <textarea
          className="crm-input"
          rows={18}
          value={packText}
          readOnly
          style={{ lineHeight: 1.6, fontSize: 12 }}
        />
      ) : (
        <p className="crm-empty">
          No candidate vacancy pack generated yet. Generate one after the job
          advert or anonymous pack has been created.
        </p>
      )}
    </div>
  )
}