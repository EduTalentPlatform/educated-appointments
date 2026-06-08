import Image from 'next/image'
import Link from 'next/link'

const employerLinks = [
  { label: 'How It Works', href: '/employer' },
  { label: 'Send a Brief', href: '/contact' },
  { label: 'Employer Portal', href: '/employer-portal/login' },
  { label: 'Sector Insights', href: '/insights' },
]

const candidateLinks = [
  { label: 'Live Jobs', href: '/jobs' },
  { label: 'Register with Us', href: '/candidate' },
  { label: 'Testimonials', href: '/testimonials' },
]

const companyLinks = [
  { label: 'About Us', href: '/about' },
  { label: 'Insights', href: '/insights' },
  { label: 'Contact', href: '/contact' },
  { label: 'Policies', href: '/policies' },
  { label: 'Data Protection & Privacy', href: '/policies/data-protection' },
]

export default function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-top">
          <div>
            <div className="footer-logo">
              <Image
                src="/logo.svg"
                alt="Educated Appointments"
                width={28}
                height={29}
                className="logo-svg"
                style={{ filter: 'brightness(0) invert(1)' }}
              />

              <div className="footer-logo-text">
                Educated Appointments
                <span>FE &amp; Skills Recruitment</span>
              </div>
            </div>

            <p className="footer-tagline">
              Specialist recruitment for Further Education, Skills &amp;
              Apprenticeships. Safer Recruitment focused. UK-wide.
            </p>

            <div className="footer-contact">
              <a href="mailto:info@educatedappointments.co.uk">
                info@educatedappointments.co.uk
              </a>
              <a href="tel:01473809096">01473 809 096</a>
            </div>
          </div>

          <div className="footer-col">
            <p className="footer-col-title">For Employers</p>
            <ul>
              {employerLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <p className="footer-col-title">For Candidates</p>
            <ul>
              {candidateLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <p className="footer-col-title">Company</p>
            <ul>
              {companyLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copy">
            © {new Date().getFullYear()} Educated Appointments Ltd. All rights
            reserved.
          </p>

          <span className="rec-badge">Safer Recruitment Focused</span>

          <div className="footer-legal">
            <Link href="/policies/data-protection">Privacy</Link>
            <Link href="/policies">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}