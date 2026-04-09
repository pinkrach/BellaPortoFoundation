import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Heart, Star, Quote, Shield, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { WaveDivider } from "@/components/WaveDivider";
import { PublicLayout } from "@/components/PublicLayout";
import { Link } from "react-router-dom";
import { donationsOverTime, testimonials } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/hero/portofino-watercolor-hero.png";
import nbTitleIcon from "@/assets/icons/nbTitleIcon.png";
import portofino1 from "@/assets/portofino/portofino-1.png";
import portofino2 from "@/assets/portofino/portofino-2.png";
import portofino3 from "@/assets/portofino/portofino-3.png";
import portofino4 from "@/assets/portofino/portofino-4.png";
import portofino5 from "@/assets/portofino/portofino-5.png";
import portofino6 from "@/assets/portofino/portofino-6.png";
import portofino7 from "@/assets/portofino/portofino-7.png";
import portofino8 from "@/assets/portofino/portofino-8.png";

const steps = [
  { icon: Shield, title: "Safety", description: "We partner with authorities to rescue girls from danger and bring them into a secure, caring environment where they can breathe again." },
  { icon: Heart, title: "Healing", description: "Through trauma-informed therapy, education, and community, we help each girl process her past and rediscover her own strength and worth." },
  { icon: Star, title: "New Beginnings", description: "When she is ready, we walk alongside her into a hopeful future — with mentorship, life skills, and a community cheering her on." },
];

const YEARLY_FUNDRAISING_GOAL = 10_000;

