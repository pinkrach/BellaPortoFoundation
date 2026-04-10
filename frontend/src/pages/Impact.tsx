import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/PublicLayout";
import { HarborLoadingState } from "@/components/HarborLoadingState";
import { useAuth } from "@/contexts/AuthContext";
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
      <div className="bg-[linear-gradient(180deg,hsl(37_39%_94%)_0%,hsl(40_42%_97%)_35%,hsl(36_37%_95%)_100%)]">
        <PublicImpactHero donateLink={donateLink} imageSrc={heroImage} />

        <div className="container mx-auto space-y-10 px-4 py-10 md:space-y-12 md:py-14">
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
                    <div className="mt-6 h-4 overflow-hidden rounded-full bg-[hsl(37_30%_90%)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#5A8FA0_0%,#9B7FC0_100%)]"
                        style={{ width: `${impactQuery.data.fundraising.progressPercent}%` }}
                      />
                    </div>
                    <p className="mt-4 text-lg text-[hsl(200_12%_40%)]">
                      <span className="font-semibold text-[hsl(200_24%_18%)]">{formatPhp(impactQuery.data.fundraising.raised)}</span> raised of{" "}
                      <span className="font-semibold text-[hsl(200_24%_18%)]">{formatPhp(impactQuery.data.fundraising.goal)}</span> annual goal
                    </p>
                  </div>

                  <div className="rounded-[1.75rem] bg-[linear-gradient(180deg,hsl(40_42%_99%)_0%,hsl(37_34%_96%)_100%)] p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[hsl(200_20%_42%)]">Trust signal</p>
                    <p className="mt-3 font-heading text-2xl text-[hsl(200_24%_18%)]">
                      {impactQuery.data.fundraising.progressPercent.toFixed(0)}% of this public impact fund is already covered
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[hsl(200_12%_40%)]">
                      The raised total comes from the existing reports summary. The goal is inferred from current donations to show a donor-facing annual target until a dedicated goal service is added.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] bg-[linear-gradient(180deg,hsl(40_42%_98%)_0%,hsl(36_30%_94%)_100%)] p-4 md:p-5">
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {impactQuery.data.kpiCards.map((card, index) => (
                    <article
                      key={card.label}
                      className="rounded-[1.75rem] border border-[hsl(37_24%_86%)] bg-white/88 p-5 shadow-[0_22px_55px_-35px_rgba(28,43,53,0.5)]"
                    >
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[hsl(200_20%_42%)]">Snapshot {index + 1}</p>
                      <h3 className="mt-3 font-heading text-2xl text-[hsl(200_24%_18%)]">{formatKpiValue(card.value, card.format)}</h3>
                      <p className="mt-2 text-base font-semibold text-[hsl(200_24%_18%)]">{card.label}</p>
                      <p className="mt-2 text-sm leading-6 text-[hsl(200_12%_40%)]">{card.description}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-[2.25rem] bg-[linear-gradient(180deg,hsl(40_42%_98%)_0%,hsl(36_32%_95%)_100%)] p-3 md:p-4">
                <DonationImpactCalculator
                  donateLink={donateLink}
                  calculator={impactQuery.data.calculator}
                  groupedAllocation={impactQuery.data.groupedAllocation}
                />
              </section>

              <section className="rounded-[2.25rem] bg-[linear-gradient(180deg,hsl(40_42%_98%)_0%,hsl(32_26%_95%)_100%)] p-4 md:p-6">
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

              <section className="rounded-[2.25rem] bg-[linear-gradient(180deg,hsl(40_42%_98%)_0%,hsl(36_30%_95%)_100%)] p-3 md:p-4">
                <MonthlyImpactSummary
                  periodLabel={impactQuery.data.trustSummary.periodLabel}
                  cards={impactQuery.data.trustSummary.cards}
                  highlights={impactQuery.data.reportsSummary.annualReport.highlights}
                  narrativeSummary={impactQuery.data.reportsSummary.annualReport.narrativeSummary}
                />
              </section>

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
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default Impact;
