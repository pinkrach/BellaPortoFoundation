/**
 * Database service aligned with `supabase/migrations/20260406233029_remote_schema.sql`.
 *
 * Tables (17): donation_allocations, donations, education_records,
 * health_wellbeing_records, home_visitations, in_kind_donation_items,
 * incident_reports, intervention_plans, partner_assignments, partners,
 * process_recordings, public_impact_snapshots, residents,
 * safehouse_monthly_metrics, safehouses, social_media_posts, supporters.
 */

import { supabase } from '../lib/supabaseClient.js'

export class DatabaseServiceError extends Error {
  /**
   * @param {string} message
   * @param {unknown} [cause]
   */
  constructor(message, cause) {
    super(message)
    this.name = 'DatabaseServiceError'
    if (cause !== undefined) this.cause = cause
  }
}

/** @type {Record<string, string>} */
export const TABLE_PRIMARY_KEYS = {
  donation_allocations: 'allocation_id',
  donations: 'donation_id',
  education_records: 'education_record_id',
  health_wellbeing_records: 'health_record_id',
  home_visitations: 'visitation_id',
  in_kind_donation_items: 'item_id',
  incident_reports: 'incident_id',
  intervention_plans: 'plan_id',
  partner_assignments: 'assignment_id',
  partners: 'partner_id',
  process_recordings: 'recording_id',
  public_impact_snapshots: 'snapshot_id',
  residents: 'resident_id',
  safehouse_monthly_metrics: 'metric_id',
  safehouses: 'safehouse_id',
  social_media_posts: 'post_id',
  supporters: 'supporter_id',
}

/**
 * @param {{ message?: string } | null} error
 * @returns {never}
 */
function throwIfSupabaseError(error) {
  if (error) {
    throw new DatabaseServiceError(error.message || 'Supabase request failed', error)
  }
}

/**
 * @param {unknown} err
 * @param {string} context
 * @returns {never}
 */
function wrapUnexpected(err, context) {
  if (err instanceof DatabaseServiceError) throw err
  const message =
    err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
      ? err.message
      : String(err)
  throw new DatabaseServiceError(`${context}: ${message}`, err)
}

/** @param {{ data: unknown; error: { message?: string } | null }} result */
function assertSingle(result, context) {
  throwIfSupabaseError(result.error)
  if (result.data == null) {
    throw new DatabaseServiceError(`${context}: no row returned`)
  }
  return result.data
}

/** @param {Record<string, unknown> | null | undefined} supporter */
function resolveSupporterName(supporter) {
  if (!supporter || typeof supporter !== 'object') return null
  const display = supporter.display_name
  const org = supporter.organization_name
  const first = supporter.first_name
  const last = supporter.last_name
  if (typeof display === 'string' && display.trim()) return display.trim()
  if (typeof org === 'string' && org.trim()) return org.trim()
  const full = [first, last].filter((x) => typeof x === 'string' && x.trim()).join(' ').trim()
  return full || null
}

/**
 * All residents with `safehouse_name` from `safehouses.name`.
 */
export async function getResidents() {
  try {
    const { data, error } = await supabase
      .from('residents')
      .select('*, safehouses(safehouse_id, name)')
      .order('resident_id', { ascending: true })

    throwIfSupabaseError(error)

    return (data ?? []).map((row) => {
      const { safehouses: sh, ...resident } = row
      const name = sh && typeof sh === 'object' && 'name' in sh ? sh.name : null
      return {
        ...resident,
        safehouse_name: name ?? null,
      }
    })
  } catch (e) {
    wrapUnexpected(e, 'getResidents')
  }
}

/**
 * Recent donations with nested `supporters` row (exact columns) and `supporter_name`.
 * @param {{ limit?: number }} [options]
 */
