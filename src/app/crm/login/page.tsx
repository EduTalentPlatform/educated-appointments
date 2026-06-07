import LoginForm from '@/components/crm/LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'EA CRM — Login' }

export default function CrmLogin() {
  return (
    <div className="crm-login-page">
      <div className="crm-login-card">
        <div className="crm-login-logo">
          <div className="crm-login-logo-mark">EA</div>
          <div>
            <p className="crm-login-logo-title">EA CRM</p>
            <p className="crm-login-logo-sub">Educated Appointments</p>
          </div>
        </div>
        <h1 className="crm-login-title">Sign in</h1>
        <p className="crm-login-hint">Use your EA account credentials</p>
        <LoginForm />
      </div>
    </div>
  )
}
