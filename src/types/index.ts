// ── Job / Vacancy ──────────────────────────────────────────────────────────
export interface Job {
  id: string
  title: string
  sector: string
  subject_area: string | null
  type: 'Permanent' | 'Contract' | 'Freelance'
  location: string
  region: string
  salary_min: number
  salary_max: number
  salary_display: string
  salary_note?: string
  description: string
  slug: string
  status: 'live' | 'closed' | 'draft'
  created_at: string
}

// ── Candidate ──────────────────────────────────────────────────────────────
export interface Candidate {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  created_at: string
}

// ── Application ────────────────────────────────────────────────────────────
export interface Application {
  id: string
  candidate_id: string
  vacancy_id: string
  status: 'applied' | 'in_review' | 'shortlisted' | 'placed' | 'rejected'
  cover_note?: string
  cv_url?: string
  created_at: string
}

// ── Filter state (used by the jobs page) ──────────────────────────────────
export interface JobFilters {
  sector: string
  type: string
  region: string
  salaryMin: number
}

// ── Apply form fields ──────────────────────────────────────────────────────
export interface ApplyFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  coverNote: string
  cv: File | null
  vacancyId: string
  vacancyTitle: string
}

// ── Server action response ─────────────────────────────────────────────────
export interface ActionResult {
  success: boolean
  error?: string
}