import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  Brain,
  CalendarRange,
  HeartPulse,
  LineChart as LineChartIcon,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { fetchWithAuth, apiBaseUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

type DetailChartType = "count" | "currency" | "score";
type TimelineMetricKey = "activeResidentsServed" | "avgHealthScore" | "avgEducationProgress" | "totalDonationImpact";

type PublicImpactResponse = {
  generatedAt: string;
  forecastMonth: string | null;
  dataset: {
    rowCount: number;
    monthMin?: string | null;
    monthMax?: string | null;
  };
  model: {
    selectedModel?: string | null;
    meanRmse?: number | null;
    meanMae?: number | null;
    meanR2?: number | null;
    targetMetrics: Array<{ target: string; rmse: number | null; mae: number | null; r2: number | null }>;
    nextForecast: {
      activeResidentsServed?: number | null;
      avgHealthScore?: number | null;
      avgEducationProgress?: number | null;
      totalDonationImpact?: number | null;
    };
    topDrivers: Record<string, Array<{ feature: string; importance: number }>>;
  };
  kpis: Array<{ label: string; value: number | null; detail: string; unit?: string }>;
  impactTimeline: Array<{
    month: string | null;
    label: string;
    activeResidentsServed: number | null;
    avgHealthScore: number | null;
    avgEducationProgress: number | null;
    totalDonationImpact: number | null;
  }>;
  storyScores: Array<{
    metricName: string;
    latestValue: number | null;
    predictedNextValue: number | null;
    recentDelta: number | null;
    trendStrength: number | null;
    headlinePriorityScore: number | null;
  }>;
  summary: {
    headline: string;
    suggestedMetric: string;
    suggestedHeadline: string;
  };
  recommendations: string[];
};

type DetailConfig = {
  title: string;
  description: string;
  chartTitle: string;
  chartType: DetailChartType;
  chartData: Array<{ label: string; value: number }>;
  highlights: string[];
};

const hasLiveApi = Boolean(apiBaseUrl);

function formatPeso(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `PHP ${Math.round(value).toLocaleString()}`;
}

function formatDecimal(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `${Math.round(value * 100) / 100}`;
}

function formatScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `${Math.round(value * 100)} pts`;
}

function formatMonth(value: string | null | undefined) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function formatChartValue(value: number, chartType: DetailChartType) {
  if (chartType === "currency") return formatPeso(value);
  if (chartType === "score") return `${Math.round(value * 100)} pts`;
  return `${Math.round(value * 100) / 100}`;
}

async function fetchBundledPublicImpactAnalytics(): Promise<PublicImpactResponse> {
  const response = await fetch("/public-impact-summary.json");
  if (!response.ok) throw new Error("Unable to load the bundled public impact analytics snapshot.");
  return response.json();
}

async function fetchLatestPublicImpactAnalytics(): Promise<PublicImpactResponse> {
  if (!hasLiveApi) return fetchBundledPublicImpactAnalytics();
  const response = await fetchWithAuth("/api/ml/public-impact/latest");
  if (response.status === 404 || !response.ok) return fetchBundledPublicImpactAnalytics();
  return response.json();
}

