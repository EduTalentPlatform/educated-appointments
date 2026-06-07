import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-montserrat',
})

export const metadata: Metadata = {
  title: 'Educated Appointments — FE & Skills Recruitment',
  description:
    'Specialist recruitment for Further Education, Skills & Apprenticeships. Assessors, IQAs, Skills Coaches, Curriculum Leads, Sales and Leadership. UK-wide.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en-GB" className={montserrat.variable}>
      <body>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  )
}
