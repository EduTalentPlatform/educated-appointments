'use client'

import { useState } from 'react'
type EnquiryType = 'employer' | 'candidate' | 'general'

const TYPES: { id: EnquiryType; label: string; icon: string; placeholder: string }[] = [
  {
    id: 'employer',
    label: 'I want to hire',
    icon: '💼',
    placeholder: 'Tell us about the role you\'re looking to fill, the type of candidate you need, and when you\'re looking to recruit...',
  },
  {
    id: 'candidate',
    label: 'I\'m looking for a role',
    icon: '👤',
    placeholder: 'Tell us about the type of role you\'re looking for, your experience, and where you\'re based...',
  },
  {
    id: 'general',
    label: 'General enquiry',
    icon: '💬',
    placeholder: 'How can we help?',
  },
]

export default function ContactPage() {
  const [type, setType] = useState<EnquiryType>('employer')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = TYPES.find((t) => t.id === type)!

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const form = e.currentTarget
    const data = {
      type,
      firstName:    (form.querySelector('[name="firstName"]') as HTMLInputElement)?.value,
      lastName:     (form.querySelector('[name="lastName"]') as HTMLInputElement)?.value,
      email:        (form.querySelector('[name="email"]') as HTMLInputElement)?.value,
      phone:        (form.querySelector('[name="phone"]') as HTMLInputElement)?.value ?? '',
      organisation: (form.querySelector('[name="organisation"]') as HTMLInputElement)?.value ?? '',
      message:      (form.querySelector('[name="message"]') as HTMLTextAreaElement)?.value ?? '',
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (result.success) {
        setIsSuccess(true)
      } else {
        setError(result.error ?? 'Something went wrong.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }

    setIsSubmitting(false)
  }

  return (
    <div className="contact-page">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div className="contact-hero">
        <div className="contact-hero-inner">
          <p className="section-eyebrow" style={{ color: 'var(--teal)' }}>Get in touch</p>
          <h1 className="contact-headline">
            Let&apos;s start a<br />conversation.
          </h1>
          <p className="contact-sub">
            Whether you&apos;re looking to hire, looking for your next role, or just want
            to find out more — we&apos;d love to hear from you.
          </p>
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────── */}
      <div className="contact-body">
        <div className="contact-body-inner">

          {/* ── LEFT: Form ────────────────────────────────────────────── */}
          <div className="contact-form-side">

            {isSuccess ? (
              <div className="contact-success">
                <div className="contact-success-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#217822" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h2 className="contact-success-title">Message received</h2>
                <p className="contact-success-body">
                  Thanks for getting in touch. One of the team will be back to you within one business day.
                </p>
                <button
                  className="contact-success-reset"
                  onClick={() => { setIsSuccess(false) }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                {/* Enquiry type selector */}
                <div className="enquiry-types">
                  {TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`enquiry-type-btn${type === t.id ? ' active' : ''}`}
                      onClick={() => setType(t.id)}
                    >
                      <span className="enquiry-type-icon">{t.icon}</span>
                      <span className="enquiry-type-label">{t.label}</span>
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="contact-form">

                  {/* Name row */}
                  <div className="cf-row">
                    <div className="cf-field">
                      <label className="cf-label">
                        First name <span className="cf-required">*</span>
                      </label>
                      <input
                        name="firstName"
                        type="text"
                        className="cf-input"
                        placeholder="Jane"
                        required
                      />
                    </div>
                    <div className="cf-field">
                      <label className="cf-label">
                        Last name <span className="cf-required">*</span>
                      </label>
                      <input
                        name="lastName"
                        type="text"
                        className="cf-input"
                        placeholder="Smith"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="cf-field">
                    <label className="cf-label">
                      Email address <span className="cf-required">*</span>
                    </label>
                    <input
                      name="email"
                      type="email"
                      className="cf-input"
                      placeholder="jane@example.com"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div className="cf-field">
                    <label className="cf-label">Phone number</label>
                    <input
                      name="phone"
                      type="tel"
                      className="cf-input"
                      placeholder="07700 900000"
                    />
                  </div>

                  {/* Organisation — employer only */}
                  {type === 'employer' && (
                    <div className="cf-field cf-field-animated">
                      <label className="cf-label">
                        Organisation <span className="cf-required">*</span>
                      </label>
                      <input
                        name="organisation"
                        type="text"
                        className="cf-input"
                        placeholder="Training provider or college name"
                        required
                      />
                    </div>
                  )}

                  {/* Message */}
                  <div className="cf-field">
                    <label className="cf-label">
                      {type === 'employer' ? 'Tell us about the role' : 'Message'}
                      <span className="cf-optional"> (optional)</span>
                    </label>
                    <textarea
                      name="message"
                      className="cf-textarea"
                      placeholder={selected.placeholder}
                      rows={5}
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="cf-error">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v4M12 16h.01" />
                      </svg>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="cf-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="cf-spinner" />
                        Sending...
                      </>
                    ) : (
                      'Send message →'
                    )}
                  </button>

                  <p className="cf-gdpr">
                    By submitting this form you agree to Educated Appointments processing
                    your data to respond to your enquiry. View our{' '}
                    <a href="/privacy-policy">Privacy Policy</a>.
                  </p>

                </form>

                {/* Contact details */}
                <div className="contact-details">
                  <div className="contact-detail-item">
                    <div className="contact-detail-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#352DEB" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .99h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.02z" />
                      </svg>
                    </div>
                    <div>
                      <p className="contact-detail-label">Phone</p>
                      <a href="tel:01473809096" className="contact-detail-value">01473 809 096</a>
                    </div>
                  </div>

                  <div className="contact-detail-item">
                    <div className="contact-detail-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#352DEB" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <div>
                      <p className="contact-detail-label">Email</p>
                      <a href="mailto:info@educatedappointments.co.uk" className="contact-detail-value">
                        info@educatedappointments.co.uk
                      </a>
                    </div>
                  </div>

                  <div className="contact-detail-item">
                    <div className="contact-detail-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#352DEB" strokeWidth="2">
                        <circle cx="12" cy="12" r="9" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <div>
                      <p className="contact-detail-label">Office hours</p>
                      <p className="contact-detail-value">Mon – Fri, 9:00am – 5:30pm</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── RIGHT: Calendly embed ──────────────────────────────────── */}
          <div className="contact-calendly-side">
            <div className="calendly-header">
              <h2 className="calendly-title">Book a 15-min intro call</h2>
              <p className="calendly-sub">
                Prefer to talk? Pick a time that suits you and we&apos;ll call you back.
              </p>
            </div>
            <div className="calendly-embed-wrap">
              <iframe
                src="https://calendly.com/joseph-edapps/introduction-call?hide_event_type_details=1&hide_gdpr_banner=1&background_color=ffffff&text_color=1a1a2e&primary_color=352DEB"
                width="100%"
                height="700"
                frameBorder="0"
                title="Book an intro call with Educated Appointments"
              />
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}