async function refreshPublicImpactAnalytics(): Promise<PublicImpactResponse> {
  const response = await fetchWithAuth("/api/ml/public-impact/refresh", { method: "POST" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Unable to refresh public impact analytics.");
  }
  return response.json();
}

function DetailDialog({
  detail,
  open,
  onOpenChange,
  badgeLabel,
}: {
  detail: DetailConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badgeLabel?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-2xl border-border/80 bg-background">
        {detail ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl text-foreground">{detail.title}</DialogTitle>
              <DialogDescription>{detail.description}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-6">
              <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-warm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-heading text-lg font-semibold text-foreground">{detail.chartTitle}</h4>
                    <p className="text-sm text-muted-foreground">This drill-down gives more context behind the selected public-impact signal.</p>
                  </div>
                  {badgeLabel ? (
                    <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/5 text-primary">
                      {badgeLabel}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-5 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={detail.chartData} layout="vertical" margin={{ left: 18, right: 18 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => {
                          if (detail.chartType === "currency") return `${Math.round(Number(value) / 1000)}k`;
                          if (detail.chartType === "score") return `${Math.round(Number(value) * 100)} pts`;
                          return `${Math.round(Number(value) * 100) / 100}`;
                        }}
                      />
                      <YAxis type="category" dataKey="label" width={155} />
                      <Tooltip formatter={(value: number) => formatChartValue(value, detail.chartType)} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 12, 12, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {detail.highlights.map((highlight) => (
                  <div key={highlight} className="rounded-2xl bg-muted/25 p-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">Publishing note</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-foreground">{highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function PublicImpactMlPanel() {
  const queryClient = useQueryClient();
  const [timelineMetric, setTimelineMetric] = useState<TimelineMetricKey>("activeResidentsServed");
  const [activeKpiLabel, setActiveKpiLabel] = useState<string | null>(null);
  const [activeChartId, setActiveChartId] = useState<string | null>(null);

  const analyticsQuery = useQuery({
    queryKey: ["public-impact-analytics"],
    queryFn: fetchLatestPublicImpactAnalytics,
    retry: false,
  });

  const refreshMutation = useMutation({
    mutationFn: refreshPublicImpactAnalytics,
    onSuccess: async (data) => {
      queryClient.setQueryData(["public-impact-analytics"], data);
      await queryClient.invalidateQueries({ queryKey: ["admin-workspace"] });
      toast.success("Public impact analytics refreshed.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to refresh public impact analytics.");
    },
  });

  const data = analyticsQuery.data;
  const error = analyticsQuery.error;
  const topStory = data?.storyScores[0];

  const timelineMeta = useMemo<Record<TimelineMetricKey, { label: string; icon: typeof Users }>>(
    () => ({
      activeResidentsServed: { label: "Residents served", icon: Users },
      avgHealthScore: { label: "Health score", icon: HeartPulse },
      avgEducationProgress: { label: "Education progress", icon: Brain },
      totalDonationImpact: { label: "Donation impact", icon: BarChart3 },
    }),
    [],
  );

  const timelineChartData = useMemo(
    () =>
      (data?.impactTimeline ?? []).map((point) => ({
        label: point.label,
        value: Number(point[timelineMetric] ?? 0),
      })),
    [data, timelineMetric],
  );

  const kpiCards = data
    ? [
        {
          label: "Forecast residents served",
          value: formatDecimal(data.model.nextForecast.activeResidentsServed),
          detail: "Predicted active residents served next month",
        },
        {
          label: "Forecast donation impact",
          value: formatPeso(data.model.nextForecast.totalDonationImpact),
          detail: "Predicted donation-linked public impact for the next cycle",
        },
        {
          label: "Suggested story",
          value: data.summary.suggestedMetric || "N/A",
          detail: "Top metric to highlight on the donor-facing dashboard next month",
        },
        {
          label: "Top story score",
          value: formatScore(topStory?.headlinePriorityScore),
          detail: topStory ? `${topStory.metricName} is the strongest current headline candidate` : "No story-ranking signal is available yet",
        },
      ]
    : [];

  const kpiDetail: DetailConfig | null = (() => {
    if (!data || !activeKpiLabel) return null;

    switch (activeKpiLabel) {
      case "Forecast residents served":
        return {
          title: "Forecast residents served",
          description: "This KPI tracks the next expected resident volume for the public dashboard.",
          chartTitle: "Residents served over time",
          chartType: "count",
          chartData: data.impactTimeline.map((point) => ({ label: point.label, value: point.activeResidentsServed ?? 0 })),
          highlights: [
            `The next forecast for ${formatMonth(data.forecastMonth)} is ${formatDecimal(data.model.nextForecast.activeResidentsServed)} residents served.`,
            `The selected forecasting model is ${data.model.selectedModel ?? "not available yet"}.`,
            "This helps the public dashboard team plan the scale narrative for next month's donor communication.",
          ],
        };
      case "Forecast donation impact":
        return {
          title: "Forecast donation impact",
          description: "This KPI estimates the next public-facing donation impact total that could appear in the donor dashboard.",
          chartTitle: "Donation impact over time",
          chartType: "currency",
          chartData: data.impactTimeline.map((point) => ({ label: point.label, value: point.totalDonationImpact ?? 0 })),
          highlights: [
            `The next forecast for ${formatMonth(data.forecastMonth)} is ${formatPeso(data.model.nextForecast.totalDonationImpact)}.`,
            "Use this to decide how strongly the donor dashboard should emphasize financial impact next month.",
            "This is a forecast signal, so the final published figure should still be human-reviewed before release.",
          ],
        };
      case "Suggested story":
      case "Top story score":
        return {
          title: "Story recommendation ranking",
          description: "This ranking combines trend strength, donor relevance, and projected change to recommend which metric should be highlighted publicly.",
          chartTitle: "Headline priority score by metric",
          chartType: "score",
          chartData: data.storyScores.map((point) => ({ label: point.metricName, value: point.headlinePriorityScore ?? 0 })),
          highlights: [
            topStory ? `${topStory.metricName} is the current strongest story candidate for the next public dashboard refresh.` : "No top story candidate is available yet.",
            data.summary.suggestedHeadline || "No suggested headline is available yet.",
            "This should guide the first draft of the public headline, but communications staff should still review wording and privacy fit.",
          ],
        };
      default:
        return null;
    }
  })();

  const chartDetail: DetailConfig | null = (() => {
    if (!data || !activeChartId) return null;

    if (activeChartId === "impact-timeline") {
      return {
        title: "Public impact values over time",
        description: "This chart lets the team inspect the historical public-impact values that support the dashboard forecast.",
        chartTitle: `${timelineMeta[timelineMetric].label} over time`,
        chartType: timelineMetric === "totalDonationImpact" ? "currency" : "count",
        chartData: timelineChartData,
        highlights: [
          `You are currently viewing ${timelineMeta[timelineMetric].label.toLowerCase()} across the public-impact timeline.`,
          `The forecast month is ${formatMonth(data.forecastMonth)}.`,
          "This is the best chart for spotting whether the next headline is backed by a visible trend instead of a one-off movement.",
        ],
      };
    }

    if (activeChartId === "story-ranking") {
      return {
        title: "AI suggested monthly impact story",
        description: "This chart ranks the donor-facing story options using the notebook's headline-priority framework.",
        chartTitle: "Headline priority score by metric",
        chartType: "score",
        chartData: data.storyScores.map((point) => ({ label: point.metricName, value: point.headlinePriorityScore ?? 0 })),
        highlights: [
          topStory ? `${topStory.metricName} currently ranks first for next month's public story.` : "No top story candidate is available yet.",
          topStory ? `Projected change: ${formatDecimal(topStory.recentDelta)}.` : "No projected delta is available yet.",
          "This chart is strongest when combined with the historical timeline before finalizing the dashboard story.",
        ],
      };
    }

    return null;
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-warm lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <LineChartIcon className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.22em]">Public Impact Planning</span>
          </div>
          <div>
            <h3 className="font-heading text-2xl font-bold text-foreground">Public Impact Forecasting</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Use the forecast to pre-stage next month&apos;s donor dashboard, then use the story ranking to decide which headline and metric deserve the public spotlight.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/5 text-primary">
              Forecast model: {data?.model.selectedModel ?? "Pending"}
            </Badge>
            <Badge variant="outline" className="rounded-full">
              Story engine: headline priority score
            </Badge>
            <span>Last refreshed: {data?.generatedAt ? formatDateTime(data.generatedAt) : "No refresh yet"}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" className="rounded-full" disabled={refreshMutation.isPending || !hasLiveApi} onClick={() => refreshMutation.mutate()}>
            <RefreshCw className={cn("mr-2 h-4 w-4", refreshMutation.isPending && "animate-spin")} />
            {hasLiveApi ? "Refresh analytics" : "Live API unavailable"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 shadow-warm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="font-semibold text-foreground">Public impact analytics could not be loaded.</p>
              <p className="mt-1 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Unknown error."}</p>
            </div>
          </div>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((kpi) => (
              <button
                key={kpi.label}
                type="button"
                onClick={() => setActiveKpiLabel(kpi.label)}
                className="rounded-2xl border border-border/70 bg-card p-5 text-left shadow-warm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg"
              >
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{kpi.value}</p>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{kpi.detail}</p>
              </button>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <button
              type="button"
              onClick={() => setActiveChartId("impact-timeline")}
              className="rounded-2xl bg-card p-6 text-left shadow-warm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-heading text-lg font-semibold text-foreground">Public impact values over time</h4>
                  <p className="text-sm text-muted-foreground">Track the public-impact metric you plan to highlight before pushing it into the donor dashboard.</p>
                </div>
                <CalendarRange className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(Object.keys(timelineMeta) as TimelineMetricKey[]).map((metric) => (
                  <Button
                    key={metric}
                    type="button"
                    size="sm"
                    variant={timelineMetric === metric ? "default" : "outline"}
                    className="rounded-full"
                    onClick={(event) => {
                      event.stopPropagation();
                      setTimelineMetric(metric);
                    }}
                  >
                    {timelineMeta[metric].label}
                  </Button>
                ))}
              </div>

              <div className="mt-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => (timelineMetric === "totalDonationImpact" ? formatPeso(value) : formatDecimal(value))} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveChartId("story-ranking")}
              className="rounded-2xl bg-card p-6 text-left shadow-warm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-heading text-lg font-semibold text-foreground">AI suggested monthly impact story</h4>
                  <p className="text-sm text-muted-foreground">Rank which public metric should headline the donor-facing dashboard next month.</p>
                </div>
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.storyScores} layout="vertical" margin={{ left: 18, right: 18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(value) => `${Math.round(Number(value) * 100)} pts`} />
                    <YAxis type="category" dataKey="metricName" width={135} />
                    <Tooltip formatter={(value: number) => `${Math.round(value * 100)} pts`} />
                    <Bar dataKey="headlinePriorityScore" fill="hsl(var(--secondary))" radius={[0, 12, 12, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </button>
          </div>

          <div className="rounded-2xl bg-card p-6 shadow-warm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-primary">Publishing Recommendation</p>
                <h4 className="mt-2 font-heading text-2xl font-bold text-foreground">{data.summary.suggestedHeadline}</h4>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Use this as the draft headline for the donor dashboard and reports page, then let communications staff adjust wording, privacy, and tone before publishing.
                </p>
              </div>
              <div className="rounded-2xl bg-primary/8 px-4 py-3 text-right">
                <p className="text-xs text-foreground/70">Forecast month</p>
                <p className="text-2xl font-bold text-foreground">{formatMonth(data.forecastMonth)}</p>
                <p className="text-xs text-foreground/70">Suggested metric: {data.summary.suggestedMetric}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {data.recommendations.map((item, index) => (
                <div key={`${item}-${index}`} className="rounded-2xl bg-muted/25 p-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Brain className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">Recommendation</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-foreground">{item}</p>
                </div>
              ))}

              <div className="rounded-2xl bg-muted/25 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">Model snapshot</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Average holdout RMSE: {formatDecimal(data.model.meanRmse)}. Keep the AI story suggestion human-reviewed before it appears on the donor-facing site.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : analyticsQuery.isLoading ? (
        <div className="rounded-2xl bg-card p-6 shadow-warm">
          <p className="text-sm text-muted-foreground">Loading the latest public impact analytics snapshot...</p>
        </div>
      ) : null}

      <DetailDialog detail={kpiDetail} open={Boolean(kpiDetail)} onOpenChange={(open) => setActiveKpiLabel(open ? activeKpiLabel : null)} badgeLabel={kpiCards.find((kpi) => kpi.label === activeKpiLabel)?.detail} />
      <DetailDialog detail={chartDetail} open={Boolean(chartDetail)} onOpenChange={(open) => setActiveChartId(open ? activeChartId : null)} badgeLabel={activeChartId === "impact-timeline" ? timelineMeta[timelineMetric].label : "Story ranking"} />
    </div>
  );
}
