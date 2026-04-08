import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { donorDonationDataQueryKey, fetchDonorDonationData, type DonationRow } from "@/lib/donorQueries";
import { Link } from "react-router-dom";
import { Gift } from "lucide-react";
import { DonationDetailsModal } from "@/components/DonationDetailsModal";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

function formatEstimatedValue(row: DonationRow) {
  const ev =
    row.estimated_value == null
      ? NaN
      : typeof row.estimated_value === "string"
        ? parseFloat(row.estimated_value)
        : Number(row.estimated_value);
  const n = !Number.isNaN(ev) ? ev : 0;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

const formatDate = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString();
};

/**
 * Giving history table (rendered inside the donor portal shell from DonorDashboard).
 */
const DonorGivingHistory = () => {
  const { userEmail } = useAuth();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<DonationRow | null>(null);
  const [filter, setFilter] = useState<"all" | "monetary" | "in_kind" | "service">("all");
  const { data, isPending, isError } = useQuery({
    queryKey: donorDonationDataQueryKey(userEmail),
    queryFn: () => fetchDonorDonationData(userEmail),
    enabled: Boolean(userEmail),
  });

  if (!userEmail) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">Loading your giving history…</div>
    );
  }

  if (isPending) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">Loading your giving history…</div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        We couldn’t load your donations. Please try again later.
      </div>
    );
  }

  const { donations } = data;
  const filtered = donations.filter((d) => {
    const t = (d.donation_type ?? "").trim();
    if (filter === "all") return true;
    if (filter === "monetary") return t === "Monetary";
    if (filter === "in_kind") return t === "In-Kind" || t === "In-Kind Donation";
    return t === "Time";
  });

  if (donations.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl p-8 shadow-warm border border-border text-center max-w-lg mx-auto"
      >
        <Gift className="h-10 w-10 text-primary mx-auto mb-4" />
        <p className="font-heading text-lg font-semibold text-foreground">No gifts yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Welcome! Start your impact journey by making your first donation.
        </p>
        <Link
          to="/impact"
          className="inline-flex mt-6 rounded-full bg-primary text-primary-foreground font-semibold text-sm px-6 py-3 shadow-warm hover:scale-[1.02] transition-transform"
        >
          Make a Donation
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp} className="bg-card rounded-2xl p-6 shadow-warm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">Giving history</h2>
            <p className="text-sm text-muted-foreground">A full view of your contributions ({filtered.length}).</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {[
            { key: "all" as const, label: "All" },
            { key: "monetary" as const, label: "Monetary" },
            { key: "in_kind" as const, label: "In-Kind" },
            { key: "service" as const, label: "Service" },
          ].map((opt) => {
            const active = filter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFilter(opt.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-warm"
                    : "border border-border bg-background text-foreground hover:bg-muted/40"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Estimated value</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr
                  key={d.donation_id}
                  className={`border-b border-border/50 cursor-pointer hover:bg-muted/40 transition-colors ${
                    i % 2 === 0 ? "bg-muted/30" : ""
                  }`}
                  onClick={() => {
                    setSelectedDonation(d);
                    setDetailsOpen(true);
                  }}
                >
                  <td className="py-2.5 text-muted-foreground">{formatDate(d.donation_date)}</td>
                  <td className="py-2.5 font-semibold text-foreground">{formatEstimatedValue(d)}</td>
                </tr>
              ))}

              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-2.5 text-muted-foreground">
                    No donations found for this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </motion.div>

      <DonationDetailsModal
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedDonation(null);
        }}
        donation={selectedDonation}
      />
    </div>
  );
};

export default DonorGivingHistory;
