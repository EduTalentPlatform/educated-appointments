import CrmSidebarInner from '@/components/crm/CrmSidebarInner'

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '240px 1fr',
      minHeight: '100vh',
    }}>
      <div style={{
        background: '#1a1a2e',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <CrmSidebarInner />
      </div>
      <div style={{ background: '#f5f5f7', minHeight: '100vh' }}>
        {children}
      </div>
    </div>
  )
}