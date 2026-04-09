import { motion } from "framer-motion";
import { PublicLayout } from "@/components/PublicLayout";
import { impactStats, donationsOverTime, donationTypes, safehouseImpact, donationUsage } from "@/data/mockData";
import { Heart, MapPin, DollarSign, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/hero/portofino-watercolor-hero.png";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const Impact = () => {
  const { isAuthenticated, role } = useAuth();
  const YEARLY_GOAL = 10_000;
  const yearRaised = donationsOverTime.reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
  const progressPercent = Math.min((yearRaised / YEARLY_GOAL) * 100, 100);
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const donateLink = isAuthenticated && role === "donor" ? "/dashboard?donate=1" : "/signup";

  return (
    <PublicLayout>
      {/* Hero — same houses / water image as home, dimmed for headline + donate CTA */}
      <section aria-labelledby="impact-heading" className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Watercolor painting of a Mediterranean bay inspired by Portofino, with waterfront buildings and calm water."
            className="h-full min-h-[320px] w-full object-cover object-[35%_100%] sm:min-h-[380px] sm:object-bottom md:min-h-[420px]"
          />
        </div>
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[hsl(205,38%,16%,0.75)] via-[hsl(200,55%,30%,0.55)] to-[hsl(200,30%,20%,0.35)]"
          aria-hidden
        />
        <div className="container relative z-10 mx-auto flex min-h-[360px] flex-col items-center justify-center px-4 py-16 md:min-h-[440px] md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="mx-auto w-full max-w-4xl text-center"
          >
            <h1
              id="impact-heading"
              className="font-heading text-4xl font-bold leading-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl"
            >
              Our Impact
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/90 drop-shadow-md md:text-xl">
              A clear view into the work your generosity sustains—measured with care, shared with respect.
            </p>
            <Link
              to={donateLink}
              title="Create an account to donate"
              className="mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#ad4f6e] px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:scale-[1.02] hover:bg-[#9c4562] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              Donate Now
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
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
          <h2 className="font-heading text-2xl font-semibold text-[hsl(200_24%_18%)]">2026 fundraising goal</h2>
          <div
            role="progressbar"
            aria-label="Yearly fundraising progress"
            aria-valuemin={0}
            aria-valuemax={YEARLY_GOAL}
            aria-valuenow={Math.round(yearRaised)}
            className="mt-5 h-3 w-full overflow-hidden rounded-full bg-muted/40"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className="h-full rounded-full bg-[#4A7A52]"
            />
          </div>
          <p className="mt-4 text-sm font-normal text-[hsl(200_12%_40%)]">
            <span className="font-semibold text-[#4A7A52]">{money.format(yearRaised)}</span> raised this year of{" "}
            <span className="font-semibold text-[hsl(200_22%_22%)]">{money.format(YEARLY_GOAL)}</span> goal
          </p>
        </motion.div>

        {/* KPI chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Heart, label: "Girls Helped", value: impactStats.girlsServed, color: "text-[hsl(24_26%_58%)]" },
            { icon: MapPin, label: "Locations", value: impactStats.safehouses, color: "text-[hsl(205_22%_40%)]" },
            { icon: DollarSign, label: "Raised This Year", value: money.format(yearRaised), color: "text-[#4A7A52]" },
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40" aria-hidden="true">
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
          <div className="rounded-2xl bg-card p-6 shadow-warm">
            <h3 id="impact-chart-donations-time" className="mb-4 font-heading text-lg font-semibold text-foreground">
              Donations Over Time
            </h3>
            <div
              role="img"
              aria-labelledby="impact-chart-donations-time"
              className="min-h-[250px] w-full overflow-x-auto [-webkit-overflow-scrolling:touch]"
            >
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={donationsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(36, 20%, 85%)" />
                  <XAxis dataKey="month" stroke="hsl(205, 20%, 40%)" fontSize={12} />
                  <YAxis stroke="hsl(205, 20%, 40%)" fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="amount" stroke="#5A8FA0" strokeWidth={3} dot={{ fill: "#5A8FA0" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl bg-card p-6 shadow-warm">
            <h3 id="impact-chart-donation-types" className="mb-4 font-heading text-lg font-semibold text-foreground">
              Donation Types
            </h3>
            <div
              role="img"
              aria-labelledby="impact-chart-donation-types"
              className="min-h-[250px] w-full overflow-x-auto [-webkit-overflow-scrolling:touch]"
            >
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
        </div>

        {/* Bar chart */}
        <div className="mb-10 rounded-2xl bg-card p-6 shadow-warm">
          <h3 id="impact-chart-safehouse" className="mb-4 font-heading text-lg font-semibold text-foreground">
            Safehouse Impact by Month
          </h3>
          <div
            role="img"
            aria-labelledby="impact-chart-safehouse"
            className="min-h-[280px] w-full overflow-x-auto [-webkit-overflow-scrolling:touch]"
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={safehouseImpact}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(36, 20%, 85%)" />
                <XAxis dataKey="month" stroke="hsl(205, 20%, 40%)" fontSize={12} />
                <YAxis stroke="hsl(205, 20%, 40%)" fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="A" fill="#5A8FA0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="B" fill="#C17A3A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="C" fill="#9B7FC0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
