import { isSupabaseConfigured } from '@/lib/supabaseClient'
import { adminStats, mlInsights, recentDonations, residentStatusByHouse } from '@/data/mockData'
import { getDonations, getResidents, getSocialMediaPosts } from '@/services/databaseService'

export type AdminKpi = {
  label: string
  value: string
}

export type AdminDonationRow = {
  id: string | number
  donor: string
  amount: number
  date: string
  type: string
}

export type AdminPieSlice = {
  name: string
  value: number
  color: string
}

export type AdminDashboardData = {
  kpis: AdminKpi[]
  residentStatusByHouse: AdminPieSlice[]
  recentDonations: AdminDonationRow[]
  mlInsights: typeof mlInsights
  source: 'mock' | 'supabase'
}

const FALLBACK_COLORS = [
  '#5A8FA0',
  '#C17A3A',
  '#9B7FC0',
  '#4A7A52',
  '#C06080',
]

function asMoney(n: unknown) {
  const num = typeof n === 'number' ? n : typeof n === 'string' ? Number(n) : NaN
  if (!Number.isFinite(num)) return 0
  return num
}

function asDateString(d: unknown) {
  if (typeof d === 'string' && d.trim()) return d
  return ''
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  if (!isSupabaseConfigured) {
    return {
      kpis: [
        { label: 'Active Residents', value: String(adminStats.activeResidents) },
        { label: 'Monthly Donations', value: `$${adminStats.monthlyDonations}` },
        { label: 'Social Engagement', value: adminStats.socialMediaEngagement.toLocaleString() },
        { label: 'Upcoming Conferences', value: String(adminStats.upcomingConferences) },
      ],
      residentStatusByHouse,
      recentDonations,
      mlInsights,
      source: 'mock',
    }
  }

  // Real data (Supabase) — keep UI shape identical to the current mock version.
  const [residents, donations, socialPosts] = await Promise.all([
    getResidents(),
    getDonations({ limit: 25 }),
    getSocialMediaPosts(),
  ])

  // KPI: Active residents (case_status contains values like Active/Closed/etc.)
  const activeResidents = (residents ?? []).filter(
    (r: any) => String(r?.case_status ?? '').toLowerCase() === 'active',
  ).length

  // KPI: Monthly donations (sum amounts for current month)
  const now = new Date()
  const currentMonth = monthKey(now)
  const monthlyDonationTotal = (donations ?? [])
    .filter((d: any) => {
      const dk = asDateString(d?.donation_date)
      if (!dk) return false
      const dt = new Date(dk)
      if (Number.isNaN(dt.getTime())) return false
      return monthKey(dt) === currentMonth
    })
    .reduce((sum: number, d: any) => sum + asMoney(d?.amount ?? d?.estimated_value), 0)

  // KPI: Social engagement — use impressions (or reach) from last 30 days if present
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - 30)
  const socialEngagement = (socialPosts ?? [])
    .slice(0, 200)
    .filter((p: any) => {
      const createdAt = asDateString(p?.created_at)
      if (!createdAt) return true // keep rows where date is missing rather than hiding everything
      const dt = new Date(createdAt)
      if (Number.isNaN(dt.getTime())) return true
      return dt >= cutoff
    })
    .reduce((sum: number, p: any) => {
      const impressions = asMoney(p?.impressions)
      const reach = asMoney(p?.reach)
      return sum + (impressions || reach || 0)
    }, 0)

  // Pie: resident status distribution (use case_status buckets)
  const statusCounts = new Map<string, number>()
  for (const r of residents ?? []) {
    const raw = String((r as any)?.case_status ?? '').trim()
    const key = raw || 'Unknown'
    statusCounts.set(key, (statusCounts.get(key) ?? 0) + 1)
  }
  const statusSlices = Array.from(statusCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value], idx) => ({
      name,
      value,
      color: FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
    }))

  // Table: recent donations (match existing columns)
  const recent = (donations ?? []).slice(0, 5).map((d: any) => {
    const donor = String(d?.supporter_name ?? 'Anonymous')
    const amount = asMoney(d?.amount ?? d?.estimated_value)
    const date = asDateString(d?.donation_date) || ''
    const type = String(d?.donation_type ?? (d?.is_recurring ? 'Monthly' : 'One-time'))
    return {
      id: d?.donation_id ?? `${donor}-${date}-${amount}`,
      donor,
      amount,
      date,
      type,
    }
  })

  return {
    kpis: [
      { label: 'Active Residents', value: String(activeResidents) },
      { label: 'Monthly Donations', value: `$${Math.round(monthlyDonationTotal)}` },
      { label: 'Social Engagement', value: Math.round(socialEngagement).toLocaleString() },
      // Not modeled yet in Supabase schema; keep placeholder for now.
      { label: 'Upcoming Conferences', value: '—' },
    ],
    residentStatusByHouse: statusSlices.length ? statusSlices : residentStatusByHouse,
    recentDonations: recent.length ? recent : recentDonations,
    mlInsights,
    source: 'supabase',
  }
}

