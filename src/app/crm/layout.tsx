import CrmSidebarInner from '@/components/crm/CrmSidebarInner'

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f5f7',
      }}
    >
      <aside
        style={{
          width: '240px',
          minWidth: '240px',
          background: '#1a1a2e',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          height: '100vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10000,
        }}
      >
        <CrmSidebarInner />
      </aside>

      <main
        style={{
          marginLeft: '240px',
          minHeight: '100vh',
          minWidth: 0,
          background: '#f5f5f7',
          overflowX: 'auto',
        }}
      >
        {children}
      </main>
    </div>
  )
}