export async function getDonations(options = {}) {
  const limit = options.limit ?? 50
  try {
    const { data, error } = await supabase
      .from('donations')
      .select(
        `
        donation_id,
        supporter_id,
        donation_type,
        donation_date,
        is_recurring,
        campaign_name,
        channel_source,
        currency_code,
        amount,
        estimated_value,
        impact_unit,
        notes,
        referral_post_id,
        supporters (
          supporter_id,
          supporter_type,
          display_name,
          organization_name,
          first_name,
          last_name,
          relationship_type,
          region,
          country,
          email,
          phone,
          status,
          created_at,
          first_donation_date,
          acquisition_channel
        )
      `,
      )
      .order('donation_date', { ascending: false, nullsFirst: false })
      .limit(limit)

    throwIfSupabaseError(error)

    return (data ?? []).map((row) => {
      const { supporters: sup, ...donation } = row
      return {
        ...donation,
        supporter_name: resolveSupporterName(sup),
        supporters: sup ?? null,
      }
    })
  } catch (e) {
    wrapUnexpected(e, 'getDonations')
  }
}

/**
 * Rows from `public_impact_snapshots` (snapshot_id, snapshot_date, headline, summary_text,
 * metric_payload_json, is_published, published_at).
 * @param {{ publishedOnly?: boolean }} [options]
 */
export async function getPublicImpact(options = {}) {
  const publishedOnly = options.publishedOnly ?? false
  try {
    let q = supabase
      .from('public_impact_snapshots')
      .select(
        'snapshot_id, snapshot_date, headline, summary_text, metric_payload_json, is_published, published_at',
      )
      .order('snapshot_date', { ascending: false, nullsFirst: false })

    if (publishedOnly) {
      q = q.eq('is_published', true)
    }

    const { data, error } = await q
    throwIfSupabaseError(error)
    return data ?? []
  } catch (e) {
    wrapUnexpected(e, 'getPublicImpact')
  }
}

/**
 * Rows from `safehouse_monthly_metrics`.
 */
export async function getMonthlyMetrics() {
  try {
    const { data, error } = await supabase
      .from('safehouse_monthly_metrics')
      .select(
        `
        metric_id,
        safehouse_id,
        month_start,
        month_end,
        active_residents,
        avg_education_progress,
        avg_health_score,
        process_recording_count,
        home_visitation_count,
        incident_count,
        notes
      `,
      )
      .order('month_start', { ascending: false, nullsFirst: false })

    throwIfSupabaseError(error)
    return data ?? []
  } catch (e) {
    wrapUnexpected(e, 'getMonthlyMetrics')
  }
}

// --- donation_allocations (allocation_id, donation_id, safehouse_id, program_area, amount_allocated, allocation_date, allocation_notes)

export async function getDonationAllocations() {
  try {
    const { data, error } = await supabase.from('donation_allocations').select('*')
    throwIfSupabaseError(error)
    return data ?? []
  } catch (e) {
    wrapUnexpected(e, 'getDonationAllocations')
  }
}

/** @param {number | string} allocationId */
export async function getDonationAllocationById(allocationId) {
  try {
    const result = await supabase
      .from('donation_allocations')
      .select('*')
      .eq('allocation_id', allocationId)
      .maybeSingle()
    return assertSingle(result, 'getDonationAllocationById')
  } catch (e) {
    wrapUnexpected(e, 'getDonationAllocationById')
  }
}

// --- donations

export async function getAllDonations() {
  try {
    const { data, error } = await supabase.from('donations').select('*')
    throwIfSupabaseError(error)
    return data ?? []
  } catch (e) {
    wrapUnexpected(e, 'getAllDonations')
  }
}

/** @param {number | string} donationId */
export async function getDonationById(donationId) {
  try {
    const result = await supabase.from('donations').select('*').eq('donation_id', donationId).maybeSingle()
    return assertSingle(result, 'getDonationById')
  } catch (e) {
    wrapUnexpected(e, 'getDonationById')
  }
}

// --- education_records

export async function getEducationRecords() {
  try {
    const { data, error } = await supabase.from('education_records').select('*')
    throwIfSupabaseError(error)
    return data ?? []
  } catch (e) {
    wrapUnexpected(e, 'getEducationRecords')
  }
}

/** @param {number | string} educationRecordId */
export async function getEducationRecordById(educationRecordId) {
  try {
    const result = await supabase
      .from('education_records')
      .select('*')
      .eq('education_record_id', educationRecordId)
      .maybeSingle()
    return assertSingle(result, 'getEducationRecordById')
  } catch (e) {
    wrapUnexpected(e, 'getEducationRecordById')
  }
}

