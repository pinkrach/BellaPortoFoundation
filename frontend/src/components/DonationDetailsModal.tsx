import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { normalizedSubmissionStatus, type DonationRow } from "@/lib/donorQueries";
import { Loader2, MapPin } from "lucide-react";

type AllocationRow = {
  program_area?: string | null;
  safehouse_id?: number | null;
  amount_allocated?: number | string | null;
  safehouses?: Record<string, unknown> | null;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatUsd(value: unknown) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(toNumber(value));
}

function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function safehouseDisplay(safehouse: Record<string, unknown> | null | undefined) {
  if (!safehouse) return "—";
  const name = typeof safehouse.name === "string" ? safehouse.name.trim() : "";
  const city = typeof (safehouse as any).city === "string" ? String((safehouse as any).city).trim() : "";
  const region =
    typeof (safehouse as any).region === "string"
      ? String((safehouse as any).region).trim()
      : typeof (safehouse as any).province === "string"
        ? String((safehouse as any).province).trim()
        : "";

  const left = [region, city].filter(Boolean).join(", ");
  const right = name || "Safehouse";
  return left ? `${left} - ${right}` : right;
}

async function fetchDonationAllocationSummary(donationId: number): Promise<{
  safehouses: string[];
  programAreas: string[];
  hasAllocations: boolean;
}> {
  if (!supabase) return { safehouses: [], programAreas: [], hasAllocations: false };

  const { data, error } = await supabase
    .from("donation_allocations")
    .select("program_area, amount_allocated, safehouse_id, safehouses(*)")
    .eq("donation_id", donationId)
    .order("amount_allocated", { ascending: false });

  if (error || !data?.length) return { safehouses: [], programAreas: [], hasAllocations: false };

  const safehouseSet = new Set<string>();
  const programAreaSet = new Set<string>();

  for (const row of data as unknown as AllocationRow[]) {
    const safehouseLabel = safehouseDisplay((row as any).safehouses ?? null);
    if (safehouseLabel && safehouseLabel !== "—") safehouseSet.add(safehouseLabel);
    const area = (row.program_area ?? "").toString().trim();
    if (area) programAreaSet.add(area);
  }

  return {
    safehouses: Array.from(safehouseSet),
    programAreas: Array.from(programAreaSet),
    hasAllocations: true,
  };
}

export function DonationDetailsModal({
  open,
  onOpenChange,
  donation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  donation: DonationRow | null;
}) {
  const donationId = donation?.donation_id ?? null;

  const allocationQuery = useQuery({
    queryKey: ["donation-allocation-summary", donationId],
    queryFn: () => fetchDonationAllocationSummary(donationId as number),
    enabled: open && donationId != null,
  });

  const amount = useMemo(() => (donation ? donation.amount ?? donation.estimated_value : null), [donation]);

  const submission = donation ? normalizedSubmissionStatus(donation) : null;
  const statusLine = (() => {
    if (!donation || !submission) return null;
    if (submission === "pending") return "Pending staff review";
    if (submission === "denied") return donation.denial_reason?.trim() ? `Not accepted: ${donation.denial_reason}` : "Not accepted";
    if (donation.goods_receipt_status === "not_received") return "Confirmed · Gift not yet marked as received";
    if (donation.goods_receipt_status === "received") return "Confirmed · Gift received";
    return "Confirmed";
  })();

  const fulfillmentLine = donation?.fulfillment_method
    ? donation.fulfillment_method === "ship"
      ? "Shipping"
      : donation.fulfillment_method === "deliver_in_person"
        ? "Deliver in person"
        : donation.fulfillment_method
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl border-border p-0">
        <div className="p-6 sm:p-7">
          <DialogHeader className="pr-8">
            <DialogTitle className="font-heading text-2xl text-foreground">Donation Details</DialogTitle>
            <DialogDescription>Review the details and impact destination for this donation.</DialogDescription>
          </DialogHeader>

          {!donation ? (
            <div className="mt-6 rounded-2xl bg-muted/20 p-4 text-sm text-muted-foreground">No donation selected.</div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-border/60 bg-background p-5 shadow-warm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{formatUsd(amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Date</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{formatDate(donation.donation_date)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background p-5 shadow-warm space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Type</p>
                <p className="text-sm font-semibold text-foreground">{(donation.donation_type ?? "—").trim() || "—"}</p>
                {donation.impact_unit?.trim() ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Units: </span>
                    {donation.impact_unit}
                  </p>
                ) : null}
                {statusLine ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Status: </span>
                    {statusLine}
                  </p>
                ) : null}
                {fulfillmentLine ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Delivery: </span>
                    {fulfillmentLine}
                  </p>
                ) : null}
                {donation.notes?.trim() ? (
                  <div className="pt-2 border-t border-border/60">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                    <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{donation.notes.trim()}</p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/15 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Impact destination</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Safehouse and program area associated with this donation.
                      </p>
                    </div>
                  </div>
                </div>

                {allocationQuery.isFetching ? (
                  <div className="mt-4 rounded-xl bg-background p-4 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading allocation details…
                  </div>
                ) : allocationQuery.isError ? (
                  <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                    We couldn’t load allocation details for this donation.
                  </div>
                ) : allocationQuery.data && !allocationQuery.data.hasAllocations ? (
                  <div className="mt-4 rounded-xl border border-border/70 bg-background p-4 text-sm text-muted-foreground">
                    Donation being processed.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/70 bg-background p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Safe houses impacted</p>
                      <div className="mt-1 space-y-1">
                        {(allocationQuery.data?.safehouses ?? []).length > 0 ? (
                          allocationQuery.data?.safehouses.map((label) => (
                            <p key={label} className="text-sm font-semibold text-foreground">
                              {label}
                            </p>
                          ))
                        ) : (
                          <p className="text-sm font-semibold text-foreground">Unspecified</p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Programs impacted</p>
                      <div className="mt-1 space-y-1">
                        {(allocationQuery.data?.programAreas ?? []).length > 0 ? (
                          allocationQuery.data?.programAreas.map((area) => (
                            <p key={area} className="text-sm font-semibold text-foreground">
                              {area}
                            </p>
                          ))
                        ) : (
                          <p className="text-sm font-semibold text-foreground">Unspecified</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-warm hover:shadow-warm-hover transition-shadow"
            >
              Close
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

