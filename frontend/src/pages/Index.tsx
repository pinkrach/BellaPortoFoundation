import { motion, useReducedMotion } from "framer-motion";
import { Heart, Home, Star, Quote, Shield, ArrowRight } from "lucide-react";
import { WaveDivider } from "@/components/WaveDivider";
import { PublicLayout } from "@/components/PublicLayout";
import { Link } from "react-router-dom";
import { impactStats, testimonials } from "@/data/mockData";
import heroImage from "@/assets/hero/portofino-watercolor-hero.png";
import nbTitleIcon from "@/assets/icons/nbTitleIcon.png";

const steps = [
  { icon: Shield, title: "Safety", description: "We partner with authorities to rescue girls from danger and bring them into a secure, caring environment where they can breathe again." },
  { icon: Heart, title: "Healing", description: "Through trauma-informed therapy, education, and community, we help each girl process her past and rediscover her own strength and worth." },
  { icon: Star, title: "New Beginnings", description: "When she is ready, we walk alongside her into a hopeful future — with mentorship, life skills, and a community cheering her on." },
];

const MONTHLY_FUNDRAISING_GOAL = 25_000;
const MONTHLY_FUNDRAISING_RAISED = 16_750;

const Index = () => {
  const reduceMotion = useReducedMotion();
  const progress = Math.min(MONTHLY_FUNDRAISING_RAISED / MONTHLY_FUNDRAISING_GOAL, 1);
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const fadeUp = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: reduceMotion ? 0 : i * 0.1,
        duration: reduceMotion ? 0.01 : 0.5,
      },
    }),
  };

  return (
    <PublicLayout>
      <div className="home-page w-full max-w-none overflow-x-hidden bg-background">

        {/* ── Hero: full-bleed watercolor image + dark overlay, white text (lovable style) ── */}
        <section
          aria-labelledby="hero-heading"
          className="relative min-h-screen flex items-center overflow-hidden"
        >
          {/* Background image */}
          <div className="absolute inset-0 z-0 w-full">
            <img
              src={heroImage}
              alt="Watercolor painting of a Mediterranean bay inspired by Portofino, with colorful waterfront buildings, calm water, and a small boat."
              className="h-full w-full object-cover object-bottom"
            />
          </div>

          {/* Dark overlay — makes white text legible across the whole hero */}
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[hsl(205,38%,16%,0.72)] via-[hsl(200,55%,30%,0.50)] to-transparent"
            aria-hidden="true"
          />

          <div className="container relative z-10 mx-auto px-4 py-24 md:py-36">
            <motion.div
              initial={{ opacity: 0, y: reduceMotion ? 0 : 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.7 }}
              className="max-w-2xl"
            >
              <h1
                id="hero-heading"
                className="font-heading text-4xl font-bold leading-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl lg:text-7xl"
              >
                Safety, Healing,{" "}
                <span className="whitespace-nowrap">New Beginnings</span>
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-white/90 drop-shadow-md md:text-xl max-w-xl">
                Founded in Portofino, Bella Bay Foundation provides long&#8209;term support for girls recovering from
                trafficking and abuse—offering safety, dignity, and a place to begin again.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/impact"
                  className="inline-flex items-center gap-2 rounded-full bg-[hsl(278,26%,76%)] px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:scale-105 hover:bg-[hsl(278,26%,70%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                >
                  Help a girl heal <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#mission"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-white/70 px-8 py-3 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                >
                  Learn our mission
                </a>
              </div>
            </motion.div>
          </div>

          {/* Wave cream colour = bg-background (stats section below) — z-10 keeps it above the dark overlay */}
          <div className="absolute bottom-0 left-0 right-0 z-10 w-full overflow-hidden">
            <WaveDivider className="text-background" />
          </div>
        </section>

        {/* ── Impact Stats — cream background (bg-background) ── */}
        <section className="bg-background py-20 md:py-28" aria-labelledby="impact-stats-heading">
          <div className="container mx-auto px-4">
            <h2 id="impact-stats-heading" className="sr-only">Our impact in numbers</h2>
            <div className="grid grid-cols-1 gap-14 md:grid-cols-3 md:gap-10">
              {[
                { label: "Girls Served",    value: impactStats.girlsServed,    icon: Heart },
                { label: "Safehouses",      value: impactStats.safehouses,      icon: Home  },
                { label: "Reintegrations",  value: impactStats.reintegrations,  icon: Star  },
              ].map((stat, i) => (
                <motion.article
                  key={stat.label}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="flex flex-col items-center text-center"
                >
                  <p className="font-heading text-5xl font-medium tabular-nums tracking-tight text-[hsl(205_22%_40%)] md:text-6xl">
                    {stat.value}
                  </p>
                  <h3 className="mx-auto mt-3 max-w-[14rem] text-sm font-normal leading-snug text-[hsl(200_14%_44%)] md:text-base">
                    {stat.label}
                  </h3>
                  <stat.icon
                    className="mt-4 h-12 w-12 text-[hsl(272_18%_58%)]"
                    strokeWidth={1.2}
                    aria-hidden="true"
                  />
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works — sand/muted background for clear cream-vs-sand distinction ──
             Wave in = text-muted (muted fill on cream background → looks like sand rising up)
             Wave out = text-background (cream fill so the next section blends seamlessly) */}
        <section className="relative" aria-labelledby="how-heading">
          <WaveDivider className="text-muted" />
          <div className="bg-muted -mt-1 py-16 md:py-20">
            <div className="container mx-auto px-4">
              <h2
                id="how-heading"
                className="mb-4 text-center font-heading text-3xl font-semibold tracking-tight text-[hsl(200_24%_20%)] md:text-4xl"
              >
                How It Works
              </h2>
              <div className="mx-auto mb-12 h-0.5 w-11 rounded-full bg-[hsl(44_30%_44%)]" aria-hidden="true" />
              <div className="grid gap-6 md:grid-cols-3">
                {steps.map((step, i) => (
                  <motion.article
                    key={step.title}
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    className="overflow-hidden rounded-2xl bg-card shadow-warm hover:-translate-y-1 hover:shadow-warm-hover transition-all"
                    aria-labelledby={`step-title-${i}`}
                  >
                    <div className="h-1.5 bg-lavender" />
                    <div className="p-6 md:p-8">
                      <div className="mb-5 inline-flex rounded-xl bg-lavender/20 p-3" aria-hidden="true">
                        <step.icon className="h-6 w-6 text-[hsl(44_28%_42%)]" strokeWidth={1.35} />
                      </div>
                      <h3
                        id={`step-title-${i}`}
                        className="mb-2 font-heading text-xl font-medium leading-snug text-[hsl(200_24%_18%)]"
                      >
                        <span className="mr-1.5 font-normal text-[hsl(44_28%_42%)]">{i + 1}.</span>
                        {step.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>
          </div>
          <WaveDivider className="text-muted -mt-1 rotate-180" />
        </section>

        {/* ── Mission — cream background (bg-background) ── */}
        <section id="mission" className="bg-background py-20 md:py-28" aria-labelledby="mission-heading">
          <div className="container mx-auto px-4">
            <div className="grid items-center gap-16 md:grid-cols-2 md:gap-20">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                <h2 id="mission-heading" className="font-heading text-3xl font-semibold tracking-tight text-[hsl(200_26%_18%)] md:text-4xl">
                  Our Mission
                </h2>
                <div className="mt-4 h-0.5 w-11 rounded-full bg-[hsl(272_20%_52%)]" aria-hidden="true" />
                <p className="mt-6 text-lg leading-[1.75] text-[hsl(200_14%_38%)] md:mt-7">
                  Bella Bay Foundation is rooted in Portofino, creating a calm, welcoming refuge for girls who have survived
                  abuse and trafficking. Through our network of safehomes, we offer shelter, trauma-informed care, education,
                  and a pathway to healing—as open and hopeful as the bay itself. Every girl deserves a chance to dream again.
                </p>
              </motion.div>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={1}
                className="flex items-center justify-center"
              >
                <img
                  src={nbTitleIcon}
                  alt="Bella Bay Foundation emblem"
                  className="w-full max-w-[300px] md:max-w-[360px]"
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Monthly Fundraising — cream band framed by the same sand waves as “How It Works” ── */}
        <section className="relative" aria-labelledby="fundraising-heading">
          <WaveDivider className="text-muted" />
          <div className="bg-muted -mt-1 py-16 md:py-20">
            <div className="container mx-auto px-4">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={0}
                className="mx-auto max-w-4xl"
              >
                <h2 id="fundraising-heading" className="sr-only">
                  Monthly fundraising
                </h2>

                <div className="rounded-3xl border border-border/60 bg-[hsl(40_42%_99%_/_0.45)] px-6 py-8 md:px-10 md:py-10">
                  <div className="flex flex-col gap-2 text-center md:flex-row md:items-end md:justify-between md:text-left">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(200_12%_42%)]">
                        Monthly fundraising goal
                      </p>
                      <p className="mt-2 font-heading text-2xl font-medium tracking-tight text-[hsl(200_24%_18%)] md:text-3xl">
                        {money.format(MONTHLY_FUNDRAISING_GOAL)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(200_12%_42%)]">
                        Raised so far
                      </p>
                      <p className="mt-2 font-heading text-2xl font-medium tracking-tight text-[#6E8F6B] md:text-3xl tabular-nums">
                        {money.format(MONTHLY_FUNDRAISING_RAISED)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-7">
                    <div
                      role="progressbar"
                      aria-label="Monthly fundraising progress"
                      aria-valuemin={0}
                      aria-valuemax={MONTHLY_FUNDRAISING_GOAL}
                      aria-valuenow={MONTHLY_FUNDRAISING_RAISED}
                      className="h-3 w-full overflow-hidden rounded-full bg-muted/40"
                    >
                      <div
                        className="h-full rounded-full bg-[#6E8F6B] transition-[width] duration-1000 ease-in-out"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs font-normal text-[hsl(200_12%_40%)]">
                      <span className="tabular-nums">{Math.round(progress * 100)}%</span>
                      <span className="tabular-nums">
                        {money.format(Math.max(MONTHLY_FUNDRAISING_GOAL - MONTHLY_FUNDRAISING_RAISED, 0))} to go
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-7 flex flex-col items-center justify-center gap-3 text-center md:flex-row md:gap-4">
                  <p className="text-sm font-medium tracking-[0.08em] uppercase text-[hsl(200_22%_24%)]">
                    Help us reach our goal.
                  </p>
                  <Link
                    to="/impact"
                    className="inline-flex items-center justify-center rounded-full bg-[#6E8F6B] px-7 py-2.5 text-sm font-semibold text-[hsl(40_44%_99%)] shadow-md shadow-[hsl(150_24%_40%_/_0.28)] transition hover:brightness-110 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E8F6B]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(40_46%_97%)]"
                  >
                    Donate today
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
          <WaveDivider className="text-muted -mt-1 rotate-180" />
        </section>

        {/* ── Testimonials — cream background (bg-background), wave above already handled by How It Works exit ── */}
        <section
          className="bg-background pb-20 pt-16 md:pb-28 md:pt-20"
          aria-labelledby="testimonials-heading"
        >
          <div className="container mx-auto px-4">
            <h2
              id="testimonials-heading"
              className="mb-4 text-center font-heading text-3xl font-semibold tracking-tight text-[hsl(200_24%_20%)] md:text-4xl"
            >
              Words from Our Supporters
            </h2>
            <div className="mx-auto mb-12 h-0.5 w-11 rounded-full bg-[hsl(24_26%_58%)]" aria-hidden="true" />
            <div className="grid gap-10 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <motion.figure
                  key={i}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="home-watercolor-quote relative rounded-3xl px-6 py-9 md:px-8 md:py-11"
                >
                  <Quote
                    className="pointer-events-none absolute right-5 top-6 h-6 w-6 text-[hsl(24_28%_52%_/_0.42)] md:h-7 md:w-7"
                    aria-hidden="true"
                  />
                  <blockquote>
                    <p className="text-[1.0625rem] font-normal leading-[1.85] text-[hsl(200_22%_22%)] md:text-lg">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </blockquote>
                  <figcaption className="mt-6 text-sm font-normal text-[hsl(200_12%_42%)]">
                    &mdash; {t.author}
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          </div>
        </section>

      </div>
    </PublicLayout>
  );
};

export default Index;