// --- health_wellbeing_records

export async function getHealthWellbeingRecords() {
  try {
    const { data, error } = await supabase.from('health_wellbeing_records').select('*')
    throwIfSupabaseError(error)
    return data ?? []
  } catch (e) {
    wrapUnexpected(e, 'getHealthWellbeingRecords')
  }
}

/** @param {number | string} healthRecordId */
export async function getHealthWellbeingRecordById(healthRecordId) {
  try {
    const result = await supabase
      .from('health_wellbeing_records')
      .select('*')
      .eq('health_record_id', healthRecordId)
      .maybeSingle()
    return assertSingle(result, 'getHealthWellbeingRecordById')
  } catch (e) {
    wrapUnexpected(e, 'getHealthWellbeingRecordById')
  }
}

// --- home_visitations

export async function getHomeVisitations() {
  try {
    const { data, error } = await supabase.from('home_visitations').select('*')
    throwIfSupabaseError(error)
    return data ?? []
  } catch (e) {
    wrapUnexpected(e, 'getHomeVisitations')
  }
}

/** @param {number | string} visitationId */
export async function getHomeVisitationById(visitationId) {
  try {
    const result = await supabase
      .from('home_visitations')
      .select('*')
      .eq('visitation_id', visitationId)
      .maybeSingle()
    return assertSingle(result, 'getHomeVisitationById')
  } catch (e) {
    wrapUnexpected(e, 'getHomeVisitationById')
  }
}

// --- in_kind_donation_items

export async function getInKindDonationItems() {
  try {
    const { data, error } = await supabase.from('in_kind_donation_items').select('*')
    throwIfSupabaseError(error)
    return data ?? []
  } catch (e) {
    wrapUnexpected(e, 'getInKindDonationItems')
  }
}

/** @param {number | string} itemId */
export async function getInKindDonationItemById(itemId) {
  try {
    const result = await supabase
      .from('in_kind_donation_items')
      .select('*')
      .eq('item_id', itemId)
      .maybeSingle()
    return assertSingle(result, 'getInKindDonationItemById')
  } catch (e) {
    wrapUnexpected(e, 'getInKindDonationItemById')
  }
}

// --- incident_reports

export async function getIncidentReports() {
  try {
    const { data, error } = await supabase.from('incident_reports').select('*')
    throwIfSupabaseError(error)
    return data ?? []
  } catch (e) {
    wrapUnexpected(e, 'getIncidentReports')
  }
}

/** @param {number | string} incidentId */
export async function getIncidentReportById(incidentId) {
  try {
    const result = await supabase
      .from('incident_reports')
      .select('*')
      .eq('incident_id', incidentId)
      .maybeSingle()
    return assertSingle(result, 'getIncidentReportById')
  } catch (e) {
    wrapUnexpected(e, 'getIncidentReportById')
  }
}

// --- intervention_plans

export async function getInterventionPlans() {
  try {
    const { data, error } = await supabase.from('intervention_plans').select('*')
    throwIfSupabaseError(error)
    return data ?? []
  } catch (e) {
    wrapUnexpected(e, 'getInterventionPlans')
  }
}

/** @param {number | string} planId */
export async function getInterventionPlanById(planId) {
  try {
    const result = await supabase
      .from('intervention_plans')
      .select('*')
      .eq('plan_id', planId)
      .maybeSingle()
    return assertSingle(result, 'getInterventionPlanById')
  } catch (e) {
    wrapUnexpected(e, 'getInterventionPlanById')
  }
}

// --- partner_assignments

export async function getPartnerAssignments() {
  try {
    const { data, error } = await supabase.from('partner_assignments').select('*')
    throwIfSupabaseError(error)
    return data ?? []
  } catch (e) {
    wrapUnexpected(e, 'getPartnerAssignments')
  }
}

/** @param {number | string} assignmentId */
export async function getPartnerAssignmentById(assignmentId) {
  try {
    const result = await supabase
      .from('partner_assignments')
      .select('*')
      .eq('assignment_id', assignmentId)
      .maybeSingle()
    return assertSingle(result, 'getPartnerAssignmentById')
  } catch (e) {
    wrapUnexpected(e, 'getPartnerAssignmentById')
  }
}

