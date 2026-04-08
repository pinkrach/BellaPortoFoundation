import { motion } from "framer-motion";
import { PublicLayout } from "@/components/PublicLayout";
import { WaveDivider } from "@/components/WaveDivider";
import { impactStats, fundraisingGoal, donationsOverTime, donationTypes, safehouseImpact, donationUsage } from "@/data/mockData";
import { Heart, MapPin, DollarSign } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const Impact = () => {
  const progressPercent = (fundraisingGoal.raised / fundraisingGoal.goal) * 100;

  return (
    <PublicLayout>
      {/* Header */}
      <section className="bg-background py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mx-auto max-w-4xl text-center">
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-[hsl(200_26%_18%)] md:text-6xl">
              Our Impact
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[hsl(200_14%_38%)] md:text-xl">
              A clear view into the work your generosity sustains—measured with care, shared with respect.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 md:py-14">
        {/* Fundraising Progress */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="mb-10 rounded-3xl border border-border/60 bg-[hsl(40_42%_99%_/_0.45)] p-6 md:p-8"
        >
          <h2 className="font-heading text-2xl font-semibold text-[hsl(200_24%_18%)]">Monthly fundraising goal</h2>
          <div className="mt-5 w-full rounded-full bg-muted/40 h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className="h-full rounded-full bg-[#6E8F6B]"
            />
          </div>
          <p className="mt-4 text-sm font-normal text-[hsl(200_12%_40%)]">
            <span className="font-semibold text-[#6E8F6B]">${fundraisingGoal.raised}</span> raised of{" "}
            <span className="font-semibold text-[hsl(200_22%_22%)]">${fundraisingGoal.goal}</span> goal
          </p>
        </motion.div>

        {/* KPI chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Heart, label: "Girls Helped", value: impactStats.girlsServed, color: "text-[hsl(24_26%_58%)]" },
            { icon: MapPin, label: "Locations", value: impactStats.safehouses, color: "text-[hsl(205_22%_40%)]" },
            { icon: DollarSign, label: "Monthly Donations", value: `$${fundraisingGoal.raised}`, color: "text-[#6E8F6B]" },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="rounded-3xl border border-border/60 bg-background/60 p-5 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center">
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[hsl(200_24%_18%)]">{kpi.value}</p>
                <p className="text-sm text-[hsl(200_12%_42%)]">{kpi.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="bg-card rounded-2xl p-6 shadow-warm">
            <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Donations Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={donationsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(36, 20%, 85%)" />
                <XAxis dataKey="month" stroke="hsl(205, 20%, 40%)" fontSize={12} />
                <YAxis stroke="hsl(205, 20%, 40%)" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="hsl(195, 66%, 32%)" strokeWidth={3} dot={{ fill: "hsl(195, 66%, 32%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-2xl p-6 shadow-warm">
            <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Donation Types</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={donationTypes} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" paddingAngle={4}>
                  {donationTypes.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar chart */}
        <div className="bg-card rounded-2xl p-6 shadow-warm mb-10">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Safehouse Impact by Month</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={safehouseImpact}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(36, 20%, 85%)" />
              <XAxis dataKey="month" stroke="hsl(205, 20%, 40%)" fontSize={12} />
              <YAxis stroke="hsl(205, 20%, 40%)" fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="A" fill="hsl(195, 66%, 32%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="B" fill="hsl(11, 52%, 52%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="C" fill="hsl(282, 28%, 72%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* What donations are used for */}
        <div className="mb-10">
          <h2 className="font-heading text-2xl font-bold text-foreground mb-6">What Your Donations Are Used For</h2>
          <Accordion type="single" collapsible className="space-y-3">
            {donationUsage.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="bg-card rounded-2xl border-0 shadow-warm overflow-hidden">
                <AccordionTrigger className="px-6 py-4 text-foreground font-semibold hover:no-underline">
                  {item.title}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-muted-foreground">
                  {item.description}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

      </div>
    </PublicLayout>
  );
};

export default Impact;
