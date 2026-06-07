'use client'

import { useState, useRef } from 'react'
import { submitApplication } from '@/app/actions/apply'
import { Job } from '@/types'

interface ApplyModalProps {
  job: Job
  onClose: () => void
}

export default function ApplyModal({ job, onClose }: ApplyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cvFileName, setCvFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('vacancyId', job.id)
    formData.set('vacancyTitle', job.title)

    const result = await submitApplication(formData)

    if (result.success) {
      setIsSuccess(true)
    } else {
      setError(result.error ?? 'Something went wrong.')
    }

    setIsSubmitting(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">Applying for</p>
            <h2 id="modal-title" className="modal-title">{job.title}</h2>
            <p className="modal-meta">
              {job.location} · {job.region} · {job.salary_display}
            </p>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isSuccess ? (
          <div className="modal-success">
            <div className="success-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#217822" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3 className="success-title">Application received</h3>
            <p className="success-body">
              Thanks for applying. We&apos;ve sent a confirmation to your email address and one of the team will be in touch shortly.
            </p>
            <button className="btn-success-close" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            {/* Name row */}
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="firstName" className="form-label">
                  First name <span className="required">*</span>
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className="form-input"
                  placeholder="Jane"
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="lastName" className="form-label">
                  Last name <span className="required">*</span>
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className="form-input"
                  placeholder="Smith"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-field">
              <label htmlFor="email" className="form-label">
                Email address <span className="required">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                placeholder="jane@example.com"
                required
              />
            </div>

            {/* Phone */}
            <div className="form-field">
              <label htmlFor="phone" className="form-label">
                Phone number <span className="required">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="form-input"
                placeholder="07700 900000"
                required
              />
            </div>

            {/* CV upload */}
            <div className="form-field">
              <label className="form-label">CV (PDF or Word)</label>
              <div
                className="cv-upload"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  name="cv"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="cv-input-hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    setCvFileName(file?.name ?? null)
                  }}
                />
                {cvFileName ? (
                  <div className="cv-selected">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#217822" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    <span>{cvFileName}</span>
                  </div>
                ) : (
                  <div className="cv-placeholder">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>Click to upload your CV</span>
                    <span className="cv-hint">PDF or Word, max 5MB</span>
                  </div>
                )}
              </div>
            </div>

            {/* Cover note */}
            <div className="form-field">
              <label htmlFor="coverNote" className="form-label">
                Cover note <span className="optional">(optional)</span>
              </label>
              <textarea
                id="coverNote"
                name="coverNote"
                className="form-textarea"
                placeholder="Tell us a bit about yourself and why you're interested in this role..."
                rows={4}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="form-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn-apply-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" />
                  Submitting...
                </>
              ) : (
                'Submit Application →'
              )}
            </button>

            <p className="form-gdpr">
              By submitting this form you agree to Educated Appointments processing
              your data to progress your application. View our{' '}
              <a href="/privacy-policy">Privacy Policy</a>.
            </p>
          </form>
        )}
      </div>
    </>
  )
}