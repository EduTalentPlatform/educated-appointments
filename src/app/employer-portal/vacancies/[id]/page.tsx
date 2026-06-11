import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient as createServerClient } from '@/lib/supabase/server'
import EmployerPortalShell from '@/components/employer-portal/EmployerPortalShell'
import EmployerCandidateCard from '@/components/employer-portal/EmployerCandidateCard'

const SUBMITTED_STATUSES = [
  'submitted',
  'presented',
  'client_interview',
  'offer',
  'offer_accepted',
  'accepted',
  'filled',
  'placed',
  'rejected',
]

const PORTAL_DOCUMENT_RELEASE_STATUSES = [
  'offer_accepted',
  'accepted',
  'filled',
  'placed',
]

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function normaliseRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function EmployerPortalVacancyPage({ params }: Props) {
  const { id } = await params

  const authSupabase = await createServerClient()
  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  if (!user) {
    redirect('/employer-portal/login')
  }

  const supabase = getServiceClient()

  const { data: portalUser } = await supabase
    .from('client_portal_users')
    .select(
      `
      *,
      clients (
        id,
        company_name
      )
    `,
    )
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  if (!portalUser) {
    redirect('/employer-portal/login')
  }

  if (portalUser.must_change_password) {
    redirect('/employer-portal/set-password?temporary=1')
  }

  const { data: access } = await supabase
    .from('portal_vacancy_access')
    .select(
      `
      *,
      vacancies (
        id,
        client_id,
        title,
        status,
        sector,
        type,
        location,
        region,
        salary_display,
        created_at
      )
    `,
    )
    .eq('portal_user_id', portalUser.id)
    .eq('vacancy_id', id)
    .eq('can_view_vacancy', true)
    .maybeSingle()

  if (!access) notFound()

  const vacancy = normaliseRelation(access.vacancies)

  if (!vacancy) notFound()
    
  if (vacancy.client_id !== portalUser.client_id) notFound()

  const client = normaliseRelation(portalUser.clients)

    const PRE_RELEASE_EMPLOYER_DOC_TYPES = new Set([
    'formatted_cv',
    'candidate_profile',
    'profile',
    'interview_prep',
  ])

  const SENSITIVE_EMPLOYER_DOC_TYPES = new Set([
    'cv',
    'qualification',
    'qualifications',
    'certificate',
    'certificates',
    'right_to_work',
    'dbs',
    'reference',
    'gdpr_acceptance',
    'identity',
    'passport',
    'other',
  ])

  function normaliseDocType(value: unknown) {
    return String(value || '').trim().toLowerCase()
  }

  function documentHasStoredFile(doc: any) {
    return Boolean(
      doc?.file_url ||
        (doc?.storage_bucket && doc?.storage_path),
    )
  }

  function employerCanSeeDocument(doc: any) {
    const docType = normaliseDocType(doc?.doc_type)

    const isReleased =
      doc?.visible_to_employer === true &&
      doc?.released === true

    if (PRE_RELEASE_EMPLOYER_DOC_TYPES.has(docType)) {
      return doc?.show_in_employer_portal === true || isReleased
    }

    if (SENSITIVE_EMPLOYER_DOC_TYPES.has(docType)) {
      return isReleased
    }

    return isReleased
  }

  function sanitizePortalDocuments(
    docs: any[],
    canViewDocuments: boolean,
    canDownloadSensitiveDocuments: boolean,
  ) {
    return docs.map(doc => {
      const docType = normaliseDocType(doc?.doc_type)
      const hasFile = documentHasStoredFile(doc)
      const isCvDocument = docType === 'formatted_cv' || docType === 'cv'

      if (!canViewDocuments || !hasFile) {
        return {
          ...doc,
          has_file: hasFile,
          file_url: null,
          storage_bucket: null,
          storage_path: null,
        }
      }

      // The employer should always be able to open the candidate CV once the
      // candidate has been submitted to their portal.
      if (isCvDocument) {
        return {
          ...doc,
          has_file: true,
        }
      }

      const canDownload =
        canDownloadSensitiveDocuments && employerCanSeeDocument(doc)

      if (canDownload) {
        return {
          ...doc,
          has_file: true,
        }
      }

      // Supporting documents should be visible as "on file", but not
      // downloadable until Educated Appointments releases them.
      return {
        ...doc,
        has_file: true,
        file_url: null,
        storage_bucket: null,
        storage_path: null,
      }
    })
  }

  const { data: applications } = access.can_view_submissions
    ? await supabase
        .from('applications')
        .select(
          `
          id,
          status,
          created_at,
          cv_url,
          employer_profile_notes,
          client_interview_date,
          client_interview_time,
          client_interview_format,
          client_interview_location,
          client_interview_notes,
          candidates (
            id,
            first_name,
            last_name,
            email,
            phone,
            job_title,
            seeking_role_type,
            preferred_location,
            town_city,
            county,
            postcode,
            salary_expected,
            notice_period,
            dbs_status
          )
        `,
        )
        .eq('vacancy_id', vacancy.id)
        .in('status', SUBMITTED_STATUSES)
        .order('created_at', { ascending: false })
    : { data: [] }

  const submittedApplications = applications ?? []

  const candidateIds = submittedApplications
    .map((application: any) => {
      const candidate = normaliseRelation(application.candidates)
      return candidate?.id
    })
    .filter(Boolean)

  const { data: documents } =
    candidateIds.length > 0
      ? await supabase
          .from('candidate_documents')
                    .select(
            'id, candidate_id, name, doc_type, summary, details, file_url, storage_bucket, storage_path, released, visible_to_employer, show_in_employer_portal, created_at',
          )
          .in('candidate_id', candidateIds)
          .order('created_at', { ascending: false })
      : { data: [] }

  const documentsByCandidateId = (documents ?? []).reduce<Record<string, any[]>>(
    (acc, doc: any) => {
      if (!doc.candidate_id) return acc
      if (!acc[doc.candidate_id]) acc[doc.candidate_id] = []
      acc[doc.candidate_id].push(doc)
      return acc
    },
    {},
  )

  return (
    <EmployerPortalShell
      name={portalUser.name}
      email={portalUser.email}
      clientName={client?.company_name || 'Employer'}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Link
          href="/employer-portal"
          style={{
            color: 'var(--primary)',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 900,
          }}
        >
          ← Back to vacancies
        </Link>

        <section
          style={{
            marginTop: 18,
            marginBottom: 20,
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 26,
            padding: 28,
            boxShadow: '0 18px 55px rgba(15,23,42,0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 240,
              height: 240,
              borderRadius: '50%',
              background: 'var(--primary)',
              opacity: 0.06,
              right: -90,
              top: -110,
            }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 18,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div>
              <p className="section-eyebrow">Candidate submissions</p>

              <h1
                style={{
                  margin: 0,
                  fontSize: 'clamp(30px, 4vw, 44px)',
                  color: 'var(--text-dark)',
                  letterSpacing: -1.4,
                  lineHeight: 1.05,
                  fontWeight: 900,
                }}
              >
                {vacancy.title}
              </h1>

              <p
                style={{
                  margin: 0,
                  marginTop: 12,
                  color: 'var(--text-muted)',
                  fontSize: 14,
                  lineHeight: 1.6,
                  fontWeight: 600,
                }}
              >
                {[vacancy.location, vacancy.region].filter(Boolean).join(', ') ||
                  'Location not specified'}
                {vacancy.salary_display ? ` · ${vacancy.salary_display}` : ''}
                {vacancy.type ? ` · ${vacancy.type}` : ''}
              </p>
            </div>

            <span
              style={{
                background: 'var(--success-light)',
                color: 'var(--success)',
                borderRadius: 999,
                padding: '9px 13px',
                fontSize: 12,
                fontWeight: 900,
                whiteSpace: 'nowrap',
              }}
            >
              {submittedApplications.length}{' '}
              {submittedApplications.length === 1 ? 'candidate' : 'candidates'}
            </span>
          </div>
        </section>

        {!access.can_view_submissions && (
          <div
            style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 22,
              padding: 26,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 20, color: 'var(--text-dark)' }}>
              Candidate submissions are not currently visible
            </h2>

            <p
              style={{
                margin: 0,
                marginTop: 8,
                color: 'var(--text-muted)',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              Educated Appointments has not released candidate submissions for
              this vacancy yet.
            </p>
          </div>
        )}

        {access.can_view_submissions && submittedApplications.length === 0 && (
          <div
            style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 22,
              padding: 26,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 20, color: 'var(--text-dark)' }}>
              No submitted candidates yet
            </h2>

            <p
              style={{
                margin: 0,
                marginTop: 8,
                color: 'var(--text-muted)',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              Candidate profiles shared by Educated Appointments will appear
              here.
            </p>
          </div>
        )}

                {access.can_view_submissions && submittedApplications.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {submittedApplications.map((application: any) => {
              const candidate = normaliseRelation(application.candidates)

                            const canViewDocuments = Boolean(access.can_view_documents)

              const canDownloadSensitiveDocuments =
                canViewDocuments &&
                PORTAL_DOCUMENT_RELEASE_STATUSES.includes(application.status)

              const candidateDocuments = candidate?.id
                ? documentsByCandidateId[candidate.id] ?? []
                : []

              const safeDocuments = sanitizePortalDocuments(
                candidateDocuments,
                canViewDocuments,
                canDownloadSensitiveDocuments,
              )

              return (
                <EmployerCandidateCard
                  key={application.id}
                  vacancyId={vacancy.id}
                  application={application}
                  candidate={candidate}
                  documents={safeDocuments}
                  canDownloadDocuments={canViewDocuments}
                />
              )
            })}
          </div>
        )}
              </div>
    </EmployerPortalShell>
  )
}