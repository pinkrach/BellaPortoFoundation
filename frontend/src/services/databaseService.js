/**
 * Backend-backed database service.
 *
 * Data flow: frontend -> backend API -> Supabase
 */

import { supabase } from '@/lib/supabaseClient'
import { redirectToLoginOnUnauthorizedResponse } from '@/lib/api'

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

const isLocalHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (isLocalHost ? 'http://localhost:5250' : '')

function buildApiUrl(path, params) {
  const basePath = apiBaseUrl ? `${apiBaseUrl}${path}` : path
  if (!params) return basePath

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue
    search.set(key, String(value))
  }

  const query = search.toString()
  return query ? `${basePath}?${query}` : basePath
}

/**
 * @param {Response} response
 * @param {string} context
 */
async function parseResponse(response, context) {
  if (response.ok) {
    if (response.status === 204) return null
    return response.json()
  }

  const text = await response.text()
  throw new DatabaseServiceError(
    `${context}: ${text || response.statusText || 'Request failed'}`,
  )
}

/**
 * @param {string} path
 * @param {string} context
 * @param {RequestInit} [init]
 */
async function apiRequest(path, context, init = {}) {
  try {
    const url = /^https?:\/\//.test(path) ? path : buildApiUrl(path)
    const token = (await supabase?.auth.getSession())?.data.session?.access_token ?? null
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
      ...init,
    })

    if (response.status === 401 && token) {
      await redirectToLoginOnUnauthorizedResponse(response)
    }

    return await parseResponse(response, context)
  } catch (error) {
    if (error instanceof DatabaseServiceError) throw error
    const message =
      error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : String(error)
    throw new DatabaseServiceError(`${context}: ${message}`, error)
  }
}

/** @param {unknown} value */
function assertArray(value, context) {
  if (!Array.isArray(value)) {
    throw new DatabaseServiceError(`${context}: expected an array response`)
  }
  return value
}

/** @param {unknown} value */
function assertObject(value, context) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DatabaseServiceError(`${context}: expected an object response`)
  }
  return value
}

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

/** @param {Record<string, unknown>} row */
function mapDonationRow(row) {
  const supporters = row.supporters && typeof row.supporters === 'object' ? row.supporters : null
  return {
    ...row,
    supporter_name: resolveSupporterName(supporters),
    supporters,
  }
}

function assertKnownTable(table, context) {
  if (!TABLE_PRIMARY_KEYS[table]) {
    throw new DatabaseServiceError(`${context}: unknown table "${table}"`)
  }
}

async function getTable(table) {
  assertKnownTable(table, 'getTable')
  return assertArray(await apiRequest(`/api/db/${table}`, `getTable(${table})`), `getTable(${table})`)
}

async function getTableById(table, id) {
  assertKnownTable(table, 'getTableById')
  return assertObject(
    await apiRequest(`/api/db/${table}/${id}`, `getTableById(${table})`),
    `getTableById(${table})`,
  )
}

async function getTableByResidentId(table, residentId) {
  assertKnownTable(table, 'getTableByResidentId')
  return assertArray(
    await apiRequest(`/api/db/${table}/resident/${residentId}`, `getTableByResidentId(${table})`),
    `getTableByResidentId(${table})`,
  )
}

export async function getResidents() {
  return assertArray(await apiRequest('/api/residents', 'getResidents'), 'getResidents')
}

export async function getDonations(options = {}) {
  const all = assertArray(await apiRequest('/api/donations', 'getDonations'), 'getDonations').map(mapDonationRow)

  const limit = options.limit ?? 50
  return all.slice(0, limit)
}

export async function getPublicImpact(options = {}) {
  const publishedOnly = options.publishedOnly ?? false
  return assertArray(
    await apiRequest(buildApiUrl('/api/public-impact', { publishedOnly }), 'getPublicImpact'),
    'getPublicImpact',
  )
}

export async function getMonthlyMetrics() {
  return assertArray(await apiRequest('/api/monthly-metrics', 'getMonthlyMetrics'), 'getMonthlyMetrics')
}

export async function getDonationAllocations() {
  return getTable('donation_allocations')
}

export async function getDonationAllocationById(allocationId) {
  return getTableById('donation_allocations', allocationId)
}

export async function getAllDonations() {
  return assertArray(await apiRequest('/api/donations', 'getAllDonations'), 'getAllDonations').map(mapDonationRow)
}

export async function getDonationById(donationId) {
  return getTableById('donations', donationId)
}

export async function getEducationRecords() {
  return getTable('education_records')
}

export async function getEducationRecordById(educationRecordId) {
  return getTableById('education_records', educationRecordId)
}

export async function getHealthWellbeingRecords() {
  return getTable('health_wellbeing_records')
}

export async function getHealthWellbeingRecordById(healthRecordId) {
  return getTableById('health_wellbeing_records', healthRecordId)
}

