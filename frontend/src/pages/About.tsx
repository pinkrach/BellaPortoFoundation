import { motion } from "framer-motion";
import { ArrowRight, Compass, HeartHandshake, Home, Sparkles, ShieldCheck, SunMedium, Waves, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { WaveDivider } from "@/components/WaveDivider";

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
    <section className="bg-background py-20 md:py-28">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-[hsl(40_42%_99%_/_0.45)] px-4 py-2 text-sm text-[hsl(200_14%_36%)]">
            <Sparkles className="h-4 w-4 text-[hsl(272_18%_48%)]" />
            About Bella Bay Foundation
          </div>
          <h1 className="mt-6 font-heading text-4xl font-semibold leading-tight text-[hsl(200_26%_18%)] md:text-6xl">
            We believe healing begins when a girl is finally met with safety, tenderness, and room to dream again.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[hsl(200_14%_38%)] md:text-xl">
            Bella Bay Foundation exists to create a calm harbor for girls recovering from abuse and trafficking—pairing
            immediate protection with the long, careful work of restoration.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link
              to="/impact"
              className="inline-flex items-center gap-2 rounded-full bg-[#6E8F6B] px-8 py-3 text-base font-semibold text-[hsl(40_44%_99%)] shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E8F6B]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Explore Our Impact <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/privacy"
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/0 px-8 py-3 text-base font-semibold text-[hsl(200_22%_22%)] transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(200_20%_40%)] focus-visible:ring-offset-2"
            >
              Our Privacy Commitment
            </Link>
          </div>
        </motion.div>
      </div>
    </section>

    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}>
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[hsl(200_12%_42%)]">Our Story</p>
            <h2 className="mt-4 font-heading text-3xl font-semibold text-[hsl(200_24%_18%)] md:text-5xl">
              A foundation shaped by rescue, restoration, and lasting dignity.
            </h2>
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-[hsl(200_14%_38%)]">
              <p>
                Bella Bay means beautiful harbor. That image guides our work: a place of refuge after chaos, a place
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
            <div className="rounded-[2rem] bg-[hsl(40_42%_99%_/_0.45)] p-5 shadow-warm">
              <div className="rounded-[1.6rem] border border-border/70 bg-background/80 p-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  {pillars.map((pillar) => (
                    <div key={pillar.title} className="rounded-2xl border border-border/60 bg-background/60 p-5">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/40">
                        <pillar.icon className="h-6 w-6 text-[hsl(205_22%_40%)]" />
                      </div>
                      <h3 className="font-heading text-xl font-semibold text-[hsl(200_24%_18%)]">{pillar.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[hsl(200_14%_38%)]">{pillar.description}</p>
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
      <WaveDivider className="text-muted" />
      <div className="-mt-px bg-muted py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[hsl(200_12%_42%)]">What Shapes Our Work</p>
            <h2 className="mt-4 font-heading text-3xl font-semibold text-[hsl(200_24%_18%)] md:text-4xl">The values we return to every day.</h2>
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
                className="rounded-2xl border border-border/60 bg-background/60 p-7"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-background/70">
                  <value.icon className="h-7 w-7 text-[hsl(272_18%_48%)]" />
                </div>
                <h3 className="font-heading text-2xl font-semibold text-[hsl(200_24%_18%)]">{value.title}</h3>
                <p className="mt-3 leading-relaxed text-[hsl(200_14%_38%)]">{value.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <WaveDivider className="-mt-px text-background" />
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
              The heart of Bella Bay is not just rescue. It is the careful, ongoing work of helping a girl feel safe
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
