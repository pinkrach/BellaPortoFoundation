import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type ImpactTrendSectionProps = {
  educationTrend: Array<{ label: string; value?: number | null }>;
  healthTrend: Array<{ label: string; value?: number | null }>;
  serviceBuckets: Array<{ label: string; count: number }>;
  processProgress: Array<{ label: string; progressRate?: number | null; concernRate?: number | null; sessions?: number | null }>;
};

function TrendCard({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-[1.75rem] bg-white/88 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[hsl(200_20%_42%)]">{eyebrow}</p>
      <h3 className="mt-3 font-heading text-2xl text-[hsl(200_24%_18%)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[hsl(200_12%_40%)]">{description}</p>
      <div className="mt-5 h-72 rounded-2xl bg-[hsl(40_42%_98%)] p-3">{children}</div>
    </article>
  );
}

export function ImpactTrendSection({
  educationTrend,
  healthTrend,
  serviceBuckets,
  processProgress,
}: ImpactTrendSectionProps) {
  return (
    <section className="space-y-6">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[hsl(200_20%_42%)]">What change donations inspire</p>
        <h2 className="mt-3 font-heading text-3xl text-[hsl(200_24%_18%)] md:text-4xl">
          Donor support is visible in education, wellbeing, and everyday recovery
        </h2>
        <p className="mt-4 text-base leading-7 text-[hsl(200_12%_40%)]">
          These charts reuse the same reporting streams already powering the analytics pipeline, translated into a public-facing story of progress.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <TrendCard
          eyebrow="Education trend"
          title="Learning progress keeps climbing"
          description="Average education progress across residents in care, using the existing resident outcomes trend."
        >
          <ChartContainer
            className="h-full w-full"
            config={{ value: { label: "Education progress", color: "#5A8FA0" } }}
          >
            <LineChart data={educationTrend}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tickLine={false} axisLine={false} width={38} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={3} dot={false} />
            </LineChart>
          </ChartContainer>
        </TrendCard>

        <TrendCard
          eyebrow="Health trend"
          title="Wellbeing rises with consistent care"
          description="Average health and wellbeing score across residents, sourced from the same reporting pipeline used internally."
        >
          <ChartContainer
            className="h-full w-full"
            config={{ value: { label: "Wellbeing score", color: "#9B7FC0" } }}
          >
            <LineChart data={healthTrend}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tickLine={false} axisLine={false} width={38} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={3} dot={false} />
            </LineChart>
          </ChartContainer>
        </TrendCard>

        <TrendCard
          eyebrow="Service themes"
          title="Caring, healing, and teaching at scale"
          description="Annual accomplishment totals translated into the mission language donors recognize most clearly."
        >
          <ChartContainer
            className="h-full w-full"
            config={{ count: { label: "Services delivered", color: "#C17A3A" } }}
          >
            <BarChart data={serviceBuckets}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={48} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[14, 14, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </TrendCard>

        <TrendCard
          eyebrow="Resident progress snapshots"
          title="Recovery is measured one steady month at a time"
          description="Progress-rate versus concern-rate from the live process-progress report, showing how support is helping girls move forward."
        >
          <ChartContainer
            className="h-full w-full"
            config={{
              progressRate: { label: "Positive progress", color: "#4A7A52" },
              concernRate: { label: "Concern rate", color: "#C06080" },
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processProgress}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis tickLine={false} axisLine={false} width={42} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <Line type="monotone" dataKey="progressRate" stroke="var(--color-progressRate)" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="concernRate" stroke="var(--color-concernRate)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </TrendCard>
      </div>
    </section>
  );
}
