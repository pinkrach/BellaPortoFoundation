import { supabase } from "@/lib/supabaseClient";

/** Next donation_id for clients that insert explicit ids (legacy path). Prefer DB default when possible. */
export async function getNextDonationId(): Promise<number> {
  if (!supabase) {
    return 10000 + Math.floor(Math.random() * 90000);
  }
  const { data, error } = await supabase
    .from("donations")
    .select("donation_id")
    .order("donation_id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Could not read max donation_id; using random id:", error.message);
    return 10000 + Math.floor(Math.random() * 90000);
  }

  const max = data?.donation_id != null ? Number(data.donation_id) : 0;
  return (Number.isFinite(max) ? max : 0) + 1;
}
