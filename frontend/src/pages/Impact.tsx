import { motion } from "framer-motion";
import { PublicLayout } from "@/components/PublicLayout";
import { WaveDivider } from "@/components/WaveDivider";
import { impactStats, fundraisingGoal, donationsOverTime, donationTypes, safehouseImpact, donationUsage, impactStories } from "@/data/mockData";
import { Heart, MapPin, DollarSign, Share2, User } from "lucide-react";
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
      {/* Header Banner */}
      <section className="bg-gradient-to-r from-primary to-lavender py-16 md:py-24 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground"
          >
            Welcome, Donors — You make this happen
          </motion.h1>
          <p className="mt-4 text-primary-foreground/80 text-lg">Track the impact of your generosity in real time.</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <WaveDivider className="text-background" />
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Fundraising Progress */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="bg-card rounded-2xl p-6 shadow-warm mb-8">
          <h3 className="font-heading text-xl font-semibold text-foreground mb-3">Monthly Fundraising Goal</h3>
          <div className="w-full bg-muted rounded-full h-5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className="h-full bg-gradient-to-r from-secondary to-coral rounded-full"
            />
          </div>
          <p className="mt-2 text-muted-foreground font-medium">
            <span className="text-secondary font-bold">${fundraisingGoal.raised}</span> raised of <span className="font-bold">${fundraisingGoal.goal}</span> goal
          </p>
        </motion.div>

        {/* KPI chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Heart, label: "Girls Helped", value: impactStats.girlsServed, color: "text-secondary" },
            { icon: MapPin, label: "Locations", value: impactStats.safehouses, color: "text-primary" },
            { icon: DollarSign, label: "Monthly Donations", value: `$${fundraisingGoal.raised}`, color: "text-sage" },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="bg-card rounded-2xl p-5 flex items-center gap-4 shadow-warm">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">{kpi.value}</p>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
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

        {/* Impact stories */}
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Anonymous Impact Stories</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* PRIVACY: Never display full names, photos, or identifying details of residents. */}
            {impactStories.map((story, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="bg-gradient-to-br from-lavender/20 to-coral/10 rounded-2xl p-6 shadow-warm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">Survivor, age {story.age}</span>
                </div>
                <p className="text-foreground italic leading-relaxed">"{story.quote}"</p>
                <button className="mt-4 text-primary text-sm flex items-center gap-1 hover:text-primary/80 transition-colors">
                  <Share2 className="h-4 w-4" /> Share this story
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Impact;
