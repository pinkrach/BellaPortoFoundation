import { startTransition, type ReactNode, useCallback, useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Building2,
  Bed,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileHeart,
  HandCoins,
  Heart,
  HeartPulse,
  Home,
  LayoutDashboard,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { PublicImpactMlPanel } from "@/components/admin/PublicImpactMlPanel";
import { OutreachSocialMediaPanel } from "@/components/admin/OutreachSocialMediaPanel";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  deleteRecord,
  getDonationAllocations,
  getDonations,
  getEducationRecords,
  getHealthWellbeingRecords,
  getHomeVisitations,
  getIncidentReports,
  getInKindDonationItems,
  getInterventionPlans,
  getProcessRecordings,
  getPublicImpactSnapshots,
  getResidents,
  getSafehouseMonthlyMetricsAll,
  getSafehouses,
  getSocialMediaPosts,
  getSupporters,
  insertRecord,
  updateRecord,
} from "@/services/databaseService";

type MainTab = "dashboard" | "residents" | "donations" | "safe-houses" | "reports" | "outreach" | "settings";
type ResidentsSubTab = "all-residents" | "process-records" | "visitations" | "education" | "health" | "interventions" | "incidents";
type DonationsSubTab = "supporters" | "donations" | "in-kind" | "allocations";
type SafeHousesSubTab = "safe-houses" | "allocation-history" | "monthly-metrics";
type OutreachSubTab = "social-media" | "public-impact";

type Resident = {
  resident_id: number;
  case_control_no: string | null;
  internal_code: string | null;
  safehouse_id: number | null;
  safehouse_name?: string | null;
  case_status: string | null;
  sex: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  religion: string | null;
  case_category: string | null;
  date_of_admission: string | null;
  assigned_social_worker: string | null;
  initial_risk_level: string | null;
  current_risk_level: string | null;
  created_at: string | null;
  notes_restricted: string | null;
  referring_agency_person: string | null;
  present_age: string | null;
  reintegration_status: string | null;
};

type Supporter = {
  supporter_id: number;
  supporter_type: string | null;
  display_name: string | null;
  organization_name: string | null;
  first_name: string | null;
  last_name: string | null;
  relationship_type: string | null;
  region: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  created_at: string | null;
  first_donation_date: string | null;
  acquisition_channel: string | null;
};

type Donation = {
  donation_id: number;
  supporter_id: number | null;
  donation_type: string | null;
  donation_date: string | null;
  created_at?: string | null;
  is_recurring: boolean | null;
  campaign_name: string | null;
  channel_source: string | null;
  currency_code: string | null;
  amount: number | string | null;
  estimated_value: number | string | null;
  impact_unit: string | null;
  notes: string | null;
  referral_post_id: number | string | null;
  supporter_name?: string | null;
  supporters?: {
    display_name?: string | null;
    organization_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

type DonationAllocation = {
  allocation_id: number;
  donation_id: number | null;
  safehouse_id: number | null;
  program_area: string | null;
  amount_allocated: number | string | null;
  allocation_date: string | null;
  allocation_notes: string | null;
};

type InKindItem = {
  item_id: number;
  donation_id: number | null;
  item_name: string | null;
  item_category: string | null;
  quantity: number | string | null;
  unit_of_measure: string | null;
  estimated_unit_value: number | string | null;
  intended_use: string | null;
  received_condition: string | null;
};

type Safehouse = {
  safehouse_id: number;
  safehouse_code: string | null;
  name: string | null;
  region: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  open_date: string | null;
  status: string | null;
  capacity_girls: number | string | null;
  capacity_staff: number | string | null;
  current_occupancy: number | string | null;
  notes: string | null;
};

type MonthlyMetric = {
  metric_id: number;
  safehouse_id: number | null;
  month_start: string | null;
  month_end: string | null;
  active_residents: number | string | null;
  avg_education_progress: number | string | null;
  avg_health_score: number | string | null;
  process_recording_count: number | string | null;
  home_visitation_count: number | string | null;
  incident_count: number | string | null;
  notes: string | null;
};

type SocialPost = {
  post_id: number;
  platform: string | null;
  created_at: string | null;
  post_type: string | null;
  campaign_name: string | null;
  impressions: number | string | null;
  engagement_rate: number | string | null;
  donation_referrals: number | string | null;
  estimated_donation_value_php: number | string | null;
};

type PublicImpactSnapshot = {
  snapshot_id: number;
  snapshot_date: string | null;
  headline: string | null;
  summary_text: string | null;
  is_published: boolean | string | null;
  published_at: string | null;
};

type RecordRow = Record<string, unknown>;
type ResidentWithSafehouse = Resident & { safehouse_name: string | null };

type WorkspaceData = {
  residents: Resident[];
  processRecordings: RecordRow[];
  visitations: RecordRow[];
  education: RecordRow[];
  health: RecordRow[];
  interventions: RecordRow[];
  incidents: RecordRow[];
  supporters: Supporter[];
  donations: Donation[];
  allocations: DonationAllocation[];
  inKind: InKindItem[];
  safehouses: Safehouse[];
  monthlyMetrics: MonthlyMetric[];
  socialPosts: SocialPost[];
  publicImpact: PublicImpactSnapshot[];
};

type AnalyticsDatum = Record<string, string | number | null>;

type AnalyticsCardConfig = {
  key: string;
  title: string;
  subtitle: string;
  kpiLabel: string;
  kpiValue: string;
  kpiDetail: string;
  data: AnalyticsDatum[];
  xKey: string;
  yKey: string;
  type?: "bar" | "line" | "pie";
  color?: string;
  emptyMessage?: string;
  modalOptions?: Array<{ value: string; label: string }>;
  selectedOption?: string;
  onOptionChange?: (value: string) => void;
};

type ResidentFormState = {
  case_control_no: string;
  internal_code: string;
  safehouse_id: string;
  case_status: string;
  sex: string;
  date_of_birth: string;
  place_of_birth: string;
  religion: string;
  case_category: string;
  date_of_admission: string;
  assigned_social_worker: string;
  current_risk_level: string;
  notes_restricted: string;
};

type SupporterFormState = {
  supporter_type: string;
  display_name: string;
  organization_name: string;
  first_name: string;
  last_name: string;
  relationship_type: string;
  region: string;
  country: string;
  email: string;
  phone: string;
  status: string;
  first_donation_date: string;
  acquisition_channel: string;
};

type DonationFormState = {
  supporter_id: string;
  donation_type: string;
  donation_date: string;
  is_recurring: string;
  campaign_name: string;
  channel_source: string;
  currency_code: string;
  amount: string;
  estimated_value: string;
  impact_unit: string;
  notes: string;
  referral_post_id: string;
};

type InKindFormState = {
  donation_id: string;
  item_name: string;
  item_category: string;
  quantity: string;
  unit_of_measure: string;
  estimated_unit_value: string;
  intended_use: string;
  received_condition: string;
};

type AllocationFormState = {
  donation_id: string;
  safehouse_id: string;
  program_area: string;
  amount_allocated: string;
  allocation_date: string;
  allocation_notes: string;
};

type SafehouseFormState = {
  safehouse_code: string;
  name: string;
  region: string;
  city: string;
  province: string;
  country: string;
  open_date: string;
  status: string;
  capacity_girls: string;
  capacity_staff: string;
  current_occupancy: string;
  notes: string;
};

type ProcessRecordFormState = {
  resident_id: string;
  session_date: string;
  social_worker: string;
  session_type: string;
  session_duration_minutes: string;
  emotional_state_observed: string;
  emotional_state_end: string;
  session_narrative: string;
  interventions_applied: string;
  interventions_none: string;
  follow_up_actions: string;
  follow_up_none: string;
  progress_noted: string;
  concerns_flagged: string;
  referral_made: string;
  notes_restricted: string;
};

function validateProcessRecordFormState(state: ProcessRecordFormState, isNewRecord: boolean): string | null {
  if (!state.resident_id.trim()) return "Please select a resident.";
  if (!state.session_date.trim()) return "Session date is required.";
  if (!state.social_worker.trim()) return "Social worker is required.";
  if (!state.session_type.trim()) return "Session type is required (Individual or Group).";
  if (isNewRecord && state.session_type !== "Individual" && state.session_type !== "Group") {
    return "For a new record, choose session type Individual or Group.";
  }
  if (!state.emotional_state_observed.trim()) return "Emotional state observed is required.";
  if (!state.session_narrative.trim()) return "A narrative summary of the session is required.";
  const interventionsOk = state.interventions_none === "true" || state.interventions_applied.trim().length > 0;
  if (!interventionsOk) return "Enter interventions applied or check None.";
  const followUpOk = state.follow_up_none === "true" || state.follow_up_actions.trim().length > 0;
  if (!followUpOk) return "Enter follow-up actions or check None.";
  return null;
}

type VisitationFormState = {
  resident_id: string;
  visit_date: string;
  social_worker: string;
  visit_type: string;
  location_visited: string;
  family_members_present: string;
  purpose: string;
  observations: string;
  family_cooperation_level: string;
  safety_concerns_noted: string;
  follow_up_needed: string;
  follow_up_notes: string;
  visit_outcome: string;
};

type EducationFormState = {
  resident_id: string;
  record_date: string;
  education_level: string;
  school_name: string;
  enrollment_status: string;
  attendance_rate: string;
  progress_percent: string;
  completion_status: string;
  notes: string;
};

type HealthFormState = {
  resident_id: string;
  record_date: string;
  general_health_score: string;
  nutrition_score: string;
  sleep_quality_score: string;
  energy_level_score: string;
  height_cm: string;
  weight_kg: string;
  bmi: string;
  medical_checkup_done: string;
  dental_checkup_done: string;
  psychological_checkup_done: string;
  notes: string;
};

type InterventionFormState = {
  resident_id: string;
  plan_category: string;
  plan_description: string;
  services_provided: string;
  target_value: string;
  target_date: string;
  status: string;
  case_conference_date: string;
};

type IncidentFormState = {
  resident_id: string;
  safehouse_id: string;
  incident_date: string;
  incident_type: string;
  severity: string;
  description: string;
  response_taken: string;
  resolved: string;
  resolution_date: string;
  reported_by: string;
  follow_up_required: string;
};

const RESIDENT_SUBTABS: Array<{ value: ResidentsSubTab; label: string }> = [
  { value: "all-residents", label: "All Residents" },
  { value: "process-records", label: "Process Records" },
  { value: "visitations", label: "Visitations & Conferences" },
  { value: "education", label: "Education" },
  { value: "health", label: "Health" },
  { value: "interventions", label: "Interventions" },
  { value: "incidents", label: "Incidents" },
];

const DONATION_SUBTABS: Array<{ value: DonationsSubTab; label: string }> = [
  { value: "supporters", label: "Supporters" },
  { value: "donations", label: "Donations" },
  { value: "in-kind", label: "In-Kind" },
  { value: "allocations", label: "Allocations" },
];

const DEFAULT_DONATIONS_SUBTAB: DonationsSubTab = "supporters";

const SAFEHOUSE_SUBTABS: Array<{ value: SafeHousesSubTab; label: string }> = [
  { value: "safe-houses", label: "Safe Houses" },
  { value: "allocation-history", label: "Allocation History" },
  { value: "monthly-metrics", label: "Monthly Metrics" },
];

const OUTREACH_SUBTABS: Array<{ value: OutreachSubTab; label: string }> = [
  { value: "social-media", label: "Social Media" },
  { value: "public-impact", label: "Public Impact" },
];

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--lavender))",
  "hsl(var(--sage))",
  "hsl(var(--seafoam))",
];

const EMPTY_WORKSPACE: WorkspaceData = {
  residents: [],
  processRecordings: [],
  visitations: [],
  education: [],
  health: [],
  interventions: [],
  incidents: [],
  supporters: [],
  donations: [],
  allocations: [],
  inKind: [],
  safehouses: [],
  monthlyMetrics: [],
  socialPosts: [],
  publicImpact: [],
};

async function fetchAdminWorkspace(): Promise<WorkspaceData> {
  const [
    residents,
    processRecordings,
    visitations,
    education,
    health,
    interventions,
    incidents,
    supporters,
    donations,
    allocations,
    inKind,
    safehouses,
    monthlyMetrics,
    socialPosts,
    publicImpact,
  ] = await Promise.all([
    getResidents(),
    getProcessRecordings(),
    getHomeVisitations(),
    getEducationRecords(),
    getHealthWellbeingRecords(),
    getInterventionPlans(),
    getIncidentReports(),
    getSupporters(),
    getDonations({ limit: 1000 }),
    getDonationAllocations(),
    getInKindDonationItems(),
    getSafehouses(),
    getSafehouseMonthlyMetricsAll(),
    getSocialMediaPosts(),
    getPublicImpactSnapshots(),
  ]);

  return {
    residents: (residents as Resident[]) ?? [],
    processRecordings: (processRecordings as RecordRow[]) ?? [],
    visitations: (visitations as RecordRow[]) ?? [],
    education: (education as RecordRow[]) ?? [],
    health: (health as RecordRow[]) ?? [],
    interventions: (interventions as RecordRow[]) ?? [],
    incidents: (incidents as RecordRow[]) ?? [],
    supporters: (supporters as Supporter[]) ?? [],
    donations: (donations as Donation[]) ?? [],
    allocations: (allocations as DonationAllocation[]) ?? [],
    inKind: (inKind as InKindItem[]) ?? [],
    safehouses: (safehouses as Safehouse[]) ?? [],
    monthlyMetrics: (monthlyMetrics as MonthlyMetric[]) ?? [],
    socialPosts: (socialPosts as SocialPost[]) ?? [],
    publicImpact: (publicImpact as PublicImpactSnapshot[]) ?? [],
  };
}

function parseIds(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 0);
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toNullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBooleanString(value: unknown) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "false") return normalized;
  }
  return "false";
}

function toNullableBoolean(value: string) {
  if (!value.trim()) return null;
  return value === "true";
}

