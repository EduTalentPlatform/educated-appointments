import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import PageEffects from '@/components/PageEffects'
import EmployerPortalLoginForm from '@/components/employer-portal/EmployerPortalLoginForm'

export default function EmployerPortalLoginPage() {
  return (
    <>
      <PageEffects />
      <Nav />
      <EmployerPortalLoginForm />
      <Footer />
    </>
  )
}