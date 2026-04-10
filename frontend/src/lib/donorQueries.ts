import { supabase } from "@/lib/supabaseClient";

export const donorDonationDataQueryKey = (userId: string | null, email: string | null) =>
  ["donor-donation-data", userId, email] as const;

export type DonationRow = {
  donation_id: number;
  supporter_id: number | null;
  donation_type: string | null;
  donation_date: string | null;
  channel_source: string | null;
  is_recurring: boolean | null;
  estimated_value: number | string | null;
  amount: number | string | null;
  currency_code: string | null;
  campaign_name: string | null;
  impact_unit: string | null;
  notes: string | null;
  submission_status: string | null;
  goods_receipt_status: string | null;
  fulfillment_method: string | null;
  denial_reason: string | null;
};

export type SubmissionStatusNormalized = "pending" | "confirmed" | "denied";

export function normalizedSubmissionStatus(row: Pick<DonationRow, "submission_status">): SubmissionStatusNormalized {
  const raw = row.submission_status;
  if (raw == null || String(raw).trim() === "") return "confirmed";
  const s = String(raw).toLowerCase();
  if (s === "pending" || s === "denied" || s === "confirmed") return s;
  return "confirmed";
}

/** Confirmed donations count toward published impact; pending and denied do not. */
export function countsTowardVerifiedImpact(row: DonationRow): boolean {
  return normalizedSubmissionStatus(row) === "confirmed";
}

const DONATION_SELECT_WITH_WORKFLOW =
  "donation_id, supporter_id, donation_type, donation_date, channel_source, is_recurring, estimated_value, amount, currency_code, campaign_name, impact_unit, notes, submission_status, goods_receipt_status, fulfillment_method, denial_reason";

const DONATION_SELECT_LEGACY =
  "donation_id, supporter_id, donation_type, donation_date, channel_source, is_recurring, estimated_value, amount, currency_code, campaign_name, impact_unit, notes";

function isDonationsWorkflowColumnError(err: { message?: string } | null | undefined): boolean {
  const m = (err?.message ?? "").toLowerCase();
  if (!m) return false;
  const names = ["submission_status", "goods_receipt_status", "fulfillment_method", "denial_reason"];
  if (!names.some((n) => m.includes(n))) return false;
  return m.includes("does not exist") || m.includes("schema cache") || m.includes("could not find");
}

const CHART_PALETTE = ["#1f7a8c", "#d96d4a", "#6eb8b8", "#5c4d7d", "#2d6a4f", "#e9c46a", "#264653", "#9b6b9e"];

function parseMoney(value: unknown): number {
  if (value == null) return 0;
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isNaN(n) ? 0 : n;
}

/** Impact prefers estimated_value; falls back to amount when missing. */
function donationImpactValue(row: DonationRow): number {
  const ev = parseMoney(row.estimated_value);
  if (ev > 0) return ev;
  return parseMoney(row.amount);
}

export type DonorAllocationRollup = {
  safehouses: string[];
  programAreas: string[];
  hasAllocations: boolean;
};

export function safehouseDisplay(safehouse: Record<string, unknown> | null | undefined): string {
  if (!safehouse) return "—";
  const name = typeof safehouse.name === "string" ? safehouse.name.trim() : "";
  const city = typeof safehouse.city === "string" ? safehouse.city.trim() : "";
  const region =
    typeof safehouse.region === "string"
      ? safehouse.region.trim()
      : typeof safehouse.province === "string"
        ? safehouse.province.trim()
        : "";
  const left = [region, city].filter(Boolean).join(", ");
  const right = name || "Safehouse";
  return left ? `${left} - ${right}` : right;
}

/** PostgREST may return an embedded FK as one object or an array depending on typings; normalize for display. */
function embeddedSafehouseRecord(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const first = value[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      return first as Record<string, unknown>;
    }
    return null;
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return null;
}

async function fetchAllocationRollupForDonationIds(donationIds: number[]): Promise<DonorAllocationRollup> {
  if (!supabase || donationIds.length === 0) {
    return { safehouses: [], programAreas: [], hasAllocations: false };
  }
  const { data, error } = await supabase
    .from("donation_allocations")
    .select("program_area, donation_id, safehouses(*)")
    .in("donation_id", donationIds);
  if (error || !data?.length) {
    return { safehouses: [], programAreas: [], hasAllocations: false };
  }
  const safehouseSet = new Set<string>();
  const programAreaSet = new Set<string>();
  for (const row of data) {
    const r = row as { program_area?: string | null; safehouses?: unknown };
    const label = safehouseDisplay(embeddedSafehouseRecord(r.safehouses));
    if (label && label !== "—") safehouseSet.add(label);
    const area = (r.program_area ?? "").toString().trim();
    if (area) programAreaSet.add(area);
  }
  const hasAllocations = safehouseSet.size > 0 || programAreaSet.size > 0;
  return {
    safehouses: Array.from(safehouseSet).sort((a, b) => a.localeCompare(b)),
    programAreas: Array.from(programAreaSet).sort((a, b) => a.localeCompare(b)),
    hasAllocations,
  };
}

