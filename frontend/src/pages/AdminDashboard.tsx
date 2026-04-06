import { AdminLayout } from "@/components/AdminLayout";
import { motion } from "framer-motion";
import { Users, Heart, BarChart3, Calendar, Sparkles } from "lucide-react";
import { adminStats, residentStatusByHouse, mlInsights, recentDonations } from "@/data/mockData";
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

const AdminDashboard = () => (
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
                {recentDonations.map((d, i) => (
                  <tr key={d.id} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                    <td className="py-2.5">{d.donor}</td>
                    <td className="py-2.5 font-semibold text-foreground">${d.amount}</td>
                    <td className="py-2.5 text-muted-foreground">{d.date}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium">{d.type}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
);

export default AdminDashboard;