function asText(value: unknown, fallback = "Not recorded") {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function asDisplayDate(value: unknown, fallback = "Not scheduled") {
  if (!value) return fallback;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function formatCurrency(value: unknown, currency = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function residentLabel(resident: Resident) {
  return resident.internal_code?.trim() || resident.case_control_no?.trim() || `Resident ${resident.resident_id}`;
}

/** Parses CC-123 / cc-0001 style case numbers (must match DB trigger). */
function parseCcCaseNumeric(caseControl: string | null | undefined): number | null {
  const s = String(caseControl ?? "").trim().toLowerCase();
  const m = s.match(/^cc-(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

/** Next case control no. after max CC-######## in the table (same padding as Postgres: min 5 digits, CC-00001+). */
function suggestNextCaseControlNoFromResidents(residents: Resident[]): string {
  let maxNum = 0;
  for (const r of residents) {
    const n = parseCcCaseNumeric(r.case_control_no);
    if (n != null && n > maxNum) maxNum = n;
  }
  const next = maxNum + 1;
  const width = Math.max(5, String(next).length);
  return `CC-${String(next).padStart(width, "0")}`;
}

/** Parses LS-0001 / ls-0001 style internal codes (case-insensitive). */
function parseLsInternalNumeric(code: string | null | undefined): number | null {
  const s = String(code ?? "").trim().toLowerCase();
  const m = s.match(/^ls-(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

/** Next internal code: LS- + 4-digit (wider if sequence exceeds 9999). */
function suggestNextLsInternalCodeFromResidents(residents: Resident[]): string {
  let maxNum = 0;
  for (const r of residents) {
    const n = parseLsInternalNumeric(r.internal_code);
    if (n != null && n > maxNum) maxNum = n;
  }
  const next = maxNum + 1;
  const width = Math.max(4, String(next).length);
  return `LS-${String(next).padStart(width, "0")}`;
}

function supporterLabel(supporter: Supporter) {
  const display = supporter.display_name?.trim();
  if (display) return display;
  const organization = supporter.organization_name?.trim();
  if (organization) return organization;
  const fullName = [supporter.first_name, supporter.last_name].filter(Boolean).join(" ").trim();
  return fullName || `Supporter ${supporter.supporter_id}`;
}

function compareDatesDescending(a: unknown, b: unknown) {
  const aDate = new Date(String(a ?? ""));
  const bDate = new Date(String(b ?? ""));
  const aTime = Number.isNaN(aDate.getTime()) ? 0 : aDate.getTime();
  const bTime = Number.isNaN(bDate.getTime()) ? 0 : bDate.getTime();
  return bTime - aTime;
}

function startOfLocalDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function sortUpcomingThenRecent<T extends Record<string, unknown>>(rows: T[], dateKey: string) {
  const now = new Date();
  const future = rows
    .filter((row) => {
      const raw = row[dateKey];
      const date = new Date(String(raw ?? ""));
      return !Number.isNaN(date.getTime()) && date >= now;
    })
    .sort((left, right) => new Date(String(left[dateKey])).getTime() - new Date(String(right[dateKey])).getTime());
  const past = rows
    .filter((row) => {
      const raw = row[dateKey];
      const date = new Date(String(raw ?? ""));
      return Number.isNaN(date.getTime()) || date < now;
    })
    .sort((left, right) => compareDatesDescending(left[dateKey], right[dateKey]));
  return [...future, ...past];
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addCalendarDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function splitFutureRows<T extends Record<string, unknown>>(rows: T[], dateKey: string) {
  const now = new Date();
  const upcoming = rows
    .filter((row) => {
      const date = new Date(String(row[dateKey] ?? ""));
      return !Number.isNaN(date.getTime()) && date > now;
    })
    .sort((left, right) => new Date(String(left[dateKey])).getTime() - new Date(String(right[dateKey])).getTime());

  const currentAndPast = rows
    .filter((row) => {
      const date = new Date(String(row[dateKey] ?? ""));
      return Number.isNaN(date.getTime()) || date <= now;
    })
    .sort((left, right) => compareDatesDescending(left[dateKey], right[dateKey]));

  return { upcoming, currentAndPast };
}

function exportRows(label: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    toast.error(`No ${label.toLowerCase()} rows are available to export.`);
    return;
  }

  const keys = Array.from(
    rows.reduce<Set<string>>((accumulator, row) => {
      Object.keys(row).forEach((key) => accumulator.add(key));
      return accumulator;
    }, new Set()),
  );

  const csv = [
    keys.join(","),
    ...rows.map((row) =>
      keys
        .map((key) => {
          const value = row[key];
          const text = value == null ? "" : String(value);
          return `"${text.replaceAll('"', '""')}"`;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${label.toLowerCase().replaceAll(/\s+/g, "-")}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildCountChart(rows: Array<Record<string, unknown>>, key: string) {
  return Array.from(
    rows.reduce<Map<string, number>>((accumulator, row) => {
      const label = asText(row[key], "Unknown");
      accumulator.set(label, (accumulator.get(label) ?? 0) + 1);
      return accumulator;
    }, new Map()),
  ).map(([label, value]) => ({ label, value }));
}

function buildAverageChart(definitions: Array<{ label: string; values: number[] }>) {
  return definitions.map((definition) => ({
    label: definition.label,
    value: definition.values.length
      ? Number((definition.values.reduce((sum, value) => sum + value, 0) / definition.values.length).toFixed(1))
      : 0,
  }));
}

function buildMonthlySumChart(
  rows: Array<Record<string, unknown>>,
  dateKey: string,
  valueSelector: (row: Record<string, unknown>) => number,
) {
  const monthly = new Map<string, number>();
  rows.forEach((row) => {
    const raw = String(row[dateKey] ?? "");
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return;
    const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
    monthly.set(key, (monthly.get(key) ?? 0) + valueSelector(row));
  });
  return Array.from(monthly.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, value]) => ({ label, value: Math.round(value) }));
}

function AnalyticsPreviewChart({ config, expanded = false }: { config: AnalyticsCardConfig; expanded?: boolean }) {
  if (!config.data.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-3 text-center text-xs text-muted-foreground">
        {config.emptyMessage ?? "No chart data yet"}
      </div>
    );
  }

  if (config.type === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={config.data}>
          {expanded ? <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /> : null}
          <XAxis
            dataKey={config.xKey}
            hide={!expanded}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            angle={expanded ? -20 : 0}
            textAnchor={expanded ? "end" : "middle"}
            height={expanded ? 60 : undefined}
          />
          <YAxis hide={!expanded} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <Tooltip formatter={(value: number | string) => [value, config.title]} />
          {expanded ? <Legend /> : null}
          <Line
            name={config.title}
            type="monotone"
            dataKey={config.yKey}
            stroke={config.color ?? "hsl(var(--primary))"}
            strokeWidth={expanded ? 3 : 2.5}
            dot={expanded}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (config.type === "pie") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={config.data}
            dataKey={config.yKey}
            nameKey={config.xKey}
            innerRadius={expanded ? 70 : 24}
            outerRadius={expanded ? 120 : 34}
            paddingAngle={expanded ? 2 : 1}
          >
            {config.data.map((entry, index) => (
              <Cell key={`${String(entry[config.xKey])}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number | string, _name, item) => [value, String(item?.payload?.[config.xKey] ?? "")]} />
          {expanded ? <Legend /> : null}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={config.data}>
        {expanded ? <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /> : null}
        <XAxis
          dataKey={config.xKey}
          hide={!expanded}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          angle={expanded ? -20 : 0}
          textAnchor={expanded ? "end" : "middle"}
          height={expanded ? 60 : undefined}
        />
        <YAxis hide={!expanded} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        <Tooltip formatter={(value: number | string) => [value, config.title]} />
        {expanded ? <Legend /> : null}
        <Bar name={config.title} dataKey={config.yKey} fill={config.color ?? "hsl(var(--primary))"} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function CompactAnalyticsCard({
  config,
  onClick,
}: {
  config: AnalyticsCardConfig;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open expanded chart: ${config.title}`}
      className="group relative w-[258px] overflow-hidden rounded-2xl border border-border/70 bg-card text-left shadow-warm transition duration-200 hover:scale-[1.02] hover:shadow-lg"
    >
      <span
        className="absolute right-2 top-2 z-10 rounded-full bg-background/90 p-1 text-muted-foreground shadow-sm transition-colors group-hover:text-foreground"
        aria-hidden
      >
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="h-[76px] bg-muted/20">
        <AnalyticsPreviewChart config={config} />
      </div>
    </button>
  );
}

function InsightRow({
  config,
  onChartClick,
}: {
  config: AnalyticsCardConfig;
  onChartClick: () => void;
}) {
  return (
    <div className="mb-1 rounded-2xl border border-border/70 bg-muted/20 px-4 py-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{config.kpiLabel}</p>
          <div className="mt-0.5 flex items-end gap-2">
            <p className="text-3xl font-semibold leading-none text-foreground">{config.kpiValue}</p>
            <p className="pb-1 text-sm text-muted-foreground">{config.kpiDetail}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <CompactAnalyticsCard config={config} onClick={onChartClick} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
  contentClassName,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card shadow-warm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-xl font-semibold leading-none tracking-tight text-foreground">{title}</h2>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-col items-end">{action}</div> : null}
      </CardHeader>
      <CardContent className={cn("pt-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

function TableAddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="default" className="gap-2 rounded-xl shadow-sm" onClick={onClick}>
      <Plus className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </Button>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card shadow-warm transition-transform hover:-translate-y-0.5" role="group" aria-label={label}>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        </div>
        <p className="text-3xl font-semibold text-foreground">{value}</p>
        <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

/** Bella Bay Command center tile (palette-locked). */
type FounderTone = "care" | "capacity" | "funding" | "attention";

const BELLA = {
  cream: "#F5F0E8",
  sand: "#EDE5D8",
  deepBay: "#1C2B35",
  stone: "#4A5C65",
  lavender: "#9B7FC0",
  water: "#5A8FA0",
  green: "#4A7A52",
  terracotta: "#C17A3A",
} as const;

const FOUNDER_ACCENT: Record<FounderTone, string> = {
  care: BELLA.lavender,
  capacity: BELLA.water,
  funding: BELLA.green,
  attention: BELLA.terracotta,
};

function FounderCommandTile({
  label,
  value,
  sub,
  tone,
  icon: Icon,
  to,
  size = "primary",
}: {
  label: string;
  value: string;
  sub?: string;
  tone: FounderTone;
  icon: typeof Heart;
  to: string;
  size?: "primary" | "secondary";
}) {
  const accent = FOUNDER_ACCENT[tone];
  const pad = size === "primary" ? "p-6" : "p-5";
  const valueClass = size === "primary" ? "text-3xl" : "text-2xl";
  const inner = (
    <>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} style={{ color: accent }} aria-hidden />
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: accent }}
        >
          {label}
        </span>
      </div>
      <p className={cn("mt-4 font-heading font-semibold tabular-nums tracking-tight", valueClass)} style={{ color: BELLA.deepBay }}>
        {value}
      </p>
      {sub ? <p className="mt-1 text-sm" style={{ color: BELLA.stone }}>{sub}</p> : null}
    </>
  );
  return (
    <Link
      to={to}
      className="relative block overflow-hidden rounded-2xl shadow-sm outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        backgroundColor: BELLA.sand,
      }}
    >
      <div className={cn("relative", pad)}>{inner}</div>
    </Link>
  );
}

function PrimaryStatusTile({
  label,
  value,
  icon: Icon,
  to,
  backgroundHex,
}: {
  label: string;
  value: string;
  icon: typeof Heart;
  to: string;
  backgroundHex: string;
}) {
  return (
    <Link
      to={to}
      className="flex h-full min-h-0 flex-col justify-between rounded-2xl shadow-sm outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ backgroundColor: backgroundHex }}
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} style={{ color: BELLA.cream }} aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: BELLA.cream }}>
            {label}
          </span>
        </div>
        <p
          className="mt-4 font-heading text-3xl font-semibold tabular-nums tracking-tight"
          style={{ color: BELLA.cream }}
        >
          {value}
        </p>
      </div>
    </Link>
  );
}

function SecondaryStatTile({
  label,
  value,
  sub,
  accentHex,
  borderHex,
  valueSpacing = "default",
  icon: Icon,
  to,
}: {
  label: string;
  value: string;
  sub?: string;
  /** Accent is used ONLY for icon + label text. Background stays Harbor Sand. */
  accentHex: string;
  /** Optional highlight border (used sparingly for hierarchy). */
  borderHex?: string;
  /** Controls vertical spacing between label row and value block. */
  valueSpacing?: "default" | "tight";
  icon: typeof Heart;
  to: string;
}) {
  const valuePad = valueSpacing === "tight" ? "pt-3" : "pt-4";

  return (
    <Link
      to={to}
      className="block h-full rounded-2xl shadow-sm outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        backgroundColor: BELLA.sand,
        border: borderHex ? `1px solid ${borderHex}` : undefined,
      }}
    >
      <div className="h-full px-5 py-3.5">
        <div className="flex h-full flex-col">
          <div className="flex items-start gap-3">
            <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} style={{ color: accentHex }} aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: accentHex }}>
              {label}
            </span>
          </div>
          <div className={cn("mt-auto", valuePad)}>
            <p className="font-heading text-2xl font-semibold tabular-nums tracking-tight" style={{ color: BELLA.deepBay }}>
              {value}
            </p>
            {sub ? <p className="mt-1 text-sm" style={{ color: BELLA.stone }}>{sub}</p> : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function SuccessMetricTile({
  label,
  value,
  subtext,
  tooltip,
  accentHex,
  borderHex,
  icon: Icon,
}: {
  label: string;
  value: string;
  subtext: string;
  tooltip: string;
  accentHex: string;
  borderHex?: string;
  icon: typeof Heart;
}) {
  return (
    <div
      className="rounded-2xl shadow-sm"
      style={{
        backgroundColor: BELLA.sand,
        border: borderHex ? `1px solid ${borderHex}` : undefined,
      }}
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} style={{ color: accentHex }} aria-hidden />
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: accentHex }} title={tooltip}>
              {label}
            </div>
            <div className="mt-1 text-sm" style={{ color: BELLA.stone }}>
              {subtext}
            </div>
          </div>
        </div>
        <div className="mt-5 font-heading text-4xl font-semibold tabular-nums tracking-tight" style={{ color: BELLA.deepBay }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  value,
  tone,
}: {
  value: string;
  tone?: "default" | "secondary" | "destructive" | "outline";
}) {
  return (
    <Badge
      variant={tone ?? "secondary"}
      className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
    >
      {value}
    </Badge>
  );
}

function FilterCheckboxGroup({
  title,
  options,
  selected,
  onChange,
  allLabel,
  getOptionLabel,
}: {
  title: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  allLabel: string;
  /** When set, shown in the list instead of the raw option value (e.g. safe house id → name). */
  getOptionLabel?: (value: string) => string;
}) {
  const allSelected = options.length > 0 && selected.length === options.length;

  const toggleValue = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((entry) => entry !== value));
      return;
    }
    onChange([...selected, value]);
  };

  return (
    <fieldset className="rounded-2xl border border-border/70 bg-background p-4">
      <legend className="mb-3 w-full text-left text-sm font-semibold uppercase tracking-[0.14em] text-foreground/80">
        {title}
      </legend>
      <div className="space-y-3 text-sm font-medium text-foreground">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => onChange(allSelected ? [] : options)}
            className="h-4 w-4 rounded border-border"
          />
          {allLabel}
        </label>
        {options.map((option) => (
          <label key={option} className="flex items-center gap-3 font-medium">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => toggleValue(option)}
              className="h-4 w-4 rounded border-border"
            />
            {getOptionLabel ? getOptionLabel(option) : option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CollapsibleSubsection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left">
            <span className="font-medium text-foreground">{title}</span>
            <span className="text-sm text-foreground/75">{open ? "Hide" : "Show"}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border/70 px-4 py-4">{children}</CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function Toolbar({
  title = "Filters",
  defaultOpen = false,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  bottomContent,
  onClearFilters,
  sortValue,
  sortOptions,
  onSortChange,
  actionItems,
}: {
  title?: string;
  defaultOpen?: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filters?: ReactNode;
  bottomContent?: ReactNode;
  onClearFilters?: () => void;
  sortValue: string;
  sortOptions: Array<{ value: string; label: string }>;
  onSortChange: (value: string) => void;
  actionItems?: Array<{ label: string; onClick: () => void }>;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const searchFieldId = useId();
  return (
    <Card className="mb-12 rounded-2xl border-border/70 bg-card shadow-warm">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div
          className={cn(
            "flex w-full items-center gap-2",
            open ? "border-b border-border/70" : "",
          )}
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-w-0 flex-1 items-center justify-between gap-3 text-left",
                open ? "px-4 py-4" : "px-4 py-1.5",
              )}
            >
              <span
                className={cn(
                  "text-foreground",
                  open ? "text-sm font-semibold tracking-tight" : "text-xs font-medium tracking-wide text-muted-foreground",
                )}
              >
                {title}
              </span>
              <span className={cn("flex shrink-0 items-center gap-2 font-medium text-muted-foreground", open ? "text-sm" : "text-xs")}>
                {open ? "Hide" : "Show"}
                {open ? <ChevronUp className="h-4 w-4 shrink-0" aria-hidden /> : <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />}
              </span>
            </button>
          </CollapsibleTrigger>
          {actionItems?.length ? (
            <div className={cn("shrink-0 pr-4", open ? "py-4" : "py-1.5")}>
              <Button
                type="button"
                variant="outline"
                className={cn("gap-2 rounded-full px-4 font-medium", open ? "h-10 text-sm" : "h-8 text-xs")}
                onClick={() => actionItems[0]?.onClick()}
              >
                <Download className={cn("shrink-0 opacity-80", open ? "h-4 w-4" : "h-3.5 w-3.5")} aria-hidden />
                Export CSV
              </Button>
            </div>
          ) : null}
        </div>
        <CollapsibleContent>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <label htmlFor={searchFieldId} className="sr-only">
                    {searchPlaceholder}
                  </label>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" aria-hidden />
                  <Input
                    id={searchFieldId}
                    value={searchValue}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-11 rounded-full border-border/80 bg-background pl-9 text-sm"
                    autoComplete="off"
                  />
                </div>
                {onClearFilters ? (
                  <Button variant="outline" className="h-11 rounded-full px-6 text-sm font-medium" onClick={onClearFilters}>
                    Clear filters
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor={`${searchFieldId}-sort`} className="sr-only">
                  Sort {title}
                </label>
                <select
                  id={`${searchFieldId}-sort`}
                  value={sortValue}
                  onChange={(event) => onSortChange(event.target.value)}
                  className="h-11 rounded-full border border-input bg-background px-4 text-sm font-medium text-foreground"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {filters ? <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{filters}</div> : null}
            {bottomContent ? <div className="mt-4 border-t border-border/70 pt-4">{bottomContent}</div> : null}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function PaginatedRows<T>({
  rows,
  page,
  perPage = 10,
}: {
  rows: T[];
  page: number;
  perPage?: number;
}) {
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    totalPages,
    safePage,
    visibleRows: rows.slice(start, start + perPage),
    start: rows.length ? start + 1 : 0,
    end: Math.min(start + perPage, rows.length),
  };
}

type TableColumnSort = { key: string; dir: "asc" | "desc" };

function compareSortValues(a: unknown, b: unknown): number {
  if (a == null || a === "") {
    if (b == null || b === "") return 0;
    return 1;
  }
  if (b == null || b === "") return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function sortRowsByColumn<T>(rows: T[], sort: TableColumnSort | undefined, getValue: (row: T, key: string) => unknown): T[] {
  if (!sort?.key) return rows;
  const mult = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((rowA, rowB) => mult * compareSortValues(getValue(rowA, sort.key), getValue(rowB, sort.key)));
}

function SortableTableHead({
  tableId,
  columnKey,
  children,
  activeSort,
  onToggle,
  className,
}: {
  tableId: string;
  columnKey: string;
  children: ReactNode;
  activeSort: TableColumnSort | undefined;
  onToggle: (tableId: string, columnKey: string) => void;
  className?: string;
}) {
  const active = activeSort?.key === columnKey;
  const dir = activeSort?.dir;
  const alignRight = Boolean(className?.includes("text-right"));
  const sortLabel =
    typeof children === "string" || typeof children === "number" ? String(children) : "this column";
  return (
    <TableHead
      className={cn("select-none", className)}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        aria-label={
          active
            ? `Sorted ${dir === "asc" ? "ascending" : "descending"} by ${sortLabel}. Click to reverse.`
            : `Sort by ${sortLabel}`
        }
        className={cn(
          "inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-muted/60",
          alignRight ? "ms-auto w-full justify-end" : "-mx-2 -my-1 justify-start text-left",
        )}
        onClick={() => onToggle(tableId, columnKey)}
      >
        <span className="truncate">{children}</span>
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          )
        ) : null}
      </button>
    </TableHead>
  );
}

function TablePagination({
  page,
  totalPages,
  totalRows,
  start,
  end,
  perPage,
  onPerPageChange,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalRows: number;
  start: number;
  end: number;
  perPage: number;
  onPerPageChange: (perPage: number) => void;
  onPageChange: (page: number) => void;
}) {
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter((entry) => {
    if (totalPages <= 7) return true;
    return entry === 1 || entry === totalPages || Math.abs(entry - page) <= 1;
  });

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm text-foreground/80">
          Showing {Math.max(end - start + 1, 0)} of {totalRows}
        </p>
        <label className="flex items-center gap-3 text-sm text-foreground/80">
          Rows per page
          <select
            value={String(perPage)}
            onChange={(event) => onPerPageChange(Number(event.target.value))}
            className="h-10 rounded-full border border-input bg-background px-3 text-sm text-foreground"
          >
            {[10, 25, 50].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Pagination className="mx-0 w-auto justify-start md:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(event) => {
                event.preventDefault();
                onPageChange(Math.max(1, page - 1));
              }}
              className={cn(page === 1 && "pointer-events-none opacity-50")}
            />
          </PaginationItem>
          {pageNumbers.map((entry) => (
            <PaginationItem key={entry}>
              <PaginationLink
                href="#"
                isActive={entry === page}
                aria-label={`Go to page ${entry}`}
                onClick={(event) => {
                  event.preventDefault();
                  onPageChange(entry);
                }}
              >
                {entry}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(event) => {
                event.preventDefault();
                onPageChange(Math.min(totalPages, page + 1));
              }}
              className={cn(page === totalPages && "pointer-events-none opacity-50")}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

type FormField = {
  key: string;
  label: string;
  type?: "text" | "date" | "number" | "textarea" | "select" | "email" | "checkbox";
  options?: Array<{ value: string; label: string }>;
  /** Show a red star and block submit when empty / invalid for this field type */
  required?: boolean;
  /** When this state key is the string "true", disable the text/textarea/select control */
  disabledWhenKeyTrue?: string;
  /** Visible text beside a checkbox (defaults to label) */
  checkboxCaption?: string;
  /** Smaller textarea, tighter label spacing */
  compact?: boolean;
  /** Smaller checkbox row, placed close to the field above */
  checkboxCompact?: boolean;
  /** Hint below the control */
  helperText?: string;
  /** User cannot edit (e.g. auto-assigned case number) */
  readOnly?: boolean;
};

function stringOptionsFromDataOrFallbacks(observed: string[], fallbacks: string[]): Array<{ value: string; label: string }> {
  const source = observed.length > 0 ? observed : fallbacks;
  const unique = Array.from(new Set(source.map((s) => String(s).trim()).filter(Boolean)));
  unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return unique.map((v) => ({ value: v, label: v }));
}

const REQUIRED_FIELDS_MESSAGE = "Please fill in all required fields marked with a red star (*).";

function isRequiredFieldValueMissing(value: string, field: FormField): boolean {
  if (field.type === "checkbox") return false;
  const trimmed = value.trim();
  if (trimmed === "") return true;
  if (field.type === "number") {
    const n = Number(trimmed);
    return !Number.isFinite(n);
  }
  if (field.type === "email") {
    return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  }
  return false;
}

function EntityModal<T extends Record<string, string>>({
  open,
  onOpenChange,
  title,
  description,
  fields,
  state,
  onChange,
  onSubmit,
  submitLabel,
  pending,
  extraValidate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fields: FormField[];
  state: T;
  onChange: (key: keyof T, value: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  pending: boolean;
  /** Return an error message to block submit, or null when OK (runs after required-field checks) */
  extraValidate?: (state: T) => string | null;
}) {
  const handleSubmit = () => {
    const missingRequired = fields.some((field) => {
      if (!field.required) return false;
      if (field.type === "checkbox") return false;
      const pairNoneActive =
        Boolean(field.disabledWhenKeyTrue) &&
        String(state[field.disabledWhenKeyTrue as keyof T] ?? "") === "true";
      if (pairNoneActive) return false;
      const raw = state[field.key as keyof T];
      return isRequiredFieldValueMissing(String(raw ?? ""), field);
    });
    if (missingRequired) {
      toast.error(REQUIRED_FIELDS_MESSAGE);
      return;
    }
    const extra = extraValidate?.(state);
    if (extra) {
      toast.error(extra);
      return;
    }
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-2xl border-border/80 bg-background">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl text-foreground">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => {
            const pairNoneActive =
              Boolean(field.disabledWhenKeyTrue) &&
              String(state[field.disabledWhenKeyTrue as keyof T] ?? "") === "true";

            const clearPairNoneOnFocus = () => {
              if (
                field.disabledWhenKeyTrue &&
                String(state[field.disabledWhenKeyTrue as keyof T] ?? "") === "true"
              ) {
                onChange(field.disabledWhenKeyTrue as keyof T, "false");
              }
            };

            if (field.type === "checkbox") {
              return (
                <label
                  key={field.key}
                  className={cn(
                    "md:col-span-2 flex cursor-pointer items-center rounded-md border border-transparent text-foreground hover:bg-muted/30",
                    field.checkboxCompact ? "-mt-1 gap-1.5 pl-0.5 pt-0.5 text-xs" : "gap-3 px-1 py-1 text-sm",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={String(state[field.key as keyof T]) === "true"}
                    onChange={(event) => onChange(field.key as keyof T, event.target.checked ? "true" : "false")}
                    className={cn(
                      "shrink-0 rounded border-border text-primary",
                      field.checkboxCompact ? "h-3 w-3" : "h-4 w-4",
                    )}
                  />
                  <span
                    className={cn(
                      field.checkboxCompact ? "font-normal leading-snug text-muted-foreground" : "font-medium text-foreground",
                    )}
                  >
                    {field.checkboxCaption ?? field.label}
                  </span>
                </label>
              );
            }

            return (
              <label
                key={field.key}
                className={cn(
                  "grid text-sm",
                  field.compact ? "gap-1" : "gap-2",
                  field.type === "textarea" ? "md:col-span-2" : "",
                )}
              >
                <span className="font-medium text-foreground">
                  {field.label}
                  {field.required ? (
                    <span className="text-destructive" aria-hidden>
                      {" "}
                      *
                    </span>
                  ) : null}
                </span>
                {field.type === "textarea" ? (
                  <>
                    <Textarea
                      value={String(state[field.key as keyof T] ?? "")}
                      onChange={(event) => {
                        if (field.readOnly) return;
                        onChange(field.key as keyof T, event.target.value);
                      }}
                      onFocus={field.disabledWhenKeyTrue ? clearPairNoneOnFocus : undefined}
                      readOnly={
                        Boolean(field.readOnly) ? false : Boolean(field.disabledWhenKeyTrue) && pairNoneActive
                      }
                      disabled={Boolean(field.readOnly)}
                      className={cn(
                        "rounded-xl border-border/80 bg-background",
                        field.compact ? "min-h-[4.5rem] text-xs leading-relaxed" : "min-h-28",
                        field.disabledWhenKeyTrue && pairNoneActive && "cursor-pointer bg-muted/40",
                        field.readOnly &&
                          "cursor-not-allowed bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-100",
                      )}
                      required={field.required}
                      aria-required={field.required}
                    />
                    {field.helperText ? (
                      <p className="text-xs leading-snug text-muted-foreground">{field.helperText}</p>
                    ) : null}
                  </>
                ) : field.type === "select" ? (
                  <>
                    <select
                      value={state[field.key as keyof T]}
                      onChange={(event) => onChange(field.key as keyof T, event.target.value)}
                      className="h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                      required={field.required}
                      aria-required={field.required}
                      disabled={pairNoneActive}
                    >
                      <option value="">Select…</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {field.helperText ? (
                      <p className="text-xs leading-snug text-muted-foreground">{field.helperText}</p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Input
                      type={field.type ?? "text"}
                      value={String(state[field.key as keyof T] ?? "")}
                      onChange={(event) => {
                        if (field.readOnly) return;
                        onChange(field.key as keyof T, event.target.value);
                      }}
                      onFocus={field.disabledWhenKeyTrue ? clearPairNoneOnFocus : undefined}
                      readOnly={
                        Boolean(field.readOnly) ? false : Boolean(field.disabledWhenKeyTrue) && pairNoneActive
                      }
                      disabled={Boolean(field.readOnly)}
                      className={cn(
                        "h-11 rounded-xl border-border/80 bg-background",
                        field.disabledWhenKeyTrue && pairNoneActive && "cursor-pointer bg-muted/40",
                        field.readOnly &&
                          "cursor-not-allowed bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-100",
                      )}
                      required={field.required}
                      aria-required={field.required}
                    />
                    {field.helperText ? (
                      <p className="text-xs leading-snug text-muted-foreground">{field.helperText}</p>
                    ) : null}
                  </>
                )}
              </label>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={pending} className="rounded-xl">
            {pending ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminWorkspace() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = (searchParams.get("tab") as MainTab | null) ?? "dashboard";
  const residentsSubTab = (searchParams.get("residentsSubTab") as ResidentsSubTab | null) ?? "all-residents";
  const donationsSubTabRaw = searchParams.get("donationsSubTab") as DonationsSubTab | null;
  const donationsSubTab: DonationsSubTab =
    donationsSubTabRaw === "supporters" ||
    donationsSubTabRaw === "donations" ||
    donationsSubTabRaw === "in-kind" ||
    donationsSubTabRaw === "allocations"
      ? donationsSubTabRaw
      : DEFAULT_DONATIONS_SUBTAB;
  const safeHousesSubTab = (searchParams.get("safeHousesSubTab") as SafeHousesSubTab | null) ?? "safe-houses";
  const outreachSubTab = (searchParams.get("outreachSubTab") as OutreachSubTab | null) ?? "social-media";
  const selectedResidentIds = parseIds(searchParams.get("residentIds"));
  const selectedSupporterId = Number(searchParams.get("supporterId") || 0) || null;
  const selectedSafehouseId = Number(searchParams.get("safehouseId") || 0) || null;

  const [residentSearch, setResidentSearch] = useState("");
  const [residentStatusFilter, setResidentStatusFilter] = useState<string[]>(["Active", "Open", "Closed", "Transferred"]);
  const [residentRiskFilter, setResidentRiskFilter] = useState<string[]>(["High", "Medium", "Low"]);
  const [residentSafehouseFilter, setResidentSafehouseFilter] = useState<string[]>([]);
  const [residentSort, setResidentSort] = useState("recent");
  const deferredResidentSearch = useDeferredValue(residentSearch);
  const [processTypeFilter, setProcessTypeFilter] = useState<string[]>([]);
  const [processWorkerFilter, setProcessWorkerFilter] = useState<string[]>([]);
  const [visitationTypeFilter, setVisitationTypeFilter] = useState<string[]>([]);
  const [visitationOutcomeFilter, setVisitationOutcomeFilter] = useState<string[]>([]);
  const [educationLevelFilter, setEducationLevelFilter] = useState<string[]>([]);
  const [educationEnrollmentFilter, setEducationEnrollmentFilter] = useState<string[]>([]);
  const [healthCheckupFilter, setHealthCheckupFilter] = useState<string[]>([]);
  const [interventionCategoryFilter, setInterventionCategoryFilter] = useState<string[]>([]);
  const [interventionStatusFilter, setInterventionStatusFilter] = useState<string[]>([]);
  const [incidentTypeFilter, setIncidentTypeFilter] = useState<string[]>([]);
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState<string[]>([]);

  const [donationSearch, setDonationSearch] = useState("");
  /** Supporters table: filter by linked supporter profile fields */
  const [donationTypeFilter, setDonationTypeFilter] = useState<string[]>([]);
  const [donationRelationshipFilter, setDonationRelationshipFilter] = useState<string[]>([]);
  const [donationStatusFilter, setDonationStatusFilter] = useState<string[]>([]);
  const [donationRegionFilter, setDonationRegionFilter] = useState<string[]>([]);
  const [donationCountryFilter, setDonationCountryFilter] = useState<string[]>([]);
  /** Donations table: filter by gift row fields */
  const [donationGiftTypeFilter, setDonationGiftTypeFilter] = useState<string[]>([]);
  const [donationGiftRecurringFilter, setDonationGiftRecurringFilter] = useState<string[]>([]);
  const [donationGiftCampaignFilter, setDonationGiftCampaignFilter] = useState<string[]>([]);
  const [donationGiftChannelFilter, setDonationGiftChannelFilter] = useState<string[]>([]);
  const [donationGiftCurrencyFilter, setDonationGiftCurrencyFilter] = useState<string[]>([]);
  /** In-kind table */
  const [inKindCategoryFilter, setInKindCategoryFilter] = useState<string[]>([]);
  const [inKindConditionFilter, setInKindConditionFilter] = useState<string[]>([]);
  const [inKindUnitFilter, setInKindUnitFilter] = useState<string[]>([]);
  /** Allocations table */
  const [allocationProgramFilter, setAllocationProgramFilter] = useState<string[]>([]);
  const [allocationSafehouseFilter, setAllocationSafehouseFilter] = useState<string[]>([]);
  const [donationSort, setDonationSort] = useState("recent");
  const [inKindSort, setInKindSort] = useState("recent");
  const [allocationSort, setAllocationSort] = useState("recent");
  const deferredDonationSearch = useDeferredValue(donationSearch);

  useEffect(() => {
    if (donationsSubTab === "supporters" && donationSort === "amount") {
      setDonationSort("recent");
    }
  }, [donationSort, donationsSubTab]);

  const [safehouseSearch, setSafehouseSearch] = useState("");
  const [safehouseStatusFilter, setSafehouseStatusFilter] = useState<string[]>([]);
  const [safehouseRegionFilter, setSafehouseRegionFilter] = useState<string[]>([]);
  const [safehouseSort, setSafehouseSort] = useState("occupancy");
  /** Monthly metrics: occurred = month_start date strictly before today (local day); future = today or later; all = no date filter. */
  const [monthlyMetricsPeriodFilter, setMonthlyMetricsPeriodFilter] = useState<"occurred" | "future" | "all">("occurred");
  const deferredSafehouseSearch = useDeferredValue(safehouseSearch);
  const [tablePages, setTablePages] = useState<Record<string, number>>({});
  const [tablePageSizes, setTablePageSizes] = useState<Record<string, number>>({});
  const [tableColumnSort, setTableColumnSort] = useState<Record<string, TableColumnSort>>({});

  const [residentDetailId, setResidentDetailId] = useState<number | null>(null);
  const [residentModalOpen, setResidentModalOpen] = useState(false);
  const [residentFormOpen, setResidentFormOpen] = useState(false);
  const [editingResidentId, setEditingResidentId] = useState<number | null>(null);
  const [residentForm, setResidentForm] = useState<ResidentFormState>({
    case_control_no: "",
    internal_code: "",
    safehouse_id: "",
    case_status: "Active",
    sex: "F",
    date_of_birth: "",
    place_of_birth: "",
    religion: "",
    case_category: "",
    date_of_admission: "",
    assigned_social_worker: "",
    current_risk_level: "Medium",
    notes_restricted: "",
  });

  const [supporterFormOpen, setSupporterFormOpen] = useState(false);
  const [editingSupporterId, setEditingSupporterId] = useState<number | null>(null);
  const [supporterForm, setSupporterForm] = useState<SupporterFormState>({
    supporter_type: "MonetaryDonor",
    display_name: "",
    organization_name: "",
    first_name: "",
    last_name: "",
    relationship_type: "",
    region: "",
    country: "Philippines",
    email: "",
    phone: "",
    status: "Active",
    first_donation_date: "",
    acquisition_channel: "",
  });

  const [donationFormOpen, setDonationFormOpen] = useState(false);
  const [editingDonationId, setEditingDonationId] = useState<number | null>(null);
  const [donationForm, setDonationForm] = useState<DonationFormState>({
    supporter_id: "",
    donation_type: "Monetary",
    donation_date: "",
    is_recurring: "false",
    campaign_name: "",
    channel_source: "",
    currency_code: "PHP",
    amount: "",
    estimated_value: "",
    impact_unit: "",
    notes: "",
    referral_post_id: "",
  });

  const [inKindFormOpen, setInKindFormOpen] = useState(false);
  const [editingInKindId, setEditingInKindId] = useState<number | null>(null);
  const [inKindForm, setInKindForm] = useState<InKindFormState>({
    donation_id: "",
    item_name: "",
    item_category: "",
    quantity: "",
    unit_of_measure: "",
    estimated_unit_value: "",
    intended_use: "",
    received_condition: "",
  });

  const [allocationFormOpen, setAllocationFormOpen] = useState(false);
  const [editingAllocationId, setEditingAllocationId] = useState<number | null>(null);
  const [allocationForm, setAllocationForm] = useState<AllocationFormState>({
    donation_id: "",
    safehouse_id: "",
    program_area: "",
    amount_allocated: "",
    allocation_date: "",
    allocation_notes: "",
  });

  const [safehouseFormOpen, setSafehouseFormOpen] = useState(false);
  const [editingSafehouseId, setEditingSafehouseId] = useState<number | null>(null);
  const [safehouseForm, setSafehouseForm] = useState<SafehouseFormState>({
    safehouse_code: "",
    name: "",
    region: "",
    city: "",
    province: "",
    country: "Philippines",
    open_date: "",
    status: "Active",
    capacity_girls: "",
    capacity_staff: "",
    current_occupancy: "",
    notes: "",
  });
  const [processFormOpen, setProcessFormOpen] = useState(false);
  const [editingProcessId, setEditingProcessId] = useState<number | null>(null);
  const [processForm, setProcessForm] = useState<ProcessRecordFormState>({
    resident_id: "",
    session_date: "",
    social_worker: "",
    session_type: "",
    session_duration_minutes: "",
    emotional_state_observed: "",
    emotional_state_end: "",
    session_narrative: "",
    interventions_applied: "",
    interventions_none: "false",
    follow_up_actions: "",
    follow_up_none: "false",
    progress_noted: "false",
    concerns_flagged: "false",
    referral_made: "false",
    notes_restricted: "",
  });
  const [visitationFormOpen, setVisitationFormOpen] = useState(false);
  const [editingVisitationId, setEditingVisitationId] = useState<number | null>(null);
  const [visitationForm, setVisitationForm] = useState<VisitationFormState>({
    resident_id: "",
    visit_date: "",
    social_worker: "",
    visit_type: "",
    location_visited: "",
    family_members_present: "",
    purpose: "",
    observations: "",
    family_cooperation_level: "",
    safety_concerns_noted: "false",
    follow_up_needed: "false",
    follow_up_notes: "",
    visit_outcome: "",
  });
  const [educationFormOpen, setEducationFormOpen] = useState(false);
  const [editingEducationId, setEditingEducationId] = useState<number | null>(null);
  const [educationForm, setEducationForm] = useState<EducationFormState>({
    resident_id: "",
    record_date: "",
    education_level: "",
    school_name: "",
    enrollment_status: "",
    attendance_rate: "",
    progress_percent: "",
    completion_status: "",
    notes: "",
  });
  const [healthFormOpen, setHealthFormOpen] = useState(false);
  const [editingHealthId, setEditingHealthId] = useState<number | null>(null);
  const [healthForm, setHealthForm] = useState<HealthFormState>({
    resident_id: "",
    record_date: "",
    general_health_score: "",
    nutrition_score: "",
    sleep_quality_score: "",
    energy_level_score: "",
    height_cm: "",
    weight_kg: "",
    bmi: "",
    medical_checkup_done: "false",
    dental_checkup_done: "false",
    psychological_checkup_done: "false",
    notes: "",
  });
  const [interventionFormOpen, setInterventionFormOpen] = useState(false);
  const [editingInterventionId, setEditingInterventionId] = useState<number | null>(null);
  const [interventionForm, setInterventionForm] = useState<InterventionFormState>({
    resident_id: "",
    plan_category: "",
    plan_description: "",
    services_provided: "",
    target_value: "",
    target_date: "",
    status: "",
    case_conference_date: "",
  });
  const [incidentFormOpen, setIncidentFormOpen] = useState(false);
  const [editingIncidentId, setEditingIncidentId] = useState<number | null>(null);
  const [incidentForm, setIncidentForm] = useState<IncidentFormState>({
    resident_id: "",
    safehouse_id: "",
    incident_date: "",
    incident_type: "",
    severity: "",
    description: "",
    response_taken: "",
    resolved: "false",
    resolution_date: "",
    reported_by: "",
    follow_up_required: "false",
  });
  const [expandedChartKey, setExpandedChartKey] = useState<string | null>(null);
  const [healthChartMetric, setHealthChartMetric] = useState("general_health_score");
  const [monthlyMetricsChartMetric, setMonthlyMetricsChartMetric] = useState("active_residents");

  const workspaceQuery = useQuery({
    queryKey: ["admin-workspace"],
    queryFn: fetchAdminWorkspace,
  });

  const workspace = workspaceQuery.data ?? EMPTY_WORKSPACE;

  const safehouseMap = useMemo(
    () => new Map(workspace.safehouses.map((safehouse) => [safehouse.safehouse_id, safehouse])),
    [workspace.safehouses],
  );

  const residentMap = useMemo<Map<number, ResidentWithSafehouse>>(
    () =>
      new Map(
        workspace.residents.map((resident) => [
          resident.resident_id,
          {
            ...resident,
            safehouse_name: resident.safehouse_name ?? safehouseMap.get(resident.safehouse_id ?? -1)?.name ?? null,
          },
        ]),
      ),
    [safehouseMap, workspace.residents],
  );

  /** Preview next auto-assigned case + internal codes while add-resident modal is open. */
  useEffect(() => {
    if (!residentFormOpen || editingResidentId != null) return;
    setResidentForm((prev) => ({
      ...prev,
      internal_code: suggestNextLsInternalCodeFromResidents(workspace.residents),
      case_control_no: suggestNextCaseControlNoFromResidents(workspace.residents),
    }));
  }, [residentFormOpen, editingResidentId, workspace.residents]);

  const supporterMap = useMemo(
    () => new Map(workspace.supporters.map((supporter) => [supporter.supporter_id, supporter])),
    [workspace.supporters],
  );

  const donationMap = useMemo(
    () => new Map(workspace.donations.map((donation) => [donation.donation_id, donation])),
    [workspace.donations],
  );
  const residentStatusOptions = ["Active", "Open", "Closed", "Transferred"];
  const residentRiskOptions = ["High", "Medium", "Low"];
  const residentSafehouseOptions = useMemo(
    () => Array.from(new Set(workspace.residents.map((resident) => safehouseMap.get(resident.safehouse_id ?? -1)?.name ?? "Unassigned"))).sort(),
    [safehouseMap, workspace.residents],
  );
  const donationTypeOptions = useMemo(
    () => Array.from(new Set(workspace.supporters.map((supporter) => supporter.supporter_type).filter(Boolean) as string[])).sort(),
    [workspace.supporters],
  );
  const donationRelationshipOptions = useMemo(
    () => Array.from(new Set(workspace.supporters.map((supporter) => supporter.relationship_type).filter(Boolean) as string[])).sort(),
    [workspace.supporters],
  );
  const donationStatusOptions = useMemo(
    () => Array.from(new Set(workspace.supporters.map((supporter) => supporter.status).filter(Boolean) as string[])).sort(),
    [workspace.supporters],
  );
  const donationRegionOptions = useMemo(
    () => Array.from(new Set(workspace.supporters.map((supporter) => supporter.region).filter(Boolean) as string[])).sort(),
    [workspace.supporters],
  );
  const donationCountryOptions = useMemo(
    () => Array.from(new Set(workspace.supporters.map((supporter) => supporter.country).filter(Boolean) as string[])).sort(),
    [workspace.supporters],
  );
  const donationGiftTypeOptions = useMemo(
    () => Array.from(new Set(workspace.donations.map((d) => d.donation_type).filter(Boolean) as string[])).sort(),
    [workspace.donations],
  );
  const donationGiftCampaignOptions = useMemo(
    () => Array.from(new Set(workspace.donations.map((d) => d.campaign_name).filter(Boolean) as string[])).sort(),
    [workspace.donations],
  );
  const donationGiftChannelOptions = useMemo(
    () => Array.from(new Set(workspace.donations.map((d) => d.channel_source).filter(Boolean) as string[])).sort(),
    [workspace.donations],
  );
  const donationGiftCurrencyOptions = useMemo(
    () => Array.from(new Set(workspace.donations.map((d) => d.currency_code).filter(Boolean) as string[])).sort(),
    [workspace.donations],
  );
  const inKindCategoryOptions = useMemo(
    () => Array.from(new Set(workspace.inKind.map((row) => row.item_category).filter(Boolean) as string[])).sort(),
    [workspace.inKind],
  );
  const inKindConditionOptions = useMemo(
    () => Array.from(new Set(workspace.inKind.map((row) => row.received_condition).filter(Boolean) as string[])).sort(),
    [workspace.inKind],
  );
  const inKindUnitOptions = useMemo(
    () => Array.from(new Set(workspace.inKind.map((row) => row.unit_of_measure).filter(Boolean) as string[])).sort(),
    [workspace.inKind],
  );
  const allocationProgramOptions = useMemo(
    () => Array.from(new Set(workspace.allocations.map((row) => row.program_area).filter(Boolean) as string[])).sort(),
    [workspace.allocations],
  );
  const allocationSafehouseIdOptions = useMemo(
    () =>
      [...workspace.safehouses]
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
        .map((sh) => String(sh.safehouse_id)),
    [workspace.safehouses],
  );
  const safehouseStatusOptions = useMemo(
    () => Array.from(new Set(workspace.safehouses.map((safehouse) => safehouse.status).filter(Boolean) as string[])).sort(),
    [workspace.safehouses],
  );
  const safehouseRegionOptions = useMemo(
    () => Array.from(new Set(workspace.safehouses.map((safehouse) => safehouse.region).filter(Boolean) as string[])).sort(),
    [workspace.safehouses],
  );
  const processTypeOptions = useMemo(
    () => Array.from(new Set(workspace.processRecordings.map((row) => String(row.session_type ?? "")).filter(Boolean))).sort(),
    [workspace.processRecordings],
  );
  const processWorkerOptions = useMemo(
    () => Array.from(new Set(workspace.processRecordings.map((row) => String(row.social_worker ?? "")).filter(Boolean))).sort(),
    [workspace.processRecordings],
  );
  const visitationTypeOptions = useMemo(
    () => Array.from(new Set(workspace.visitations.map((row) => String(row.visit_type ?? "")).filter(Boolean))).sort(),
    [workspace.visitations],
  );
  const visitationOutcomeOptions = useMemo(
    () => Array.from(new Set(workspace.visitations.map((row) => String(row.visit_outcome ?? "")).filter(Boolean))).sort(),
    [workspace.visitations],
  );
  const educationLevelOptions = useMemo(
    () => Array.from(new Set(workspace.education.map((row) => String(row.education_level ?? "")).filter(Boolean))).sort(),
    [workspace.education],
  );
  const educationEnrollmentOptions = useMemo(
    () => Array.from(new Set(workspace.education.map((row) => String(row.enrollment_status ?? "")).filter(Boolean))).sort(),
    [workspace.education],
  );
  const interventionCategoryOptions = useMemo(
    () => Array.from(new Set(workspace.interventions.map((row) => String(row.plan_category ?? "")).filter(Boolean))).sort(),
    [workspace.interventions],
  );
  const interventionStatusOptions = useMemo(
    () => Array.from(new Set(workspace.interventions.map((row) => String(row.status ?? "")).filter(Boolean))).sort(),
    [workspace.interventions],
  );
  const incidentTypeOptions = useMemo(
    () => Array.from(new Set(workspace.incidents.map((row) => String(row.incident_type ?? "")).filter(Boolean))).sort(),
    [workspace.incidents],
  );
  const incidentSeverityOptions = useMemo(
    () => Array.from(new Set(workspace.incidents.map((row) => String(row.severity ?? "")).filter(Boolean))).sort(),
    [workspace.incidents],
  );

  const socialWorkersObserved = useMemo(() => {
    const set = new Set<string>();
    workspace.residents.forEach((r) => {
      const w = String(r.assigned_social_worker ?? "").trim();
      if (w) set.add(w);
    });
    workspace.processRecordings.forEach((row) => {
      const w = String(row.social_worker ?? "").trim();
      if (w) set.add(w);
    });
    workspace.visitations.forEach((row) => {
      const w = String(row.social_worker ?? "").trim();
      if (w) set.add(w);
    });
    return Array.from(set);
  }, [workspace.processRecordings, workspace.residents, workspace.visitations]);

  const caseCategoryFormOptions = useMemo(() => {
    const observed = Array.from(
      new Set(workspace.residents.map((r) => String(r.case_category ?? "").trim()).filter(Boolean)),
    );
    return stringOptionsFromDataOrFallbacks(observed, [
      "Physical abuse",
      "Sexual abuse",
      "Neglect",
      "Emotional abuse",
      "Exploitation",
      "At risk",
      "Other",
    ]);
  }, [workspace.residents]);

  const socialWorkerFormOptions = useMemo(
    () =>
      stringOptionsFromDataOrFallbacks(socialWorkersObserved, [
        "Case manager",
        "Supervising social worker",
        "Psychosocial support staff",
      ]),
    [socialWorkersObserved],
  );

  const visitTypeFormOptions = useMemo(
    () =>
      stringOptionsFromDataOrFallbacks(visitationTypeOptions, [
        "Home visit",
        "Follow-up",
        "School visit",
        "Office visit",
        "Conference",
        "Court",
        "Other",
      ]),
    [visitationTypeOptions],
  );

  const enrollmentStatusFormOptions = useMemo(
    () =>
      stringOptionsFromDataOrFallbacks(educationEnrollmentOptions, [
        "Enrolled",
        "Pending",
        "Active",
        "Suspended",
        "Completed",
        "Withdrawn",
        "Not enrolled",
      ]),
    [educationEnrollmentOptions],
  );

  const planCategoryFormOptions = useMemo(
    () =>
      stringOptionsFromDataOrFallbacks(interventionCategoryOptions, [
        "Education",
        "Health",
        "Psychosocial",
        "Legal",
        "Family reunification",
        "Livelihood",
        "Other",
      ]),
    [interventionCategoryOptions],
  );

  const incidentTypeFormOptions = useMemo(
    () =>
      stringOptionsFromDataOrFallbacks(incidentTypeOptions, [
        "Medical",
        "Behavioral",
        "Safety",
        "Conflict",
        "AWOL",
        "Substance-related",
        "Other",
      ]),
    [incidentTypeOptions],
  );

  const incidentSeverityFormOptions = useMemo(
    () => stringOptionsFromDataOrFallbacks(incidentSeverityOptions, ["Low", "Medium", "High", "Critical"]),
    [incidentSeverityOptions],
  );

  const selectedResidents = selectedResidentIds
    .map((residentId) => residentMap.get(residentId))
    .filter((resident): resident is ResidentWithSafehouse => Boolean(resident));

  const setParams = (updates: Record<string, string | null>) => {
    startTransition(() => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) next.delete(key);
        else next.set(key, value);
      });
      setSearchParams(next, { replace: true });
    });
  };

  const getPage = (key: string) => tablePages[key] ?? 1;
  const setPage = (key: string, page: number) => {
    setTablePages((current) => ({ ...current, [key]: page }));
  };
  const getPageSize = (key: string) => tablePageSizes[key] ?? 10;
  const setPageSize = (key: string, size: number) => {
    setTablePageSizes((current) => ({ ...current, [key]: size }));
    setTablePages((current) => ({ ...current, [key]: 1 }));
  };

  const toggleTableColumnSort = useCallback((tableId: string, columnKey: string) => {
    setTableColumnSort((prev) => {
      const cur = prev[tableId];
      if (cur?.key === columnKey) {
        return { ...prev, [tableId]: { key: columnKey, dir: cur.dir === "asc" ? "desc" : "asc" } };
      }
      return { ...prev, [tableId]: { key: columnKey, dir: "asc" } };
    });
  }, []);

  const setTab = (tab: MainTab) => {
    setParams({ tab });
  };

  const setResidentSelection = (ids: number[]) => {
    setParams({ residentIds: ids.length ? ids.join(",") : null });
  };

  const toggleResidentSelection = (residentId: number) => {
    const next = selectedResidentIds.includes(residentId)
      ? selectedResidentIds.filter((entry) => entry !== residentId)
      : [...selectedResidentIds, residentId];
    setResidentSelection(next);
  };

  const openResidentDetail = (residentId: number) => {
    if (!selectedResidentIds.includes(residentId)) {
      setResidentSelection([...selectedResidentIds, residentId]);
    }
    setResidentDetailId(residentId);
    setResidentModalOpen(true);
  };

  const selectedResidentDetail = residentDetailId ? residentMap.get(residentDetailId) ?? null : null;

  const invalidateWorkspace = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: ["admin-workspace"] });
    toast.success(message);
  };

  const createMutation = useMutation({
    mutationFn: async ({
      table,
      payload,
    }: {
      table:
        | "residents"
        | "supporters"
        | "donations"
        | "in_kind_donation_items"
        | "donation_allocations"
        | "safehouses"
        | "process_recordings"
        | "home_visitations"
        | "education_records"
        | "health_wellbeing_records"
        | "intervention_plans"
        | "incident_reports";
      payload: Record<string, unknown>;
    }) => insertRecord(table, payload),
    onSuccess: async () => {
      await invalidateWorkspace("Record created.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to create that record.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      table,
      id,
      payload,
    }: {
      table:
        | "residents"
        | "supporters"
        | "donations"
        | "in_kind_donation_items"
        | "donation_allocations"
        | "safehouses"
        | "process_recordings"
        | "home_visitations"
        | "education_records"
        | "health_wellbeing_records"
        | "intervention_plans"
        | "incident_reports";
      id: number;
      payload: Record<string, unknown>;
    }) => updateRecord(table, id, payload),
    onSuccess: async () => {
      await invalidateWorkspace("Record updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to update that record.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({
      table,
      id,
    }: {
      table:
        | "residents"
        | "supporters"
        | "donations"
        | "in_kind_donation_items"
        | "donation_allocations"
        | "safehouses"
        | "process_recordings"
        | "home_visitations"
        | "education_records"
        | "health_wellbeing_records"
        | "intervention_plans"
        | "incident_reports";
      id: number;
    }) => deleteRecord(table, id),
    onSuccess: async () => {
      await invalidateWorkspace("Record deleted.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to delete that record.");
    },
  });

  const latestVisitationByResident = useMemo(() => {
    const grouped = new Map<number, RecordRow>();
    sortUpcomingThenRecent(workspace.visitations, "visit_date").forEach((row) => {
      const residentId = toNumber(row.resident_id);
      if (!residentId || grouped.has(residentId)) return;
      grouped.set(residentId, row);
    });
    return grouped;
  }, [workspace.visitations]);

  const filteredResidentsTable = useMemo(() => {
    const query = deferredResidentSearch.trim().toLowerCase();
    const rows = workspace.residents.filter((resident) => {
      const safehouse = safehouseMap.get(resident.safehouse_id ?? -1);
      const matchesSearch =
        !query ||
        [
          residentLabel(resident),
          resident.case_control_no,
          resident.case_status,
          resident.case_category,
          resident.assigned_social_worker,
          safehouse?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);

      const safehouseName = safehouse?.name ?? "Unassigned";
      const normalizedRisk = (resident.current_risk_level ?? "").toLowerCase();
      const matchesStatus = residentStatusFilter.length === 0 || residentStatusFilter.includes(resident.case_status ?? "");
      const matchesRisk = residentRiskFilter.length === 0 || residentRiskFilter.some((entry) => normalizedRisk.startsWith(entry.toLowerCase()));
      const matchesSafehouse = residentSafehouseFilter.length === 0 || residentSafehouseFilter.includes(safehouseName);

      return matchesSearch && matchesStatus && matchesRisk && matchesSafehouse;
    });

    const sorted = [...rows].sort((left, right) => {
      if (residentSort === "risk") {
        const order = { High: 0, Medium: 1, Low: 2 } as Record<string, number>;
        const leftRank = order[left.current_risk_level ?? ""] ?? 3;
        const rightRank = order[right.current_risk_level ?? ""] ?? 3;
        return leftRank - rightRank || compareDatesDescending(left.created_at, right.created_at);
      }
      if (residentSort === "latest-visit") {
        return compareDatesDescending(
          latestVisitationByResident.get(left.resident_id)?.visit_date,
          latestVisitationByResident.get(right.resident_id)?.visit_date,
        );
      }
      return compareDatesDescending(left.created_at, right.created_at);
    });

    return sorted;
  }, [
    deferredResidentSearch,
    latestVisitationByResident,
    residentRiskFilter,
    residentSafehouseFilter,
    residentSort,
    residentStatusFilter,
    safehouseMap,
    workspace.residents,
  ]);

  const selectedResidentIdSet = useMemo(() => new Set(selectedResidentIds), [selectedResidentIds]);

  const filterResidentLinkedRows = (rows: RecordRow[]) => {
    if (!selectedResidentIds.length) return rows;
    return rows.filter((row) => selectedResidentIdSet.has(toNumber(row.resident_id)));
  };

  const residentProcessSplit = useMemo(() => {
    const rows = filterResidentLinkedRows(workspace.processRecordings).filter((row) => {
      const matchesType = processTypeFilter.length === 0 || processTypeFilter.includes(String(row.session_type ?? ""));
      const matchesWorker = processWorkerFilter.length === 0 || processWorkerFilter.includes(String(row.social_worker ?? ""));
      return matchesType && matchesWorker;
    });
    return splitFutureRows(rows, "session_date");
  }, [processTypeFilter, processWorkerFilter, selectedResidentIdSet, selectedResidentIds.length, workspace.processRecordings]);
  const residentVisitationSplit = useMemo(() => {
    const rows = filterResidentLinkedRows(workspace.visitations).filter((row) => {
      const matchesType = visitationTypeFilter.length === 0 || visitationTypeFilter.includes(String(row.visit_type ?? ""));
      const matchesOutcome = visitationOutcomeFilter.length === 0 || visitationOutcomeFilter.includes(String(row.visit_outcome ?? ""));
      return matchesType && matchesOutcome;
    });
    return splitFutureRows(rows, "visit_date");
  }, [selectedResidentIdSet, selectedResidentIds.length, visitationOutcomeFilter, visitationTypeFilter, workspace.visitations]);
  const residentEducationSplit = useMemo(() => {
    const rows = filterResidentLinkedRows(workspace.education).filter((row) => {
      const matchesLevel = educationLevelFilter.length === 0 || educationLevelFilter.includes(String(row.education_level ?? ""));
      const matchesEnrollment = educationEnrollmentFilter.length === 0 || educationEnrollmentFilter.includes(String(row.enrollment_status ?? ""));
      return matchesLevel && matchesEnrollment;
    });
    return splitFutureRows(rows, "record_date");
  }, [educationEnrollmentFilter, educationLevelFilter, selectedResidentIdSet, selectedResidentIds.length, workspace.education]);
  const residentHealthSplit = useMemo(() => {
    const rows = filterResidentLinkedRows(workspace.health).filter((row) => {
      if (healthCheckupFilter.length === 0) return true;
      const selected = new Set(healthCheckupFilter);
      return (
        (selected.has("Medical") && String(row.medical_checkup_done).toLowerCase() === "true") ||
        (selected.has("Dental") && String(row.dental_checkup_done).toLowerCase() === "true") ||
        (selected.has("Psychological") && String(row.psychological_checkup_done).toLowerCase() === "true")
      );
    });
    return splitFutureRows(rows, "record_date");
  }, [healthCheckupFilter, selectedResidentIdSet, selectedResidentIds.length, workspace.health]);
  const residentInterventionSplit = useMemo(() => {
    const rows = filterResidentLinkedRows(workspace.interventions).filter((row) => {
      const matchesCategory = interventionCategoryFilter.length === 0 || interventionCategoryFilter.includes(String(row.plan_category ?? ""));
      const matchesStatus = interventionStatusFilter.length === 0 || interventionStatusFilter.includes(String(row.status ?? ""));
      return matchesCategory && matchesStatus;
    });
    return splitFutureRows(rows, "target_date");
  }, [interventionCategoryFilter, interventionStatusFilter, selectedResidentIdSet, selectedResidentIds.length, workspace.interventions]);
  const residentIncidentSplit = useMemo(() => {
    const rows = filterResidentLinkedRows(workspace.incidents).filter((row) => {
      const matchesType = incidentTypeFilter.length === 0 || incidentTypeFilter.includes(String(row.incident_type ?? ""));
      const matchesSeverity = incidentSeverityFilter.length === 0 || incidentSeverityFilter.includes(String(row.severity ?? ""));
      return matchesType && matchesSeverity;
    });
    return splitFutureRows(rows, "incident_date");
  }, [incidentSeverityFilter, incidentTypeFilter, selectedResidentIdSet, selectedResidentIds.length, workspace.incidents]);

  const residentUpcomingEvents = useMemo(() => {
    const now = new Date();
    const visitEvents = residentVisitationSplit.upcoming
      .slice(0, 5)
      .map((row) => ({
        id: `visit-${row.visitation_id}`,
        label: `${residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))} visitation`,
        date: String(row.visit_date ?? ""),
        detail: String(row.location_visited ?? row.visit_type ?? "Upcoming visitation"),
      }));

    const interventionEvents = residentInterventionSplit.upcoming
      .slice(0, 5)
      .map((row) => ({
        id: `plan-${row.plan_id}`,
        label: `${residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))} intervention target`,
        date: String(row.target_date ?? ""),
        detail: String(row.plan_category ?? row.status ?? "Upcoming intervention"),
      }));

    return [...visitEvents, ...interventionEvents]
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
      .slice(0, 6);
  }, [residentInterventionSplit.upcoming, residentMap, residentVisitationSplit.upcoming]);

  const filteredSupporters = useMemo(() => {
    const query = deferredDonationSearch.trim().toLowerCase();
    return [...workspace.supporters]
      .filter((supporter) => {
        const matchesType = donationTypeFilter.length === 0 || donationTypeFilter.includes(supporter.supporter_type ?? "");
        const matchesRelationship =
          donationRelationshipFilter.length === 0 || donationRelationshipFilter.includes(supporter.relationship_type ?? "");
        const matchesStatus = donationStatusFilter.length === 0 || donationStatusFilter.includes(supporter.status ?? "");
        const matchesRegion = donationRegionFilter.length === 0 || donationRegionFilter.includes(supporter.region ?? "");
        const matchesCountry = donationCountryFilter.length === 0 || donationCountryFilter.includes(supporter.country ?? "");
        const matchesSearch =
          !query ||
          [
            supporterLabel(supporter),
            supporter.supporter_type,
            supporter.region,
            supporter.status,
            supporter.acquisition_channel,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);
        return matchesSearch && matchesType && matchesRelationship && matchesStatus && matchesRegion && matchesCountry;
      })
      .sort((left, right) => {
        if (donationSort === "name") return supporterLabel(left).localeCompare(supporterLabel(right));
        return compareDatesDescending(left.created_at, right.created_at);
      });
  }, [
    deferredDonationSearch,
    donationCountryFilter,
    donationRegionFilter,
    donationRelationshipFilter,
    donationSort,
    donationStatusFilter,
    donationTypeFilter,
    workspace.supporters,
  ]);

  const filteredDonations = useMemo(() => {
    const query = deferredDonationSearch.trim().toLowerCase();
    return [...workspace.donations]
      .filter((donation) => {
        const supporter = donation.supporter_id ? supporterMap.get(donation.supporter_id) ?? null : null;
        const matchesSearch =
          !query ||
          [
            supporter ? supporterLabel(supporter) : donation.supporter_name,
            donation.donation_type,
            donation.campaign_name,
            donation.channel_source,
            donation.currency_code,
            String(donation.donation_id ?? ""),
            donation.is_recurring == null ? "" : String(donation.is_recurring),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);
        const recurringStr = donation.is_recurring == null ? "" : String(donation.is_recurring);
        const matchesGiftType =
          donationGiftTypeFilter.length === 0 || donationGiftTypeFilter.includes(donation.donation_type ?? "");
        const matchesRecurring =
          donationGiftRecurringFilter.length === 0 || donationGiftRecurringFilter.includes(recurringStr);
        const matchesCampaign =
          donationGiftCampaignFilter.length === 0 || donationGiftCampaignFilter.includes(donation.campaign_name ?? "");
        const matchesChannel =
          donationGiftChannelFilter.length === 0 || donationGiftChannelFilter.includes(donation.channel_source ?? "");
        const matchesCurrency =
          donationGiftCurrencyFilter.length === 0 || donationGiftCurrencyFilter.includes(donation.currency_code ?? "");
        const matchesSupporter = !selectedSupporterId || donation.supporter_id === selectedSupporterId;
        return (
          matchesSearch &&
          matchesGiftType &&
          matchesRecurring &&
          matchesCampaign &&
          matchesChannel &&
          matchesCurrency &&
          matchesSupporter
        );
      })
      .sort((left, right) => {
        if (donationSort === "amount") {
          return toNumber(right.amount ?? right.estimated_value) - toNumber(left.amount ?? left.estimated_value);
        }
        if (donationSort === "name") {
          const leftS = left.supporter_id ? supporterMap.get(left.supporter_id) : null;
          const rightS = right.supporter_id ? supporterMap.get(right.supporter_id) : null;
          return supporterLabel(leftS ?? ({} as Supporter)).localeCompare(supporterLabel(rightS ?? ({} as Supporter)));
        }
        return compareDatesDescending(left.donation_date, right.donation_date);
      });
  }, [
    deferredDonationSearch,
    donationGiftCampaignFilter,
    donationGiftChannelFilter,
    donationGiftCurrencyFilter,
    donationGiftRecurringFilter,
    donationGiftTypeFilter,
    donationSort,
    selectedSupporterId,
    supporterMap,
    workspace.donations,
  ]);

  const filteredInKind = useMemo(() => {
    const query = deferredDonationSearch.trim().toLowerCase();
    return workspace.inKind
      .filter((item) => {
        if (selectedSupporterId) {
          const donation = item.donation_id ? donationMap.get(item.donation_id) ?? null : null;
          if (donation?.supporter_id !== selectedSupporterId) return false;
        }
        const matchesCategory =
          inKindCategoryFilter.length === 0 || inKindCategoryFilter.includes(item.item_category ?? "");
        const matchesCondition =
          inKindConditionFilter.length === 0 || inKindConditionFilter.includes(item.received_condition ?? "");
        const matchesUnit = inKindUnitFilter.length === 0 || inKindUnitFilter.includes(item.unit_of_measure ?? "");
        const matchesSearch =
          !query ||
          [
            item.item_name,
            item.item_category,
            item.intended_use,
            item.received_condition,
            String(item.donation_id ?? ""),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);
        return matchesCategory && matchesCondition && matchesUnit && matchesSearch;
      })
      .sort((left, right) => {
        if (inKindSort === "name") {
          return (left.item_name ?? "").localeCompare(right.item_name ?? "");
        }
        if (inKindSort === "donation") {
          return toNumber(left.donation_id) - toNumber(right.donation_id);
        }
        return toNumber(right.item_id) - toNumber(left.item_id);
      });
  }, [
    deferredDonationSearch,
    donationMap,
    inKindCategoryFilter,
    inKindConditionFilter,
    inKindSort,
    inKindUnitFilter,
    selectedSupporterId,
    workspace.inKind,
  ]);

  const filteredAllocations = useMemo(() => {
    const query = deferredDonationSearch.trim().toLowerCase();
    return [...workspace.allocations]
      .filter((allocation) => {
        if (selectedSupporterId) {
          const donation = allocation.donation_id ? donationMap.get(allocation.donation_id) ?? null : null;
          if (donation?.supporter_id !== selectedSupporterId) return false;
        }
        const shName = safehouseMap.get(allocation.safehouse_id ?? -1)?.name ?? "";
        const matchesProgram =
          allocationProgramFilter.length === 0 || allocationProgramFilter.includes(allocation.program_area ?? "");
        const matchesSafehouse =
          allocationSafehouseFilter.length === 0 ||
          allocationSafehouseFilter.includes(String(allocation.safehouse_id ?? ""));
        const matchesSearch =
          !query ||
          [
            allocation.program_area,
            allocation.allocation_notes,
            String(allocation.donation_id ?? ""),
            String(allocation.allocation_id ?? ""),
            shName,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);
        return matchesProgram && matchesSafehouse && matchesSearch;
      })
      .sort((left, right) => {
        if (allocationSort === "amount") {
          return toNumber(right.amount_allocated) - toNumber(left.amount_allocated);
        }
        return compareDatesDescending(left.allocation_date, right.allocation_date);
      });
  }, [
    allocationProgramFilter,
    allocationSafehouseFilter,
    allocationSort,
    deferredDonationSearch,
    donationMap,
    safehouseMap,
    selectedSupporterId,
    workspace.allocations,
  ]);

  const filteredSafehouses = useMemo(() => {
    const query = deferredSafehouseSearch.trim().toLowerCase();
    return [...workspace.safehouses]
      .filter((safehouse) => {
        const matchesSearch =
          !query ||
          [safehouse.name, safehouse.safehouse_code, safehouse.region, safehouse.city, safehouse.status]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);
        const matchesStatus = safehouseStatusFilter.length === 0 || safehouseStatusFilter.includes(safehouse.status ?? "");
        const matchesRegion = safehouseRegionFilter.length === 0 || safehouseRegionFilter.includes(safehouse.region ?? "");
        return matchesSearch && matchesStatus && matchesRegion;
      })
      .sort((left, right) => {
        if (safehouseSort === "name") return asText(left.name, "").localeCompare(asText(right.name, ""));
        if (safehouseSort === "recent") return compareDatesDescending(left.open_date, right.open_date);
        const leftOccupancy = toNumber(left.current_occupancy) / Math.max(toNumber(left.capacity_girls), 1);
        const rightOccupancy = toNumber(right.current_occupancy) / Math.max(toNumber(right.capacity_girls), 1);
        return rightOccupancy - leftOccupancy;
      });
  }, [deferredSafehouseSearch, safehouseRegionFilter, safehouseSort, safehouseStatusFilter, workspace.safehouses]);

  const safehouseAllocations = useMemo(
    () =>
      filteredAllocations.filter((allocation) => !selectedSafehouseId || allocation.safehouse_id === selectedSafehouseId),
    [filteredAllocations, selectedSafehouseId],
  );

  const safehouseMetrics = useMemo(() => {
    const todayStart = startOfLocalDayMs(new Date());
    return [...workspace.monthlyMetrics]
      .filter((metric) => !selectedSafehouseId || metric.safehouse_id === selectedSafehouseId)
      .filter((metric) => {
        if (monthlyMetricsPeriodFilter === "all") return true;
        const parsed = metric.month_start ? new Date(String(metric.month_start)) : null;
        if (!parsed || Number.isNaN(parsed.getTime())) return false;
        const metricDay = startOfLocalDayMs(parsed);
        if (monthlyMetricsPeriodFilter === "occurred") return metricDay < todayStart;
        return metricDay >= todayStart;
      })
      .sort((left, right) => compareDatesDescending(left.month_start, right.month_start));
  }, [monthlyMetricsPeriodFilter, selectedSafehouseId, workspace.monthlyMetrics]);

  const safehouseTableStats = useMemo(() => {
    const map = new Map<number, { residents: number; allocationsTotal: number }>();
    for (const sh of workspace.safehouses) {
      const residentsAssigned = workspace.residents.filter((resident) => resident.safehouse_id === sh.safehouse_id).length;
      const donationAllocations = workspace.allocations
        .filter((allocation) => allocation.safehouse_id === sh.safehouse_id)
        .reduce((sum, allocation) => sum + toNumber(allocation.amount_allocated), 0);
      map.set(sh.safehouse_id, { residents: residentsAssigned, allocationsTotal: donationAllocations });
    }
    return map;
  }, [workspace.allocations, workspace.residents, workspace.safehouses]);

  const founderDashboardStats = useMemo(() => {
    const now = new Date();
    const dayStart = startOfDay(now);
    const horizonEnd = addCalendarDays(dayStart, 14);
    horizonEnd.setHours(23, 59, 59, 999);
    const thirtyDaysAgo = addCalendarDays(dayStart, -30);

    const inactiveHouseStatuses = new Set(["closed", "inactive", "archived"]);

    const activeResidents = workspace.residents.filter((r) => (r.case_status ?? "").toLowerCase() === "active").length;
    const activeSafehouses = workspace.safehouses.filter((s) => {
      const st = (s.status ?? "").toLowerCase().trim();
      return !inactiveHouseStatuses.has(st);
    }).length;
    const unresolvedIncidents = workspace.incidents.filter((row) => !String(row.resolved ?? "").toLowerCase().startsWith("true")).length;

    const totalCapacity = workspace.safehouses.reduce((sum, s) => sum + toNumber(s.capacity_girls), 0);
    const totalOccupancy = workspace.safehouses.reduce((sum, s) => sum + toNumber(s.current_occupancy), 0);
    const bedUtilPercent = totalCapacity ? Math.round((totalOccupancy / totalCapacity) * 100) : null;

    const terminalIntervention = new Set(["completed", "closed", "done", "resolved", "cancelled", "complete"]);
    const interventionOpen = (row: RecordRow) => {
      const status = String(row.status ?? "").toLowerCase();
      return !terminalIntervention.has(status);
    };

    const overdueActions = workspace.interventions.filter((row) => {
      if (!interventionOpen(row)) return false;
      const td = new Date(String(row.target_date ?? ""));
      return !Number.isNaN(td.getTime()) && td < dayStart;
    }).length;

    let upcomingDeadlines14 = 0;
    for (const row of workspace.visitations) {
      const d = new Date(String(row.visit_date ?? ""));
      if (Number.isNaN(d.getTime()) || d <= now || d > horizonEnd) continue;
      upcomingDeadlines14 += 1;
    }
    for (const row of workspace.interventions) {
      if (!interventionOpen(row)) continue;
      const d = new Date(String(row.target_date ?? ""));
      if (Number.isNaN(d.getTime()) || d <= now || d > horizonEnd) continue;
      upcomingDeadlines14 += 1;
    }

    const casesRequiringReview = workspace.interventions.filter((row) => {
      if (!interventionOpen(row)) return false;
      const d = new Date(String(row.case_conference_date ?? ""));
      if (Number.isNaN(d.getTime())) return false;
      if (d < dayStart) return true;
      return d <= horizonEnd;
    }).length;

    const recentGiving30 = workspace.donations.reduce((sum, donation) => {
      const dt = new Date(String(donation.donation_date ?? ""));
      if (Number.isNaN(dt.getTime()) || dt < thirtyDaysAgo) return sum;
      return sum + toNumber(donation.amount ?? donation.estimated_value);
    }, 0);

    const totalAllocated = workspace.allocations.reduce((sum, a) => sum + toNumber(a.amount_allocated), 0);
    const totalDonated = workspace.donations.reduce((sum, d) => sum + toNumber(d.amount ?? d.estimated_value), 0);
    const unallocatedBalance = Math.max(totalDonated - totalAllocated, 0);

    return {
      activeResidents,
      activeSafehouses,
      unresolvedIncidents,
      bedUtilPercent,
      bedSub: totalCapacity > 0 ? `${totalOccupancy}/${totalCapacity} beds` : undefined,
      overdueActions,
      upcomingDeadlines14,
      casesRequiringReview,
      recentGiving30,
      unallocatedBalance,
    };
  }, [
    workspace.allocations,
    workspace.donations,
    workspace.incidents,
    workspace.interventions,
    workspace.residents,
    workspace.safehouses,
    workspace.visitations,
  ]);

  const successMetrics = useMemo(() => {
    const riskRank = (value: unknown): number | null => {
      const v = String(value ?? "").trim().toLowerCase();
      if (!v) return null;
      if (v.startsWith("critical")) return 4;
      if (v.startsWith("high")) return 3;
      if (v.startsWith("medium")) return 2;
      if (v.startsWith("low")) return 1;
      return null;
    };

    const residentsWithRisk = workspace.residents
      .map((r) => ({ initial: riskRank(r.initial_risk_level), current: riskRank(r.current_risk_level) }))
      .filter((x) => x.initial != null && x.current != null);

    const denom = residentsWithRisk.length;
    const numer = residentsWithRisk.filter((x) => (x.current as number) < (x.initial as number)).length;
    const riskReductionRatePct = denom > 0 ? Math.round((numer / denom) * 100) : null;

    const activeResidents = workspace.residents.filter((r) => (r.case_status ?? "").toLowerCase() === "active");
    const reintegrationDenom = activeResidents.length;
    const reintegrationNumer = activeResidents.filter((r) => {
      const s = (r.reintegration_status ?? "").trim().toLowerCase();
      return s === "in progress" || s === "completed";
    }).length;
    const reintegrationProgressPct =
      reintegrationDenom > 0 ? Math.round((reintegrationNumer / reintegrationDenom) * 100) : null;

    return { riskReductionRatePct, reintegrationProgressPct };
  }, [workspace.residents]);

  const outreachConversionRatePct = useMemo(() => {
    const denom = workspace.socialPosts.length;
    if (denom === 0) return null;
    const numer = workspace.socialPosts.filter((post) => toNumber(post.donation_referrals) > 0).length;
    return Math.round((numer / denom) * 100);
  }, [workspace.socialPosts]);

  const dashboardRecentDonations = useMemo(
    () =>
      [...workspace.donations]
        .sort((left, right) => {
          const leftKey = (left.created_at ?? left.donation_date) as unknown;
          const rightKey = (right.created_at ?? right.donation_date) as unknown;
          return compareDatesDescending(leftKey, rightKey) || toNumber(right.donation_id) - toNumber(left.donation_id);
        })
        .slice(0, 8),
    [workspace.donations],
  );

  const outreachKpis = useMemo(() => {
    const totalImpressions = workspace.socialPosts.reduce((sum, post) => sum + toNumber(post.impressions), 0);
    const totalReferrals = workspace.socialPosts.reduce((sum, post) => sum + toNumber(post.donation_referrals), 0);
    const totalEstimatedValue = workspace.socialPosts.reduce((sum, post) => sum + toNumber(post.estimated_donation_value_php), 0);
    const avgEngagementRate =
      workspace.socialPosts.length > 0
        ? workspace.socialPosts.reduce((sum, post) => sum + toNumber(post.engagement_rate), 0) / workspace.socialPosts.length
        : 0;
    return {
      totalImpressions,
      totalReferrals,
      totalEstimatedValue,
      avgEngagementRate,
    };
  }, [workspace.socialPosts]);

  const outreachPlatformChart = useMemo(() => {
    const grouped = new Map<string, { impressions: number; referrals: number }>();
    workspace.socialPosts.forEach((post) => {
      const key = post.platform ?? "Unknown";
      const current = grouped.get(key) ?? { impressions: 0, referrals: 0 };
      current.impressions += toNumber(post.impressions);
      current.referrals += toNumber(post.donation_referrals);
      grouped.set(key, current);
    });
    return Array.from(grouped.entries()).map(([platform, metrics], index) => ({
      platform,
      impressions: metrics.impressions,
      referrals: metrics.referrals,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [workspace.socialPosts]);

  const reportsTrendData = useMemo(() => {
    const byMonth = new Map<string, { incidents: number; occupancy: number; donations: number }>();

    workspace.incidents.forEach((incident) => {
      const raw = String(incident.incident_date ?? "");
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const current = byMonth.get(key) ?? { incidents: 0, occupancy: 0, donations: 0 };
      current.incidents += 1;
      byMonth.set(key, current);
    });

    workspace.monthlyMetrics.forEach((metric) => {
      const raw = String(metric.month_start ?? "");
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const current = byMonth.get(key) ?? { incidents: 0, occupancy: 0, donations: 0 };
      current.occupancy += toNumber(metric.active_residents);
      byMonth.set(key, current);
    });

    workspace.donations.forEach((donation) => {
      const raw = String(donation.donation_date ?? "");
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const current = byMonth.get(key) ?? { incidents: 0, occupancy: 0, donations: 0 };
      current.donations += toNumber(donation.amount ?? donation.estimated_value);
      byMonth.set(key, current);
    });

    return Array.from(byMonth.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .slice(-8)
      .map(([month, values]) => ({
        month,
        incidents: values.incidents,
        occupancy: values.occupancy,
        donations: Math.round(values.donations / 1000),
      }));
  }, [workspace.donations, workspace.incidents, workspace.monthlyMetrics]);

  const chartConfigs = useMemo(() => {
    const donationsByMonth = buildMonthlySumChart(
      filteredDonations as unknown as Array<Record<string, unknown>>,
      "donation_date",
      (row) => toNumber(row.amount ?? row.estimated_value),
    );

    const healthMetricDefinitions: Record<string, { label: string; extractor: (row: RecordRow) => number }> = {
      general_health_score: { label: "General Health", extractor: (row) => toNumber(row.general_health_score) },
      nutrition_score: { label: "Nutrition", extractor: (row) => toNumber(row.nutrition_score) },
      sleep_quality_score: { label: "Sleep", extractor: (row) => toNumber(row.sleep_quality_score) },
      energy_level_score: { label: "Energy", extractor: (row) => toNumber(row.energy_level_score) },
    };

    const currentHealthMetric = healthMetricDefinitions[healthChartMetric] ?? healthMetricDefinitions.general_health_score;
    const monthlyMetricLabels: Record<string, string> = {
      active_residents: "Active Residents",
      avg_education_progress: "Education Progress",
      avg_health_score: "Health Score",
      home_visitation_count: "Visitations",
      incident_count: "Incidents",
    };

    return {
      "residents-all": {
        key: "residents-all",
        title: "Case status mix",
        subtitle: "Resident case status distribution",
        kpiLabel: "Visible Residents",
        kpiValue: String(filteredResidentsTable.length),
        kpiDetail: `${filteredResidentsTable.filter((resident) => (resident.case_status ?? "").toLowerCase() === "active").length} active in this view`,
        data: buildCountChart(
          filteredResidentsTable.map((resident) => ({ case_status: resident.case_status ?? "Unknown" })),
          "case_status",
        ),
        xKey: "label",
        yKey: "value",
        type: "pie",
      },
      "residents-process": {
        key: "residents-process",
        title: "Session types",
        subtitle: "Current process record mix",
        kpiLabel: "Follow-Up Queue",
        kpiValue: String(residentProcessSplit.currentAndPast.filter((row) => String(row.follow_up_actions ?? "").trim()).length),
        kpiDetail: `${residentProcessSplit.currentAndPast.length} visible process records`,
        data: buildCountChart(residentProcessSplit.currentAndPast, "session_type"),
        xKey: "label",
        yKey: "value",
      },
      "residents-visitations": {
        key: "residents-visitations",
        title: "Visit outcomes",
        subtitle: "Outcome distribution for visible visitations",
        kpiLabel: "Upcoming Events",
        kpiValue: String(residentUpcomingEvents.length),
        kpiDetail: `${residentVisitationSplit.currentAndPast.length} completed or current visit rows`,
        data: buildCountChart(residentVisitationSplit.currentAndPast, "visit_outcome"),
        xKey: "label",
        yKey: "value",
        type: "pie",
      },
      "residents-education": {
        key: "residents-education",
        title: "Education progress",
        subtitle: "Average progress by education level",
        kpiLabel: "Average Progress",
        kpiValue: `${residentEducationSplit.currentAndPast.length ? Math.round(residentEducationSplit.currentAndPast.reduce((sum, row) => sum + toNumber(row.progress_percent), 0) / residentEducationSplit.currentAndPast.length) : 0}%`,
        kpiDetail: `${residentEducationSplit.currentAndPast.length} visible education records`,
        data: buildAverageChart(
          educationLevelOptions.map((option) => ({
            label: option,
            values: residentEducationSplit.currentAndPast
              .filter((row) => String(row.education_level ?? "") === option)
              .map((row) => toNumber(row.progress_percent))
              .filter((value) => value > 0),
          })),
        ).filter((entry) => entry.value > 0),
        xKey: "label",
        yKey: "value",
      },
      "residents-health": {
        key: "residents-health",
        title: currentHealthMetric.label,
        subtitle: "Visible health records by resident",
        kpiLabel: "Average Health",
        kpiValue: `${residentHealthSplit.currentAndPast.length ? (residentHealthSplit.currentAndPast.reduce((sum, row) => sum + currentHealthMetric.extractor(row), 0) / residentHealthSplit.currentAndPast.length).toFixed(1) : "0.0"}`,
        kpiDetail: `${residentHealthSplit.currentAndPast.length} visible health records`,
        data: residentHealthSplit.currentAndPast
          .map((row) => ({
            label: residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident)),
            value: currentHealthMetric.extractor(row),
          }))
          .filter((entry) => entry.value > 0)
          .slice(0, 10),
        xKey: "label",
        yKey: "value",
        modalOptions: Object.entries(healthMetricDefinitions).map(([value, meta]) => ({ value, label: meta.label })),
        selectedOption: healthChartMetric,
        onOptionChange: setHealthChartMetric,
      },
      "residents-interventions": {
        key: "residents-interventions",
        title: "Intervention status",
        subtitle: "Plan status across visible interventions",
        kpiLabel: "Overdue Plans",
        kpiValue: String(
          residentInterventionSplit.currentAndPast.filter((row) => {
            const date = new Date(String(row.target_date ?? ""));
            return !Number.isNaN(date.getTime()) && date < new Date() && String(row.status ?? "").toLowerCase() !== "completed";
          }).length,
        ),
        kpiDetail: `${residentInterventionSplit.currentAndPast.length} visible intervention plans`,
        data: buildCountChart(residentInterventionSplit.currentAndPast, "status"),
        xKey: "label",
        yKey: "value",
        type: "pie",
      },
      "residents-incidents": {
        key: "residents-incidents",
        title: "Incident severity",
        subtitle: "Severity mix for visible incidents",
        kpiLabel: "Open Incidents",
        kpiValue: String(residentIncidentSplit.currentAndPast.filter((row) => String(row.resolved ?? "").toLowerCase() !== "true").length),
        kpiDetail: `${residentIncidentSplit.currentAndPast.length} visible incidents`,
        data: buildCountChart(residentIncidentSplit.currentAndPast, "severity"),
        xKey: "label",
        yKey: "value",
        color: "hsl(var(--secondary))",
        type: "pie",
      },
      "donations-supporters": {
        key: "donations-supporters",
        title: "Supporter status",
        subtitle: "Current visible supporter mix",
        kpiLabel: "Active Supporters",
        kpiValue: String(filteredSupporters.filter((supporter) => (supporter.status ?? "").toLowerCase() === "active").length),
        kpiDetail: `${filteredSupporters.length} visible supporters`,
        data: buildCountChart(filteredSupporters.map((supporter) => ({ status: supporter.status ?? "Unknown" })), "status"),
        xKey: "label",
        yKey: "value",
        type: "pie",
      },
      "donations-donations": {
        key: "donations-donations",
        title: "Donation trend",
        subtitle: "Monthly donation value in scope",
        kpiLabel: "Recurring Share",
        kpiValue: `${filteredDonations.length ? Math.round((filteredDonations.filter((donation) => String(donation.is_recurring).toLowerCase() === "true").length / filteredDonations.length) * 100) : 0}%`,
        kpiDetail: `${formatCurrency(filteredDonations.reduce((sum, donation) => sum + toNumber(donation.amount ?? donation.estimated_value), 0))} in current scope`,
        data: donationsByMonth,
        xKey: "label",
        yKey: "value",
        type: "line",
      },
      "donations-in-kind": {
        key: "donations-in-kind",
        title: "In-kind categories",
        subtitle: "Visible in-kind item mix",
        kpiLabel: "In-Kind Items",
        kpiValue: String(filteredInKind.length),
        kpiDetail: `${formatCompactNumber(filteredInKind.reduce((sum, item) => sum + toNumber(item.quantity), 0))} total units in view`,
        data: buildCountChart(filteredInKind as unknown as Array<Record<string, unknown>>, "item_category"),
        xKey: "label",
        yKey: "value",
        type: "pie",
      },
      "donations-allocations": {
        key: "donations-allocations",
        title: "Allocation areas",
        subtitle: "Program area totals",
        kpiLabel: "Allocated Value",
        kpiValue: formatCurrency(filteredAllocations.reduce((sum, allocation) => sum + toNumber(allocation.amount_allocated), 0)),
        kpiDetail: `${filteredAllocations.length} visible allocation records`,
        data: Array.from(
          filteredAllocations.reduce<Map<string, number>>((accumulator, allocation) => {
            const label = asText(allocation.program_area, "Unassigned");
            accumulator.set(label, (accumulator.get(label) ?? 0) + toNumber(allocation.amount_allocated));
            return accumulator;
          }, new Map()),
        ).map(([label, value]) => ({ label, value: Math.round(value) })),
        xKey: "label",
        yKey: "value",
      },
      "safehouses-overview": {
        key: "safehouses-overview",
        title: "Occupancy by house",
        subtitle: "Current occupancy across visible houses",
        kpiLabel: "Average Occupancy",
        kpiValue: `${filteredSafehouses.length ? Math.round(filteredSafehouses.reduce((sum, safehouse) => sum + (toNumber(safehouse.current_occupancy) / Math.max(toNumber(safehouse.capacity_girls), 1)) * 100, 0) / filteredSafehouses.length) : 0}%`,
        kpiDetail: `${filteredSafehouses.length} visible safe houses`,
        data: filteredSafehouses.map((safehouse) => ({
          label: asText(safehouse.name, `House ${safehouse.safehouse_id}`),
          value: Math.round((toNumber(safehouse.current_occupancy) / Math.max(toNumber(safehouse.capacity_girls), 1)) * 100),
        })),
        xKey: "label",
        yKey: "value",
      },
      "safehouses-allocations": {
        key: "safehouses-allocations",
        title: "Allocation areas",
        subtitle: "Visible allocation history by program",
        kpiLabel: "Allocated To Houses",
        kpiValue: formatCurrency(safehouseAllocations.reduce((sum, allocation) => sum + toNumber(allocation.amount_allocated), 0)),
        kpiDetail: `${safehouseAllocations.length} visible allocation records`,
        data: Array.from(
          safehouseAllocations.reduce<Map<string, number>>((accumulator, allocation) => {
            const label = asText(allocation.program_area, "Unassigned");
            accumulator.set(label, (accumulator.get(label) ?? 0) + toNumber(allocation.amount_allocated));
            return accumulator;
          }, new Map()),
        ).map(([label, value]) => ({ label, value: Math.round(value) })),
        xKey: "label",
        yKey: "value",
      },
      "safehouses-metrics": {
        key: "safehouses-metrics",
        title: monthlyMetricLabels[monthlyMetricsChartMetric] ?? "Monthly metrics",
        subtitle: "Visible monthly metric trend",
        kpiLabel: "Latest Snapshot",
        kpiValue: String(
          safehouseMetrics.length
            ? toNumber(safehouseMetrics[0][monthlyMetricsChartMetric as keyof MonthlyMetric]).toFixed(
                monthlyMetricsChartMetric.includes("avg_") ? 1 : 0,
              )
            : 0,
        ),
        kpiDetail: monthlyMetricLabels[monthlyMetricsChartMetric] ?? "Monthly metrics",
        data: safehouseMetrics
          .map((metric) => ({
            label: String(metric.month_start ?? "").slice(0, 7) || asDisplayDate(metric.month_start),
            value: toNumber(metric[monthlyMetricsChartMetric as keyof MonthlyMetric]),
          }))
          .filter((entry) => entry.label),
        xKey: "label",
        yKey: "value",
        type: "line",
        modalOptions: Object.entries(monthlyMetricLabels).map(([value, label]) => ({ value, label })),
        selectedOption: monthlyMetricsChartMetric,
        onOptionChange: setMonthlyMetricsChartMetric,
      },
    } as Record<string, AnalyticsCardConfig>;
  }, [
    educationLevelOptions,
    filteredAllocations,
    filteredDonations,
    filteredInKind,
    filteredResidentsTable,
    filteredSafehouses,
    filteredSupporters,
    healthChartMetric,
    monthlyMetricsChartMetric,
    residentEducationSplit.currentAndPast,
    residentHealthSplit.currentAndPast,
    residentIncidentSplit.currentAndPast,
    residentInterventionSplit.currentAndPast,
    residentMap,
    residentProcessSplit.currentAndPast,
    residentUpcomingEvents,
    residentVisitationSplit.currentAndPast,
    safehouseAllocations,
    safehouseMetrics,
  ]);

  const residentsRowsSorted = useMemo(
    () =>
      sortRowsByColumn(filteredResidentsTable, tableColumnSort.residents, (r, key) => {
        switch (key) {
          case "name":
            return residentLabel(r);
          case "age":
            return toNumber(r.present_age);
          case "case_status":
            return r.case_status ?? "";
          case "safe_house":
            return safehouseMap.get(r.safehouse_id ?? -1)?.name ?? "";
          case "latest_visitation": {
            const d = latestVisitationByResident.get(r.resident_id)?.visit_date;
            if (!d) return 0;
            const t = new Date(String(d)).getTime();
            return Number.isNaN(t) ? 0 : t;
          }
          case "risk":
            return r.current_risk_level ?? "";
          case "date_added": {
            if (!r.created_at) return 0;
            const t = new Date(String(r.created_at)).getTime();
            return Number.isNaN(t) ? 0 : t;
          }
          default:
            return r.resident_id;
        }
      }),
    [filteredResidentsTable, latestVisitationByResident, safehouseMap, tableColumnSort.residents],
  );

  const processRowsSorted = useMemo(
    () =>
      sortRowsByColumn(residentProcessSplit.currentAndPast, tableColumnSort["process-records"], (row, key) => {
        switch (key) {
          case "resident":
            return residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident));
          case "session_date": {
            const t = row.session_date ? new Date(String(row.session_date)).getTime() : 0;
            return Number.isNaN(t) ? 0 : t;
          }
          case "social_worker":
            return String(row.social_worker ?? "");
          case "session_type":
            return String(row.session_type ?? "");
          case "concerns_flagged":
            return String(row.concerns_flagged).toLowerCase() === "true" ? 1 : 0;
          case "follow_up":
            return String(row.follow_up_actions ?? "");
          default:
            return row.recording_id;
        }
      }),
    [residentMap, residentProcessSplit.currentAndPast, tableColumnSort["process-records"]],
  );

  const visitationsRowsSorted = useMemo(
    () =>
      sortRowsByColumn(residentVisitationSplit.currentAndPast, tableColumnSort.visitations, (row, key) => {
        switch (key) {
          case "resident":
            return residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident));
          case "visit_date": {
            const t = row.visit_date ? new Date(String(row.visit_date)).getTime() : 0;
            return Number.isNaN(t) ? 0 : t;
          }
          case "visit_type":
            return String(row.visit_type ?? "");
          case "location":
            return String(row.location_visited ?? "");
          case "social_worker":
            return String(row.social_worker ?? "");
          case "outcome":
            return String(row.visit_outcome ?? "");
          default:
            return row.visitation_id;
        }
      }),
    [residentMap, residentVisitationSplit.currentAndPast, tableColumnSort.visitations],
  );

  const educationRowsSorted = useMemo(
    () =>
      sortRowsByColumn(residentEducationSplit.currentAndPast, tableColumnSort.education, (row, key) => {
        switch (key) {
          case "resident":
            return residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident));
          case "record_date": {
            const t = row.record_date ? new Date(String(row.record_date)).getTime() : 0;
            return Number.isNaN(t) ? 0 : t;
          }
          case "level":
            return String(row.education_level ?? "");
          case "school":
            return String(row.school_name ?? "");
          case "enrollment":
            return String(row.enrollment_status ?? "");
          case "progress":
            return toNumber(row.progress_percent);
          default:
            return row.education_record_id;
        }
      }),
    [residentMap, residentEducationSplit.currentAndPast, tableColumnSort.education],
  );

  const healthRowsSorted = useMemo(
    () =>
      sortRowsByColumn(residentHealthSplit.currentAndPast, tableColumnSort.health, (row, key) => {
        switch (key) {
          case "resident":
            return residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident));
          case "record_date": {
            const t = row.record_date ? new Date(String(row.record_date)).getTime() : 0;
            return Number.isNaN(t) ? 0 : t;
          }
          case "health_score":
            return toNumber(row.general_health_score);
          case "nutrition":
            return toNumber(row.nutrition_score);
          case "sleep":
            return toNumber(row.sleep_quality_score);
          case "bmi":
            return toNumber(row.bmi);
          default:
            return row.health_record_id;
        }
      }),
    [residentMap, residentHealthSplit.currentAndPast, tableColumnSort.health],
  );

  const interventionsRowsSorted = useMemo(
    () =>
      sortRowsByColumn(residentInterventionSplit.currentAndPast, tableColumnSort.interventions, (row, key) => {
        switch (key) {
          case "resident":
            return residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident));
          case "category":
            return String(row.plan_category ?? "");
          case "target_date": {
            const t = row.target_date ? new Date(String(row.target_date)).getTime() : 0;
            return Number.isNaN(t) ? 0 : t;
          }
          case "status":
            return String(row.status ?? "");
          case "conference_date": {
            const t = row.case_conference_date ? new Date(String(row.case_conference_date)).getTime() : 0;
            return Number.isNaN(t) ? 0 : t;
          }
          case "services":
            return String(row.services_provided ?? "");
          default:
            return row.plan_id;
        }
      }),
    [residentMap, residentInterventionSplit.currentAndPast, tableColumnSort.interventions],
  );

  const incidentsRowsSorted = useMemo(
    () =>
      sortRowsByColumn(residentIncidentSplit.currentAndPast, tableColumnSort.incidents, (row, key) => {
        switch (key) {
          case "resident":
            return residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident));
          case "incident_date": {
            const t = row.incident_date ? new Date(String(row.incident_date)).getTime() : 0;
            return Number.isNaN(t) ? 0 : t;
          }
          case "incident_type":
            return String(row.incident_type ?? "");
          case "severity":
            return String(row.severity ?? "");
          case "reported_by":
            return String(row.reported_by ?? "");
          case "resolved":
            return String(row.resolved).toLowerCase() === "true" ? 1 : 0;
          default:
            return row.incident_id;
        }
      }),
    [residentMap, residentIncidentSplit.currentAndPast, tableColumnSort.incidents],
  );

  const supportersRowsSorted = useMemo(
    () =>
      sortRowsByColumn(filteredSupporters, tableColumnSort.supporters, (s, key) => {
        switch (key) {
          case "name":
            return supporterLabel(s);
          case "type":
            return String(s.supporter_type ?? "");
          case "status":
            return String(s.status ?? "");
          case "region":
            return String(s.region ?? "");
          case "first_donation": {
            const t = s.first_donation_date ? new Date(String(s.first_donation_date)).getTime() : 0;
            return Number.isNaN(t) ? 0 : t;
          }
          case "channel":
            return String(s.acquisition_channel ?? "");
          default:
            return s.supporter_id;
        }
      }),
    [filteredSupporters, tableColumnSort.supporters],
  );

  const donationsRowsSorted = useMemo(
    () =>
      sortRowsByColumn(filteredDonations, tableColumnSort["donations-tab"], (row, key) => {
        switch (key) {
          case "supporter":
            return row.supporter_id
              ? supporterLabel(supporterMap.get(row.supporter_id) ?? ({} as Supporter))
              : row.supporter_name ?? "Anonymous";
          case "donation_date": {
            const t = row.donation_date ? new Date(String(row.donation_date)).getTime() : 0;
            return Number.isNaN(t) ? 0 : t;
          }
          case "donation_type":
            return String(row.donation_type ?? "");
          case "campaign":
            return String(row.campaign_name ?? "");
          case "channel":
            return String(row.channel_source ?? "");
          case "amount":
            return toNumber(row.amount ?? row.estimated_value);
          default:
            return row.donation_id;
        }
      }),
    [filteredDonations, supporterMap, tableColumnSort["donations-tab"]],
  );

  const inKindRowsSorted = useMemo(
    () =>
      sortRowsByColumn(filteredInKind, tableColumnSort["in-kind"], (item, key) => {
        switch (key) {
          case "donation":
            return toNumber(item.donation_id);
          case "item":
            return String(item.item_name ?? "");
          case "category":
            return String(item.item_category ?? "");
          case "quantity":
            return toNumber(item.quantity);
          case "intended_use":
            return String(item.intended_use ?? "");
          case "condition":
            return String(item.received_condition ?? "");
          default:
            return item.item_id;
        }
      }),
    [filteredInKind, tableColumnSort["in-kind"]],
  );

  const allocationsRowsSorted = useMemo(
    () =>
      sortRowsByColumn(filteredAllocations, tableColumnSort.allocations, (allocation, key) => {
        switch (key) {
          case "donation":
            return toNumber(allocation.donation_id);
          case "safe_house":
            return safehouseMap.get(allocation.safehouse_id ?? -1)?.name ?? "";
          case "program_area":
            return String(allocation.program_area ?? "");
          case "allocation_date": {
            const t = allocation.allocation_date ? new Date(String(allocation.allocation_date)).getTime() : 0;
            return Number.isNaN(t) ? 0 : t;
          }
          case "amount":
            return toNumber(allocation.amount_allocated);
          default:
            return allocation.allocation_id;
        }
      }),
    [filteredAllocations, safehouseMap, tableColumnSort.allocations],
  );

  const safehousesRowsSorted = useMemo(
    () =>
      sortRowsByColumn(filteredSafehouses, tableColumnSort["safe-houses"], (sh, key) => {
        const stats = safehouseTableStats.get(sh.safehouse_id) ?? { residents: 0, allocationsTotal: 0 };
        switch (key) {
          case "name":
            return asText(sh.name, "");
          case "region":
            return [sh.city, sh.region].filter(Boolean).join(", ");
          case "status":
            return String(sh.status ?? "");
          case "capacity":
            return toNumber(sh.capacity_girls);
          case "occupancy":
            return toNumber(sh.current_occupancy);
          case "residents_assigned":
            return stats.residents;
          case "donation_allocations":
            return stats.allocationsTotal;
          default:
            return sh.safehouse_id;
        }
      }),
    [filteredSafehouses, safehouseTableStats, tableColumnSort["safe-houses"]],
  );

  const allocationHistoryRowsSorted = useMemo(
    () =>
      sortRowsByColumn(safehouseAllocations, tableColumnSort["allocation-history"], (allocation, key) => {
        switch (key) {
          case "safe_house":
            return safehouseMap.get(allocation.safehouse_id ?? -1)?.name ?? "";
          case "donation":
            return toNumber(allocation.donation_id);
          case "program_area":
            return String(allocation.program_area ?? "");
          case "allocation_date": {
            const t = allocation.allocation_date ? new Date(String(allocation.allocation_date)).getTime() : 0;
            return Number.isNaN(t) ? 0 : t;
          }
          case "amount":
            return toNumber(allocation.amount_allocated);
          default:
            return allocation.allocation_id;
        }
      }),
    [safehouseAllocations, safehouseMap, tableColumnSort["allocation-history"]],
  );

  const monthlyMetricsRowsSorted = useMemo(
    () =>
      sortRowsByColumn(safehouseMetrics, tableColumnSort["monthly-metrics"], (metric, key) => {
        switch (key) {
          case "safe_house":
            return safehouseMap.get(metric.safehouse_id ?? -1)?.name ?? "";
          case "month": {
            const t = metric.month_start ? new Date(String(metric.month_start)).getTime() : 0;
            return Number.isNaN(t) ? 0 : t;
          }
          case "active_residents":
            return toNumber(metric.active_residents);
          case "education_progress":
            return toNumber(metric.avg_education_progress);
          case "health_score":
            return toNumber(metric.avg_health_score);
          case "visitations":
            return toNumber(metric.home_visitation_count);
          case "incidents":
            return toNumber(metric.incident_count);
          default:
            return metric.metric_id;
        }
      }),
    [safehouseMap, safehouseMetrics, tableColumnSort["monthly-metrics"]],
  );

  const outreachPostsRowsSorted = useMemo(() => {
    const base = [...workspace.socialPosts];
    if (!tableColumnSort["social-posts"]?.key) {
      return base.sort((left, right) => compareDatesDescending(left.created_at, right.created_at));
    }
    return sortRowsByColumn(base, tableColumnSort["social-posts"], (post, key) => {
      switch (key) {
        case "platform":
          return String(post.platform ?? "");
        case "date": {
          const t = post.created_at ? new Date(String(post.created_at)).getTime() : 0;
          return Number.isNaN(t) ? 0 : t;
        }
        case "post_type":
          return String(post.post_type ?? "");
        case "impressions":
          return toNumber(post.impressions);
        case "estimated_value":
          return toNumber(post.estimated_donation_value_php);
        default:
          return post.post_id;
      }
    });
  }, [tableColumnSort, workspace.socialPosts]);

  const residentsTablePage = PaginatedRows({ rows: residentsRowsSorted, page: getPage("residents"), perPage: getPageSize("residents") });
  const processTablePage = PaginatedRows({ rows: processRowsSorted, page: getPage("process-records"), perPage: getPageSize("process-records") });
  const visitationsTablePage = PaginatedRows({ rows: visitationsRowsSorted, page: getPage("visitations"), perPage: getPageSize("visitations") });
  const educationTablePage = PaginatedRows({ rows: educationRowsSorted, page: getPage("education"), perPage: getPageSize("education") });
  const healthTablePage = PaginatedRows({ rows: healthRowsSorted, page: getPage("health"), perPage: getPageSize("health") });
  const interventionsTablePage = PaginatedRows({ rows: interventionsRowsSorted, page: getPage("interventions"), perPage: getPageSize("interventions") });
  const incidentsTablePage = PaginatedRows({ rows: incidentsRowsSorted, page: getPage("incidents"), perPage: getPageSize("incidents") });
  const supportersTablePage = PaginatedRows({ rows: supportersRowsSorted, page: getPage("supporters"), perPage: getPageSize("supporters") });
  const donationsTablePage = PaginatedRows({ rows: donationsRowsSorted, page: getPage("donations"), perPage: getPageSize("donations") });
  const inKindTablePage = PaginatedRows({ rows: inKindRowsSorted, page: getPage("in-kind"), perPage: getPageSize("in-kind") });
  const allocationsTablePage = PaginatedRows({ rows: allocationsRowsSorted, page: getPage("allocations"), perPage: getPageSize("allocations") });
  const safehousesTablePage = PaginatedRows({ rows: safehousesRowsSorted, page: getPage("safe-houses"), perPage: getPageSize("safe-houses") });
  const allocationHistoryTablePage = PaginatedRows({ rows: allocationHistoryRowsSorted, page: getPage("allocation-history"), perPage: getPageSize("allocation-history") });
  const monthlyMetricsTablePage = PaginatedRows({ rows: monthlyMetricsRowsSorted, page: getPage("monthly-metrics"), perPage: getPageSize("monthly-metrics") });
  const outreachPostsTablePage = PaginatedRows({
    rows: outreachPostsRowsSorted,
    page: getPage("social-posts"),
    perPage: getPageSize("social-posts"),
  });

  const residentFields: FormField[] = useMemo(
    () => [
      {
        key: "case_control_no",
        label: "Case Control No.",
        readOnly: true,
      },
      {
        key: "internal_code",
        label: "Internal Code",
        readOnly: true,
      },
      {
        key: "safehouse_id",
        label: "Safe House",
        type: "select",
        required: true,
        options: workspace.safehouses.map((safehouse) => ({
          value: String(safehouse.safehouse_id),
          label: safehouse.name ?? `Safe House ${safehouse.safehouse_id}`,
        })),
      },
      {
        key: "case_status",
        label: "Case Status",
        type: "select",
        required: true,
        options: ["Active", "Open", "Closed", "Transferred"].map((entry) => ({ value: entry, label: entry })),
      },
      {
        key: "sex",
        label: "Sex",
        type: "select",
        required: true,
        options: ["F", "M"].map((entry) => ({ value: entry, label: entry })),
      },
      { key: "date_of_birth", label: "Date of Birth", type: "date" },
      { key: "place_of_birth", label: "Place of Birth" },
      { key: "religion", label: "Religion" },
      {
        key: "case_category",
        label: "Case Category",
        type: "select",
        required: true,
        options: caseCategoryFormOptions,
      },
      { key: "date_of_admission", label: "Intake Date", type: "date", required: true },
      {
        key: "assigned_social_worker",
        label: "Assigned Social Worker",
        type: "select",
        required: true,
        options: socialWorkerFormOptions,
      },
      {
        key: "current_risk_level",
        label: "Risk Status",
        type: "select",
        required: true,
        options: ["Low", "Medium", "High", "Critical"].map((entry) => ({ value: entry, label: entry })),
      },
      { key: "notes_restricted", label: "Notes", type: "textarea" },
    ],
    [caseCategoryFormOptions, socialWorkerFormOptions, workspace.safehouses],
  );

  const supporterFields: FormField[] = [
    {
      key: "supporter_type",
      label: "Supporter Type",
      type: "select",
      required: true,
      options: [
        "MonetaryDonor",
        "InKindDonor",
        "SocialMediaAdvocate",
        "Volunteer",
        "PartnerOrganization",
      ].map((entry) => ({ value: entry, label: entry })),
    },
    { key: "display_name", label: "Display Name" },
    { key: "organization_name", label: "Organization Name" },
    { key: "first_name", label: "First Name" },
    { key: "last_name", label: "Last Name" },
    { key: "relationship_type", label: "Relationship Type" },
    { key: "region", label: "Region" },
    { key: "country", label: "Country", required: true },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone" },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: ["Active", "Inactive"].map((entry) => ({ value: entry, label: entry })),
    },
    { key: "first_donation_date", label: "First Donation Date", type: "date" },
    { key: "acquisition_channel", label: "Acquisition Channel" },
  ];

  const donationFields: FormField[] = useMemo(
    () => [
      {
        key: "supporter_id",
        label: "Supporter",
        type: "select" as const,
        required: true,
        options: workspace.supporters.map((supporter) => ({
          value: String(supporter.supporter_id),
          label: supporterLabel(supporter),
        })),
      },
      {
        key: "donation_type",
        label: "Donation Type",
        type: "select" as const,
        required: true,
        options: ["Monetary", "InKind"].map((entry) => ({ value: entry, label: entry })),
      },
      { key: "donation_date", label: "Donation Date", type: "date" as const, required: true },
      {
        key: "is_recurring",
        label: "Recurring",
        type: "select" as const,
        required: true,
        options: [
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ],
      },
      { key: "campaign_name", label: "Campaign Name" },
      { key: "channel_source", label: "Channel Source" },
      { key: "currency_code", label: "Currency Code", required: true },
      {
        key: "amount",
        label: "Amount",
        type: "number" as const,
        required: donationForm.donation_type === "Monetary",
      },
      {
        key: "estimated_value",
        label: "Estimated Value",
        type: "number" as const,
        required: donationForm.donation_type === "InKind",
      },
      { key: "impact_unit", label: "Impact Unit" },
      { key: "notes", label: "Notes", type: "textarea" as const },
      { key: "referral_post_id", label: "Referral Post ID" },
    ],
    [donationForm.donation_type, workspace.supporters],
  );

  const inKindFields: FormField[] = [
    {
      key: "donation_id",
      label: "Donation",
      type: "select",
      required: true,
      options: workspace.donations.map((donation) => ({
        value: String(donation.donation_id),
        label: `Donation #${donation.donation_id}`,
      })),
    },
    { key: "item_name", label: "Item Name", required: true },
    { key: "item_category", label: "Category", required: true },
    { key: "quantity", label: "Quantity", type: "number", required: true },
    { key: "unit_of_measure", label: "Unit of Measure" },
    { key: "estimated_unit_value", label: "Estimated Unit Value", type: "number" },
    { key: "intended_use", label: "Intended Use" },
    { key: "received_condition", label: "Received Condition" },
  ];

  const allocationFields: FormField[] = [
    {
      key: "donation_id",
      label: "Donation",
      type: "select",
      required: true,
      options: workspace.donations.map((donation) => ({
        value: String(donation.donation_id),
        label: `Donation #${donation.donation_id}`,
      })),
    },
    {
      key: "safehouse_id",
      label: "Safe House",
      type: "select",
      required: true,
      options: workspace.safehouses.map((safehouse) => ({
        value: String(safehouse.safehouse_id),
        label: safehouse.name ?? `Safe House ${safehouse.safehouse_id}`,
      })),
    },
    { key: "program_area", label: "Program Area", required: true },
    { key: "amount_allocated", label: "Amount Allocated", type: "number", required: true },
    { key: "allocation_date", label: "Allocation Date", type: "date", required: true },
    { key: "allocation_notes", label: "Allocation Notes", type: "textarea" },
  ];

  const safehouseFields: FormField[] = [
    { key: "safehouse_code", label: "Safe House Code", required: true },
    { key: "name", label: "Name", required: true },
    { key: "region", label: "Region", required: true },
    { key: "city", label: "City", required: true },
    { key: "province", label: "Province" },
    { key: "country", label: "Country", required: true },
    { key: "open_date", label: "Open Date", type: "date" },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: ["Active", "Inactive"].map((entry) => ({ value: entry, label: entry })),
    },
    { key: "capacity_girls", label: "Capacity Girls", type: "number", required: true },
    { key: "capacity_staff", label: "Capacity Staff", type: "number", required: true },
    { key: "current_occupancy", label: "Current Occupancy", type: "number", required: true },
    { key: "notes", label: "Notes", type: "textarea" },
  ];
  const residentSelectOptions = useMemo(
    () => workspace.residents.map((resident) => ({ value: String(resident.resident_id), label: residentLabel(resident) })),
    [workspace.residents],
  );

  const processSessionTypeSelectOptions = useMemo(() => {
    const base = [
      { value: "Individual", label: "Individual" },
      { value: "Group", label: "Group" },
    ];
    const cur = processForm.session_type.trim();
    if (cur && !base.some((o) => o.value === cur)) {
      return [...base, { value: cur, label: `${cur} (saved value)` }];
    }
    return base;
  }, [processForm.session_type]);

  const processFields: FormField[] = useMemo(
    () => [
      { key: "resident_id", label: "Resident", type: "select", required: true, options: residentSelectOptions },
      { key: "session_date", label: "Session Date", type: "date", required: true },
      {
        key: "social_worker",
        label: "Social Worker",
        type: "select",
        required: true,
        options: socialWorkerFormOptions,
      },
      {
        key: "session_type",
        label: "Session Type",
        type: "select",
        required: true,
        options: processSessionTypeSelectOptions,
      },
      { key: "emotional_state_observed", label: "Emotional State Observed", required: true },
      {
        key: "session_narrative",
        label: "Narrative Summary of Session",
        type: "textarea",
        required: true,
      },
      {
        key: "interventions_applied",
        label: "Interventions Applied",
        type: "textarea",
        required: true,
        compact: true,
        disabledWhenKeyTrue: "interventions_none",
      },
      {
        key: "interventions_none",
        label: "None",
        type: "checkbox",
        checkboxCompact: true,
        checkboxCaption: "None — no interventions applied",
      },
      {
        key: "follow_up_actions",
        label: "Follow-up Actions",
        type: "textarea",
        required: true,
        compact: true,
        disabledWhenKeyTrue: "follow_up_none",
      },
      {
        key: "follow_up_none",
        label: "None",
        type: "checkbox",
        checkboxCompact: true,
        checkboxCaption: "None — no follow-up actions",
      },
      { key: "session_duration_minutes", label: "Duration (minutes)", type: "number" },
      { key: "emotional_state_end", label: "Emotional State End" },
      { key: "progress_noted", label: "Progress Noted", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
      { key: "concerns_flagged", label: "Concerns Flagged", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
      { key: "referral_made", label: "Referral Made", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
      { key: "notes_restricted", label: "Notes", type: "textarea" },
    ],
    [processSessionTypeSelectOptions, residentSelectOptions, socialWorkerFormOptions],
  );

  const visitationFields: FormField[] = useMemo(
    () => [
      { key: "resident_id", label: "Resident", type: "select", required: true, options: residentSelectOptions },
      { key: "visit_date", label: "Visit Date", type: "date", required: true },
      {
        key: "social_worker",
        label: "Social Worker",
        type: "select",
        required: true,
        options: socialWorkerFormOptions,
      },
      {
        key: "visit_type",
        label: "Visit Type",
        type: "select",
        required: true,
        options: visitTypeFormOptions,
      },
      { key: "location_visited", label: "Location Visited", required: true },
      { key: "family_members_present", label: "Family Members Present" },
      { key: "purpose", label: "Purpose", type: "textarea" },
      { key: "observations", label: "Observations", type: "textarea" },
      { key: "family_cooperation_level", label: "Family Cooperation" },
      { key: "safety_concerns_noted", label: "Safety Concerns", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
      { key: "follow_up_needed", label: "Follow-up Needed", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
      { key: "follow_up_notes", label: "Follow-up Notes", type: "textarea" },
      { key: "visit_outcome", label: "Visit Outcome" },
    ],
    [residentSelectOptions, socialWorkerFormOptions, visitTypeFormOptions],
  );

  const educationFields: FormField[] = useMemo(
    () => [
      { key: "resident_id", label: "Resident", type: "select", required: true, options: residentSelectOptions },
      { key: "record_date", label: "Record Date", type: "date", required: true },
      { key: "education_level", label: "Education Level", required: true },
      { key: "school_name", label: "School Name", required: true },
      {
        key: "enrollment_status",
        label: "Enrollment Status",
        type: "select",
        required: true,
        options: enrollmentStatusFormOptions,
      },
      { key: "attendance_rate", label: "Attendance Rate", type: "number" },
      { key: "progress_percent", label: "Progress Percent", type: "number" },
      { key: "completion_status", label: "Completion Status" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    [enrollmentStatusFormOptions, residentSelectOptions],
  );

  const healthFields: FormField[] = [
    { key: "resident_id", label: "Resident", type: "select", required: true, options: residentSelectOptions },
    { key: "record_date", label: "Record Date", type: "date", required: true },
    { key: "general_health_score", label: "General Health Score", type: "number", required: true },
    { key: "nutrition_score", label: "Nutrition Score", type: "number", required: true },
    { key: "sleep_quality_score", label: "Sleep Quality Score", type: "number", required: true },
    { key: "energy_level_score", label: "Energy Score", type: "number" },
    { key: "height_cm", label: "Height (cm)", type: "number" },
    { key: "weight_kg", label: "Weight (kg)", type: "number" },
    { key: "bmi", label: "BMI", type: "number" },
    { key: "medical_checkup_done", label: "Medical Checkup", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
    { key: "dental_checkup_done", label: "Dental Checkup", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
    { key: "psychological_checkup_done", label: "Psychological Checkup", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
    { key: "notes", label: "Notes", type: "textarea" },
  ];

  const interventionFields: FormField[] = useMemo(
    () => [
      { key: "resident_id", label: "Resident", type: "select", required: true, options: residentSelectOptions },
      {
        key: "plan_category",
        label: "Plan Category",
        type: "select",
        required: true,
        options: planCategoryFormOptions,
      },
      { key: "plan_description", label: "Plan Description", type: "textarea", required: true },
      { key: "services_provided", label: "Services Provided" },
      { key: "target_value", label: "Target Value", type: "number" },
      { key: "target_date", label: "Target Date", type: "date", required: true },
      { key: "status", label: "Status", required: true },
      { key: "case_conference_date", label: "Case Conference Date", type: "date" },
    ],
    [planCategoryFormOptions, residentSelectOptions],
  );

  const incidentFields: FormField[] = useMemo(
    () => [
      { key: "resident_id", label: "Resident", type: "select", required: true, options: residentSelectOptions },
      {
        key: "safehouse_id",
        label: "Safe House",
        type: "select",
        required: true,
        options: workspace.safehouses.map((safehouse) => ({
          value: String(safehouse.safehouse_id),
          label: safehouse.name ?? `Safe House ${safehouse.safehouse_id}`,
        })),
      },
      { key: "incident_date", label: "Incident Date", type: "date", required: true },
      {
        key: "incident_type",
        label: "Incident Type",
        type: "select",
        required: true,
        options: incidentTypeFormOptions,
      },
      {
        key: "severity",
        label: "Severity",
        type: "select",
        required: true,
        options: incidentSeverityFormOptions,
      },
      { key: "description", label: "Description", type: "textarea", required: true },
      { key: "response_taken", label: "Response Taken", type: "textarea" },
      { key: "resolved", label: "Resolved", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
      { key: "resolution_date", label: "Resolution Date", type: "date" },
      { key: "reported_by", label: "Reported By", required: true },
      { key: "follow_up_required", label: "Follow-up Required", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
    ],
    [incidentSeverityFormOptions, incidentTypeFormOptions, residentSelectOptions, workspace.safehouses],
  );

  const validateSupporterIdentity = (s: SupporterFormState): string | null => {
    const hasDisplay = s.display_name.trim().length > 0;
    const hasOrg = s.organization_name.trim().length > 0;
    const hasBothNames = s.first_name.trim().length > 0 && s.last_name.trim().length > 0;
    if (!hasDisplay && !hasOrg && !hasBothNames) {
      return "Enter a display name, organization name, or both first and last name.";
    }
    if (s.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim())) {
      return "Enter a valid email address or leave email blank.";
    }
    return null;
  };

  const validateDonationAmounts = (s: DonationFormState): string | null => {
    if (s.donation_type === "Monetary") {
      const raw = s.amount.trim();
      if (!raw || !Number.isFinite(Number(raw))) {
        return "Enter a valid amount for monetary donations.";
      }
    } else if (s.donation_type === "InKind") {
      const raw = s.estimated_value.trim();
      if (!raw || !Number.isFinite(Number(raw))) {
        return "Enter a valid estimated value for in-kind donations.";
      }
    }
    const ref = s.referral_post_id.trim();
    if (ref && !Number.isFinite(Number(ref))) {
      return "Referral post ID must be a valid number or left blank.";
    }
    return null;
  };

  const openResidentForm = (resident?: Resident) => {
    setEditingResidentId(resident?.resident_id ?? null);
    const isNewResident = resident == null;
    setResidentForm({
      case_control_no: isNewResident
        ? suggestNextCaseControlNoFromResidents(workspace.residents)
        : String(resident.case_control_no ?? ""),
      internal_code: isNewResident
        ? suggestNextLsInternalCodeFromResidents(workspace.residents)
        : String(resident.internal_code ?? ""),
      safehouse_id: resident?.safehouse_id ? String(resident.safehouse_id) : "",
      case_status: resident?.case_status ?? "Active",
      sex: resident?.sex ?? "F",
      date_of_birth: resident?.date_of_birth ?? "",
      place_of_birth: resident?.place_of_birth ?? "",
      religion: resident?.religion ?? "",
      case_category: resident?.case_category ?? "",
      date_of_admission: resident?.date_of_admission ?? "",
      assigned_social_worker: resident?.assigned_social_worker ?? "",
      current_risk_level: resident?.current_risk_level ?? "Medium",
      notes_restricted: resident?.notes_restricted ?? "",
    });
    setResidentFormOpen(true);
  };

  const openSupporterForm = (supporter?: Supporter) => {
    setEditingSupporterId(supporter?.supporter_id ?? null);
    setSupporterForm({
      supporter_type: supporter?.supporter_type ?? "MonetaryDonor",
      display_name: supporter?.display_name ?? "",
      organization_name: supporter?.organization_name ?? "",
      first_name: supporter?.first_name ?? "",
      last_name: supporter?.last_name ?? "",
      relationship_type: supporter?.relationship_type ?? "",
      region: supporter?.region ?? "",
      country: supporter?.country ?? "Philippines",
      email: supporter?.email ?? "",
      phone: supporter?.phone ?? "",
      status: supporter?.status ?? "Active",
      first_donation_date: supporter?.first_donation_date ?? "",
      acquisition_channel: supporter?.acquisition_channel ?? "",
    });
    setSupporterFormOpen(true);
  };

  const openDonationForm = (donation?: Donation) => {
    setEditingDonationId(donation?.donation_id ?? null);
    setDonationForm({
      supporter_id: donation?.supporter_id ? String(donation.supporter_id) : "",
      donation_type: donation?.donation_type ?? "Monetary",
      donation_date: donation?.donation_date ?? "",
      is_recurring: toBooleanString(donation?.is_recurring),
      campaign_name: donation?.campaign_name ?? "",
      channel_source: donation?.channel_source ?? "",
      currency_code: donation?.currency_code ?? "PHP",
      amount: donation?.amount != null ? String(donation.amount) : "",
      estimated_value: donation?.estimated_value != null ? String(donation.estimated_value) : "",
      impact_unit: donation?.impact_unit ?? "",
      notes: donation?.notes ?? "",
      referral_post_id: donation?.referral_post_id != null ? String(donation.referral_post_id) : "",
    });
    setDonationFormOpen(true);
  };

  const openInKindForm = (item?: InKindItem) => {
    setEditingInKindId(item?.item_id ?? null);
    setInKindForm({
      donation_id: item?.donation_id ? String(item.donation_id) : "",
      item_name: item?.item_name ?? "",
      item_category: item?.item_category ?? "",
      quantity: item?.quantity != null ? String(item.quantity) : "",
      unit_of_measure: item?.unit_of_measure ?? "",
      estimated_unit_value: item?.estimated_unit_value != null ? String(item.estimated_unit_value) : "",
      intended_use: item?.intended_use ?? "",
      received_condition: item?.received_condition ?? "",
    });
    setInKindFormOpen(true);
  };

  const openAllocationForm = (allocation?: DonationAllocation) => {
    setEditingAllocationId(allocation?.allocation_id ?? null);
    setAllocationForm({
      donation_id: allocation?.donation_id ? String(allocation.donation_id) : "",
      safehouse_id: allocation?.safehouse_id ? String(allocation.safehouse_id) : "",
      program_area: allocation?.program_area ?? "",
      amount_allocated: allocation?.amount_allocated != null ? String(allocation.amount_allocated) : "",
      allocation_date: allocation?.allocation_date ?? "",
      allocation_notes: allocation?.allocation_notes ?? "",
    });
    setAllocationFormOpen(true);
  };

  const openSafehouseForm = (safehouse?: Safehouse) => {
    setEditingSafehouseId(safehouse?.safehouse_id ?? null);
    setSafehouseForm({
      safehouse_code: safehouse?.safehouse_code ?? "",
      name: safehouse?.name ?? "",
      region: safehouse?.region ?? "",
      city: safehouse?.city ?? "",
      province: safehouse?.province ?? "",
      country: safehouse?.country ?? "Philippines",
      open_date: safehouse?.open_date ?? "",
      status: safehouse?.status ?? "Active",
      capacity_girls: safehouse?.capacity_girls != null ? String(safehouse.capacity_girls) : "",
      capacity_staff: safehouse?.capacity_staff != null ? String(safehouse.capacity_staff) : "",
      current_occupancy: safehouse?.current_occupancy != null ? String(safehouse.current_occupancy) : "",
      notes: safehouse?.notes ?? "",
    });
    setSafehouseFormOpen(true);
  };

  const openProcessForm = (row?: RecordRow) => {
    setEditingProcessId(row ? toNumber(row.recording_id) : null);
    const interventionsRaw = String(row?.interventions_applied ?? "").trim();
    const followUpRaw = String(row?.follow_up_actions ?? "").trim();
    const interventionsIsNone =
      !interventionsRaw || interventionsRaw.toLowerCase() === "none" || interventionsRaw.toLowerCase() === "n/a";
    const followUpIsNone =
      !followUpRaw || followUpRaw.toLowerCase() === "none" || followUpRaw.toLowerCase() === "n/a";
    setProcessForm({
      resident_id: row?.resident_id ? String(row.resident_id) : selectedResidentIds[0] ? String(selectedResidentIds[0]) : "",
      session_date: String(row?.session_date ?? ""),
      social_worker: String(row?.social_worker ?? ""),
      session_type: String(row?.session_type ?? ""),
      session_duration_minutes: row?.session_duration_minutes ? String(row.session_duration_minutes) : "",
      emotional_state_observed: String(row?.emotional_state_observed ?? ""),
      emotional_state_end: String(row?.emotional_state_end ?? ""),
      session_narrative: String(row?.session_narrative ?? ""),
      interventions_applied: interventionsIsNone ? "" : interventionsRaw,
      interventions_none: interventionsIsNone ? "true" : "false",
      follow_up_actions: followUpIsNone ? "" : followUpRaw,
      follow_up_none: followUpIsNone ? "true" : "false",
      progress_noted: toBooleanString(row?.progress_noted),
      concerns_flagged: toBooleanString(row?.concerns_flagged),
      referral_made: toBooleanString(row?.referral_made),
      notes_restricted: String(row?.notes_restricted ?? ""),
    });
    setProcessFormOpen(true);
  };

  const openVisitationForm = (row?: RecordRow) => {
    setEditingVisitationId(row ? toNumber(row.visitation_id) : null);
    setVisitationForm({
      resident_id: row?.resident_id ? String(row.resident_id) : selectedResidentIds[0] ? String(selectedResidentIds[0]) : "",
      visit_date: String(row?.visit_date ?? ""),
      social_worker: String(row?.social_worker ?? ""),
      visit_type: String(row?.visit_type ?? ""),
      location_visited: String(row?.location_visited ?? ""),
      family_members_present: String(row?.family_members_present ?? ""),
      purpose: String(row?.purpose ?? ""),
      observations: String(row?.observations ?? ""),
      family_cooperation_level: String(row?.family_cooperation_level ?? ""),
      safety_concerns_noted: toBooleanString(row?.safety_concerns_noted),
      follow_up_needed: toBooleanString(row?.follow_up_needed),
      follow_up_notes: String(row?.follow_up_notes ?? ""),
      visit_outcome: String(row?.visit_outcome ?? ""),
    });
    setVisitationFormOpen(true);
  };

  const openEducationForm = (row?: RecordRow) => {
    setEditingEducationId(row ? toNumber(row.education_record_id) : null);
    setEducationForm({
      resident_id: row?.resident_id ? String(row.resident_id) : selectedResidentIds[0] ? String(selectedResidentIds[0]) : "",
      record_date: String(row?.record_date ?? ""),
      education_level: String(row?.education_level ?? ""),
      school_name: String(row?.school_name ?? ""),
      enrollment_status: String(row?.enrollment_status ?? ""),
      attendance_rate: row?.attendance_rate ? String(row.attendance_rate) : "",
      progress_percent: row?.progress_percent ? String(row.progress_percent) : "",
      completion_status: String(row?.completion_status ?? ""),
      notes: String(row?.notes ?? ""),
    });
    setEducationFormOpen(true);
  };

  const openHealthForm = (row?: RecordRow) => {
    setEditingHealthId(row ? toNumber(row.health_record_id) : null);
    setHealthForm({
      resident_id: row?.resident_id ? String(row.resident_id) : selectedResidentIds[0] ? String(selectedResidentIds[0]) : "",
      record_date: String(row?.record_date ?? ""),
      general_health_score: row?.general_health_score ? String(row.general_health_score) : "",
      nutrition_score: row?.nutrition_score ? String(row.nutrition_score) : "",
      sleep_quality_score: row?.sleep_quality_score ? String(row.sleep_quality_score) : "",
      energy_level_score: row?.energy_level_score ? String(row.energy_level_score) : "",
      height_cm: row?.height_cm ? String(row.height_cm) : "",
      weight_kg: row?.weight_kg ? String(row.weight_kg) : "",
      bmi: row?.bmi ? String(row.bmi) : "",
      medical_checkup_done: toBooleanString(row?.medical_checkup_done),
      dental_checkup_done: toBooleanString(row?.dental_checkup_done),
      psychological_checkup_done: toBooleanString(row?.psychological_checkup_done),
      notes: String(row?.notes ?? ""),
    });
    setHealthFormOpen(true);
  };

  const openInterventionForm = (row?: RecordRow) => {
    setEditingInterventionId(row ? toNumber(row.plan_id) : null);
    setInterventionForm({
      resident_id: row?.resident_id ? String(row.resident_id) : selectedResidentIds[0] ? String(selectedResidentIds[0]) : "",
      plan_category: String(row?.plan_category ?? ""),
      plan_description: String(row?.plan_description ?? ""),
      services_provided: String(row?.services_provided ?? ""),
      target_value: row?.target_value ? String(row.target_value) : "",
      target_date: String(row?.target_date ?? ""),
      status: String(row?.status ?? ""),
      case_conference_date: String(row?.case_conference_date ?? ""),
    });
    setInterventionFormOpen(true);
  };

  const openIncidentForm = (row?: RecordRow) => {
    setEditingIncidentId(row ? toNumber(row.incident_id) : null);
    setIncidentForm({
      resident_id: row?.resident_id ? String(row.resident_id) : selectedResidentIds[0] ? String(selectedResidentIds[0]) : "",
      safehouse_id: row?.safehouse_id ? String(row.safehouse_id) : "",
      incident_date: String(row?.incident_date ?? ""),
      incident_type: String(row?.incident_type ?? ""),
      severity: String(row?.severity ?? ""),
      description: String(row?.description ?? ""),
      response_taken: String(row?.response_taken ?? ""),
      resolved: toBooleanString(row?.resolved),
      resolution_date: String(row?.resolution_date ?? ""),
      reported_by: String(row?.reported_by ?? ""),
      follow_up_required: toBooleanString(row?.follow_up_required),
    });
    setIncidentFormOpen(true);
  };

  const submitResidentForm = () => {
    const payload: Record<string, unknown> = {
      safehouse_id: toNullableNumber(residentForm.safehouse_id),
      case_status: residentForm.case_status || null,
      sex: residentForm.sex || null,
      date_of_birth: residentForm.date_of_birth || null,
      place_of_birth: residentForm.place_of_birth || null,
      religion: residentForm.religion || null,
      case_category: residentForm.case_category || null,
      date_of_admission: residentForm.date_of_admission || null,
      assigned_social_worker: residentForm.assigned_social_worker || null,
      current_risk_level: residentForm.current_risk_level || null,
      notes_restricted: residentForm.notes_restricted || null,
    };
    if (editingResidentId) {
      updateMutation.mutate({ table: "residents", id: editingResidentId, payload });
    } else {
      payload.case_control_no = null;
      payload.internal_code = null;
      createMutation.mutate({ table: "residents", payload });
    }
    setResidentFormOpen(false);
  };

  const submitSupporterForm = () => {
    const payload = Object.fromEntries(
      Object.entries(supporterForm).map(([key, value]) => [key, value.trim() ? value : null]),
    );
    if (editingSupporterId) {
      updateMutation.mutate({ table: "supporters", id: editingSupporterId, payload });
    } else {
      createMutation.mutate({ table: "supporters", payload });
    }
    setSupporterFormOpen(false);
  };

  const submitDonationForm = () => {
    const payload = {
      supporter_id: toNullableNumber(donationForm.supporter_id),
      donation_type: donationForm.donation_type || null,
      donation_date: donationForm.donation_date || null,
      is_recurring: toNullableBoolean(donationForm.is_recurring),
      campaign_name: donationForm.campaign_name || null,
      channel_source: donationForm.channel_source || null,
      currency_code: donationForm.currency_code || null,
      amount: toNullableNumber(donationForm.amount),
      estimated_value: toNullableNumber(donationForm.estimated_value),
      impact_unit: donationForm.impact_unit || null,
      notes: donationForm.notes || null,
      referral_post_id: toNullableNumber(donationForm.referral_post_id),
    };
    if (editingDonationId) {
      updateMutation.mutate({ table: "donations", id: editingDonationId, payload });
    } else {
      createMutation.mutate({ table: "donations", payload });
    }
    setDonationFormOpen(false);
  };

  const submitInKindForm = () => {
    const payload = {
      donation_id: toNullableNumber(inKindForm.donation_id),
      item_name: inKindForm.item_name || null,
      item_category: inKindForm.item_category || null,
      quantity: toNullableNumber(inKindForm.quantity),
      unit_of_measure: inKindForm.unit_of_measure || null,
      estimated_unit_value: toNullableNumber(inKindForm.estimated_unit_value),
      intended_use: inKindForm.intended_use || null,
      received_condition: inKindForm.received_condition || null,
    };
    if (editingInKindId) {
      updateMutation.mutate({ table: "in_kind_donation_items", id: editingInKindId, payload });
    } else {
      createMutation.mutate({ table: "in_kind_donation_items", payload });
    }
    setInKindFormOpen(false);
  };

  const submitAllocationForm = () => {
    const payload = {
      donation_id: toNullableNumber(allocationForm.donation_id),
      safehouse_id: toNullableNumber(allocationForm.safehouse_id),
      program_area: allocationForm.program_area || null,
      amount_allocated: toNullableNumber(allocationForm.amount_allocated),
      allocation_date: allocationForm.allocation_date || null,
      allocation_notes: allocationForm.allocation_notes || null,
    };
    if (editingAllocationId) {
      updateMutation.mutate({ table: "donation_allocations", id: editingAllocationId, payload });
    } else {
      createMutation.mutate({ table: "donation_allocations", payload });
    }
    setAllocationFormOpen(false);
  };

  const submitSafehouseForm = () => {
    const payload = {
      safehouse_code: safehouseForm.safehouse_code || null,
      name: safehouseForm.name || null,
      region: safehouseForm.region || null,
      city: safehouseForm.city || null,
      province: safehouseForm.province || null,
      country: safehouseForm.country || null,
      open_date: safehouseForm.open_date || null,
      status: safehouseForm.status || null,
      capacity_girls: toNullableNumber(safehouseForm.capacity_girls),
      capacity_staff: toNullableNumber(safehouseForm.capacity_staff),
      current_occupancy: toNullableNumber(safehouseForm.current_occupancy),
      notes: safehouseForm.notes || null,
    };
    if (editingSafehouseId) {
      updateMutation.mutate({ table: "safehouses", id: editingSafehouseId, payload });
    } else {
      createMutation.mutate({ table: "safehouses", payload });
    }
    setSafehouseFormOpen(false);
  };

  const submitProcessForm = () => {
    const payload = {
      resident_id: toNullableNumber(processForm.resident_id),
      session_date: processForm.session_date || null,
      social_worker: processForm.social_worker || null,
      session_type: processForm.session_type || null,
      session_duration_minutes: toNullableNumber(processForm.session_duration_minutes),
      emotional_state_observed: processForm.emotional_state_observed || null,
      emotional_state_end: processForm.emotional_state_end || null,
      session_narrative: processForm.session_narrative || null,
      interventions_applied:
        processForm.interventions_none === "true" ? "None" : processForm.interventions_applied.trim() || null,
      follow_up_actions:
        processForm.follow_up_none === "true" ? "None" : processForm.follow_up_actions.trim() || null,
      progress_noted: toNullableBoolean(processForm.progress_noted),
      concerns_flagged: toNullableBoolean(processForm.concerns_flagged),
      referral_made: toNullableBoolean(processForm.referral_made),
      notes_restricted: processForm.notes_restricted || null,
    };
    if (editingProcessId) updateMutation.mutate({ table: "process_recordings", id: editingProcessId, payload });
    else createMutation.mutate({ table: "process_recordings", payload });
    setProcessFormOpen(false);
  };

  const submitVisitationForm = () => {
    const payload = {
      resident_id: toNullableNumber(visitationForm.resident_id),
      visit_date: visitationForm.visit_date || null,
      social_worker: visitationForm.social_worker || null,
      visit_type: visitationForm.visit_type || null,
      location_visited: visitationForm.location_visited || null,
      family_members_present: visitationForm.family_members_present || null,
      purpose: visitationForm.purpose || null,
      observations: visitationForm.observations || null,
      family_cooperation_level: visitationForm.family_cooperation_level || null,
      safety_concerns_noted: toNullableBoolean(visitationForm.safety_concerns_noted),
      follow_up_needed: toNullableBoolean(visitationForm.follow_up_needed),
      follow_up_notes: visitationForm.follow_up_notes || null,
      visit_outcome: visitationForm.visit_outcome || null,
    };
    if (editingVisitationId) updateMutation.mutate({ table: "home_visitations", id: editingVisitationId, payload });
    else createMutation.mutate({ table: "home_visitations", payload });
    setVisitationFormOpen(false);
  };

  const submitEducationForm = () => {
    const payload = {
      resident_id: toNullableNumber(educationForm.resident_id),
      record_date: educationForm.record_date || null,
      education_level: educationForm.education_level || null,
      school_name: educationForm.school_name || null,
      enrollment_status: educationForm.enrollment_status || null,
      attendance_rate: toNullableNumber(educationForm.attendance_rate),
      progress_percent: toNullableNumber(educationForm.progress_percent),
      completion_status: educationForm.completion_status || null,
      notes: educationForm.notes || null,
    };
    if (editingEducationId) updateMutation.mutate({ table: "education_records", id: editingEducationId, payload });
    else createMutation.mutate({ table: "education_records", payload });
    setEducationFormOpen(false);
  };

  const submitHealthForm = () => {
    const payload = {
      resident_id: toNullableNumber(healthForm.resident_id),
      record_date: healthForm.record_date || null,
      general_health_score: toNullableNumber(healthForm.general_health_score),
      nutrition_score: toNullableNumber(healthForm.nutrition_score),
      sleep_quality_score: toNullableNumber(healthForm.sleep_quality_score),
      energy_level_score: toNullableNumber(healthForm.energy_level_score),
      height_cm: toNullableNumber(healthForm.height_cm),
      weight_kg: toNullableNumber(healthForm.weight_kg),
      bmi: toNullableNumber(healthForm.bmi),
      medical_checkup_done: toNullableBoolean(healthForm.medical_checkup_done),
      dental_checkup_done: toNullableBoolean(healthForm.dental_checkup_done),
      psychological_checkup_done: toNullableBoolean(healthForm.psychological_checkup_done),
      notes: healthForm.notes || null,
    };
    if (editingHealthId) updateMutation.mutate({ table: "health_wellbeing_records", id: editingHealthId, payload });
    else createMutation.mutate({ table: "health_wellbeing_records", payload });
    setHealthFormOpen(false);
  };

  const submitInterventionForm = () => {
    const payload = {
      resident_id: toNullableNumber(interventionForm.resident_id),
      plan_category: interventionForm.plan_category || null,
      plan_description: interventionForm.plan_description || null,
      services_provided: interventionForm.services_provided || null,
      target_value: toNullableNumber(interventionForm.target_value),
      target_date: interventionForm.target_date || null,
      status: interventionForm.status || null,
      case_conference_date: interventionForm.case_conference_date || null,
    };
    if (editingInterventionId) updateMutation.mutate({ table: "intervention_plans", id: editingInterventionId, payload });
    else createMutation.mutate({ table: "intervention_plans", payload });
    setInterventionFormOpen(false);
  };

  const submitIncidentForm = () => {
    const payload = {
      resident_id: toNullableNumber(incidentForm.resident_id),
      safehouse_id: toNullableNumber(incidentForm.safehouse_id),
      incident_date: incidentForm.incident_date || null,
      incident_type: incidentForm.incident_type || null,
      severity: incidentForm.severity || null,
      description: incidentForm.description || null,
      response_taken: incidentForm.response_taken || null,
      resolved: toNullableBoolean(incidentForm.resolved),
      resolution_date: incidentForm.resolution_date || null,
      reported_by: incidentForm.reported_by || null,
      follow_up_required: toNullableBoolean(incidentForm.follow_up_required),
    };
    if (editingIncidentId) updateMutation.mutate({ table: "incident_reports", id: editingIncidentId, payload });
    else createMutation.mutate({ table: "incident_reports", payload });
    setIncidentFormOpen(false);
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    table:
      | "residents"
      | "supporters"
      | "donations"
      | "in_kind_donation_items"
      | "donation_allocations"
      | "safehouses"
      | "process_recordings"
      | "home_visitations"
      | "education_records"
      | "health_wellbeing_records"
      | "intervention_plans"
      | "incident_reports";
    id: number;
    label: string;
  } | null>(null);

  const confirmDelete = (table: "residents" | "supporters" | "donations" | "in_kind_donation_items" | "donation_allocations" | "safehouses" | "process_recordings" | "home_visitations" | "education_records" | "health_wellbeing_records" | "intervention_plans" | "incident_reports", id: number, label: string) => {
    setPendingDelete({ table, id, label });
    setDeleteModalOpen(true);
  };

  const performDelete = () => {
    if (!pendingDelete) return;
    deleteMutation.mutate({ table: pendingDelete.table, id: pendingDelete.id });
    setDeleteModalOpen(false);
    setPendingDelete(null);
  };

  const goToResidentSubview = (subtab: ResidentsSubTab, residentId: number) => {
    setResidentModalOpen(false);
    setParams({
      tab: "residents",
      residentsSubTab: subtab,
      residentIds: selectedResidentIds.includes(residentId) ? selectedResidentIds.join(",") : [...selectedResidentIds, residentId].join(","),
    });
  };

  const renderResidentToolbar = () => {
    const commonFilters = (
      <>
        <FilterCheckboxGroup title="Status" options={residentStatusOptions} selected={residentStatusFilter} onChange={setResidentStatusFilter} allLabel="All statuses" />
        <FilterCheckboxGroup title="Risk" options={residentRiskOptions} selected={residentRiskFilter} onChange={setResidentRiskFilter} allLabel="All risks" />
        <FilterCheckboxGroup title="Safe House" options={residentSafehouseOptions} selected={residentSafehouseFilter} onChange={setResidentSafehouseFilter} allLabel="All safe houses" />
        {residentsSubTab === "process-records" ? (
          <>
            <FilterCheckboxGroup title="Session Type" options={processTypeOptions} selected={processTypeFilter} onChange={setProcessTypeFilter} allLabel="All session types" />
            <FilterCheckboxGroup title="Social Worker" options={processWorkerOptions} selected={processWorkerFilter} onChange={setProcessWorkerFilter} allLabel="All social workers" />
          </>
        ) : null}
        {residentsSubTab === "visitations" ? (
          <>
            <FilterCheckboxGroup title="Visit Type" options={visitationTypeOptions} selected={visitationTypeFilter} onChange={setVisitationTypeFilter} allLabel="All visit types" />
            <FilterCheckboxGroup title="Outcome" options={visitationOutcomeOptions} selected={visitationOutcomeFilter} onChange={setVisitationOutcomeFilter} allLabel="All outcomes" />
          </>
        ) : null}
        {residentsSubTab === "education" ? (
          <>
            <FilterCheckboxGroup title="Education Level" options={educationLevelOptions} selected={educationLevelFilter} onChange={setEducationLevelFilter} allLabel="All levels" />
            <FilterCheckboxGroup title="Enrollment" options={educationEnrollmentOptions} selected={educationEnrollmentFilter} onChange={setEducationEnrollmentFilter} allLabel="All enrollment statuses" />
          </>
        ) : null}
        {residentsSubTab === "health" ? (
          <FilterCheckboxGroup title="Checkups" options={["Medical", "Dental", "Psychological"]} selected={healthCheckupFilter} onChange={setHealthCheckupFilter} allLabel="All checkup types" />
        ) : null}
        {residentsSubTab === "interventions" ? (
          <>
            <FilterCheckboxGroup title="Category" options={interventionCategoryOptions} selected={interventionCategoryFilter} onChange={setInterventionCategoryFilter} allLabel="All categories" />
            <FilterCheckboxGroup title="Status" options={interventionStatusOptions} selected={interventionStatusFilter} onChange={setInterventionStatusFilter} allLabel="All statuses" />
          </>
        ) : null}
        {residentsSubTab === "incidents" ? (
          <>
            <FilterCheckboxGroup title="Incident Type" options={incidentTypeOptions} selected={incidentTypeFilter} onChange={setIncidentTypeFilter} allLabel="All incident types" />
            <FilterCheckboxGroup title="Severity" options={incidentSeverityOptions} selected={incidentSeverityFilter} onChange={setIncidentSeverityFilter} allLabel="All severities" />
          </>
        ) : null}
      </>
    );

    return (
      <Toolbar
        defaultOpen={false}
        searchValue={residentSearch}
        onSearchChange={setResidentSearch}
        searchPlaceholder="Search residents, status, case category, social worker, or safe house"
        filters={commonFilters}
        onClearFilters={() => {
          setResidentSearch("");
          setResidentStatusFilter(residentStatusOptions);
          setResidentRiskFilter(residentRiskOptions);
          setResidentSafehouseFilter([]);
          setProcessTypeFilter([]);
          setProcessWorkerFilter([]);
          setVisitationTypeFilter([]);
          setVisitationOutcomeFilter([]);
          setEducationLevelFilter([]);
          setEducationEnrollmentFilter([]);
          setHealthCheckupFilter([]);
          setInterventionCategoryFilter([]);
          setInterventionStatusFilter([]);
          setIncidentTypeFilter([]);
          setIncidentSeverityFilter([]);
          setResidentSelection([]);
        }}
        bottomContent={
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Filtered by:
              </div>
              {selectedResidents.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedResidents.map((resident) => (
                    <button
                      key={resident.resident_id}
                      type="button"
                      onClick={() => toggleResidentSelection(resident.resident_id)}
                      className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                      aria-label={`Remove ${residentLabel(resident)} from resident filter`}
                    >
                      {residentLabel(resident)}
                      <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No resident filters applied. Select residents from the table to narrow all resident-linked records.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge value={selectedResidents.length ? "Filter active" : "Viewing all residents"} tone={selectedResidents.length ? "default" : "outline"} />
              <Button variant="outline" className="rounded-xl" onClick={() => setResidentSelection([])} disabled={!selectedResidents.length}>
                Clear resident filters
              </Button>
            </div>
          </div>
        }
        sortValue={residentSort}
        sortOptions={[
          { value: "recent", label: "Most recent first" },
          { value: "risk", label: "Highest risk first" },
          { value: "latest-visit", label: "Latest visitation first" },
        ]}
        onSortChange={setResidentSort}
        actionItems={[
          {
            label: "Export current view as CSV",
            onClick: () => {
              if (residentsSubTab === "all-residents") exportRows("Residents", filteredResidentsTable.map((resident) => ({
                name: residentLabel(resident),
                age: resident.present_age,
                case_status: resident.case_status,
                safe_house: safehouseMap.get(resident.safehouse_id ?? -1)?.name ?? "",
                latest_visitation: latestVisitationByResident.get(resident.resident_id)?.visit_date ?? "",
                risk_status: resident.current_risk_level,
                date_added: resident.created_at,
              })));
              else if (residentsSubTab === "process-records") exportRows("Process Records", residentProcessSplit.currentAndPast);
              else if (residentsSubTab === "visitations") exportRows("Visitations", residentVisitationSplit.currentAndPast);
              else if (residentsSubTab === "education") exportRows("Education", residentEducationSplit.currentAndPast);
              else if (residentsSubTab === "health") exportRows("Health", residentHealthSplit.currentAndPast);
              else if (residentsSubTab === "interventions") exportRows("Interventions", residentInterventionSplit.currentAndPast);
              else exportRows("Incidents", residentIncidentSplit.currentAndPast);
            },
          },
        ]}
      />
    );
  };

  const renderDonationsToolbar = () => {
    const supporterFilters = (
      <>
        <FilterCheckboxGroup
          title="Supporter type"
          options={donationTypeOptions}
          selected={donationTypeFilter}
          onChange={setDonationTypeFilter}
          allLabel="All supporter types"
        />
        <FilterCheckboxGroup
          title="Relationship"
          options={donationRelationshipOptions}
          selected={donationRelationshipFilter}
          onChange={setDonationRelationshipFilter}
          allLabel="All relationships"
        />
        <FilterCheckboxGroup
          title="Status"
          options={donationStatusOptions}
          selected={donationStatusFilter}
          onChange={setDonationStatusFilter}
          allLabel="All statuses"
        />
        <FilterCheckboxGroup
          title="Region"
          options={donationRegionOptions}
          selected={donationRegionFilter}
          onChange={setDonationRegionFilter}
          allLabel="All regions"
        />
        <FilterCheckboxGroup
          title="Country"
          options={donationCountryOptions}
          selected={donationCountryFilter}
          onChange={setDonationCountryFilter}
          allLabel="All countries"
        />
      </>
    );

    const donationRowFilters = (
      <>
        <FilterCheckboxGroup
          title="Gift type"
          options={donationGiftTypeOptions}
          selected={donationGiftTypeFilter}
          onChange={setDonationGiftTypeFilter}
          allLabel="All gift types"
        />
        <FilterCheckboxGroup
          title="Recurring"
          options={["true", "false"]}
          selected={donationGiftRecurringFilter}
          onChange={setDonationGiftRecurringFilter}
          allLabel="All"
          getOptionLabel={(v) => (v === "true" ? "Yes" : "No")}
        />
        <FilterCheckboxGroup
          title="Campaign"
          options={donationGiftCampaignOptions}
          selected={donationGiftCampaignFilter}
          onChange={setDonationGiftCampaignFilter}
          allLabel="All campaigns"
        />
        <FilterCheckboxGroup
          title="Channel"
          options={donationGiftChannelOptions}
          selected={donationGiftChannelFilter}
          onChange={setDonationGiftChannelFilter}
          allLabel="All channels"
        />
        <FilterCheckboxGroup
          title="Currency"
          options={donationGiftCurrencyOptions}
          selected={donationGiftCurrencyFilter}
          onChange={setDonationGiftCurrencyFilter}
          allLabel="All currencies"
        />
      </>
    );

    const inKindRowFilters = (
      <>
        <FilterCheckboxGroup
          title="Category"
          options={inKindCategoryOptions}
          selected={inKindCategoryFilter}
          onChange={setInKindCategoryFilter}
          allLabel="All categories"
        />
        <FilterCheckboxGroup
          title="Condition"
          options={inKindConditionOptions}
          selected={inKindConditionFilter}
          onChange={setInKindConditionFilter}
          allLabel="All conditions"
        />
        <FilterCheckboxGroup
          title="Unit"
          options={inKindUnitOptions}
          selected={inKindUnitFilter}
          onChange={setInKindUnitFilter}
          allLabel="All units"
        />
      </>
    );

    const allocationRowFilters = (
      <>
        <FilterCheckboxGroup
          title="Program area"
          options={allocationProgramOptions}
          selected={allocationProgramFilter}
          onChange={setAllocationProgramFilter}
          allLabel="All program areas"
        />
        <FilterCheckboxGroup
          title="Safe house"
          options={allocationSafehouseIdOptions}
          selected={allocationSafehouseFilter}
          onChange={setAllocationSafehouseFilter}
          allLabel="All safe houses"
          getOptionLabel={(id) => safehouseMap.get(Number(id))?.name ?? `House #${id}`}
        />
      </>
    );

    const searchPlaceholder =
      donationsSubTab === "supporters"
        ? "Search supporter name, type, region, status, or channel"
        : donationsSubTab === "donations"
          ? "Search supporter, campaign, channel, currency, or donation id"
          : donationsSubTab === "in-kind"
            ? "Search item name, category, donation id, or intended use"
            : "Search program area, safe house, donation id, or notes";

    const filtersForTab =
      donationsSubTab === "supporters"
        ? supporterFilters
        : donationsSubTab === "donations"
          ? donationRowFilters
          : donationsSubTab === "in-kind"
            ? inKindRowFilters
            : allocationRowFilters;

    const clearFiltersForTab = () => {
      setDonationSearch("");
      if (donationsSubTab === "supporters") {
        setDonationTypeFilter([]);
        setDonationRelationshipFilter([]);
        setDonationStatusFilter([]);
        setDonationRegionFilter([]);
        setDonationCountryFilter([]);
      } else if (donationsSubTab === "donations") {
        setDonationGiftTypeFilter([]);
        setDonationGiftRecurringFilter([]);
        setDonationGiftCampaignFilter([]);
        setDonationGiftChannelFilter([]);
        setDonationGiftCurrencyFilter([]);
      } else if (donationsSubTab === "in-kind") {
        setInKindCategoryFilter([]);
        setInKindConditionFilter([]);
        setInKindUnitFilter([]);
      } else {
        setAllocationProgramFilter([]);
        setAllocationSafehouseFilter([]);
      }
      setParams({ supporterId: null });
    };

    const sortValue =
      donationsSubTab === "in-kind" ? inKindSort : donationsSubTab === "allocations" ? allocationSort : donationSort;
    const sortOptions =
      donationsSubTab === "supporters"
        ? [
            { value: "recent", label: "Newest supporters first" },
            { value: "name", label: "Name (A–Z)" },
          ]
        : donationsSubTab === "donations"
          ? [
              { value: "recent", label: "Most recent gift date" },
              { value: "amount", label: "Highest value first" },
              { value: "name", label: "Supporter name (A–Z)" },
            ]
          : donationsSubTab === "in-kind"
            ? [
                { value: "recent", label: "Newest items first" },
                { value: "name", label: "Item name (A–Z)" },
                { value: "donation", label: "Donation id (low to high)" },
              ]
            : [
                { value: "recent", label: "Most recent allocation date" },
                { value: "amount", label: "Largest amount first" },
              ];
    const onSortChange = (value: string) => {
      if (donationsSubTab === "in-kind") setInKindSort(value);
      else if (donationsSubTab === "allocations") setAllocationSort(value);
      else setDonationSort(value);
    };

    return (
      <Toolbar
        defaultOpen={false}
        searchValue={donationSearch}
        onSearchChange={setDonationSearch}
        searchPlaceholder={searchPlaceholder}
        filters={filtersForTab}
        onClearFilters={clearFiltersForTab}
        bottomContent={
          donationsSubTab === "supporters" ? null : (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <HandCoins className="h-4 w-4 text-primary" />
                  Active supporter:
                </div>
                {selectedSupporterId ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setParams({ supporterId: null })}
                      className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                    >
                      {supporterLabel(supporterMap.get(selectedSupporterId) ?? ({} as Supporter))}
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No supporter filter applied. Click a supporter row to narrow this table to one donor.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge value={selectedSupporterId ? "Filter active" : "All supporters"} tone={selectedSupporterId ? "default" : "outline"} />
                <Button variant="outline" className="rounded-xl" onClick={() => setParams({ supporterId: null })} disabled={!selectedSupporterId}>
                  Clear supporter filter
                </Button>
              </div>
            </div>
          )
        }
        sortValue={sortValue}
        sortOptions={sortOptions}
        onSortChange={onSortChange}
        actionItems={[
          {
            label: "Export current view as CSV",
            onClick: () => {
              if (donationsSubTab === "supporters") exportRows("Supporters", filteredSupporters as unknown as Array<Record<string, unknown>>);
              else if (donationsSubTab === "donations") exportRows("Donations", filteredDonations as unknown as Array<Record<string, unknown>>);
              else if (donationsSubTab === "in-kind") exportRows("In Kind", filteredInKind as unknown as Array<Record<string, unknown>>);
              else exportRows("Allocations", filteredAllocations as unknown as Array<Record<string, unknown>>);
            },
          },
        ]}
      />
    );
  };

  const renderSafehousesToolbar = () => (
    <Toolbar
      defaultOpen={false}
      searchValue={safehouseSearch}
      onSearchChange={setSafehouseSearch}
      searchPlaceholder="Search safe houses, regions, status, or city"
      filters={
        <>
          {safeHousesSubTab === "monthly-metrics" ? (
            <fieldset className="rounded-2xl border border-border/70 bg-background p-4">
              <legend className="mb-3 w-full text-left text-sm font-semibold uppercase tracking-[0.14em] text-foreground/80">
                Metric period
              </legend>
              <div className="space-y-3 text-sm font-medium text-foreground">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="monthly-metrics-period"
                    checked={monthlyMetricsPeriodFilter === "occurred"}
                    onChange={() => setMonthlyMetricsPeriodFilter("occurred")}
                    className="h-4 w-4 border-border text-primary"
                  />
                  Occurred
                </label>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="monthly-metrics-period"
                    checked={monthlyMetricsPeriodFilter === "future"}
                    onChange={() => setMonthlyMetricsPeriodFilter("future")}
                    className="h-4 w-4 border-border text-primary"
                  />
                  Future
                </label>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="monthly-metrics-period"
                    checked={monthlyMetricsPeriodFilter === "all"}
                    onChange={() => setMonthlyMetricsPeriodFilter("all")}
                    className="h-4 w-4 border-border text-primary"
                  />
                  All
                </label>
              </div>
            </fieldset>
          ) : null}
          <FilterCheckboxGroup title="Status" options={safehouseStatusOptions} selected={safehouseStatusFilter} onChange={setSafehouseStatusFilter} allLabel="All statuses" />
          <FilterCheckboxGroup title="Region" options={safehouseRegionOptions} selected={safehouseRegionFilter} onChange={setSafehouseRegionFilter} allLabel="All regions" />
        </>
      }
      onClearFilters={() => {
        setSafehouseSearch("");
        setSafehouseStatusFilter([]);
        setSafehouseRegionFilter([]);
        setMonthlyMetricsPeriodFilter("occurred");
        setParams({ safehouseId: null });
      }}
      bottomContent={
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Building2 className="h-4 w-4 text-primary" />
              Active safe house:
            </div>
            {selectedSafehouseId ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setParams({ safehouseId: null })}
                  aria-label={`Clear safe house filter: ${safehouseMap.get(selectedSafehouseId)?.name ?? `Safe House ${selectedSafehouseId}`}`}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                >
                  {safehouseMap.get(selectedSafehouseId)?.name ?? `Safe House ${selectedSafehouseId}`}
                  <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No safe house filter applied. Click a safe house row to narrow allocation history and monthly metrics to that location.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge value={selectedSafehouseId ? "Filter active" : "All safe houses"} tone={selectedSafehouseId ? "default" : "outline"} />
            <Button variant="outline" className="rounded-xl" onClick={() => setParams({ safehouseId: null })} disabled={!selectedSafehouseId}>
              Clear safe house filter
            </Button>
          </div>
        </div>
      }
      sortValue={safehouseSort}
      sortOptions={[
        { value: "occupancy", label: "Highest occupancy first" },
        { value: "name", label: "Name" },
        { value: "recent", label: "Most recently opened" },
      ]}
      onSortChange={setSafehouseSort}
      actionItems={[
        {
          label: "Export current view as CSV",
          onClick: () => {
            if (safeHousesSubTab === "safe-houses") {
              exportRows("Safe Houses", filteredSafehouses as unknown as Array<Record<string, unknown>>);
            } else if (safeHousesSubTab === "allocation-history") {
              exportRows("Allocation History", safehouseAllocations as unknown as Array<Record<string, unknown>>);
            } else {
              exportRows("Monthly Metrics", safehouseMetrics as unknown as Array<Record<string, unknown>>);
            }
          },
        },
      ]}
    />
  );

  const renderInsightRow = (chartKey: string) => {
    const config = chartConfigs[chartKey];
    if (!config) return null;
    return <InsightRow config={config} onChartClick={() => setExpandedChartKey(chartKey)} />;
  };

  const residentInsightKey =
    residentsSubTab === "all-residents"
      ? "residents-all"
      : residentsSubTab === "process-records"
        ? "residents-process"
        : residentsSubTab === "visitations"
          ? "residents-visitations"
          : residentsSubTab === "education"
            ? "residents-education"
            : residentsSubTab === "health"
              ? "residents-health"
              : residentsSubTab === "interventions"
                ? "residents-interventions"
                : "residents-incidents";

  const donationsInsightKey =
    donationsSubTab === "supporters"
      ? "donations-supporters"
      : donationsSubTab === "donations"
        ? "donations-donations"
        : donationsSubTab === "in-kind"
          ? "donations-in-kind"
          : "donations-allocations";

  const safehousesInsightKey =
    safeHousesSubTab === "allocation-history"
      ? "safehouses-allocations"
      : safeHousesSubTab === "monthly-metrics"
        ? "safehouses-metrics"
        : "safehouses-overview";

  const expandedChart = expandedChartKey ? chartConfigs[expandedChartKey] ?? null : null;

  return (
    <div className="space-y-6">
      <Dialog
        open={deleteModalOpen}
        onOpenChange={(open) => {
          setDeleteModalOpen(open);
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-left">Confirm deletion</DialogTitle>
                <DialogDescription className="text-left">
                  {pendingDelete
                    ? `Delete ${pendingDelete.label}? This cannot be undone.`
                    : "This action cannot be undone."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setDeleteModalOpen(false);
                setPendingDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={performDelete}
              disabled={!pendingDelete || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {workspaceQuery.isError ? (
        <Card className="rounded-2xl border-destructive/30 bg-destructive/5 shadow-warm">
          <CardContent className="flex items-center gap-3 p-5 text-sm text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {workspaceQuery.error instanceof Error ? workspaceQuery.error.message : "The admin workspace could not load."}
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={currentTab} onValueChange={(value) => setTab(value as MainTab)} className="space-y-6">
        <TabsContent value="dashboard" className="space-y-10">
          {workspaceQuery.isPending ? (
            <p className="text-sm" style={{ color: BELLA.stone }}>Loading workspace data…</p>
          ) : null}

          {!workspaceQuery.isPending ? (
            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr] xl:items-stretch">
              <div className="space-y-4">
                {/* OKR / success metrics */}
                <section aria-label="Success metrics" className="space-y-3">
                  <h2
                    className="font-heading text-sm font-semibold uppercase tracking-wider"
                    style={{ color: BELLA.stone }}
                  >
                    Success metrics
                  </h2>
                  <div className="grid gap-6 md:grid-cols-2">
                    <SuccessMetricTile
                      label="Risk Reduction Rate"
                      value={successMetrics.riskReductionRatePct != null ? `${successMetrics.riskReductionRatePct}%` : "—"}
                      subtext="Residents safer than at intake"
                      tooltip="Percentage of residents who are safer now than when they entered the program."
                      accentHex={BELLA.lavender}
                      borderHex={BELLA.lavender}
                      icon={Shield}
                    />
                    <SuccessMetricTile
                      label="Reintegration Progress"
                      value={successMetrics.reintegrationProgressPct != null ? `${successMetrics.reintegrationProgressPct}%` : "—"}
                      subtext="On-track toward permanent outcomes"
                      tooltip="Percentage of active residents who are actively progressing toward a permanent, stable outcome."
                      accentHex={BELLA.water}
                      borderHex={BELLA.water}
                      icon={CheckCircle2}
                    />
                  </div>
                </section>

                {/* Primary status row — solid approved colors only */}
                <section aria-label="At a glance" className="space-y-3">
                  <h2
                    className="font-heading text-sm font-semibold uppercase tracking-wider"
                    style={{ color: BELLA.stone }}
                  >
                    At a glance
                  </h2>
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    <PrimaryStatusTile
                      label="Active residents"
                      value={String(founderDashboardStats.activeResidents)}
                      icon={Heart}
                      to="/admin?tab=residents"
                      backgroundHex={BELLA.lavender}
                    />
                    <PrimaryStatusTile
                      label="Active safe houses"
                      value={String(founderDashboardStats.activeSafehouses)}
                      icon={Home}
                      to="/admin?tab=safe-houses"
                      backgroundHex={BELLA.water}
                    />
                    <PrimaryStatusTile
                      label="Unresolved incidents"
                      value={String(founderDashboardStats.unresolvedIncidents)}
                      icon={ShieldAlert}
                      to="/admin?tab=residents&residentsSubTab=incidents"
                      backgroundHex={BELLA.terracotta}
                    />
                    <PrimaryStatusTile
                      label="Unallocated balance"
                      value={formatCurrency(founderDashboardStats.unallocatedBalance)}
                      icon={Wallet}
                      to="/admin?tab=donations&donationsSubTab=allocations"
                      backgroundHex={BELLA.green}
                    />
                  </div>
                </section>

                {/* Secondary */}
                <section aria-labelledby="founder-attention-heading" className="space-y-3">
                  <h2
                    id="founder-attention-heading"
                    className="font-heading text-sm font-semibold uppercase tracking-wider"
                    style={{ color: BELLA.stone }}
                  >
                    Follow-ups
                  </h2>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <SecondaryStatTile
                      label="Bed utilization"
                      value={founderDashboardStats.bedUtilPercent != null ? `${founderDashboardStats.bedUtilPercent}%` : "—"}
                      sub={founderDashboardStats.bedSub}
                      accentHex={BELLA.water}
                      icon={Bed}
                      to="/admin?tab=safe-houses"
                    />
                    <SecondaryStatTile
                      label="Overdue actions"
                      value={String(founderDashboardStats.overdueActions)}
                      sub="Action needed"
                      accentHex={BELLA.terracotta}
                      icon={AlertTriangle}
                      to="/admin?tab=residents&residentsSubTab=interventions"
                    />
                    <SecondaryStatTile
                      label="Upcoming Conferences"
                      value={String(founderDashboardStats.upcomingDeadlines14)}
                      sub="Next 14 days"
                      accentHex={BELLA.terracotta}
                      icon={CalendarDays}
                      to="/admin?tab=residents&residentsSubTab=visitations"
                    />
                    <SecondaryStatTile
                      label="Cases to review"
                      value={String(founderDashboardStats.casesRequiringReview)}
                      sub="Decision required"
                      accentHex={BELLA.terracotta}
                      icon={ClipboardCheck}
                      to="/admin?tab=residents&residentsSubTab=interventions"
                    />
                  </div>
                </section>

                {/* Funding + Outreach (parallel) */}
                <section aria-label="Funding and outreach" className="space-y-3">
                  <div className="grid gap-6 sm:grid-cols-2 sm:items-stretch">
                    <div className="space-y-1">
                      <h2
                        className="font-heading text-sm font-semibold uppercase tracking-wider"
                        style={{ color: BELLA.stone }}
                      >
                        Funding
                      </h2>
                      <SecondaryStatTile
                        label="Recent giving · 30 days"
                        value={formatCurrency(founderDashboardStats.recentGiving30)}
                        sub="Last 30 days"
                        accentHex={BELLA.green}
                        icon={HandCoins}
                        to="/admin?tab=donations"
                        valueSpacing="tight"
                      />
                    </div>
                    <div className="space-y-1">
                      <h2
                        className="font-heading text-sm font-semibold uppercase tracking-wider"
                        style={{ color: BELLA.stone }}
                      >
                        Outreach
                      </h2>
                      <SecondaryStatTile
                        label="Outreach conversion"
                        value={outreachConversionRatePct != null ? `${outreachConversionRatePct}%` : "—"}
                        sub="Posts that drive donations"
                        accentHex={BELLA.terracotta}
                        icon={Megaphone}
                        to="/admin?tab=outreach"
                        valueSpacing="tight"
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* Right column — recent donations list */}
              <div className="flex min-h-0 h-full flex-col gap-4">
                {/* Spacer header so Recent Donations aligns with OKR cards (not under the header) */}
                <h2
                  className="font-heading text-sm font-semibold uppercase tracking-wider opacity-0 select-none"
                  style={{ color: BELLA.stone }}
                  aria-hidden
                >
                  Success metrics
                </h2>
                <aside className="flex min-h-0 flex-1 rounded-2xl shadow-sm" style={{ backgroundColor: BELLA.sand }}>
                  <div className="flex min-h-0 h-full flex-col p-6">
                    <div className="flex items-center gap-3">
                      <HandCoins className="h-5 w-5 shrink-0" strokeWidth={1.5} style={{ color: BELLA.green }} aria-hidden />
                      <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: BELLA.green }}>
                        Recent donations
                      </h2>
                    </div>
                    <div className="mt-5 flex w-full min-w-0 flex-1 flex-col gap-3">
                      {dashboardRecentDonations.map((donation) => {
                        const supporter =
                          donation.supporter_id
                            ? supporterLabel(supporterMap.get(donation.supporter_id) ?? ({} as Supporter))
                            : donation.supporter_name ?? "Anonymous";
                        const amount = formatCurrency(donation.amount ?? donation.estimated_value, donation.currency_code ?? "PHP");
                        return (
                          <div
                            key={String(donation.donation_id)}
                            className="flex w-full min-w-0 items-start justify-between gap-4 rounded-xl px-3 py-2"
                            style={{ backgroundColor: BELLA.cream }}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium" style={{ color: BELLA.deepBay }}>
                                {supporter}
                              </p>
                              <p className="text-xs" style={{ color: BELLA.stone }}>
                                {asDisplayDate((donation.created_at ?? donation.donation_date) as unknown)}
                              </p>
                            </div>
                            <p className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: BELLA.deepBay }}>
                              {amount}
                            </p>
                          </div>
                        );
                      })}
                      {!dashboardRecentDonations.length ? (
                        <p className="text-sm" style={{ color: BELLA.stone }}>
                          No donations yet.
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-5">
                      <Link
                        to="/admin?tab=donations"
                        className="text-sm font-medium underline-offset-4 hover:underline"
                        style={{ color: BELLA.deepBay }}
                      >
                        View donations →
                      </Link>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="residents" className="space-y-6">
          <Tabs value={residentsSubTab} onValueChange={(value) => setParams({ residentsSubTab: value })} className="space-y-6">
            {renderInsightRow(residentInsightKey)}
            <TabsList
              aria-label="Resident record views"
              className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-2xl border border-border/70 bg-card p-2 shadow-warm"
            >
              {RESIDENT_SUBTABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-xl px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all-residents" className="space-y-6">
              <SectionCard
                title="Residents"
                description="Row click opens the resident detail modal and applies the resident to the global cross-tab filter."
                action={<TableAddButton label="Add resident" onClick={() => openResidentForm()} />}
              >
                {renderResidentToolbar()}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Select</TableHead>
                      <SortableTableHead
                        tableId="residents"
                        columnKey="name"
                        activeSort={tableColumnSort.residents}
                        onToggle={toggleTableColumnSort}
                      >
                        Name
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="residents"
                        columnKey="age"
                        activeSort={tableColumnSort.residents}
                        onToggle={toggleTableColumnSort}
                      >
                        Age
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="residents"
                        columnKey="case_status"
                        activeSort={tableColumnSort.residents}
                        onToggle={toggleTableColumnSort}
                      >
                        Case Status
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="residents"
                        columnKey="safe_house"
                        activeSort={tableColumnSort.residents}
                        onToggle={toggleTableColumnSort}
                      >
                        Safe House
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="residents"
                        columnKey="latest_visitation"
                        activeSort={tableColumnSort.residents}
                        onToggle={toggleTableColumnSort}
                      >
                        Latest Visitation
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="residents"
                        columnKey="risk"
                        activeSort={tableColumnSort.residents}
                        onToggle={toggleTableColumnSort}
                      >
                        Risk Status
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="residents"
                        columnKey="date_added"
                        activeSort={tableColumnSort.residents}
                        onToggle={toggleTableColumnSort}
                      >
                        Date Added
                      </SortableTableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {residentsTablePage.visibleRows.map((resident) => (
                      <TableRow
                        key={resident.resident_id}
                        className="cursor-pointer"
                        onClick={() => openResidentDetail(resident.resident_id)}
                      >
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedResidentIdSet.has(resident.resident_id)}
                            onChange={() => toggleResidentSelection(resident.resident_id)}
                            className="h-4 w-4 rounded border-border text-primary"
                            aria-label={`Select ${residentLabel(resident)} for cross-tab filters`}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{residentLabel(resident)}</TableCell>
                        <TableCell>{asText(resident.present_age, "Unknown")}</TableCell>
                        <TableCell>
                          <StatusBadge value={asText(resident.case_status, "Unknown")} tone="outline" />
                        </TableCell>
                        <TableCell>{safehouseMap.get(resident.safehouse_id ?? -1)?.name ?? "Unassigned"}</TableCell>
                        <TableCell>{asDisplayDate(latestVisitationByResident.get(resident.resident_id)?.visit_date)}</TableCell>
                        <TableCell>
                          <StatusBadge
                            value={asText(resident.current_risk_level, "Unknown")}
                            tone={(resident.current_risk_level ?? "").toLowerCase().startsWith("high") ? "destructive" : "secondary"}
                          />
                        </TableCell>
                        <TableCell>{asDisplayDate(resident.created_at)}</TableCell>
                        <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                              onClick={() => openResidentForm(resident)}
                              aria-label={`Edit ${residentLabel(resident)}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:text-destructive"
                              onClick={() => confirmDelete("residents", resident.resident_id, residentLabel(resident))}
                              aria-label={`Delete ${residentLabel(resident)}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!filteredResidentsTable.length ? (
                      <TableRow>
                        <TableCell colSpan={9}>
                          <EmptyState title="No residents matched this view" description="Adjust the search, risk, or case status filters to see more records." />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
                <TablePagination
                  page={residentsTablePage.safePage}
                  totalPages={residentsTablePage.totalPages}
                  totalRows={filteredResidentsTable.length}
                  start={residentsTablePage.start}
                  end={residentsTablePage.end}
                  perPage={getPageSize("residents")}
                  onPerPageChange={(size) => setPageSize("residents", size)}
                  onPageChange={(page) => setPage("residents", page)}
                />
              </SectionCard>
            </TabsContent>

            <TabsContent value="process-records">
              <SectionCard
                title="Process records"
                description={selectedResidents.length ? "Process records are filtered to the selected resident set." : "Showing current and past process records. Future-dated sessions are separated below."}
                action={<TableAddButton label="Add process record" onClick={() => openProcessForm()} />}
              >
                {renderResidentToolbar()}
                {residentProcessSplit.upcoming.length ? (
                  <div className="mb-4">
                    <CollapsibleSubsection title={`Upcoming process sessions (${residentProcessSplit.upcoming.length})`}>
                      <div className="space-y-3">
                        {residentProcessSplit.upcoming.map((row) => (
                          <div key={String(row.recording_id)} className="rounded-2xl border border-border/70 bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-foreground">{residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))}</p>
                              <StatusBadge value={asDisplayDate(row.session_date)} tone="outline" />
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{asText(row.session_type)} • {asText(row.social_worker)}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSubsection>
                  </div>
                ) : null}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        tableId="process-records"
                        columnKey="resident"
                        activeSort={tableColumnSort["process-records"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Resident
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="process-records"
                        columnKey="session_date"
                        activeSort={tableColumnSort["process-records"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Session Date
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="process-records"
                        columnKey="social_worker"
                        activeSort={tableColumnSort["process-records"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Social Worker
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="process-records"
                        columnKey="session_type"
                        activeSort={tableColumnSort["process-records"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Session Type
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="process-records"
                        columnKey="concerns_flagged"
                        activeSort={tableColumnSort["process-records"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Concerns Flagged
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="process-records"
                        columnKey="follow_up"
                        activeSort={tableColumnSort["process-records"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Follow-up
                      </SortableTableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processTablePage.visibleRows.map((row) => (
                      <TableRow key={String(row.recording_id)}>
                        <TableCell>{residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))}</TableCell>
                        <TableCell>{asDisplayDate(row.session_date)}</TableCell>
                        <TableCell>{asText(row.social_worker)}</TableCell>
                        <TableCell>{asText(row.session_type)}</TableCell>
                        <TableCell>{String(row.concerns_flagged).toLowerCase() === "true" ? "Yes" : "No"}</TableCell>
                        <TableCell>{asText(row.follow_up_actions)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                              onClick={() => openProcessForm(row)}
                              aria-label={`Edit process record for ${residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:text-destructive"
                              onClick={() => confirmDelete("process_recordings", toNumber(row.recording_id), `process record #${row.recording_id}`)}
                              aria-label={`Delete process record #${row.recording_id}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  page={processTablePage.safePage}
                  totalPages={processTablePage.totalPages}
                  totalRows={residentProcessSplit.currentAndPast.length}
                  start={processTablePage.start}
                  end={processTablePage.end}
                  perPage={getPageSize("process-records")}
                  onPerPageChange={(size) => setPageSize("process-records", size)}
                  onPageChange={(page) => setPage("process-records", page)}
                />
              </SectionCard>
            </TabsContent>

            <TabsContent value="visitations">
              <SectionCard
                title="Visitations & conferences"
                description={selectedResidents.length ? "Visitations are filtered to the selected resident set." : "All visitations are sorted upcoming first and then newest completed visits."}
                action={<TableAddButton label="Add visitation" onClick={() => openVisitationForm()} />}
              >
                {renderResidentToolbar()}
                {residentUpcomingEvents.length ? (
                  <div className="mb-4">
                    <CollapsibleSubsection title={`Upcoming events & conferences (${residentUpcomingEvents.length})`}>
                      <div className="space-y-3">
                        {residentUpcomingEvents.map((event) => (
                          <div key={event.id} className="rounded-2xl border border-border/70 bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-foreground">{event.label}</p>
                              <StatusBadge value={asDisplayDate(event.date)} tone="outline" />
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSubsection>
                  </div>
                ) : null}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        tableId="visitations"
                        columnKey="resident"
                        activeSort={tableColumnSort.visitations}
                        onToggle={toggleTableColumnSort}
                      >
                        Resident
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="visitations"
                        columnKey="visit_date"
                        activeSort={tableColumnSort.visitations}
                        onToggle={toggleTableColumnSort}
                      >
                        Visit Date
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="visitations"
                        columnKey="visit_type"
                        activeSort={tableColumnSort.visitations}
                        onToggle={toggleTableColumnSort}
                      >
                        Type
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="visitations"
                        columnKey="location"
                        activeSort={tableColumnSort.visitations}
                        onToggle={toggleTableColumnSort}
                      >
                        Location
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="visitations"
                        columnKey="social_worker"
                        activeSort={tableColumnSort.visitations}
                        onToggle={toggleTableColumnSort}
                      >
                        Social Worker
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="visitations"
                        columnKey="outcome"
                        activeSort={tableColumnSort.visitations}
                        onToggle={toggleTableColumnSort}
                      >
                        Outcome
                      </SortableTableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visitationsTablePage.visibleRows.map((row) => (
                      <TableRow key={String(row.visitation_id)}>
                        <TableCell>{residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))}</TableCell>
                        <TableCell>{asDisplayDate(row.visit_date)}</TableCell>
                        <TableCell>{asText(row.visit_type)}</TableCell>
                        <TableCell>{asText(row.location_visited)}</TableCell>
                        <TableCell>{asText(row.social_worker)}</TableCell>
                        <TableCell>{asText(row.visit_outcome)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                              onClick={() => openVisitationForm(row)}
                              aria-label={`Edit visitation for ${residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:text-destructive"
                              onClick={() => confirmDelete("home_visitations", toNumber(row.visitation_id), `visitation #${row.visitation_id}`)}
                              aria-label={`Delete visitation #${row.visitation_id}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  page={visitationsTablePage.safePage}
                  totalPages={visitationsTablePage.totalPages}
                  totalRows={residentVisitationSplit.currentAndPast.length}
                  start={visitationsTablePage.start}
                  end={visitationsTablePage.end}
                  perPage={getPageSize("visitations")}
                  onPerPageChange={(size) => setPageSize("visitations", size)}
                  onPageChange={(page) => setPage("visitations", page)}
                />
              </SectionCard>
            </TabsContent>

            <TabsContent value="education">
              <SectionCard
                title="Education records"
                description={selectedResidents.length ? "Education records are filtered to the selected resident set." : "All education records are sorted upcoming first and then newest first."}
                action={<TableAddButton label="Add education record" onClick={() => openEducationForm()} />}
              >
                {renderResidentToolbar()}
                {residentEducationSplit.upcoming.length ? (
                  <div className="mb-4">
                    <CollapsibleSubsection title={`Future education records (${residentEducationSplit.upcoming.length})`}>
                      <div className="space-y-3">
                        {residentEducationSplit.upcoming.map((row) => (
                          <div key={String(row.education_record_id)} className="rounded-2xl border border-border/70 bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-foreground">{residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))}</p>
                              <StatusBadge value={asDisplayDate(row.record_date)} tone="outline" />
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{asText(row.education_level)} • {asText(row.school_name)}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSubsection>
                  </div>
                ) : null}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        tableId="education"
                        columnKey="resident"
                        activeSort={tableColumnSort.education}
                        onToggle={toggleTableColumnSort}
                      >
                        Resident
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="education"
                        columnKey="record_date"
                        activeSort={tableColumnSort.education}
                        onToggle={toggleTableColumnSort}
                      >
                        Record Date
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="education"
                        columnKey="level"
                        activeSort={tableColumnSort.education}
                        onToggle={toggleTableColumnSort}
                      >
                        Level
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="education"
                        columnKey="school"
                        activeSort={tableColumnSort.education}
                        onToggle={toggleTableColumnSort}
                      >
                        School
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="education"
                        columnKey="enrollment"
                        activeSort={tableColumnSort.education}
                        onToggle={toggleTableColumnSort}
                      >
                        Enrollment
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="education"
                        columnKey="progress"
                        activeSort={tableColumnSort.education}
                        onToggle={toggleTableColumnSort}
                      >
                        Progress
                      </SortableTableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {educationTablePage.visibleRows.map((row) => (
                      <TableRow key={String(row.education_record_id)}>
                        <TableCell>{residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))}</TableCell>
                        <TableCell>{asDisplayDate(row.record_date)}</TableCell>
                        <TableCell>{asText(row.education_level)}</TableCell>
                        <TableCell>{asText(row.school_name)}</TableCell>
                        <TableCell>{asText(row.enrollment_status)}</TableCell>
                        <TableCell>{toNumber(row.progress_percent).toFixed(0)}%</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                              onClick={() => openEducationForm(row)}
                              aria-label={`Edit education record for ${residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:text-destructive"
                              onClick={() => confirmDelete("education_records", toNumber(row.education_record_id), `education record #${row.education_record_id}`)}
                              aria-label={`Delete education record #${row.education_record_id}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  page={educationTablePage.safePage}
                  totalPages={educationTablePage.totalPages}
                  totalRows={residentEducationSplit.currentAndPast.length}
                  start={educationTablePage.start}
                  end={educationTablePage.end}
                  perPage={getPageSize("education")}
                  onPerPageChange={(size) => setPageSize("education", size)}
                  onPageChange={(page) => setPage("education", page)}
                />
              </SectionCard>
            </TabsContent>

            <TabsContent value="health">
              <SectionCard
                title="Health & well-being"
                description={selectedResidents.length ? "Health records are filtered to the selected resident set." : "All health records are sorted upcoming first and then newest first."}
                action={<TableAddButton label="Add health record" onClick={() => openHealthForm()} />}
              >
                {renderResidentToolbar()}
                {residentHealthSplit.upcoming.length ? (
                  <div className="mb-4">
                    <CollapsibleSubsection title={`Future health records (${residentHealthSplit.upcoming.length})`}>
                      <div className="space-y-3">
                        {residentHealthSplit.upcoming.map((row) => (
                          <div key={String(row.health_record_id)} className="rounded-2xl border border-border/70 bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-foreground">{residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))}</p>
                              <StatusBadge value={asDisplayDate(row.record_date)} tone="outline" />
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">Health score {toNumber(row.general_health_score).toFixed(1)}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSubsection>
                  </div>
                ) : null}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        tableId="health"
                        columnKey="resident"
                        activeSort={tableColumnSort.health}
                        onToggle={toggleTableColumnSort}
                      >
                        Resident
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="health"
                        columnKey="record_date"
                        activeSort={tableColumnSort.health}
                        onToggle={toggleTableColumnSort}
                      >
                        Record Date
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="health"
                        columnKey="health_score"
                        activeSort={tableColumnSort.health}
                        onToggle={toggleTableColumnSort}
                      >
                        Health Score
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="health"
                        columnKey="nutrition"
                        activeSort={tableColumnSort.health}
                        onToggle={toggleTableColumnSort}
                      >
                        Nutrition
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="health"
                        columnKey="sleep"
                        activeSort={tableColumnSort.health}
                        onToggle={toggleTableColumnSort}
                      >
                        Sleep
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="health"
                        columnKey="bmi"
                        activeSort={tableColumnSort.health}
                        onToggle={toggleTableColumnSort}
                      >
                        BMI
                      </SortableTableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {healthTablePage.visibleRows.map((row) => (
                      <TableRow key={String(row.health_record_id)}>
                        <TableCell>{residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))}</TableCell>
                        <TableCell>{asDisplayDate(row.record_date)}</TableCell>
                        <TableCell>{toNumber(row.general_health_score).toFixed(1)}</TableCell>
                        <TableCell>{toNumber(row.nutrition_score).toFixed(1)}</TableCell>
                        <TableCell>{toNumber(row.sleep_quality_score).toFixed(1)}</TableCell>
                        <TableCell>{toNumber(row.bmi).toFixed(1)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                              onClick={() => openHealthForm(row)}
                              aria-label={`Edit health record for ${residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:text-destructive"
                              onClick={() => confirmDelete("health_wellbeing_records", toNumber(row.health_record_id), `health record #${row.health_record_id}`)}
                              aria-label={`Delete health record #${row.health_record_id}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  page={healthTablePage.safePage}
                  totalPages={healthTablePage.totalPages}
                  totalRows={residentHealthSplit.currentAndPast.length}
                  start={healthTablePage.start}
                  end={healthTablePage.end}
                  perPage={getPageSize("health")}
                  onPerPageChange={(size) => setPageSize("health", size)}
                  onPageChange={(page) => setPage("health", page)}
                />
              </SectionCard>
            </TabsContent>

            <TabsContent value="interventions">
              <SectionCard
                title="Interventions"
                description={selectedResidents.length ? "Interventions are filtered to the selected resident set." : "All interventions are sorted by upcoming target first and then newest first."}
                action={<TableAddButton label="Add intervention" onClick={() => openInterventionForm()} />}
              >
                {renderResidentToolbar()}
                {residentInterventionSplit.upcoming.length ? (
                  <div className="mb-4">
                    <CollapsibleSubsection title={`Upcoming interventions & conferences (${residentInterventionSplit.upcoming.length})`}>
                      <div className="space-y-3">
                        {residentInterventionSplit.upcoming.map((row) => (
                          <div key={String(row.plan_id)} className="rounded-2xl border border-border/70 bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-foreground">{residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))}</p>
                              <StatusBadge value={asDisplayDate(row.target_date)} tone="outline" />
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{asText(row.plan_category)} • {asText(row.status)}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSubsection>
                  </div>
                ) : null}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        tableId="interventions"
                        columnKey="resident"
                        activeSort={tableColumnSort.interventions}
                        onToggle={toggleTableColumnSort}
                      >
                        Resident
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="interventions"
                        columnKey="category"
                        activeSort={tableColumnSort.interventions}
                        onToggle={toggleTableColumnSort}
                      >
                        Category
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="interventions"
                        columnKey="target_date"
                        activeSort={tableColumnSort.interventions}
                        onToggle={toggleTableColumnSort}
                      >
                        Target Date
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="interventions"
                        columnKey="status"
                        activeSort={tableColumnSort.interventions}
                        onToggle={toggleTableColumnSort}
                      >
                        Status
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="interventions"
                        columnKey="conference_date"
                        activeSort={tableColumnSort.interventions}
                        onToggle={toggleTableColumnSort}
                      >
                        Conference Date
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="interventions"
                        columnKey="services"
                        activeSort={tableColumnSort.interventions}
                        onToggle={toggleTableColumnSort}
                      >
                        Services
                      </SortableTableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interventionsTablePage.visibleRows.map((row) => (
                      <TableRow key={String(row.plan_id)}>
                        <TableCell>{residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))}</TableCell>
                        <TableCell>{asText(row.plan_category)}</TableCell>
                        <TableCell>{asDisplayDate(row.target_date)}</TableCell>
                        <TableCell>{asText(row.status)}</TableCell>
                        <TableCell>{asDisplayDate(row.case_conference_date)}</TableCell>
                        <TableCell>{asText(row.services_provided)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                              onClick={() => openInterventionForm(row)}
                              aria-label={`Edit intervention for ${residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:text-destructive"
                              onClick={() => confirmDelete("intervention_plans", toNumber(row.plan_id), `intervention #${row.plan_id}`)}
                              aria-label={`Delete intervention #${row.plan_id}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  page={interventionsTablePage.safePage}
                  totalPages={interventionsTablePage.totalPages}
                  totalRows={residentInterventionSplit.currentAndPast.length}
                  start={interventionsTablePage.start}
                  end={interventionsTablePage.end}
                  perPage={getPageSize("interventions")}
                  onPerPageChange={(size) => setPageSize("interventions", size)}
                  onPageChange={(page) => setPage("interventions", page)}
                />
              </SectionCard>
            </TabsContent>

            <TabsContent value="incidents">
              <SectionCard
                title="Incidents"
                description={selectedResidents.length ? "Incidents are filtered to the selected resident set." : "All incident reports are sorted upcoming first and then newest first."}
                action={<TableAddButton label="Add incident" onClick={() => openIncidentForm()} />}
              >
                {renderResidentToolbar()}
                {residentIncidentSplit.upcoming.length ? (
                  <div className="mb-4">
                    <CollapsibleSubsection title={`Future-dated incidents (${residentIncidentSplit.upcoming.length})`}>
                      <div className="space-y-3">
                        {residentIncidentSplit.upcoming.map((row) => (
                          <div key={String(row.incident_id)} className="rounded-2xl border border-border/70 bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-foreground">{residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))}</p>
                              <StatusBadge value={asDisplayDate(row.incident_date)} tone="outline" />
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{asText(row.incident_type)} • {asText(row.severity)}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSubsection>
                  </div>
                ) : null}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        tableId="incidents"
                        columnKey="resident"
                        activeSort={tableColumnSort.incidents}
                        onToggle={toggleTableColumnSort}
                      >
                        Resident
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="incidents"
                        columnKey="incident_date"
                        activeSort={tableColumnSort.incidents}
                        onToggle={toggleTableColumnSort}
                      >
                        Incident Date
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="incidents"
                        columnKey="incident_type"
                        activeSort={tableColumnSort.incidents}
                        onToggle={toggleTableColumnSort}
                      >
                        Type
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="incidents"
                        columnKey="severity"
                        activeSort={tableColumnSort.incidents}
                        onToggle={toggleTableColumnSort}
                      >
                        Severity
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="incidents"
                        columnKey="reported_by"
                        activeSort={tableColumnSort.incidents}
                        onToggle={toggleTableColumnSort}
                      >
                        Reported By
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="incidents"
                        columnKey="resolved"
                        activeSort={tableColumnSort.incidents}
                        onToggle={toggleTableColumnSort}
                      >
                        Resolved
                      </SortableTableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incidentsTablePage.visibleRows.map((row) => (
                      <TableRow key={String(row.incident_id)}>
                        <TableCell>{residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))}</TableCell>
                        <TableCell>{asDisplayDate(row.incident_date)}</TableCell>
                        <TableCell>{asText(row.incident_type)}</TableCell>
                        <TableCell>{asText(row.severity)}</TableCell>
                        <TableCell>{asText(row.reported_by)}</TableCell>
                        <TableCell>{String(row.resolved).toLowerCase() === "true" ? "Yes" : "No"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                              onClick={() => openIncidentForm(row)}
                              aria-label={`Edit incident for ${residentLabel(residentMap.get(toNumber(row.resident_id)) ?? ({} as Resident))}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:text-destructive"
                              onClick={() => confirmDelete("incident_reports", toNumber(row.incident_id), `incident #${row.incident_id}`)}
                              aria-label={`Delete incident #${row.incident_id}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  page={incidentsTablePage.safePage}
                  totalPages={incidentsTablePage.totalPages}
                  totalRows={residentIncidentSplit.currentAndPast.length}
                  start={incidentsTablePage.start}
                  end={incidentsTablePage.end}
                  perPage={getPageSize("incidents")}
                  onPerPageChange={(size) => setPageSize("incidents", size)}
                  onPageChange={(page) => setPage("incidents", page)}
                />
              </SectionCard>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="donations" className="space-y-6">
          <Tabs value={donationsSubTab} onValueChange={(value) => setParams({ donationsSubTab: value })} className="space-y-6">
            {renderInsightRow(donationsInsightKey)}
            <TabsList
              aria-label="Donation workspace sections"
              className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-2xl border border-border/70 bg-card p-2 shadow-warm"
            >
              {DONATION_SUBTABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-xl px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="supporters" className="space-y-6">
              <SectionCard
                title="Supporters"
                description="Click a supporter row to filter all donation subtabs to that supporter."
                action={<TableAddButton label="Add supporter" onClick={() => openSupporterForm()} />}
              >
                {renderDonationsToolbar()}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        tableId="supporters"
                        columnKey="name"
                        activeSort={tableColumnSort.supporters}
                        onToggle={toggleTableColumnSort}
                      >
                        Name
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="supporters"
                        columnKey="type"
                        activeSort={tableColumnSort.supporters}
                        onToggle={toggleTableColumnSort}
                      >
                        Type
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="supporters"
                        columnKey="status"
                        activeSort={tableColumnSort.supporters}
                        onToggle={toggleTableColumnSort}
                      >
                        Status
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="supporters"
                        columnKey="region"
                        activeSort={tableColumnSort.supporters}
                        onToggle={toggleTableColumnSort}
                      >
                        Region
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="supporters"
                        columnKey="first_donation"
                        activeSort={tableColumnSort.supporters}
                        onToggle={toggleTableColumnSort}
                      >
                        First Donation
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="supporters"
                        columnKey="channel"
                        activeSort={tableColumnSort.supporters}
                        onToggle={toggleTableColumnSort}
                      >
                        Channel
                      </SortableTableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supportersTablePage.visibleRows.map((supporter) => (
                      <TableRow
                        key={supporter.supporter_id}
                        className="cursor-pointer"
                        onClick={() => setParams({ supporterId: String(supporter.supporter_id) })}
                      >
                        <TableCell className="font-medium text-foreground">{supporterLabel(supporter)}</TableCell>
                        <TableCell>{asText(supporter.supporter_type)}</TableCell>
                        <TableCell>
                          <StatusBadge value={asText(supporter.status, "Unknown")} tone={supporter.status === "Active" ? "default" : "outline"} />
                        </TableCell>
                        <TableCell>{asText(supporter.region)}</TableCell>
                        <TableCell>{asDisplayDate(supporter.first_donation_date)}</TableCell>
                        <TableCell>{asText(supporter.acquisition_channel)}</TableCell>
                        <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                              onClick={() => openSupporterForm(supporter)}
                              aria-label={`Edit ${supporterLabel(supporter)}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:text-destructive"
                              onClick={() => confirmDelete("supporters", supporter.supporter_id, supporterLabel(supporter))}
                              aria-label={`Delete ${supporterLabel(supporter)}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  page={supportersTablePage.safePage}
                  totalPages={supportersTablePage.totalPages}
                  totalRows={filteredSupporters.length}
                  start={supportersTablePage.start}
                  end={supportersTablePage.end}
                  perPage={getPageSize("supporters")}
                  onPerPageChange={(size) => setPageSize("supporters", size)}
                  onPageChange={(page) => setPage("supporters", page)}
                />
              </SectionCard>
            </TabsContent>

            <TabsContent value="donations" className="space-y-6">
              <SectionCard
                title="Donations"
                description="Every monetary and in-kind gift: date, supporter, campaign, channel, and value. Filter with the toolbar above; when a supporter is selected, only their donations appear."
                action={<TableAddButton label="Add donation" onClick={() => openDonationForm()} />}
              >
                {renderDonationsToolbar()}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        tableId="donations-tab"
                        columnKey="supporter"
                        activeSort={tableColumnSort["donations-tab"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Supporter
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="donations-tab"
                        columnKey="donation_date"
                        activeSort={tableColumnSort["donations-tab"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Date
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="donations-tab"
                        columnKey="donation_type"
                        activeSort={tableColumnSort["donations-tab"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Type
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="donations-tab"
                        columnKey="campaign"
                        activeSort={tableColumnSort["donations-tab"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Campaign
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="donations-tab"
                        columnKey="channel"
                        activeSort={tableColumnSort["donations-tab"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Channel
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="donations-tab"
                        columnKey="amount"
                        activeSort={tableColumnSort["donations-tab"]}
                        onToggle={toggleTableColumnSort}
                        className="text-right"
                      >
                        Amount
                      </SortableTableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {donationsTablePage.visibleRows.map((donation) => (
                      <TableRow key={donation.donation_id}>
                        <TableCell>{donation.supporter_id ? supporterLabel(supporterMap.get(donation.supporter_id) ?? ({} as Supporter)) : donation.supporter_name ?? "Anonymous"}</TableCell>
                        <TableCell>{asDisplayDate(donation.donation_date)}</TableCell>
                        <TableCell>{asText(donation.donation_type)}</TableCell>
                        <TableCell>{asText(donation.campaign_name)}</TableCell>
                        <TableCell>{asText(donation.channel_source)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(donation.amount ?? donation.estimated_value, donation.currency_code ?? "PHP")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                              onClick={() => openDonationForm(donation)}
                              aria-label={`Edit donation #${donation.donation_id}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:text-destructive"
                              onClick={() => confirmDelete("donations", donation.donation_id, `donation #${donation.donation_id}`)}
                              aria-label={`Delete donation #${donation.donation_id}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  page={donationsTablePage.safePage}
                  totalPages={donationsTablePage.totalPages}
                  totalRows={filteredDonations.length}
                  start={donationsTablePage.start}
                  end={donationsTablePage.end}
                  perPage={getPageSize("donations")}
                  onPerPageChange={(size) => setPageSize("donations", size)}
                  onPageChange={(page) => setPage("donations", page)}
                />
              </SectionCard>
            </TabsContent>

            <TabsContent value="in-kind" className="space-y-6">
              <SectionCard
                title="In-kind items"
                description="Line items tied to donation records—what was received, quantity, condition, and estimated value. Scoped to the active supporter filter when one is chosen."
                action={<TableAddButton label="Add in-kind item" onClick={() => openInKindForm()} />}
              >
                {renderDonationsToolbar()}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        tableId="in-kind"
                        columnKey="donation"
                        activeSort={tableColumnSort["in-kind"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Donation
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="in-kind"
                        columnKey="item"
                        activeSort={tableColumnSort["in-kind"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Item
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="in-kind"
                        columnKey="category"
                        activeSort={tableColumnSort["in-kind"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Category
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="in-kind"
                        columnKey="quantity"
                        activeSort={tableColumnSort["in-kind"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Quantity
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="in-kind"
                        columnKey="intended_use"
                        activeSort={tableColumnSort["in-kind"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Intended Use
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="in-kind"
                        columnKey="condition"
                        activeSort={tableColumnSort["in-kind"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Condition
                      </SortableTableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inKindTablePage.visibleRows.map((item) => (
                      <TableRow key={item.item_id}>
                        <TableCell>#{item.donation_id}</TableCell>
                        <TableCell>{asText(item.item_name)}</TableCell>
                        <TableCell>{asText(item.item_category)}</TableCell>
                        <TableCell>{`${toNumber(item.quantity)} ${asText(item.unit_of_measure, "")}`.trim()}</TableCell>
                        <TableCell>{asText(item.intended_use)}</TableCell>
                        <TableCell>{asText(item.received_condition)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                              onClick={() => openInKindForm(item)}
                              aria-label={`Edit in-kind item ${asText(item.item_name, `#${item.item_id}`)}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:text-destructive"
                              onClick={() => confirmDelete("in_kind_donation_items", item.item_id, item.item_name ?? `item #${item.item_id}`)}
                              aria-label={`Delete in-kind item ${asText(item.item_name, `#${item.item_id}`)}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  page={inKindTablePage.safePage}
                  totalPages={inKindTablePage.totalPages}
                  totalRows={filteredInKind.length}
                  start={inKindTablePage.start}
                  end={inKindTablePage.end}
                  perPage={getPageSize("in-kind")}
                  onPerPageChange={(size) => setPageSize("in-kind", size)}
                  onPageChange={(page) => setPage("in-kind", page)}
                />
              </SectionCard>
            </TabsContent>

            <TabsContent value="allocations" className="space-y-6">
              <SectionCard
                title="Allocations"
                description="How donation funds are assigned to safe houses and program areas, with amounts and dates. Rows respect the supporter filter so you see allocations for that donor’s gifts only."
                action={<TableAddButton label="Add allocation" onClick={() => openAllocationForm()} />}
              >
                {renderDonationsToolbar()}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        tableId="allocations"
                        columnKey="donation"
                        activeSort={tableColumnSort.allocations}
                        onToggle={toggleTableColumnSort}
                      >
                        Donation
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="allocations"
                        columnKey="safe_house"
                        activeSort={tableColumnSort.allocations}
                        onToggle={toggleTableColumnSort}
                      >
                        Safe House
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="allocations"
                        columnKey="program_area"
                        activeSort={tableColumnSort.allocations}
                        onToggle={toggleTableColumnSort}
                      >
                        Program Area
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="allocations"
                        columnKey="allocation_date"
                        activeSort={tableColumnSort.allocations}
                        onToggle={toggleTableColumnSort}
                      >
                        Allocation Date
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="allocations"
                        columnKey="amount"
                        activeSort={tableColumnSort.allocations}
                        onToggle={toggleTableColumnSort}
                        className="text-right"
                      >
                        Amount
                      </SortableTableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocationsTablePage.visibleRows.map((allocation) => (
                      <TableRow key={allocation.allocation_id}>
                        <TableCell>#{allocation.donation_id}</TableCell>
                        <TableCell>{safehouseMap.get(allocation.safehouse_id ?? -1)?.name ?? "Unassigned"}</TableCell>
                        <TableCell>{asText(allocation.program_area)}</TableCell>
                        <TableCell>{asDisplayDate(allocation.allocation_date)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(allocation.amount_allocated)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                              onClick={() => openAllocationForm(allocation)}
                              aria-label={`Edit allocation #${allocation.allocation_id}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:text-destructive"
                              onClick={() => confirmDelete("donation_allocations", allocation.allocation_id, `allocation #${allocation.allocation_id}`)}
                              aria-label={`Delete allocation #${allocation.allocation_id}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  page={allocationsTablePage.safePage}
                  totalPages={allocationsTablePage.totalPages}
                  totalRows={filteredAllocations.length}
                  start={allocationsTablePage.start}
                  end={allocationsTablePage.end}
                  perPage={getPageSize("allocations")}
                  onPerPageChange={(size) => setPageSize("allocations", size)}
                  onPageChange={(page) => setPage("allocations", page)}
                />
              </SectionCard>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="safe-houses" className="space-y-6">
          <Tabs value={safeHousesSubTab} onValueChange={(value) => setParams({ safeHousesSubTab: value })} className="space-y-6">
            {renderInsightRow(safehousesInsightKey)}
            <TabsList
              aria-label="Safe house workspace sections"
              className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-2xl border border-border/70 bg-card p-2 shadow-warm"
            >
              {SAFEHOUSE_SUBTABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-xl px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="safe-houses" className="space-y-6">
              <SectionCard
                title="Safe houses"
                description="Click a safe house row to filter related allocations and monthly metrics."
                action={<TableAddButton label="Add safe house" onClick={() => openSafehouseForm()} />}
              >
                {renderSafehousesToolbar()}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        tableId="safe-houses"
                        columnKey="name"
                        activeSort={tableColumnSort["safe-houses"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Name
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="safe-houses"
                        columnKey="region"
                        activeSort={tableColumnSort["safe-houses"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Region
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="safe-houses"
                        columnKey="status"
                        activeSort={tableColumnSort["safe-houses"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Status
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="safe-houses"
                        columnKey="capacity"
                        activeSort={tableColumnSort["safe-houses"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Capacity
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="safe-houses"
                        columnKey="occupancy"
                        activeSort={tableColumnSort["safe-houses"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Occupancy
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="safe-houses"
                        columnKey="residents_assigned"
                        activeSort={tableColumnSort["safe-houses"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Residents Assigned
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="safe-houses"
                        columnKey="donation_allocations"
                        activeSort={tableColumnSort["safe-houses"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Donation Allocations
                      </SortableTableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safehousesTablePage.visibleRows.map((safehouse) => {
                      const residentsAssigned = workspace.residents.filter((resident) => resident.safehouse_id === safehouse.safehouse_id).length;
                      const donationAllocations = workspace.allocations
                        .filter((allocation) => allocation.safehouse_id === safehouse.safehouse_id)
                        .reduce((sum, allocation) => sum + toNumber(allocation.amount_allocated), 0);
                      return (
                        <TableRow
                          key={safehouse.safehouse_id}
                          className="cursor-pointer"
                          onClick={() => setParams({ safehouseId: String(safehouse.safehouse_id) })}
                        >
                          <TableCell className="font-medium text-foreground">{asText(safehouse.name)}</TableCell>
                          <TableCell>{[safehouse.city, safehouse.region].filter(Boolean).join(", ")}</TableCell>
                          <TableCell>
                            <StatusBadge value={asText(safehouse.status, "Unknown")} tone={safehouse.status === "Active" ? "default" : "outline"} />
                          </TableCell>
                          <TableCell>{toNumber(safehouse.capacity_girls)}</TableCell>
                          <TableCell>{`${toNumber(safehouse.current_occupancy)} / ${toNumber(safehouse.capacity_girls)}`}</TableCell>
                          <TableCell>{residentsAssigned}</TableCell>
                          <TableCell>{formatCurrency(donationAllocations)}</TableCell>
                          <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl"
                                onClick={() => openSafehouseForm(safehouse)}
                                aria-label={`Edit safe house ${asText(safehouse.name, `#${safehouse.safehouse_id}`)}`}
                              >
                                <Pencil className="h-4 w-4" aria-hidden />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl text-destructive hover:text-destructive"
                                onClick={() => confirmDelete("safehouses", safehouse.safehouse_id, safehouse.name ?? `safehouse #${safehouse.safehouse_id}`)}
                                aria-label={`Delete safe house ${asText(safehouse.name, `#${safehouse.safehouse_id}`)}`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <TablePagination
                  page={safehousesTablePage.safePage}
                  totalPages={safehousesTablePage.totalPages}
                  totalRows={filteredSafehouses.length}
                  start={safehousesTablePage.start}
                  end={safehousesTablePage.end}
                  perPage={getPageSize("safe-houses")}
                  onPerPageChange={(size) => setPageSize("safe-houses", size)}
                  onPageChange={(page) => setPage("safe-houses", page)}
                />
              </SectionCard>
            </TabsContent>

            <TabsContent value="allocation-history" className="space-y-6">
              <SectionCard title="Allocation history" description="Filtered to the selected safe house when one is active.">
                {renderSafehousesToolbar()}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        tableId="allocation-history"
                        columnKey="safe_house"
                        activeSort={tableColumnSort["allocation-history"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Safe House
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="allocation-history"
                        columnKey="donation"
                        activeSort={tableColumnSort["allocation-history"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Donation
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="allocation-history"
                        columnKey="program_area"
                        activeSort={tableColumnSort["allocation-history"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Program Area
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="allocation-history"
                        columnKey="allocation_date"
                        activeSort={tableColumnSort["allocation-history"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Allocation Date
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="allocation-history"
                        columnKey="amount"
                        activeSort={tableColumnSort["allocation-history"]}
                        onToggle={toggleTableColumnSort}
                        className="text-right"
                      >
                        Amount
                      </SortableTableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocationHistoryTablePage.visibleRows.map((allocation) => (
                      <TableRow key={allocation.allocation_id}>
                        <TableCell>{safehouseMap.get(allocation.safehouse_id ?? -1)?.name ?? "Unassigned"}</TableCell>
                        <TableCell>#{allocation.donation_id}</TableCell>
                        <TableCell>{asText(allocation.program_area)}</TableCell>
                        <TableCell>{asDisplayDate(allocation.allocation_date)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(allocation.amount_allocated)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  page={allocationHistoryTablePage.safePage}
                  totalPages={allocationHistoryTablePage.totalPages}
                  totalRows={safehouseAllocations.length}
                  start={allocationHistoryTablePage.start}
                  end={allocationHistoryTablePage.end}
                  perPage={getPageSize("allocation-history")}
                  onPerPageChange={(size) => setPageSize("allocation-history", size)}
                  onPageChange={(page) => setPage("allocation-history", page)}
                />
              </SectionCard>
            </TabsContent>

            <TabsContent value="monthly-metrics" className="space-y-6">
              <SectionCard title="Monthly metrics" description="Occupancy, education, health, visitations, and incident snapshots by month.">
                {renderSafehousesToolbar()}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        tableId="monthly-metrics"
                        columnKey="safe_house"
                        activeSort={tableColumnSort["monthly-metrics"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Safe House
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="monthly-metrics"
                        columnKey="month"
                        activeSort={tableColumnSort["monthly-metrics"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Month
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="monthly-metrics"
                        columnKey="active_residents"
                        activeSort={tableColumnSort["monthly-metrics"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Active Residents
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="monthly-metrics"
                        columnKey="education_progress"
                        activeSort={tableColumnSort["monthly-metrics"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Education Progress
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="monthly-metrics"
                        columnKey="health_score"
                        activeSort={tableColumnSort["monthly-metrics"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Health Score
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="monthly-metrics"
                        columnKey="visitations"
                        activeSort={tableColumnSort["monthly-metrics"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Visitations
                      </SortableTableHead>
                      <SortableTableHead
                        tableId="monthly-metrics"
                        columnKey="incidents"
                        activeSort={tableColumnSort["monthly-metrics"]}
                        onToggle={toggleTableColumnSort}
                      >
                        Incidents
                      </SortableTableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyMetricsTablePage.visibleRows.map((metric) => (
                      <TableRow key={metric.metric_id}>
                        <TableCell>{safehouseMap.get(metric.safehouse_id ?? -1)?.name ?? "Unassigned"}</TableCell>
                        <TableCell>{asDisplayDate(metric.month_start)}</TableCell>
                        <TableCell>{toNumber(metric.active_residents)}</TableCell>
                        <TableCell>{toNumber(metric.avg_education_progress).toFixed(0)}%</TableCell>
                        <TableCell>{toNumber(metric.avg_health_score).toFixed(1)}</TableCell>
                        <TableCell>{toNumber(metric.home_visitation_count)}</TableCell>
                        <TableCell>{toNumber(metric.incident_count)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  page={monthlyMetricsTablePage.safePage}
                  totalPages={monthlyMetricsTablePage.totalPages}
                  totalRows={safehouseMetrics.length}
                  start={monthlyMetricsTablePage.start}
                  end={monthlyMetricsTablePage.end}
                  perPage={getPageSize("monthly-metrics")}
                  onPerPageChange={(size) => setPageSize("monthly-metrics", size)}
                  onPageChange={(page) => setPage("monthly-metrics", page)}
                />
              </SectionCard>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={Download} label="Export reports" value="4 packs" detail="Resident, donation, occupancy, and incident exports ready" />
            <KpiCard icon={HandCoins} label="Donation reports" value={String(filteredDonations.length)} detail="Donation records currently in scope" />
            <KpiCard icon={Users} label="Resident trends" value={String(workspace.residents.length)} detail="Residents feeding the trend dashboards" />
            <KpiCard icon={Home} label="Occupancy trends" value={String(workspace.monthlyMetrics.length)} detail="Monthly safe house snapshots available" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Report export cards" description="A modular placeholder section designed for future report generators.">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { title: "Donation report", detail: "Campaign, supporter, and allocation summaries." },
                  { title: "Resident trends", detail: "Admissions, case status, and risk movement." },
                  { title: "Occupancy trends", detail: "Utilization by house and by month." },
                  { title: "Incidents trends", detail: "Incident volume, severity, and closure speed." },
                ].map((card) => (
                  <div key={card.title} className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <p className="font-medium text-foreground">{card.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{card.detail}</p>
                    <Button variant="outline" className="mt-4 rounded-xl" aria-label={`Prepare export: ${card.title}`}>
                      Prepare export
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Trend overview" description="A clean placeholder chart block for trend reporting expansion.">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={reportsTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="incidents" stroke="hsl(var(--secondary))" strokeWidth={3} />
                  <Line type="monotone" dataKey="occupancy" stroke="hsl(var(--primary))" strokeWidth={3} />
                  <Line type="monotone" dataKey="donations" stroke="hsl(var(--accent-foreground))" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="outreach" className="space-y-6">
          <Tabs value={outreachSubTab} onValueChange={(value) => setParams({ outreachSubTab: value })} className="space-y-6">
            <TabsList
              aria-label="Outreach workspace sections"
              className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-2xl border border-border/70 bg-card p-2 shadow-warm"
            >
              {OUTREACH_SUBTABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-xl px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="social-media" className="space-y-6">
              <OutreachSocialMediaPanel socialPosts={workspace.socialPosts} />
            </TabsContent>

            <TabsContent value="public-impact" className="space-y-6">
              <PublicImpactMlPanel />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="settings">
          <SectionCard
            title="Settings"
            description="This tab intentionally preserves the existing Settings page exactly as it is today."
            action={
              <Button asChild className="rounded-xl">
                <Link to="/admin/settings">
                  Open full settings console
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-5">
                <p className="font-medium text-foreground">Why this stays separate</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  You asked to preserve the current settings page exactly. This tab acts as the same top-level entry
                  point while handing off to the untouched settings console for all security, workflow, and integration controls.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-5">
                <p className="font-medium text-foreground">What remains consistent</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The settings area still appears as one of the seven main admin tabs, but no styles or interaction
                  patterns inside the original settings page were altered in this refactor.
                </p>
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(expandedChart)} onOpenChange={(open) => !open && setExpandedChartKey(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-2xl border-border/80 bg-background">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-foreground">{expandedChart?.title ?? "Chart"}</DialogTitle>
            <DialogDescription>{expandedChart?.subtitle ?? "Filter-aware analytics for the current table view."}</DialogDescription>
          </DialogHeader>
          {expandedChart ? (
            <div className="space-y-5">
              {expandedChart.modalOptions?.length ? (
                <div className="flex flex-wrap items-center gap-3">
                  <label htmlFor="admin-expanded-chart-view" className="text-sm font-medium text-foreground">
                    View:
                  </label>
                  <select
                    id="admin-expanded-chart-view"
                    value={expandedChart.selectedOption}
                    onChange={(event) => expandedChart.onOptionChange?.(event.target.value)}
                    className="h-10 rounded-full border border-input bg-background px-4 text-sm text-foreground"
                    aria-label={`${expandedChart.title} data view`}
                  >
                    {expandedChart.modalOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-warm">
                <div className="h-[360px]">
                  <AnalyticsPreviewChart config={expandedChart} expanded />
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={residentModalOpen} onOpenChange={setResidentModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-2xl border-border/80 bg-background">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-foreground">
              {selectedResidentDetail ? residentLabel(selectedResidentDetail) : "Resident detail"}
            </DialogTitle>
            <DialogDescription>
              Full resident record fields, notes, and quick navigation into related workstreams.
            </DialogDescription>
          </DialogHeader>
          {selectedResidentDetail ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(() => {
                  const sh = safehouseMap.get(selectedResidentDetail.safehouse_id ?? -1);
                  const safehouseIdLabel =
                    selectedResidentDetail.safehouse_id != null
                      ? `ID ${selectedResidentDetail.safehouse_id}`
                      : "No safe house ID";
                  const safehouseNameLabel = sh?.name ?? selectedResidentDetail.safehouse_name ?? "Unassigned";
                  return [
                    { label: "Resident ID", value: String(selectedResidentDetail.resident_id) },
                    { label: "Case control no.", value: asText(selectedResidentDetail.case_control_no, "Not recorded") },
                    { label: "Internal code", value: asText(selectedResidentDetail.internal_code, "Not recorded") },
                    { label: "Date added", value: asDisplayDate(selectedResidentDetail.created_at, "Not recorded") },
                    { label: "Date of birth", value: asDisplayDate(selectedResidentDetail.date_of_birth, "Not recorded") },
                    {
                      label: "Personal information",
                      value: `${asText(selectedResidentDetail.sex)} • ${asText(selectedResidentDetail.present_age, "Age unavailable")}`,
                    },
                    {
                      label: "Demographics",
                      value: `${asText(selectedResidentDetail.place_of_birth)} • ${asText(selectedResidentDetail.religion)}`,
                    },
                    {
                      label: "Case status",
                      value: `${asText(selectedResidentDetail.case_status)} • ${asText(selectedResidentDetail.case_category)}`,
                    },
                    {
                      label: "Assigned social worker",
                      value: asText(selectedResidentDetail.assigned_social_worker, "Not recorded"),
                    },
                    {
                      label: "Current risk level",
                      value: asText(selectedResidentDetail.current_risk_level, "Not recorded"),
                    },
                    {
                      label: "Reintegration status",
                      value: asText(selectedResidentDetail.reintegration_status, "Not recorded"),
                    },
                    {
                      label: "Safe house",
                      value: `${safehouseIdLabel} · ${safehouseNameLabel}`,
                    },
                    { label: "Intake date", value: asDisplayDate(selectedResidentDetail.date_of_admission) },
                    {
                      label: "Emergency information",
                      value: asText(selectedResidentDetail.referring_agency_person, "Referral contact not recorded"),
                    },
                  ];
                })().map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/75">{item.label}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
              <SectionCard title="Notes" description="Restricted notes and resident-specific context.">
                <p className="text-sm text-muted-foreground">{asText(selectedResidentDetail.notes_restricted, "No resident notes are recorded yet.")}</p>
              </SectionCard>
              <SectionCard title="Quick actions" description="Jump directly into the resident-related record areas and keep the resident filter applied.">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {[
                    { label: "View Visitations", subtab: "visitations", icon: Home },
                    { label: "View Process Records", subtab: "process-records", icon: FileHeart },
                    { label: "View Education", subtab: "education", icon: ClipboardList },
                    { label: "View Health", subtab: "health", icon: HeartPulse },
                    { label: "View Interventions", subtab: "interventions", icon: Sparkles },
                    { label: "View Incidents", subtab: "incidents", icon: AlertTriangle },
                  ].map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={action.label}
                        variant="outline"
                        className="h-auto justify-start rounded-2xl border-border/80 px-4 py-4 text-left"
                        onClick={() => goToResidentSubview(action.subtab as ResidentsSubTab, selectedResidentDetail.resident_id)}
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{action.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </SectionCard>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <EntityModal
        open={residentFormOpen}
        onOpenChange={setResidentFormOpen}
        title={editingResidentId ? "Edit Resident" : "Add Resident"}
        description="Use the same modal interaction pattern as the rest of the admin workspace."
        fields={residentFields}
        state={residentForm}
        onChange={(key, value) => setResidentForm((current) => ({ ...current, [key]: value }))}
        onSubmit={submitResidentForm}
        submitLabel={editingResidentId ? "Save resident" : "Create resident"}
        pending={createMutation.isPending || updateMutation.isPending}
      />

      <EntityModal
        open={supporterFormOpen}
        onOpenChange={setSupporterFormOpen}
        title={editingSupporterId ? "Edit Supporter" : "Add Supporter"}
        description="Supporter add and edit flows now match the shared admin modal pattern."
        fields={supporterFields}
        state={supporterForm}
        onChange={(key, value) => setSupporterForm((current) => ({ ...current, [key]: value }))}
        onSubmit={submitSupporterForm}
        submitLabel={editingSupporterId ? "Save supporter" : "Create supporter"}
        pending={createMutation.isPending || updateMutation.isPending}
        extraValidate={validateSupporterIdentity}
      />

      <EntityModal
        open={donationFormOpen}
        onOpenChange={setDonationFormOpen}
        title={editingDonationId ? "Edit Donation" : "Add Donation"}
        description="Donation add and edit flows use the same shared modal and spacing language."
        fields={donationFields}
        state={donationForm}
        onChange={(key, value) => setDonationForm((current) => ({ ...current, [key]: value }))}
        onSubmit={submitDonationForm}
        submitLabel={editingDonationId ? "Save donation" : "Create donation"}
        pending={createMutation.isPending || updateMutation.isPending}
        extraValidate={validateDonationAmounts}
      />

      <EntityModal
        open={inKindFormOpen}
        onOpenChange={setInKindFormOpen}
        title={editingInKindId ? "Edit In-Kind Item" : "Add In-Kind Item"}
        description="In-kind item maintenance follows the same consistent add, edit, and delete interaction model."
        fields={inKindFields}
        state={inKindForm}
        onChange={(key, value) => setInKindForm((current) => ({ ...current, [key]: value }))}
        onSubmit={submitInKindForm}
        submitLabel={editingInKindId ? "Save item" : "Create item"}
        pending={createMutation.isPending || updateMutation.isPending}
      />

      <EntityModal
        open={allocationFormOpen}
        onOpenChange={setAllocationFormOpen}
        title={editingAllocationId ? "Edit Allocation" : "Add Allocation"}
        description="Allocation records use the same modal treatment as all other admin tables."
        fields={allocationFields}
        state={allocationForm}
        onChange={(key, value) => setAllocationForm((current) => ({ ...current, [key]: value }))}
        onSubmit={submitAllocationForm}
        submitLabel={editingAllocationId ? "Save allocation" : "Create allocation"}
        pending={createMutation.isPending || updateMutation.isPending}
      />

      <EntityModal
        open={safehouseFormOpen}
        onOpenChange={setSafehouseFormOpen}
        title={editingSafehouseId ? "Edit Safe House" : "Add Safe House"}
        description="Safe house management now uses the same shared card, table, and modal flow as every other workspace."
        fields={safehouseFields}
        state={safehouseForm}
        onChange={(key, value) => setSafehouseForm((current) => ({ ...current, [key]: value }))}
        onSubmit={submitSafehouseForm}
        submitLabel={editingSafehouseId ? "Save safe house" : "Create safe house"}
        pending={createMutation.isPending || updateMutation.isPending}
      />

      <EntityModal
        open={processFormOpen}
        onOpenChange={setProcessFormOpen}
        title={editingProcessId ? "Edit Process Record" : "Add Process Record"}
        description={
          editingProcessId
            ? "Update this process recording. Session date, facilitator, session type, emotional state, narrative, interventions, and follow-up must be complete (or mark interventions / follow-up as None)."
            : "Each entry must include session date, social worker, session type (Individual or Group), emotional state observed, a narrative summary, interventions applied (or None), and follow-up actions (or None)."
        }
        fields={processFields}
        state={processForm}
        onChange={(key, value) =>
          setProcessForm((current) => {
            const next: ProcessRecordFormState = { ...current, [key]: value };
            if (key === "interventions_none" && value === "true") next.interventions_applied = "";
            if (key === "follow_up_none" && value === "true") next.follow_up_actions = "";
            if (key === "interventions_applied" && value.trim()) next.interventions_none = "false";
            if (key === "follow_up_actions" && value.trim()) next.follow_up_none = "false";
            return next;
          })
        }
        onSubmit={submitProcessForm}
        submitLabel={editingProcessId ? "Save process record" : "Create process record"}
        pending={createMutation.isPending || updateMutation.isPending}
        extraValidate={(s) => validateProcessRecordFormState(s, editingProcessId == null)}
      />

      <EntityModal
        open={visitationFormOpen}
        onOpenChange={setVisitationFormOpen}
        title={editingVisitationId ? "Edit Visitation" : "Add Visitation"}
        description="Manage visitations and conference-related records directly from the visitations table."
        fields={visitationFields}
        state={visitationForm}
        onChange={(key, value) => setVisitationForm((current) => ({ ...current, [key]: value }))}
        onSubmit={submitVisitationForm}
        submitLabel={editingVisitationId ? "Save visitation" : "Create visitation"}
        pending={createMutation.isPending || updateMutation.isPending}
      />

      <EntityModal
        open={educationFormOpen}
        onOpenChange={setEducationFormOpen}
        title={editingEducationId ? "Edit Education Record" : "Add Education Record"}
        description="Create and maintain education records in the same modal workflow as the rest of the admin workspace."
        fields={educationFields}
        state={educationForm}
        onChange={(key, value) => setEducationForm((current) => ({ ...current, [key]: value }))}
        onSubmit={submitEducationForm}
        submitLabel={editingEducationId ? "Save education record" : "Create education record"}
        pending={createMutation.isPending || updateMutation.isPending}
      />

      <EntityModal
        open={healthFormOpen}
        onOpenChange={setHealthFormOpen}
        title={editingHealthId ? "Edit Health Record" : "Add Health Record"}
        description="Create and maintain health and well-being records directly from the table section."
        fields={healthFields}
        state={healthForm}
        onChange={(key, value) => setHealthForm((current) => ({ ...current, [key]: value }))}
        onSubmit={submitHealthForm}
        submitLabel={editingHealthId ? "Save health record" : "Create health record"}
        pending={createMutation.isPending || updateMutation.isPending}
      />

      <EntityModal
        open={interventionFormOpen}
        onOpenChange={setInterventionFormOpen}
        title={editingInterventionId ? "Edit Intervention" : "Add Intervention"}
        description="Manage intervention plans and conference targets from the intervention table."
        fields={interventionFields}
        state={interventionForm}
        onChange={(key, value) => setInterventionForm((current) => ({ ...current, [key]: value }))}
        onSubmit={submitInterventionForm}
        submitLabel={editingInterventionId ? "Save intervention" : "Create intervention"}
        pending={createMutation.isPending || updateMutation.isPending}
      />

      <EntityModal
        open={incidentFormOpen}
        onOpenChange={setIncidentFormOpen}
        title={editingIncidentId ? "Edit Incident" : "Add Incident"}
        description="Create, update, or resolve incident records directly inside the incidents table view."
        fields={incidentFields}
        state={incidentForm}
        onChange={(key, value) => setIncidentForm((current) => ({ ...current, [key]: value }))}
        onSubmit={submitIncidentForm}
        submitLabel={editingIncidentId ? "Save incident" : "Create incident"}
        pending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