function colorForDonationType(typeKey: string, index: number): string {
  const k = typeKey.toLowerCase();
  if (k.includes("monetary") || k.includes("cash")) return "#1f7a8c";
  if (k.includes("inkind") || k.includes("in-kind") || k.includes("in_kind")) return "#d96d4a";
  if (k.includes("time") || k.includes("volunteer")) return "#6eb8b8";
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

function emptyAllocationRollup(): DonorAllocationRollup {
  return { safehouses: [], programAreas: [], hasAllocations: false };
}

function emptyPayload(): {
  donations: DonationRow[];
  totalImpact: number;
  donationCount: number;
  typeSplitChart: { name: string; value: number; color: string }[];
  hasSupporterRecord: boolean;
  allocationRollup: DonorAllocationRollup;
} {
  return {
    donations: [],
    totalImpact: 0,
    donationCount: 0,
    typeSplitChart: [],
    hasSupporterRecord: false,
    allocationRollup: emptyAllocationRollup(),
  };
}

/**
 * Loads donations for the signed-in user:
 * profiles.supporter_id first; if missing, fallback supporters.email match and link profile.
 */
export async function fetchDonorDonationData(userId: string | null, userEmail: string | null): Promise<{
  donations: DonationRow[];
  totalImpact: number;
  donationCount: number;
  typeSplitChart: { name: string; value: number; color: string }[];
  hasSupporterRecord: boolean;
  allocationRollup: DonorAllocationRollup;
}> {
  try {
    if (!supabase) {
      return emptyPayload();
    }

    let supporterId: number | null = null;
    let emailFromProfile: string | null = null;

    if (userId) {
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("supporter_id,email")
        .eq("id", userId)
        .maybeSingle();
      if (!profileErr) {
        const parsed = Number(profile?.supporter_id);
        supporterId = Number.isFinite(parsed) ? parsed : null;
        emailFromProfile = typeof profile?.email === "string" ? profile.email : null;
      }
    }

    if (supporterId == null) {
      const email = (userEmail?.trim() || emailFromProfile?.trim() || "").trim();
      if (!email) return emptyPayload();

      const { data: supporter, error: supErr } = await supabase
        .from("supporters")
        .select("supporter_id")
        .eq("email", email)
        .maybeSingle();

      if (supErr || !supporter?.supporter_id) {
        return emptyPayload();
      }

      supporterId = Number(supporter.supporter_id);
      if (userId && Number.isFinite(supporterId)) {
        await supabase
          .from("profiles")
          .update({ supporter_id: supporterId })
          .eq("id", userId)
          .is("supporter_id", null);
      }
    }

    let donationRows = null as unknown[] | null;
    let donErr = null as { message?: string } | null;

    {
      const r = await supabase
        .from("donations")
        .select(DONATION_SELECT_WITH_WORKFLOW)
        .eq("supporter_id", supporterId as number)
        .order("donation_date", { ascending: false });
      donationRows = r.data as unknown[] | null;
      donErr = r.error;
    }

    if (donErr && isDonationsWorkflowColumnError(donErr)) {
      const r = await supabase
        .from("donations")
        .select(DONATION_SELECT_LEGACY)
        .eq("supporter_id", supporterId as number)
        .order("donation_date", { ascending: false });
      donationRows = r.data as unknown[] | null;
      donErr = r.error;
    }

    if (donErr) {
      return { ...emptyPayload(), hasSupporterRecord: true };
    }

    if (!donationRows?.length) {
      return { ...emptyPayload(), hasSupporterRecord: true };
    }

    const donations = donationRows as DonationRow[];

    const verified = donations.filter(countsTowardVerifiedImpact);

    let totalImpact = 0;
    for (const d of verified) {
      totalImpact += donationImpactValue(d);
    }

    const byType = new Map<string, number>();
    for (const d of verified) {
      const label = (d.donation_type?.trim() || "Other") || "Other";
      const v = donationImpactValue(d);
      byType.set(label, (byType.get(label) ?? 0) + v);
    }

    const typeSplitChart = Array.from(byType.entries()).map(([name, value], index) => ({
      name,
      value,
      color: colorForDonationType(name, index),
    }));

    const verifiedDonationIds = verified.map((d) => d.donation_id).filter((id) => Number.isFinite(id));
    const allocationRollup = await fetchAllocationRollupForDonationIds(verifiedDonationIds);

    return {
      donations,
      totalImpact,
      donationCount: verified.length,
      typeSplitChart,
      hasSupporterRecord: true,
      allocationRollup,
    };
  } catch {
    return emptyPayload();
  }
}
