/** True when PostgREST/Supabase rejects an insert because workflow columns are not on `donations` yet. */
export function isMissingDonationWorkflowColumnMessage(message: string | undefined | null): boolean {
  const m = (message ?? "").toLowerCase();
  if (!m) return false;
  const keys = ["submission_status", "goods_receipt_status", "fulfillment_method", "denial_reason"];
  if (!keys.some((k) => m.includes(k))) return false;
  return (
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("could not find") ||
    m.includes("column")
  );
}

export function stripDonationWorkflowFields<T extends Record<string, unknown>>(payload: T): Omit<T, "submission_status" | "goods_receipt_status" | "fulfillment_method" | "denial_reason"> {
  const next = { ...payload };
  delete (next as Record<string, unknown>).submission_status;
  delete (next as Record<string, unknown>).goods_receipt_status;
  delete (next as Record<string, unknown>).fulfillment_method;
  delete (next as Record<string, unknown>).denial_reason;
  return next;
}
