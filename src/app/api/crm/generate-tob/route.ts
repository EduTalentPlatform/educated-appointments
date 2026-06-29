import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'

export async function POST(request: NextRequest) {
  try {
    const { client, terms } = await request.json()

    const prompt = `You are generating a Terms of Business document for Educated Appointments Limited (registered company no. 11817946), Westerfield Business Centre, Main Road, Ipswich, IP6 9AB ("the Agency").

Generate a complete, professional Terms of Business using the standard EA structure:
1. The Parties
2. Definitions (Candidate, Data Protection Laws, Engagement, Introduction, Introduction Fee, Losses, Remuneration, Vulnerable Person)
3. The Contract (4 sub-clauses — entire agreement, prevails over client terms, no variation without director sign-off, employment agency status)
4. Notification and Fees (agreed fee %, 12-month window, payment terms, VAT, late payment interest at 8% above base rate)
5. Refunds (refund scale for first ${terms.rebate_weeks} weeks, conditions for qualifying)
6. Introductions to Third Parties (12-month liability if client passes candidate to third party)
7. Suitability Checks (EA obligations, client obligations including DBS/right to work/references, vulnerable persons provisions)
8. Information to be Provided
9. Confidentiality and Data Protection (GDPR, Data Protection Act 2018, candidate data used only for work-finding purposes, data sharing covered)
10. Liability
11. Notices
12. Severability
13. Governing Law (England & Wales)

Schedule: Scale of Refund table

CLIENT DETAILS:
- Client: ${client.company_name}${client.company_number ? ` (registered company no. ${client.company_number})` : ''}
${client.trading_as ? `- Trading as: ${client.trading_as}` : ''}
${client.address ? `- Address: ${client.address}` : ''}

AGREED COMMERCIAL TERMS:
- Introduction Fee: ${terms.fee_percentage}% of Remuneration for first 12 months
- Payment: within ${terms.payment_terms_days} days of invoice
- Rebate period: ${terms.rebate_weeks} weeks
- PSL status: ${terms.psl_status}
${terms.exclusivity ? '- Exclusivity clause: this engagement is on an exclusive basis' : ''}
${terms.notes ? `- Additional agreed terms: ${terms.notes}` : ''}

Write the complete document with all numbered clauses. Use formal legal language.

Formatting rules:
- Do not use Markdown headings such as # or ##.
- Do not use horizontal rules such as ---.
- Do not use block quotes using >.
- Do not include a signature section.
- Do not include "Signature and Acceptance".
- Do not include placeholder dotted signature lines.
- Include the refund schedule as simple rows, not a Markdown table.
- The CRM will add the branded formatting and DocuSign signature field separately.

Make the wording ready to send.`

    const { text } = await callAI(prompt, { maxTokens: 6000 })
    return NextResponse.json({ tob: text })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Something went wrong.' }, { status: 500 })
  }
}