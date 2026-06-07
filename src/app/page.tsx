import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import TrustBar from '@/components/TrustBar'
import Marquee from '@/components/Marquee'
import AudienceSplit from '@/components/AudienceSplit'
import SaferRecruitment from '@/components/SaferRecruitment'
import EmployerPortal from '@/components/EmployerPortal'
import Process from '@/components/Process'
import LiveJobs from '@/components/LiveJobs'
import Testimonials from '@/components/Testimonials'
import CallToAction from '@/components/CallToAction'
import Footer from '@/components/Footer'
import PageEffects from '@/components/PageEffects'

export const revalidate = 60

export default function HomePage() {
  return (
    <>
      <PageEffects />
      <Nav />
      <Hero />
      <TrustBar />
      <Marquee />
      <AudienceSplit />
      <SaferRecruitment />
      <EmployerPortal />
      <Process />
      <LiveJobs />
      <Testimonials />
      <CallToAction />
      <Footer />
    </>
  )
}
