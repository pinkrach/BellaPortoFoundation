import { AdminLayout } from "@/components/AdminLayout";
import { motion } from "framer-motion";
import { Users, Heart, BarChart3, Calendar, Sparkles } from "lucide-react";
import { mlInsights } from "@/data/mockData";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useAdminDashboardData } from "@/hooks/useAdminDashboardData";
import { useNavigate } from "react-router-dom";

const activeReports = mlInsights
  .map((insight, originalIndex) => ({ insight, originalIndex }))
  .filter(({ insight }) => /high-risk/i.test(insight.title) || /high risk/i.test(insight.title));

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const AdminDashboard = () => {
  const { data } = useAdminDashboardData();
  const navigate = useNavigate();

  const kpis = [
    { label: "Active Residents", value: data?.kpis?.[0]?.value ?? "—", icon: Users },
    { label: "Monthly Donations", value: data?.kpis?.[1]?.value ?? "—", icon: Heart },
    { label: "Social Engagement", value: data?.kpis?.[2]?.value ?? "—", icon: BarChart3 },
    { label: "Upcoming Conferences", value: data?.kpis?.[3]?.value ?? "—", icon: Calendar },
  ];

  const residentStatusByHouse = data?.residentStatusByHouse ?? [];
  const recentDonations = data?.recentDonations ?? [];

  type RecentDonation = (typeof recentDonations)[number];

  const toNumber = (value: unknown) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const formatDonationDate = (value: unknown) => {
    if (typeof value !== "string" || !value) return "-";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  };

  const formatCurrency = (value: unknown, code = "PHP") =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(toNumber(value));

  const getSupporterName = (donation: RecentDonation) => {
    const supporters = (donation as any)?.supporters;
    const display = typeof supporters?.display_name === "string" ? supporters.display_name.trim() : "";
    if (display) return display;
    const org = typeof supporters?.organization_name === "string" ? supporters.organization_name.trim() : "";
    if (org) return org;
    const first = typeof supporters?.first_name === "string" ? supporters.first_name.trim() : "";
    const last = typeof supporters?.last_name === "string" ? supporters.last_name.trim() : "";
    const full = `${first} ${last}`.trim();
    return full || "Unknown";
  };

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
            <h3 className="font-heading text-base font-semibold text-primary-foreground">Reports</h3>
          </div>
          <div className="p-4 space-y-3">
            {activeReports.map(({ insight, originalIndex }) => (
              <button
                key={originalIndex}
                onClick={() => navigate(`/admin/reports?item=${originalIndex}`)}
                className="w-full text-left p-3 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                <p className="text-sm font-semibold text-foreground">High Risk Resident Review</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Prioritize residents most likely to need urgent follow‑up in the next 30 days.
                </p>
              </button>
            ))}
            <button
              onClick={() => navigate("/admin/reports")}
              className="text-sm text-primary font-medium hover:underline"
            >
              View all reports →
            </button>
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
                {recentDonations.map((d: any, i: number) => (
                  <tr key={d.donation_id ?? i} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
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

                {recentDonations.length === 0 ? (
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
