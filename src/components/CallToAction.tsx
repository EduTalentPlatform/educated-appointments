import Link from 'next/link'

export default function CallToAction() {
  return (
    <section className="cta-section">
      <div className="cta-inner">
        <div>
          <h2 className="cta-headline reveal">
            Ready to stop<br />
            <span className="teal">wasting time?</span>
          </h2>
          <p className="cta-sub reveal reveal-delay-1">
            Book a free 15-minute intro call. We&apos;ll understand your brief, give you an
            honest picture of the market, and tell you exactly what we can do — including
            getting you set up on the Employer Portal.
          </p>
        </div>
        <div className="cta-buttons reveal reveal-delay-2">
          <Link href="/contact" className="btn-cta-primary">Book a 15-min call →</Link>
          <a href="tel:01473809096" className="btn-cta-ghost">01473 809 096</a>
        </div>
      </div>
    </section>
  )
}
