import { motion } from "framer-motion";
import { ArrowRight, Compass, HeartHandshake, Home, Sparkles, ShieldCheck, SunMedium, Waves, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { WaveDivider, WaveDividerTop } from "@/components/WaveDivider";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.55 } }),
};

const pillars = [
  {
    icon: Home,
    title: "Safe Harbor",
    description:
      "We create welcoming spaces where girls can rest, feel protected, and begin rebuilding trust after trauma.",
    accent: "from-primary/20 to-accent/30",
  },
  {
    icon: HeartHandshake,
    title: "Trauma-Informed Care",
    description:
      "Healing is not rushed. We center dignity, therapy, compassion, and patient support at every step.",
    accent: "from-coral/20 to-coral/10",
  },
  {
    icon: Compass,
    title: "Future Pathways",
    description:
      "Education, life skills, and mentorship help each girl imagine a future that is stable, safe, and hopeful.",
    accent: "from-lavender/30 to-accent/15",
  },
];

const values = [
  {
    icon: ShieldCheck,
    title: "Protection First",
    text: "Every decision begins with safety, privacy, and the long-term wellbeing of the girls we serve.",
  },
  {
    icon: Users,
    title: "Community Care",
    text: "We work with caregivers, social workers, donors, and advocates who believe healing happens together.",
  },
  {
    icon: SunMedium,
    title: "Steady Hope",
    text: "Hope is built through consistent care, small wins, and the quiet confidence that change is possible.",
  },
];

const timeline = [
  {
    label: "Rescue",
    body: "Girls arrive after intervention and are met with immediate care, stabilization, and compassionate intake.",
  },
  {
    label: "Restore",
    body: "Counseling, education support, and daily routines help rebuild security, confidence, and trust.",
  },
  {
    label: "Rebuild",
    body: "Through mentorship and practical preparation, we help each girl move toward a safer and more independent future.",
  },
];

const About = () => (
  <PublicLayout>
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-lavender">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_78%_22%,rgba(255,255,255,0.14),transparent_22%),linear-gradient(135deg,transparent,rgba(255,255,255,0.06))]" />
      <div className="absolute top-12 right-8 hidden lg:block text-primary-foreground/15">
        <Waves className="h-40 w-40 animate-wave" />
      </div>
      <div className="container relative z-10 mx-auto px-4 py-24 md:py-32">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }} className="max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-4 py-2 text-sm text-primary-foreground/90">
            <Sparkles className="h-4 w-4" />
            About Bella Porto Foundation
          </div>
          <h1 className="max-w-3xl font-heading text-4xl font-bold leading-tight text-primary-foreground md:text-6xl">
            We believe healing begins when a girl is finally met with safety, tenderness, and room to dream again.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/82 md:text-xl">
            Bella Porto Foundation exists to create a beautiful harbor for girls recovering from abuse and trafficking,
            pairing immediate protection with the long, careful work of restoration.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/impact"
              className="inline-flex items-center gap-2 rounded-full bg-coral px-8 py-3 font-semibold text-foreground shadow-warm transition-transform hover:scale-105"
            >
              Explore Our Impact <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/privacy"
              className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/40 px-8 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
            >
              Our Privacy Commitment
            </Link>
          </div>
        </motion.div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            { number: "24/7", label: "Care-centered support model" },
            { number: "3", label: "Core stages of restoration" },
            { number: "100%", label: "Mission-driven nonprofit focus" },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="rounded-2xl border border-primary-foreground/18 bg-primary-foreground/10 p-6 backdrop-blur-sm"
            >
              <p className="font-heading text-4xl font-bold text-primary-foreground">{item.number}</p>
              <p className="mt-2 text-sm uppercase tracking-[0.24em] text-primary-foreground/72">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <WaveDivider className="text-background" />
      </div>
    </section>

    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}>
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-secondary">Our Story</p>
            <h2 className="mt-4 font-heading text-3xl font-bold text-foreground md:text-5xl">
              A foundation shaped by rescue, restoration, and lasting dignity.
            </h2>
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-muted-foreground">
              <p>
                Bella Porto means beautiful harbor. That image guides our work: a place of refuge after chaos, a place
                where frightened girls are welcomed with gentleness rather than urgency.
              </p>
              <p>
                We support survivors through safe housing, trauma-informed services, education, and trusted relational
                care. Our aim is not only to respond to crisis, but to nurture stability and possibility over time.
              </p>
              <p>
                We also believe transparency matters. Donors, advocates, and administrators should be able to support
                this mission responsibly while respecting the privacy and protection every child deserves.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            variants={fadeUp}
            className="relative"
          >
            <div className="rounded-[2rem] bg-gradient-to-br from-lavender/25 via-card to-coral/10 p-5 shadow-warm-lg">
              <div className="rounded-[1.6rem] border border-border/70 bg-card/95 p-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  {pillars.map((pillar) => (
                    <div key={pillar.title} className={`rounded-2xl bg-gradient-to-br ${pillar.accent} p-5 shadow-warm`}>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-card/80">
                        <pillar.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-heading text-xl font-semibold text-foreground">{pillar.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>

    <section className="relative">
      <WaveDividerTop className="text-muted" />
      <div className="-mt-1 bg-muted py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-primary">What Shapes Our Work</p>
            <h2 className="mt-4 font-heading text-3xl font-bold text-foreground md:text-4xl">The values we return to every day.</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="rounded-2xl bg-card p-7 shadow-warm transition-all hover:-translate-y-1 hover:shadow-warm-hover"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <value.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-heading text-2xl font-semibold text-foreground">{value.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{value.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <WaveDivider className="text-muted -mt-1 rotate-180" />
    </section>

    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}>
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-secondary">How We Walk With Survivors</p>
            <h2 className="mt-4 font-heading text-3xl font-bold text-foreground md:text-4xl">
              Restoration is a journey, not a single intervention.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              The heart of Bella Porto is not just rescue. It is the careful, ongoing work of helping a girl feel safe
              enough to heal, belong, and imagine a future again.
            </p>
          </motion.div>

          <div className="space-y-5">
            {timeline.map((item, index) => (
              <motion.div
                key={item.label}
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-warm"
              >
                <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-b from-primary via-accent to-coral" />
                <div className="pl-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                    <h3 className="font-heading text-2xl font-semibold text-foreground">{item.label}</h3>
                  </div>
                  <p className="mt-4 leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section className="pb-16 md:pb-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0}
          variants={fadeUp}
          className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-primary via-primary to-secondary shadow-warm-lg"
        >
          <div className="grid gap-8 px-8 py-10 md:grid-cols-[1.2fr_0.8fr] md:px-10 md:py-12">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-primary-foreground/70">Stand With Us</p>
              <h2 className="mt-4 max-w-2xl font-heading text-3xl font-bold text-primary-foreground md:text-4xl">
                Every safe space, every restored routine, and every step toward healing is sustained by people who care.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-primary-foreground/80">
                Learn how support is translated into real care, responsible stewardship, and tangible impact for the girls
                we serve.
              </p>
            </div>
            <div className="flex flex-col justify-center gap-4">
              <Link
                to="/impact"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-6 py-3 font-semibold text-primary transition-transform hover:scale-[1.02]"
              >
                See Our Impact <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  </PublicLayout>
);

export default About;