// --- partners

export async function getPartners() {
  try {
    const { data, error } = await supabase.from('partners').select('*')
    throwIfSupabaseError(error)
    return data ?? []
  } catch (e) {
    wrapUnexpected(e, 'getPartners')
  }
}

/** @param {number | string} partnerId */
export async function getPartnerById(partnerId) {
  try {
    const result = await supabase.from('partners').select('*').eq('partner_id', partnerId).maybeSingle()
    return assertSingle(result, 'getPartnerById')
  } catch (e) {
    wrapUnexpected(e, 'getPartnerById')
  }
}

// --- process_recordings

export async function getProcessRecordings() {
  try {
    const { data, error } = await supabase.from('process_recordings').select('*')
    throwIfSupabaseError(error)
    return data ?? []
  } catch (e) {
    wrapUnexpected(e, 'getProcessRecordings')
  }
}

/** @param {number | string} recordingId */
export async function getProcessRecordingById(recordingId) {
  try {
    const result = await supabase
      .from('process_recordings')
      .select('*')
      .eq('recording_id', recordingId)
      .maybeSingle()
    return assertSingle(result, 'getProcessRecordingById')
  } catch (e) {
    wrapUnexpected(e, 'getProcessRecordingById')
  }
}

// --- public_impact_snapshots

export async function getPublicImpactSnapshots() {
  return getPublicImpact({ publishedOnly: false })
}

/** @param {number | string} snapshotId */
export async function getPublicImpactSnapshotById(snapshotId) {
  try {
    const result = await supabase
      .from('public_impact_snapshots')
      .select('*')
      .eq('snapshot_id', snapshotId)
      .maybeSingle()
    return assertSingle(result, 'getPublicImpactSnapshotById')
  } catch (e) {
    wrapUnexpected(e, 'getPublicImpactSnapshotById')
  }
}

// --- residents (see also getResidents)

export async function getResidentsRaw() {
  try {
    const { data, error } = await supabase.from('residents').select('*')
    throwIfSupabaseError(error)
    return data ?? []
  } catch (e) {
    wrapUnexpected(e, 'getResidentsRaw')
  }
}

/** @param {number | string} residentId */
export async function getResidentById(residentId) {
  try {
    const result = await supabase.from('residents').select('*').eq('resident_id', residentId).maybeSingle()
    return assertSingle(result, 'getResidentById')
  } catch (e) {
    wrapUnexpected(e, 'getResidentById')
  }
}

// --- safehouse_monthly_metrics (see also getMonthlyMetrics)

export async function getSafehouseMonthlyMetricsAll() {
  return getMonthlyMetrics()
}

/** @param {number | string} metricId */
export async function getSafehouseMonthlyMetricById(metricId) {
  try {
    const result = await supabase
      .from('safehouse_monthly_metrics')
      .select('*')
      .eq('metric_id', metricId)
      .maybeSingle()
    return assertSingle(result, 'getSafehouseMonthlyMetricById')
  } catch (e) {
    wrapUnexpected(e, 'getSafehouseMonthlyMetricById')
  }
}

// --- safehouses

export async function getSafehouses() {
  try {
    const { data, error } = await supabase.from('safehouses').select('*')
    throwIfSupabaseError(error)
    return data ?? []
  } catch (e) {
    wrapUnexpected(e, 'getSafehouses')
  }
}

/** @param {number | string} safehouseId */
export async function getSafehouseById(safehouseId) {
  try {
    const result = await supabase
      .from('safehouses')
      .select('*')
      .eq('safehouse_id', safehouseId)
      .maybeSingle()
    return assertSingle(result, 'getSafehouseById')
  } catch (e) {
    wrapUnexpected(e, 'getSafehouseById')
  }
}

// --- social_media_posts

export async function getSocialMediaPosts() {
  try {
    const { data, error } = await supabase.from('social_media_posts').select('*')
    throwIfSupabaseError(error)
    return data ?? []
  } catch (e) {
    wrapUnexpected(e, 'getSocialMediaPosts')
  }
}

