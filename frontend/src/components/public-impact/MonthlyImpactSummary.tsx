type MonthlyImpactSummaryProps = {
  periodLabel: string;
  highlights: string[];
  narrativeSummary: string;
};

export function MonthlyImpactSummary({ periodLabel, highlights, narrativeSummary }: MonthlyImpactSummaryProps) {
  return (
    <section className="py-1">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 lg:items-start">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[hsl(200_20%_42%)]">Recent impact summary</p>
          <h2 className="mt-3 font-heading text-3xl text-[hsl(200_24%_18%)] md:text-4xl">
            What your support made possible most recently
          </h2>
          <p className="text-base leading-7 text-[hsl(200_12%_40%)]">
            Latest published period: <span className="font-semibold text-[hsl(200_24%_18%)]">{periodLabel}</span>
          </p>
          <p className="text-base leading-7 text-[hsl(200_12%_40%)]">{narrativeSummary}</p>
        </div>

        <div className="grid gap-3 lg:pt-1">
          {highlights.map((highlight) => (
            <div key={highlight} className="rounded-2xl bg-white/80 px-4 py-3 text-sm leading-6 text-[hsl(200_12%_40%)]">
              {highlight}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
