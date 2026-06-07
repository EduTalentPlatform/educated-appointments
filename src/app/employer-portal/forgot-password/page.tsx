import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import PageEffects from '@/components/PageEffects'
import ForgotPasswordForm from '@/components/employer-portal/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Forgot Employer Portal Password | Educated Appointments',
  description: 'Reset your Educated Appointments employer portal password.',
}

export default function EmployerPortalForgotPasswordPage() {
  return (
    <>
      <PageEffects />
      <Nav />
      <ForgotPasswordForm />
      <Footer />
    </>
  )
}