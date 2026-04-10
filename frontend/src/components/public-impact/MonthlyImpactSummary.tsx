import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type MonthlyImpactSummaryProps = {
  periodLabel: string;
  cards: Array<{
    label: string;
    value: string;
    summary: string;
    detail: string;
  }>;
  highlights: string[];
  narrativeSummary: string;
};

export function MonthlyImpactSummary({
  periodLabel,
  cards,
  highlights,
  narrativeSummary,
}: MonthlyImpactSummaryProps) {
  return (
    <section className="rounded-[2rem] border border-[hsl(37_24%_86%)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(245,240,232,0.96)_100%)] p-6 shadow-[0_30px_80px_-50px_rgba(28,43,53,0.55)] md:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[hsl(200_20%_42%)]">Recent impact summary</p>
          <h2 className="mt-3 font-heading text-3xl text-[hsl(200_24%_18%)] md:text-4xl">
            What your support made possible most recently
          </h2>
          <p className="mt-4 text-base leading-7 text-[hsl(200_12%_40%)]">
            Latest published period: <span className="font-semibold text-[hsl(200_24%_18%)]">{periodLabel}</span>
          </p>
          <p className="mt-4 text-base leading-7 text-[hsl(200_12%_40%)]">{narrativeSummary}</p>

          <div className="mt-6 grid gap-3">
            {highlights.map((highlight) => (
              <div key={highlight} className="rounded-2xl bg-white/80 px-4 py-3 text-sm leading-6 text-[hsl(200_12%_40%)]">
                {highlight}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/70 bg-white/88 p-4 shadow-[0_18px_50px_-30px_rgba(28,43,53,0.42)]">
          <Accordion type="single" collapsible className="space-y-3">
            {cards.map((card, index) => (
              <AccordionItem
                key={card.label}
                value={`impact-${index}`}
                className="overflow-hidden rounded-2xl border border-[hsl(37_22%_86%)] bg-[hsl(40_42%_99%)] px-5"
              >
                <AccordionTrigger className="py-4 text-left hover:no-underline">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(200_20%_42%)]">{card.label}</p>
                    <p className="mt-1 font-heading text-2xl text-[hsl(200_24%_18%)]">{card.value}</p>
                    <p className="mt-2 text-sm leading-6 text-[hsl(200_12%_40%)]">{card.summary}</p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-6 text-[hsl(200_12%_40%)]">
                  {card.detail}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
