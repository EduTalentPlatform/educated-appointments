import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import AboutPage from '@/components/about/AboutPage'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us — Educated Appointments',
  description:
    'Educated Appointments was founded by Joe Sutton — a former training provider professional who built EA on one principle: quality over quantity, every single time.',
}

export default function About() {
  return (
    <>
      <Nav />
      <AboutPage />
      <Footer />
    </>
  )
}