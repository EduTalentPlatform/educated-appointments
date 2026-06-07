'use client'

import { useState } from 'react'
import Link from 'next/link'

type Props = {
  token: string
  candidateName: string
  candidateEmail: string
  policyVersion: string
  policyUrl: string
}

export default function CandidateDeclarationForm({
  token,
  candidateName,
  candidateEmail,
  policyVersion,
  policyUrl,
}: Props) {
  const [typedName, setTypedName] = useState(candidateName)
  const [typedEmail, setTypedEmail] = useState(candidateEmail)
  const [readAndUnderstood, setReadAndUnderstood] = useState(false)
  const [futureOpportunitiesConsent, setFutureOpportunitiesConsent] =
    useState(false)
  const [vacancyUpdatesConsent, setVacancyUpdatesConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitDeclaration(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!readAndUnderstood) {
      setError(
        'Please confirm that you have read and understood the Candidate Privacy Notice.',
      )
      return
    }

    if (!typedName.trim()) {
      setError('Please enter your name.')
      return
    }

    if (!typedEmail.trim()) {
      setError('Please enter your email address.')
      return
    }

    setSubmitting(true)

    const res = await fetch('/api/public/candidate-declaration/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        typed_name: typedName.trim(),
        typed_email: typedEmail.trim(),
        read_and_understood: readAndUnderstood,
        future_opportunities_consent: futureOpportunitiesConsent,
        vacancy_updates_consent: vacancyUpdatesConsent,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Could not submit declaration.')
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="candidate-declaration-card">
        <div className="candidate-declaration-success">
          <span>✓</span>
          <h2>Declaration submitted</h2>
          <p>
            Thank you. Your declaration has been received by Educated
            Appointments.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form className="candidate-declaration-card" onSubmit={submitDeclaration}>
      <div className="candidate-declaration-card-header">
        <p className="section-eyebrow">Candidate acknowledgement</p>

        <h2>Review and confirm</h2>

        <p>
          This declaration records that you have been shown the Candidate
          Privacy Notice and understand how your data may be used for
          recruitment purposes.
        </p>
      </div>

      <div className="candidate-declaration-summary">
        <div>
          <span>Candidate</span>
          <strong>{candidateName || 'Candidate'}</strong>
        </div>

        <div>
          <span>Email</span>
          <strong>{candidateEmail || 'Not provided'}</strong>
        </div>

        <div>
          <span>Policy version</span>
          <strong>{policyVersion}</strong>
        </div>
      </div>

      <div className="candidate-declaration-policy">
        <div>
          <h3>Candidate Privacy Notice</h3>
          <p>
            Please read the Candidate Privacy Notice before submitting this
            declaration.
          </p>
        </div>

        <Link href={policyUrl} target="_blank" rel="noopener noreferrer">
          Open notice →
        </Link>
      </div>

      <div className="candidate-declaration-fields">
        <label>
          Your name
          <input
            value={typedName}
            onChange={event => setTypedName(event.target.value)}
            placeholder="Your full name"
          />
        </label>

        <label>
          Your email
          <input
            type="email"
            value={typedEmail}
            onChange={event => setTypedEmail(event.target.value)}
            placeholder="Your email address"
          />
        </label>
      </div>

      <div className="candidate-declaration-checks">
        <label className="candidate-declaration-check required">
          <input
            type="checkbox"
            checked={readAndUnderstood}
            onChange={event => setReadAndUnderstood(event.target.checked)}
          />

          <span>
            I confirm that I have read and understood the Candidate Privacy
            Notice and understand how Educated Appointments Ltd will process my
            personal data for recruitment purposes, including the use of
            AI-assisted tools as explained in the notice.
          </span>
        </label>

        <label className="candidate-declaration-check">
          <input
            type="checkbox"
            checked={futureOpportunitiesConsent}
            onChange={event =>
              setFutureOpportunitiesConsent(event.target.checked)
            }
          />

          <span>
            I agree that Educated Appointments Ltd may keep my details on file
            for future suitable opportunities.
          </span>
        </label>

        <label className="candidate-declaration-check">
          <input
            type="checkbox"
            checked={vacancyUpdatesConsent}
            onChange={event => setVacancyUpdatesConsent(event.target.checked)}
          />

          <span>
            I agree that Educated Appointments Ltd may contact me with suitable
            vacancy updates.
          </span>
        </label>
      </div>

      {error && <p className="candidate-declaration-error">{error}</p>}

      <button
        type="submit"
        className="candidate-declaration-submit"
        disabled={submitting}
      >
        {submitting ? 'Submitting...' : 'Submit declaration'}
      </button>

      <p className="candidate-declaration-small">
        If you have any questions, contact info@educatedappointments.co.uk.
      </p>
    </form>
  )
}