const Index = () => {
  const { isAuthenticated, role } = useAuth();
  const reduceMotion = useReducedMotion();
  const yearlyRaised = donationsOverTime.reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
  const progress = Math.min(yearlyRaised / YEARLY_FUNDRAISING_GOAL, 1);
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const [carouselIndex, setCarouselIndex] = useState(0);

  const carouselImages = [
    { src: portofino1, alt: "Harbor view with colorful waterfront buildings under a cloudy sky." },
    { src: portofino2, alt: "Sunlit harbor and hillside with boats docked along the shore." },
    { src: portofino3, alt: "Sailboat in the foreground with the village waterfront behind it." },
    { src: portofino4, alt: "Waterfront buildings and boats along the harbor under a cloudy sky." },
    { src: portofino5, alt: "Wide view of the bay with deep blue water and a bright sky." },
    { src: portofino6, alt: "Harbor boats and waterfront buildings seen from a pier on a cloudy day." },
    { src: portofino7, alt: "Hillside coastline and pastel buildings lining the curve of the bay." },
    { src: portofino8, alt: "Shadows on a stone path, hands reaching toward each other." },
  ] as const;

  const goPrev = () => setCarouselIndex((i) => (i - 1 + carouselImages.length) % carouselImages.length);
  const goNext = () => setCarouselIndex((i) => (i + 1) % carouselImages.length);
  const visibleCarouselIndices = [
    carouselIndex,
    (carouselIndex + 1) % carouselImages.length,
    (carouselIndex + 2) % carouselImages.length,
  ];
  const donateLink = isAuthenticated && role === "donor" ? "/dashboard?donate=1" : "/signup";

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
              className="h-full w-full object-cover object-[35%_100%] sm:object-bottom"
            />
          </div>

          {/* Dark overlay — makes white text legible across the whole hero */}
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[hsl(205,38%,16%,0.72)] via-[hsl(200,55%,30%,0.50)] to-transparent"
            aria-hidden="true"
          />

          <div className="container relative z-10 mx-auto px-3 py-24 sm:px-4 md:py-36">
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
                trafficking and abuse—offering safety, healing, and a place to begin again.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to={donateLink}
                  title="Create an account to donate"
                  className="inline-flex items-center gap-2 rounded-full bg-[#9B7FC0] px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:scale-105 hover:bg-[#8a6db5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
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

        {/* ── Mission — cream section right after hero ── */}
        <section id="mission" className="bg-background py-20 md:py-28" aria-labelledby="mission-heading">
          <div className="container mx-auto px-4">
            <div className="grid items-center gap-16 md:grid-cols-2 md:gap-20">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                <h2
                  id="mission-heading"
                  className="font-heading text-3xl font-semibold tracking-tight text-[hsl(200_26%_18%)] md:text-4xl"
                >
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

        {/* ── Portofino carousel — sand/muted section where “How It Works” used to be ── */}
        <section className="relative" aria-labelledby="portofino-carousel-heading">
          <WaveDivider className="text-muted" />
          <div className="bg-muted -mt-1 py-16 md:py-20">
            <div className="container mx-auto px-4">
              <h2 id="portofino-carousel-heading" className="sr-only">
                Portofino photo carousel
              </h2>

              <div className="mx-auto max-w-5xl">
                <div className="relative">
                  <div className="grid gap-4 md:grid-cols-3">
                    {visibleCarouselIndices.map((index, slot) => (
                      <div
                        key={`${index}-${slot}`}
                        className={cn(
                          "overflow-hidden rounded-3xl bg-[hsl(40_42%_99%_/_0.45)] shadow-warm transition-transform md:origin-center",
                          // Keep side images subtly smaller via the card scale (image still covers rounded corners).
                          slot !== 1 && "md:scale-[0.97]",
                          // Emphasize the middle image on desktop for a gentle focal point.
                          slot === 1 && "md:scale-[1.08] md:-translate-y-2 md:shadow-warm-hover md:z-[1]",
                        )}
                      >
                        {/* Fixed-height frame + `img` fills it prevents subpixel seams/gaps */}
                        <div className="h-[240px] md:h-[300px]">
                          <img
                            src={carouselImages[index].src}
                            alt={carouselImages[index].alt}
                            className="block h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={goPrev}
                    className="absolute -left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2.5 text-[hsl(200_24%_18%)] shadow-sm backdrop-blur-sm transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(200_20%_40%)] md:-left-4"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="absolute -right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2.5 text-[hsl(200_24%_18%)] shadow-sm backdrop-blur-sm transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(200_20%_40%)] md:-right-4"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-5 flex items-center justify-center gap-2">
                  {carouselImages.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCarouselIndex(i)}
                      className={cn(
                        "h-2.5 w-2.5 rounded-full transition",
                        i === carouselIndex ? "bg-[hsl(200_24%_22%)]" : "bg-[hsl(200_10%_70%)] hover:bg-[hsl(200_16%_55%)]",
                      )}
                      aria-label={`Go to photo ${i + 1}`}
                      aria-current={i === carouselIndex ? "true" : undefined}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <WaveDivider className="text-muted -mt-1 rotate-180" />
        </section>

        {/* ── How It Works — moved down (not adjacent to Mission) ── */}
        <section className="bg-background py-20 md:py-28" aria-labelledby="how-heading">
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
                        2026 fundraising goal
                      </p>
                      <p className="mt-2 font-heading text-2xl font-medium tracking-tight text-[hsl(200_24%_18%)] md:text-3xl">
                        {money.format(YEARLY_FUNDRAISING_GOAL)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(200_12%_42%)]">
                        Raised this year
                      </p>
                      <p className="mt-2 font-heading text-2xl font-medium tracking-tight text-[#4A7A52] md:text-3xl tabular-nums">
                        {money.format(yearlyRaised)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-7">
                    <div
                      role="progressbar"
                      aria-label="Yearly fundraising progress"
                      aria-valuemin={0}
                      aria-valuemax={YEARLY_FUNDRAISING_GOAL}
                      aria-valuenow={yearlyRaised}
                      className="h-3 w-full overflow-hidden rounded-full bg-muted/40"
                    >
                      <div
                        className="h-full rounded-full bg-[#4A7A52] transition-[width] duration-1000 ease-in-out"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs font-normal text-[hsl(200_12%_40%)]">
                      <span className="tabular-nums">{Math.round(progress * 100)}%</span>
                      <span className="tabular-nums">
                        {money.format(Math.max(YEARLY_FUNDRAISING_GOAL - yearlyRaised, 0))} to go
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-7 flex flex-col items-center justify-center gap-3 text-center md:flex-row md:gap-4">
                  <p className="text-sm font-medium tracking-[0.08em] uppercase text-[hsl(200_22%_24%)]">
                    Help us reach our goal.
                  </p>
                  <Link
                    to={donateLink}
                    title="Create an account to donate"
                    className="inline-flex items-center justify-center rounded-full bg-[#4A7A52] px-7 py-2.5 text-sm font-semibold text-[#F5F0E8] shadow-md shadow-[hsl(150_24%_28%_/_0.22)] transition hover:brightness-110 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7A52]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F0E8]"
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
