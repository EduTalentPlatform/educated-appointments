import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import PageEffects from '@/components/PageEffects'
import SetPasswordForm from '@/components/employer-portal/SetPasswordForm'

export const metadata: Metadata = {
  title: 'Set Employer Portal Password | Educated Appointments',
  description: 'Set your Educated Appointments employer portal password.',
}

export default function EmployerPortalSetPasswordPage() {
  return (
    <>
      <PageEffects />
      <Nav />
      <SetPasswordForm />
      <Footer />
    </>
  )
}