/** @param {number | string} postId */
export async function getSocialMediaPostById(postId) {
  try {
    const result = await supabase
      .from('social_media_posts')
      .select('*')
      .eq('post_id', postId)
      .maybeSingle()
    return assertSingle(result, 'getSocialMediaPostById')
  } catch (e) {
    wrapUnexpected(e, 'getSocialMediaPostById')
  }
}

// --- supporters

export async function getSupporters() {
  try {
    const { data, error } = await supabase.from('supporters').select('*')
    throwIfSupabaseError(error)
    return data ?? []
  } catch (e) {
    wrapUnexpected(e, 'getSupporters')
  }
}

/** @param {number | string} supporterId */
export async function getSupporterById(supporterId) {
  try {
    const result = await supabase
      .from('supporters')
      .select('*')
      .eq('supporter_id', supporterId)
      .maybeSingle()
    return assertSingle(result, 'getSupporterById')
  } catch (e) {
    wrapUnexpected(e, 'getSupporterById')
  }
}

/**
 * Insert a row into a known table. Uses exact PostgREST table names.
 * @param {keyof typeof TABLE_PRIMARY_KEYS} table
 * @param {Record<string, unknown>} row
 */
export async function insertRecord(table, row) {
  if (!TABLE_PRIMARY_KEYS[table]) {
    throw new DatabaseServiceError(`insertRecord: unknown table "${table}"`)
  }
  try {
    const { data, error } = await supabase.from(table).insert(row).select()
    throwIfSupabaseError(error)
    return data
  } catch (e) {
    wrapUnexpected(e, `insertRecord(${table})`)
  }
}

/**
 * @param {keyof typeof TABLE_PRIMARY_KEYS} table
 * @param {number | string} id
 * @param {Record<string, unknown>} patch
 */
export async function updateRecord(table, id, patch) {
  const pk = TABLE_PRIMARY_KEYS[table]
  if (!pk) {
    throw new DatabaseServiceError(`updateRecord: unknown table "${table}"`)
  }
  try {
    const { data, error } = await supabase.from(table).update(patch).eq(pk, id).select()
    throwIfSupabaseError(error)
    return data
  } catch (e) {
    wrapUnexpected(e, `updateRecord(${table})`)
  }
}

/**
 * @param {keyof typeof TABLE_PRIMARY_KEYS} table
 * @param {number | string} id
 */
export async function deleteRecord(table, id) {
  const pk = TABLE_PRIMARY_KEYS[table]
  if (!pk) {
    throw new DatabaseServiceError(`deleteRecord: unknown table "${table}"`)
  }
  try {
    const { data, error } = await supabase.from(table).delete().eq(pk, id).select()
    throwIfSupabaseError(error)
    return data
  } catch (e) {
    wrapUnexpected(e, `deleteRecord(${table})`)
  }
}

/** Default export bundles common entry points for convenience. */
const databaseService = {
  TABLE_PRIMARY_KEYS,
  getResidents,
  getDonations,
  getPublicImpact,
  getMonthlyMetrics,
  getDonationAllocations,
  getDonationAllocationById,
  getAllDonations,
  getDonationById,
  getEducationRecords,
  getEducationRecordById,
  getHealthWellbeingRecords,
  getHealthWellbeingRecordById,
  getHomeVisitations,
  getHomeVisitationById,
  getInKindDonationItems,
  getInKindDonationItemById,
  getIncidentReports,
  getIncidentReportById,
  getInterventionPlans,
  getInterventionPlanById,
  getPartnerAssignments,
  getPartnerAssignmentById,
  getPartners,
  getPartnerById,
  getProcessRecordings,
  getProcessRecordingById,
  getPublicImpactSnapshots,
  getPublicImpactSnapshotById,
  getResidentsRaw,
  getResidentById,
  getSafehouseMonthlyMetricsAll,
  getSafehouseMonthlyMetricById,
  getSafehouses,
  getSafehouseById,
  getSocialMediaPosts,
  getSocialMediaPostById,
  getSupporters,
  getSupporterById,
  insertRecord,
  updateRecord,
  deleteRecord,
}

export default databaseService
