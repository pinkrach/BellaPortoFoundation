import { supabase } from "@/lib/supabaseClient";

export const donorDonationDataQueryKey = (email: string | null) => ["donor-donation-data", email] as const;

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
};

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

function colorForDonationType(typeKey: string, index: number): string {
  const k = typeKey.toLowerCase();
  if (k.includes("monetary") || k.includes("cash")) return "#1f7a8c";
  if (k.includes("inkind") || k.includes("in-kind") || k.includes("in_kind")) return "#d96d4a";
  if (k.includes("time") || k.includes("volunteer")) return "#6eb8b8";
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

function emptyPayload(): {
  donations: DonationRow[];
  totalImpact: number;
  donationCount: number;
  typeSplitChart: { name: string; value: number; color: string }[];
  hasSupporterRecord: boolean;
} {
  return {
    donations: [],
    totalImpact: 0,
    donationCount: 0,
    typeSplitChart: [],
    hasSupporterRecord: false,
  };
}

/**
 * Loads donations for the signed-in user: supporters.email → supporter_id → donations.
 */
export async function fetchDonorDonationData(userEmail: string | null): Promise<{
  donations: DonationRow[];
  totalImpact: number;
  donationCount: number;
  typeSplitChart: { name: string; value: number; color: string }[];
  hasSupporterRecord: boolean;
}> {
  try {
    if (!supabase || !userEmail?.trim()) {
      return emptyPayload();
    }

    const email = userEmail.trim();

    const { data: supporter, error: supErr } = await supabase
      .from("supporters")
      .select("supporter_id")
      .eq("email", email)
      .maybeSingle();

    if (supErr || !supporter?.supporter_id) {
      return emptyPayload();
    }

    const supporterId = supporter.supporter_id;

    const { data: donationRows, error: donErr } = await supabase
      .from("donations")
      .select(
        "donation_id, supporter_id, donation_type, donation_date, channel_source, is_recurring, estimated_value, amount, currency_code, campaign_name",
      )
      .eq("supporter_id", supporterId)
      .order("donation_date", { ascending: false });

    if (donErr) {
      return { ...emptyPayload(), hasSupporterRecord: true };
    }

    if (!donationRows?.length) {
      return { ...emptyPayload(), hasSupporterRecord: true };
    }

    const donations = donationRows as DonationRow[];

    let totalImpact = 0;
    for (const d of donations) {
      totalImpact += donationImpactValue(d);
    }

    const byType = new Map<string, number>();
    for (const d of donations) {
      const label = (d.donation_type?.trim() || "Other") || "Other";
      const v = donationImpactValue(d);
      byType.set(label, (byType.get(label) ?? 0) + v);
    }

    const typeSplitChart = Array.from(byType.entries()).map(([name, value], index) => ({
      name,
      value,
      color: colorForDonationType(name, index),
    }));

    return {
      donations,
      totalImpact,
      donationCount: donations.length,
      typeSplitChart,
      hasSupporterRecord: true,
    };
  } catch {
    return emptyPayload();
  }
}
