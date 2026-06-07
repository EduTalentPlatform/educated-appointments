import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import EmployerPage from '@/components/employer/EmployerPage'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Recruit for Your Training Provider — Educated Appointments',
  description:
    'FE & Skills specialist recruitment for training providers and colleges. Assessors, IQAs, Skills Coaches, Sales, Leadership and more. Safer Recruitment focused. UK-wide.',
}

export default function Employer() {
  return (
    <>
      <Nav />
      <EmployerPage />
      <Footer />
    </>
  )
}


