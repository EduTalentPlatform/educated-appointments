'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Lead = { id: string; company_name: string; sector: string | null; region: string | null }

type Analysis = {
  overview: string
  key_points: string[]
  pain_points: string | null
  roles_to_fill: string | null
  psl_agencies: string | null
  salary_notes: string | null
  retention_notes: string | null
  fee_agreed: string | null
  decision_maker: string | null
  next_steps: string | null
  follow_up_date: string | null
  convert_to_client: boolean
  conversion_reasoning: string
}

interface Props {
  lead: Lead
  onActivitySaved: (activity: any) => void
}

export default function MeetingRecorder({ lead, onActivitySaved }: Props) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [analysing, setAnalysing] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [supported, setSupported] = useState(true)

  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) setSupported(false)
  }, [])

  function startRecording() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { setError('Speech recognition is not supported in this browser. Use Chrome.'); return }

    setError(null)
    setAnalysis(null)
    setSaved(false)

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-GB'

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' '
        } else {
          interim += event.results[i][0].transcript
        }
      }
      if (final) {
        transcriptRef.current += final
        setTranscript(transcriptRef.current)
      }
      setInterimText(interim)
    }

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        setError(`Microphone error: ${event.error}`)
        setIsRecording(false)
      }
    }

    recognition.onend = () => {
      // Auto-restart if still recording
      if (recognitionRef.current && isRecording) {
        try { recognition.start() } catch {}
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  function stopRecording() {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setInterimText('')
    setIsRecording(false)
  }

  function clearTranscript() {
    setTranscript('')
    transcriptRef.current = ''
    setInterimText('')
    setAnalysis(null)
    setSaved(false)
    setError(null)
  }

  async function analyseTranscript() {
    const text = transcript.trim()
    if (!text) { setError('No transcript to analyse.'); return }
    setAnalysing(true)
    setError(null)

    const res = await fetch('/api/crm/meeting-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: text, lead }),
    })
    const data = await res.json()
    if (data.result) {
      setAnalysis(data.result)
    } else {
      setError(data.error ?? 'Analysis failed.')
    }
    setAnalysing(false)
  }

  async function saveAsBdMeeting() {
    if (!analysis) return
    const supabase = createClient()
    const { data } = await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      activity_type: 'bd_meeting',
      content: analysis.overview,
      pain_points: analysis.pain_points,
      roles_to_fill: analysis.roles_to_fill,
      psl_agencies: analysis.psl_agencies,
      salary_notes: analysis.salary_notes,
      retention_notes: analysis.retention_notes,
      fee_agreed: analysis.fee_agreed,
      decision_maker: analysis.decision_maker,
      next_steps: analysis.next_steps,
      follow_up_date: analysis.follow_up_date,
    }).select().single()

    if (data) {
      onActivitySaved(data)
      setSaved(true)
    }
  }

  return (
    <div className="crm-tab-content">

      {!supported && (
        <div className="ld-recorder-warning">
          ⚠️ Speech recognition requires Chrome. You can still paste notes manually below.
        </div>
      )}

      {/* Recording controls */}
      <div className="ld-recorder-card">
        <div className="ld-recorder-header">
          <div>
            <h3 className="ld-recorder-title">Meeting Recorder</h3>
            <p className="ld-recorder-sub">
              {isRecording ? 'Recording — speak clearly into your microphone' : 'Press record before or during your meeting, or paste notes manually'}
            </p>
          </div>
          <div className="ld-recorder-controls">
            {!isRecording ? (
              <button className="ld-btn-record" onClick={startRecording} disabled={!supported}>
                <span className="ld-record-dot" />
                Start recording
              </button>
            ) : (
              <button className="ld-btn-stop" onClick={stopRecording}>
                <span className="ld-stop-square" />
                Stop recording
              </button>
            )}
            {transcript && !isRecording && (
              <button className="crm-btn-ghost crm-btn-sm" onClick={clearTranscript}>Clear</button>
            )}
          </div>
        </div>

        {isRecording && (
          <div className="ld-recording-indicator">
            <span className="ld-pulse" />
            <span>Recording in progress</span>
          </div>
        )}
      </div>

      {/* Transcript */}
      <div className="crm-field">
        <label className="crm-label">
          Transcript {isRecording && <span style={{ color: 'var(--primary)' }}>— live</span>}
        </label>
        <textarea
          className="crm-input"
          rows={8}
          placeholder="Transcript will appear here as you speak, or paste / type meeting notes directly..."
          value={transcript + (interimText ? ` ${interimText}` : '')}
          onChange={e => { setTranscript(e.target.value); transcriptRef.current = e.target.value }}
          style={{ fontFamily: 'inherit', lineHeight: 1.7 }}
        />
        {interimText && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Listening...</p>}
      </div>

      {error && <p style={{ fontSize: 13, color: '#e53e3e', fontWeight: 600 }}>{error}</p>}

      {transcript && !isRecording && (
        <button className="crm-btn-ai" onClick={analyseTranscript} disabled={analysing}>
          {analysing ? '✦ Analysing...' : '✦ Analyse with AI'}
        </button>
      )}

      {/* Analysis output */}
      {analysis && (
        <div className="ld-analysis">
          <div className="ld-analysis-header">
            <p className="ld-analysis-title">✦ Meeting Analysis</p>
            {!saved ? (
              <button className="crm-btn-primary crm-btn-sm" onClick={saveAsBdMeeting}>
                Save as BD Meeting →
              </button>
            ) : (
              <span className="crm-badge" style={{ background: '#e8f5e8', color: '#217822' }}>✓ Saved to activity log</span>
            )}
          </div>

          {/* Overview */}
          <div className="ld-analysis-section">
            <p className="ld-analysis-label">Overview</p>
            <p className="ld-analysis-text">{analysis.overview}</p>
          </div>

          {/* Key points */}
          {analysis.key_points?.length > 0 && (
            <div className="ld-analysis-section">
              <p className="ld-analysis-label">Key points</p>
              <ul className="ld-analysis-list">
                {analysis.key_points.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}

          {/* Grid of details */}
          <div className="ld-analysis-grid">
            {[
              { label: 'Pain points', value: analysis.pain_points },
              { label: 'Roles to fill', value: analysis.roles_to_fill },
              { label: 'Current agencies', value: analysis.psl_agencies },
              { label: 'Salary notes', value: analysis.salary_notes },
              { label: 'Retention', value: analysis.retention_notes },
              { label: 'Fee agreed', value: analysis.fee_agreed, highlight: true },
              { label: 'Decision maker', value: analysis.decision_maker },
              { label: 'Follow-up', value: analysis.follow_up_date, highlight: true },
            ].filter(f => f.value).map(f => (
              <div key={f.label} className="ld-analysis-field">
                <p className="ld-analysis-field-label">{f.label}</p>
                <p className="ld-analysis-field-value" style={{ color: f.highlight ? 'var(--primary)' : undefined, fontWeight: f.highlight ? 700 : undefined }}>
                  {f.value}
                </p>
              </div>
            ))}
          </div>

          {/* Next steps */}
          {analysis.next_steps && (
            <div className="ld-analysis-section ld-analysis-next-steps">
              <p className="ld-analysis-label">Recommended next steps</p>
              <p className="ld-analysis-text">{analysis.next_steps}</p>
            </div>
          )}

          {/* Convert recommendation */}
          <div className={`ld-analysis-convert ${analysis.convert_to_client ? 'ld-convert-yes' : 'ld-convert-no'}`}>
            <span className="ld-convert-icon">{analysis.convert_to_client ? '✓' : '○'}</span>
            <div>
              <p className="ld-convert-label">{analysis.convert_to_client ? 'Ready to convert to client' : 'Not ready to convert yet'}</p>
              <p className="ld-convert-reason">{analysis.conversion_reasoning}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}