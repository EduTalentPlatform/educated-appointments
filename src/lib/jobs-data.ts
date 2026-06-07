import { Job } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA — used until Supabase is connected for a given environment
// ─────────────────────────────────────────────────────────────────────────────

export const STATIC_JOBS: Job[] = [
  {
    id: '1',
    title: 'F-Gas Teacher & Assessor',
    sector: 'Assessing',
    subject_area: 'Electrical',
    type: 'Permanent',
    location: 'St Ives',
    region: 'East of England',
    salary_min: 38000,
    salary_max: 45000,
    salary_display: '£38,000 – £45,000',
    description: 'We are seeking an experienced F-Gas Teacher & Assessor to join a leading training provider in St Ives.',
    slug: 'f-gas-teacher-assessor',
    status: 'live',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Plumbing & Heating Tutor & Assessor',
    sector: 'Tutoring & Teaching',
    subject_area: 'Plumbing & Heating',
    type: 'Permanent',
    location: 'St Ives',
    region: 'East of England',
    salary_min: 38000,
    salary_max: 45000,
    salary_display: '£38,000 – £45,000',
    description: 'An exciting opportunity for an experienced Plumbing & Heating professional to move into training and assessment.',
    slug: 'plumbing-heating-tutor-assessor',
    status: 'live',
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Business Development Manager',
    sector: 'Sales & Business Development',
    subject_area: null,
    type: 'Permanent',
    location: 'Derby',
    region: 'East Midlands',
    salary_min: 35000,
    salary_max: 40000,
    salary_display: '£35,000 – £40,000',
    salary_note: '(£45K OTE)',
    description: 'A well-established apprenticeship provider is looking for a driven BDM to grow their employer partnerships.',
    slug: 'business-development-manager',
    status: 'live',
    created_at: new Date().toISOString(),
  },
]

// ── Role Types (first filter) ─────────────────────────────────────────────────
export const ROLE_TYPES = [
  'All Role Types',
  'Assessing',
  'Tutoring & Teaching',
  'Skills Coaching',
  'Functional Skills',
  'Curriculum & Leadership',
  'Sales & Business Development',
  'Employer Engagement',
  'MIS & Data',
  'Operations & Management',
  'Senior Management',
  'Director',
  'Executive Leadership',
]

// Role types that trigger the subject area filter
export const ROLE_TYPES_WITH_SUBJECTS = [
  'Assessing',
  'Tutoring & Teaching',
  'Skills Coaching',
  'Functional Skills',
  'Curriculum & Leadership',
]

// ── Subject Areas (second filter) ────────────────────────────────────────────
export const SUBJECT_AREAS: Record<string, string[]> = {
  'Trades & Engineering': [
    'Electrical',
    'Plumbing & Heating',
    'Gas & Renewables',
    'Construction & Built Environment',
    'Engineering & Manufacturing',
    'Automotive & Transport',
  ],
  'Health & Care': [
    'Adult Care',
    'Health & Science',
    'Childcare & Early Years',
  ],
  'Business & Professional': [
    'Business & Administration',
    'Digital & Technology',
    'Sales & Marketing',
    'Finance & Accounting',
    'Legal & Compliance',
    'Leadership & Management',
    'Cross-sector / General',
  ],
  'Service Industries': [
    'Hospitality & Catering',
    'Hair & Beauty',
    'Retail & Customer Service',
  ],
}

// Flat list for filtering logic
export const ALL_SUBJECT_AREAS = Object.values(SUBJECT_AREAS).flat()

export const JOB_TYPES = ['All Types', 'Permanent', 'Contract', 'Freelance']

export const REGIONS = [
  'All Regions',
  'East of England',
  'East Midlands',
  'West Midlands',
  'North West',
  'North East',
  'Yorkshire',
  'South East',
  'South West',
  'London',
  'Wales',
  'Scotland',
  'Remote / Flexible',
]

export const SALARY_RANGES = [
  { label: 'Any salary', min: 0 },
  { label: '£25,000+', min: 25000 },
  { label: '£30,000+', min: 30000 },
  { label: '£35,000+', min: 35000 },
  { label: '£40,000+', min: 40000 },
  { label: '£50,000+', min: 50000 },
]