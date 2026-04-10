import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/PublicLayout";
import { HarborLoadingState } from "@/components/HarborLoadingState";
import { useAuth } from "@/contexts/AuthContext";
import { WaveDivider } from "@/components/WaveDivider";
import heroImage from "@/assets/hero/Girls at twilight by the water.png";
import { Link } from "react-router-dom";
import { ArrowRight, HeartHandshake } from "lucide-react";

import { PublicImpactHero } from "@/components/public-impact/PublicImpactHero";
import { DonationImpactCalculator } from "@/components/public-impact/DonationImpactCalculator";
import { ImpactTrendSection } from "@/components/public-impact/ImpactTrendSection";
import { MonthlyImpactSummary } from "@/components/public-impact/MonthlyImpactSummary";
import { getPublicImpactPageData } from "@/services/publicImpactPageData";

function formatPhp(value: number) {
  return `PHP ${Math.round(value).toLocaleString()}`;
}

function formatKpiValue(value: number, format: "count" | "percent" | "score") {
  if (format === "percent") return `${Math.round(value)}%`;
  if (format === "score") return value.toFixed(2);
  return Math.round(value).toLocaleString();
}

const Impact = () => {
  const { isAuthenticated, role } = useAuth();
  const donateLink = isAuthenticated && role === "donor" ? "/dashboard?donate=1" : "/signup";
  const impactQuery = useQuery({
    queryKey: ["public-impact-page"],
    queryFn: getPublicImpactPageData,
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <PublicLayout>
      <div className="w-full max-w-none overflow-x-hidden bg-background">
        <PublicImpactHero donateLink={donateLink} imageSrc={heroImage} />

        <section className="bg-muted py-10 md:py-14">
          <div className="container mx-auto space-y-10 px-4 md:space-y-12">
            {impactQuery.isLoading ? (
              <div className="space-y-6">
                <HarborLoadingState title="Building your impact view" description="Gathering donor-safe reporting metrics and current impact summaries." />
              </div>
            ) : impactQuery.isError || !impactQuery.data ? (
              <section className="rounded-[2rem] border border-[hsl(37_24%_86%)] bg-white/85 p-8 shadow-[0_24px_60px_-38px_rgba(28,43,53,0.55)]">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[hsl(200_20%_42%)]">Impact data unavailable</p>
                <h1 className="mt-3 font-heading text-3xl text-[hsl(200_24%_18%)]">We could not load the latest public impact summary.</h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-[hsl(200_12%_40%)]">
                  Please try again in a moment. The donor experience depends on the bundled reports and impact summary artifacts.
                </p>
              </section>
            ) : (
              <div className="space-y-10">
                <section className="rounded-[2rem] border border-[hsl(37_24%_86%)] bg-white/85 p-6 shadow-[0_30px_80px_-48px_rgba(28,43,53,0.55)] md:p-8">
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[hsl(200_20%_42%)]">Fundraising goal</p>
                      <h2 className="mt-3 font-heading text-3xl text-[hsl(200_24%_18%)] md:text-4xl">Keep safe housing and healing support within reach</h2>
                      <div className="mt-6 h-4 overflow-hidden rounded-full bg-muted/40">
                        <div
                          className="h-full rounded-full bg-[#4A7A52]"
                          style={{ width: `${impactQuery.data.fundraising.progressPercent}%` }}
                        />
                      </div>
                      <p className="mt-4 text-lg text-[hsl(200_12%_40%)]">
                        <span className="font-semibold text-[hsl(200_24%_18%)]">{formatPhp(impactQuery.data.fundraising.raised)}</span> raised of{" "}
                        <span className="font-semibold text-[hsl(200_24%_18%)]">{formatPhp(impactQuery.data.fundraising.goal)}</span> annual goal
                      </p>
                    </div>

                    <div className="rounded-2xl bg-card p-5 shadow-warm">
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[hsl(200_20%_42%)]">Trust signal</p>
                      <p className="mt-3 font-heading text-2xl text-[hsl(200_24%_18%)]">
                        {impactQuery.data.fundraising.progressPercent.toFixed(0)}% of this public impact fund is already covered
                      </p>
                    </div>
                  </div>
                </section>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {impactQuery.data.kpiCards.map((card, index) => (
                    <article
                      key={card.label}
                      className="overflow-hidden rounded-2xl bg-card shadow-warm transition-all hover:-translate-y-1 hover:shadow-warm-hover"
                    >
                      <div className="h-1.5 bg-lavender" />
                      <div className="p-5 md:p-6">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[hsl(200_20%_42%)]">Snapshot {index + 1}</p>
                        <h3 className="mt-3 font-heading text-2xl text-[hsl(200_24%_18%)]">{formatKpiValue(card.value, card.format)}</h3>
                        <p className="mt-2 text-base font-semibold text-[hsl(200_24%_18%)]">{card.label}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <WaveDivider className="text-muted -mt-1 rotate-180" />

        {!impactQuery.isLoading && !impactQuery.isError && impactQuery.data ? (
          <>
            <section className="bg-background py-12 md:py-16">
              <div className="container mx-auto space-y-10 px-4 md:space-y-12">
                <DonationImpactCalculator
                  donateLink={donateLink}
                  calculator={impactQuery.data.calculator}
                  groupedAllocation={impactQuery.data.groupedAllocation}
                />

                <section className="rounded-[2.25rem] bg-card p-4 md:p-6">
                  <ImpactTrendSection
                    educationTrend={impactQuery.data.reportsSummary.residentOutcomes.educationTrend.map((point) => ({
                      label: point.label ?? "",
                      value: typeof point.value === "number" ? point.value : null,
                    }))}
                    healthTrend={impactQuery.data.reportsSummary.residentOutcomes.healthTrend.map((point) => ({
                      label: point.label ?? "",
                      value: typeof point.value === "number" ? point.value : null,
                    }))}
                    serviceBuckets={impactQuery.data.reportsSummary.annualReport.serviceBuckets}
                    processProgress={impactQuery.data.reportsSummary.residentOutcomes.processProgress.map((point) => ({
                      label: point.label ?? "",
                      progressRate: typeof point.progressRate === "number" ? point.progressRate : null,
                      concernRate: typeof point.concernRate === "number" ? point.concernRate : null,
                      sessions: typeof point.sessions === "number" ? point.sessions : null,
                    }))}
                  />
                </section>
              </div>
            </section>

            <WaveDivider className="text-muted" />

            <section className="bg-muted -mt-1 pt-12 pb-6 md:pt-16 md:pb-8">
              <div className="container mx-auto px-4">
                <MonthlyImpactSummary
                  periodLabel={impactQuery.data.trustSummary.periodLabel}
                  highlights={impactQuery.data.reportsSummary.annualReport.highlights}
                  narrativeSummary={impactQuery.data.reportsSummary.annualReport.narrativeSummary}
                />
              </div>
            </section>

            <WaveDivider className="text-background" />

            <section className="bg-background -mt-1 pt-4 pb-10 md:pt-5 md:pb-12">
              <div className="container mx-auto px-4">
                <section className="sticky bottom-4 z-20">
                  <div className="rounded-[1.5rem] border border-[hsl(37_24%_82%)] bg-[rgba(255,252,248,0.94)] px-4 py-3 shadow-[0_24px_70px_-45px_rgba(28,43,53,0.8)] backdrop-blur-md md:px-5">
                    <div className="flex flex-col items-center justify-between gap-3 text-center lg:flex-row lg:text-left">
                      <div className="flex max-w-2xl items-start gap-3">
                        <div className="rounded-xl bg-[hsl(266_34%_63%_/_0.14)] p-2.5 text-[hsl(266_34%_58%)]">
                          <HeartHandshake className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-heading text-xl text-[hsl(200_24%_18%)] md:text-2xl">Every gift helps provide safe housing, education, and healing support.</p>
                          <p className="mt-1 text-sm leading-6 text-[hsl(200_12%_40%)]">
                            Give today to keep doors open, classrooms active, and recovery care within reach.
                          </p>
                        </div>
                      </div>
                      <Link
                        to={donateLink}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(266_34%_63%)] px-7 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-20px_rgba(155,127,192,0.95)] transition hover:bg-[hsl(266_34%_58%)]"
                      >
                        Donate Now
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </section>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </PublicLayout>
  );
};

export default Impact;