export async function getHomeVisitations() {
  return getTable('home_visitations')
}

export async function getHomeVisitationById(visitationId) {
  return getTableById('home_visitations', visitationId)
}

export async function getInKindDonationItems() {
  return getTable('in_kind_donation_items')
}

export async function getInKindDonationItemById(itemId) {
  return getTableById('in_kind_donation_items', itemId)
}

export async function getIncidentReports() {
  return getTable('incident_reports')
}

export async function getIncidentReportById(incidentId) {
  return getTableById('incident_reports', incidentId)
}

export async function getInterventionPlans() {
  return getTable('intervention_plans')
}

export async function getInterventionPlanById(planId) {
  return getTableById('intervention_plans', planId)
}

export async function getPartnerAssignments() {
  return getTable('partner_assignments')
}

export async function getPartnerAssignmentById(assignmentId) {
  return getTableById('partner_assignments', assignmentId)
}

export async function getPartners() {
  return getTable('partners')
}

export async function getPartnerById(partnerId) {
  return getTableById('partners', partnerId)
}

export async function getProcessRecordings() {
  return getTable('process_recordings')
}

export async function getProcessRecordingById(recordingId) {
  return getTableById('process_recordings', recordingId)
}

export async function getPublicImpactSnapshots() {
  return getPublicImpact({ publishedOnly: false })
}

export async function getPublicImpactSnapshotById(snapshotId) {
  return getTableById('public_impact_snapshots', snapshotId)
}

export async function getResidentsRaw() {
  return getTable('residents')
}

export async function getResidentById(residentId) {
  return getTableById('residents', residentId)
}

export async function getEducationRecordsByResidentId(residentId) {
  return getTableByResidentId('education_records', residentId)
}

export async function getHealthWellbeingRecordsByResidentId(residentId) {
  return getTableByResidentId('health_wellbeing_records', residentId)
}

export async function getHomeVisitationsByResidentId(residentId) {
  return getTableByResidentId('home_visitations', residentId)
}

export async function getIncidentReportsByResidentId(residentId) {
  return getTableByResidentId('incident_reports', residentId)
}

export async function getInterventionPlansByResidentId(residentId) {
  return getTableByResidentId('intervention_plans', residentId)
}

export async function getProcessRecordingsByResidentId(residentId) {
  return getTableByResidentId('process_recordings', residentId)
}

export async function getResidentProfileBundle(residentId) {
  return assertObject(
    await apiRequest(`/api/residents/${residentId}/profile-bundle`, 'getResidentProfileBundle'),
    'getResidentProfileBundle',
  )
}

export async function getSafehouseMonthlyMetricsAll() {
  return getMonthlyMetrics()
}

export async function getSafehouseMonthlyMetricById(metricId) {
  return getTableById('safehouse_monthly_metrics', metricId)
}

export async function getSafehouses() {
  return getTable('safehouses')
}

export async function getSafehouseById(safehouseId) {
  return getTableById('safehouses', safehouseId)
}

export async function getSocialMediaPosts() {
  return getTable('social_media_posts')
}

export async function getSocialMediaPostById(postId) {
  return getTableById('social_media_posts', postId)
}

export async function getSupporters() {
  return assertArray(await apiRequest('/api/supporters', 'getSupporters'), 'getSupporters')
}

export async function getSupporterById(supporterId) {
  return getTableById('supporters', supporterId)
}

/**
 * @param {keyof typeof TABLE_PRIMARY_KEYS} table
 * @param {Record<string, unknown>} row
 */
export async function insertRecord(table, row) {
  assertKnownTable(table, 'insertRecord')
  return assertArray(
    await apiRequest(`/api/db/${table}`, `insertRecord(${table})`, {
      method: 'POST',
      body: JSON.stringify(row),
    }),
    `insertRecord(${table})`,
  )
}

/**
 * @param {keyof typeof TABLE_PRIMARY_KEYS} table
 * @param {number | string} id
 * @param {Record<string, unknown>} patch
 */
export async function updateRecord(table, id, patch) {
  assertKnownTable(table, 'updateRecord')
  return assertObject(
    await apiRequest(`/api/db/${table}/${id}`, `updateRecord(${table})`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
    `updateRecord(${table})`,
  )
}

/**
 * @param {keyof typeof TABLE_PRIMARY_KEYS} table
 * @param {number | string} id
 */
export async function deleteRecord(table, id) {
  assertKnownTable(table, 'deleteRecord')
  return apiRequest(`/api/db/${table}/${id}`, `deleteRecord(${table})`, {
    method: 'DELETE',
  })
}

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
  getEducationRecordsByResidentId,
  getHealthWellbeingRecordsByResidentId,
  getHomeVisitationsByResidentId,
  getIncidentReportsByResidentId,
  getInterventionPlansByResidentId,
  getProcessRecordingsByResidentId,
  getResidentProfileBundle,
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
