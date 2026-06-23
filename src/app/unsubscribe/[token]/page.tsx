import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import UnsubscribeClient from '@/components/marketing/UnsubscribeClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface Props {
  params: Promise<{ token: string }>
}

export default async function UnsubscribePage({ params }: Props) {
  const { token } = await params
  const supabase = getServiceClient()

  const { data: unsubscribeRecord } = await supabase
    .from('marketing_unsubscribes')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, #e0f0fb 0, transparent 28%), #f5f5f7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 720,
          background: '#fff',
          borderRadius: 28,
          padding: 34,
          boxShadow: '0 24px 70px rgba(15, 23, 42, 0.12)',
          border: '1px solid rgba(15, 23, 42, 0.08)',
        }}
      >
        <div style={{ marginBottom: 26 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 16,
              background: '#1a1a2e',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              marginBottom: 14,
            }}
          >
            EA
          </div>

          <p
            style={{
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: 1.4,
              color: '#6b7280',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Educated Appointments
          </p>
        </div>

        {!unsubscribeRecord ? (
          <div>
            <h1 style={{ margin: '0 0 12px', fontSize: 34 }}>
              This link is not valid
            </h1>

            <p style={{ fontSize: 17, lineHeight: 1.6, color: '#4b5563' }}>
              This unsubscribe link could not be found. It may have expired, been
              copied incorrectly, or already been replaced by a newer link.
            </p>

            <p style={{ fontSize: 17, lineHeight: 1.6, color: '#4b5563' }}>
              If you want to stop receiving marketing emails, reply to the email
              you received and we’ll sort it manually.
            </p>
          </div>
        ) : (
          <UnsubscribeClient
            token={token}
            email={unsubscribeRecord.email || unsubscribeRecord.email_normalised}
            alreadyUnsubscribed={Boolean(unsubscribeRecord.unsubscribed_at)}
          />
        )}

        <div
          style={{
            marginTop: 30,
            paddingTop: 18,
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <Link
            href="/"
            style={{
              color: '#1a1a2e',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Back to Educated Appointments
          </Link>
        </div>
      </section>
    </main>
  )
}