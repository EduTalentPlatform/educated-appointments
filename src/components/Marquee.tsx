const roles = [
  'Assessors',
  'IQAs',
  'Skills Coaches',
  'Curriculum Leads',
  'Endpoint Assessors',
  'Business Development Managers',
  'Employer Engagement Managers',
  'Sales Managers',
  'MIS Officers',
  'Functional Skills Tutors',
  'Head of Apprenticeships',
  'Quality Managers',
  'Compliance Officers',
  'Operations Directors',
  'Commercial Directors',
]

export default function Marquee() {
  // Duplicate for seamless loop
  const allRoles = [...roles, ...roles]

  return (
    <div className="marquee-section">
      <div className="marquee-track">
        {allRoles.map((role, i) => (
          <div key={i} className="marquee-item">
            <div className="marquee-dot" />
            {role}
          </div>
        ))}
      </div>
    </div>
  )
}
