import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import ContactPage from '@/components/contact/ContactPage'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us — Educated Appointments',
  description:
    'Get in touch with Educated Appointments. Employer enquiries, candidate registrations, or book a free 15-minute intro call.',
}

export default function Contact() {
  return (
    <>
      <Nav />
      <ContactPage />
      <Footer />
    </>
  )
}