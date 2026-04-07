import { AdminLayout } from "@/components/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, Heart, BarChart3, Calendar, Sparkles } from "lucide-react";
import { adminStats, residentStatusByHouse, mlInsights } from "@/data/mockData";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const kpis = [
  { label: "Active Residents", value: adminStats.activeResidents, icon: Users },
  { label: "Monthly Donations", value: `$${adminStats.monthlyDonations}`, icon: Heart },
  { label: "Social Engagement", value: adminStats.socialMediaEngagement.toLocaleString(), icon: BarChart3 },
  { label: "Upcoming Conferences", value: adminStats.upcomingConferences, icon: Calendar },
];

type RecentDonation = {
  donation_id: number;
  donation_type: string | null;
  donation_date: string | null;
  amount: number | string | null;
  estimated_value: number | string | null;
  currency_code: string | null;
  supporters?: {
    display_name?: string | null;
    organization_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

const isLocalHost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (isLocalHost ? "http://localhost:5250" : "");

function getSupporterName(donation: RecentDonation) {
  const display = donation.supporters?.display_name?.trim();
  if (display) return display;

  const org = donation.supporters?.organization_name?.trim();
  if (org) return org;

  const fullName = [donation.supporters?.first_name, donation.supporters?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || "Unknown";
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function formatCurrency(value: number | string | null | undefined, code = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDonationDate(value: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

async function fetchRecentDonations(): Promise<RecentDonation[]> {
  const endpoint = apiBaseUrl ? `${apiBaseUrl}/api/donations` : "/api/donations";
  const response = await fetch(endpoint);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to load donations.");
  }

  const rows = (await response.json()) as RecentDonation[];
  return rows
    .slice()
    .sort((a, b) => new Date(b.donation_date ?? 0).getTime() - new Date(a.donation_date ?? 0).getTime())
    .slice(0, 8);
}

const AdminDashboard = () => {
  const recentDonationsQuery = useQuery({
    queryKey: ["dashboard-recent-donations"],
    queryFn: fetchRecentDonations,
  });

  return (
    <AdminLayout>
    {/* KPI Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          custom={i}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="bg-card rounded-2xl p-5 shadow-warm border-t-4 border-secondary hover:shadow-warm-hover transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <kpi.icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
          <p className="text-sm text-muted-foreground mt-1">{kpi.label}</p>
        </motion.div>
      ))}
    </div>

    {/* Main content */}
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Pie Chart */}
      <div className="bg-card rounded-2xl p-6 shadow-warm">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Resident Status by Safehouse</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={residentStatusByHouse} cx="50%" cy="50%" innerRadius={55} outerRadius={100} dataKey="value" paddingAngle={4}>
              {residentStatusByHouse.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Right column */}
      <div className="space-y-6">
        {/* ML Insights */}
        <div className="bg-card rounded-2xl shadow-warm overflow-hidden">
          <div className="bg-primary px-6 py-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h3 className="font-heading text-base font-semibold text-primary-foreground">ML Insights & Recommendations</h3>
          </div>
          <div className="p-4 space-y-3">
            {mlInsights.map((insight, i) => (
              <div key={i} className="p-3 rounded-xl bg-muted/50">
                <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
              </div>
            ))}
            <button className="text-sm text-primary font-medium hover:underline">View Details →</button>
          </div>
        </div>

        {/* Recent Donations */}
        <div className="bg-card rounded-2xl p-6 shadow-warm">
          <h3 className="font-heading text-base font-semibold text-foreground mb-4">Recent Donations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 font-medium">Donor</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {recentDonationsQuery.isLoading ? (
                  <tr>
                    <td className="py-2.5 text-muted-foreground" colSpan={4}>
                      Loading recent donations...
                    </td>
                  </tr>
                ) : null}

                {recentDonationsQuery.error ? (
                  <tr>
                    <td className="py-2.5 text-destructive" colSpan={4}>
                      {(recentDonationsQuery.error as Error).message}
                    </td>
                  </tr>
                ) : null}

                {recentDonationsQuery.data?.map((d, i) => (
                  <tr key={d.donation_id} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                    <td className="py-2.5">{getSupporterName(d)}</td>
                    <td className="py-2.5 font-semibold text-foreground">
                      {d.donation_type === "Monetary"
                        ? formatCurrency(d.amount, d.currency_code ?? "PHP")
                        : formatCurrency(d.estimated_value, d.currency_code ?? "PHP")}
                    </td>
                    <td className="py-2.5 text-muted-foreground">{formatDonationDate(d.donation_date)}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium">
                        {d.donation_type ?? "Unknown"}
                      </span>
                    </td>
                  </tr>
                ))}

                {recentDonationsQuery.data && recentDonationsQuery.data.length === 0 ? (
                  <tr>
                    <td className="py-2.5 text-muted-foreground" colSpan={4}>
                      No donations found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
