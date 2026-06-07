import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function NotFound() {
  return (
    <>
      <Nav />
      <div className="not-found">
        <div className="not-found-inner">
          <p className="not-found-code">404</p>
          <h1 className="not-found-title">This page doesn&apos;t exist.</h1>
          <p className="not-found-sub">
            The page you&apos;re looking for has moved, been removed, or never existed.
            Let&apos;s get you back on track.
          </p>
          <div className="not-found-links">
            <Link href="/" className="not-found-btn-primary">Back to homepage</Link>
            <Link href="/jobs" className="not-found-btn-ghost">Browse live jobs</Link>
            <Link href="/contact" className="not-found-btn-ghost">Contact us</Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}