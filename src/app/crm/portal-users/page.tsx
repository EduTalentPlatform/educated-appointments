import 'server-only'

import { createClient } from '@supabase/supabase-js'
import PortalUsersAdmin from '@/components/crm/portal-users/PortalUsersAdmin'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function CrmPortalUsersPage() {
  const supabase = getServiceClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, company_name')
    .order('company_name', { ascending: true })

  const clientIds = (clients || []).map(client => client.id)

  const { data: contacts } =
    clientIds.length > 0
      ? await supabase
          .from('client_contacts')
          .select(
            'id, client_id, name, title, email, phone, linkedin, role_type, is_primary, created_at',
          )
          .in('client_id', clientIds)
          .order('is_primary', { ascending: false, nullsFirst: false })
          .order('name', { ascending: true })
      : { data: [] }

  const { data: portalUsers } = await supabase
    .from('client_portal_users')
    .select(
      `
      id,
      client_id,
      client_contact_id,
      auth_user_id,
      name,
      email,
      role,
      active,
      created_at,
      updated_at,
      clients (
        id,
        company_name
      )
    `,
    )
    .order('created_at', { ascending: false })

  const portalUserIds = (portalUsers || []).map(user => user.id)

  const { data: accessRows } =
    portalUserIds.length > 0
      ? await supabase
          .from('portal_vacancy_access')
          .select(
            `
            id,
            client_id,
            vacancy_id,
            portal_user_id,
            can_view_vacancy,
            can_view_submissions,
            can_view_documents,
            created_at,
            updated_at,
            vacancies (
              id,
              title,
              status
            )
          `,
          )
          .in('portal_user_id', portalUserIds)
          .order('created_at', { ascending: false })
      : { data: [] }

  const accessByPortalUserId = (accessRows || []).reduce<Record<string, any[]>>(
    (acc, row: any) => {
      if (!acc[row.portal_user_id]) acc[row.portal_user_id] = []
      acc[row.portal_user_id].push(row)
      return acc
    },
    {},
  )

  const users = (portalUsers || []).map((portalUser: any) => ({
    ...portalUser,
    vacancy_access: accessByPortalUserId[portalUser.id] || [],
  }))

  return (
    <main className="crm-page">
      <PortalUsersAdmin
        initialClients={clients || []}
        initialContacts={contacts || []}
        initialUsers={users}
      />
    </main>
  )
}