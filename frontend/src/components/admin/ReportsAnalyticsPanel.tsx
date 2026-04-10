import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Download,
  Filter,
  HeartPulse,
  Home,
  LineChart as LineChartIcon,
  Megaphone,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
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
import { Input } from "@/components/ui/input";
import {
  AnalyticsDetailDialog as SharedAnalyticsDetailDialog,
  type AnalyticsChartRow,
  type AnalyticsDetailConfig as SharedAnalyticsDetailConfig,
} from "@/components/dashboard/charts/AnalyticsDetailDialog";
import { fetchWithAuth } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";

type FilterState = {
  dateFrom: string;
  dateTo: string;
  safehouseId: string;
  campaignName: string;
};

type Kpi = {
  key: string;
  label: string;
  value: number | null;
  detail: string;
  unit?: string;
};

type ChartRow = AnalyticsChartRow;

type ReportsSummary = {
  generatedAt: string;
  asOf: string;
  refreshWarning?: string;
  refreshMode?: string;
  availableFilters: {
    safehouses: Array<{ value: string; label: string }>;
    campaigns: Array<{ value: string; label: string }>;
    dateRange: { min?: string | null; max?: string | null };
  };
  kpis: Kpi[];
  donation: {
    trends: ChartRow[];
    retention: ChartRow[];
    lapseRisk: ChartRow[];
    segmentSummary: ChartRow[];
    allocationByProgramArea: ChartRow[];
    campaignPerformance: ChartRow[];
    donorUpgradeOpportunities: ChartRow[];
    donorUpgradeModel?: {
      isTrained?: boolean;
      classificationModel?: string | null;
      regressionModel?: string | null;
      metrics?: ChartRow[];
    };
  };
  residentOutcomes: {
    educationTrend: ChartRow[];
    healthTrend: ChartRow[];
    processProgress: ChartRow[];
    homeVisitOutcomeTrend: ChartRow[];
    incidentTrend: ChartRow[];
    riskLevelDistribution: ChartRow[];
  };
  safehouse: {
    occupancyVsCapacity: ChartRow[];
    incidentForecast: ChartRow[];
    educationBySafehouse: ChartRow[];
    healthBySafehouse: ChartRow[];
    staffingPressure: ChartRow[];
  };
  reintegration: {
    readiness: ChartRow[];
    heuristicReadiness?: ChartRow[];
    readinessModel?: {
      isTrained?: boolean;
      selectedModel?: string | null;
      metrics?: ChartRow[];
    };
    completionRate: number;
    funnel: ChartRow[];
    interventionCompletion: ChartRow[];
  };
  outreachImpact: {
    bestPlatform?: string | null;
    bestPostingTime?: string | null;
    conversionByPostType: ChartRow[];
    donationValueForecast: ChartRow[];
    publicImpactSnapshots: ChartRow[];
  };
  annualReport: {
    serviceBuckets: ChartRow[];
    beneficiaryCounts: ChartRow[];
    serviceCounts: ChartRow[];
    outcomes: ChartRow[];
    programAreas: ChartRow[];
    highlights: string[];
    narrativeSummary: string;
  };
};

type DetailConfig = {
  title: string;
  description: string;
  miniKpis?: SharedAnalyticsDetailConfig["miniKpis"];
  views?: SharedAnalyticsDetailConfig["views"];
  chartType?: "line" | "bar" | "pie";
  data?: ChartRow[];
  rows?: ChartRow[];
  xKey?: string;
  dataKey?: string;
  secondaryKey?: string;
  labelKey?: string;
  valueKey?: string;
  searchable?: boolean;
  rowAction?: {
    label: string;
    type: "supporter";
    idKey: string;
    textKey: string;
  };
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.05, duration: 0.3 },
  }),
};

const PIE_COLORS = ["#5A8FA0", "#C17A3A", "#4A7A52", "#C06080", "#9B7FC0", "#406B83"];

function formatNumber(value: number | null | undefined, unit?: string) {
  if (value == null || Number.isNaN(value)) return "N/A";
  if (unit === "currency") return `PHP ${Math.round(value).toLocaleString()}`;
  if (unit === "%") return `${value}%`;
  if (unit === "score") return `${value}`;
  return Math.round(value * 100) / 100;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function hasActiveFilters(filters: FilterState) {
  return Boolean(filters.dateFrom || filters.dateTo || filters.safehouseId || filters.campaignName);
}

function buildSafehouseLabel(row: ChartRow) {
  const id = row.safehouseId ?? row.safehouse_id ?? row.id;
  if (id != null) return `Safehouse ${id}`;
  const name = row.safehouseName ?? row.name ?? row.label;
  const matchedNumber = String(name ?? "").match(/(\d+)/);
  if (matchedNumber) return `Safehouse ${matchedNumber[1]}`;
  return "Safehouse";
}

function toParams(filters: FilterState) {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.safehouseId) params.set("safehouseId", filters.safehouseId);
  if (filters.campaignName) params.set("campaignName", filters.campaignName);
  return params.toString();
}

async function fetchReportsSummary(filters: FilterState): Promise<ReportsSummary> {
  const parseStrictJson = async (response: Response) => {
    const text = await response.text();
    const normalized = text
      .replace(/\bNaN\b/g, "null")
      .replace(/\b-Infinity\b/g, "null")
      .replace(/\bInfinity\b/g, "null");
    return JSON.parse(normalized) as ReportsSummary;
  };

  const bundled = async () => {
    const response = await fetch("/reports-summary.json");
    if (!response.ok) {
      throw new Error("Unable to load reports summary.");
    }
    return parseStrictJson(response);
  };

  const query = toParams(filters);
  try {
    const response = await fetchWithAuth(`/api/reports/summary${query ? `?${query}` : ""}`);
    if (!response.ok) {
      if (hasActiveFilters(filters)) {
        const text = await response.text();
        throw new Error(text || "Unable to load filtered reports summary.");
      }
      return bundled();
    }
    return parseStrictJson(response);
  } catch (error) {
    if (hasActiveFilters(filters)) {
      throw error instanceof Error ? error : new Error("Unable to load filtered reports summary.");
    }
    return bundled();
  }
}

async function downloadAnnual() {
  window.print();
}

function DetailDialog({
  detail,
  open,
  onOpenChange,
  onSupporterOpen,
}: {
  detail: DetailConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSupporterOpen: (supporterId: string | number | null | undefined) => void;
}) {
  const sharedDetail = useMemo<SharedAnalyticsDetailConfig | null>(() => {
    if (!detail) return null;
    if (detail.views?.length) {
      return {
        title: detail.title,
        description: detail.description,
        miniKpis: detail.miniKpis,
        views: detail.views,
        rowAction: detail.rowAction,
      };
    }
    return {
      title: detail.title,
      description: detail.description,
      miniKpis: detail.miniKpis,
      views: [
        {
          key: "default",
          label: detail.title,
          description: detail.description,
          chartType: detail.chartType!,
          data: detail.data ?? [],
          rows: detail.rows,
          xKey: detail.xKey,
          dataKey: detail.dataKey,
          secondaryKey: detail.secondaryKey,
          labelKey: detail.labelKey,
          valueKey: detail.valueKey,
          searchable: detail.searchable,
        },
      ],
      rowAction: detail.rowAction,
    };
  }, [detail]);

  return <SharedAnalyticsDetailDialog detail={sharedDetail} open={open} onOpenChange={onOpenChange} onSupporterOpen={onSupporterOpen} />;
}

function MetricCard({
  title,
  description,
  onClick,
  children,
  icon: Icon,
}: {
  title: string;
  description: string;
  onClick?: () => void;
  children: React.ReactNode;
  icon: typeof BarChart3;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl bg-card p-6 text-left shadow-warm transition-transform hover:-translate-y-0.5",
        onClick ? "border border-border/70" : "border border-transparent",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="mt-5 h-72">{children}</div>
    </button>
  );
}

export function ReportsAnalyticsPanel() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: "",
    dateTo: "",
    safehouseId: "",
    campaignName: "",
  });
  const [detail, setDetail] = useState<DetailConfig | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["reports-summary", filters],
    queryFn: () => fetchReportsSummary(filters),
    retry: false,
  });

  const data = summaryQuery.data;
  const error = summaryQuery.error as Error | null;
  const occupancyChartRows = useMemo<Array<ChartRow & { displayLabel: string }>>(
    () =>
      (data?.safehouse.occupancyVsCapacity ?? []).map((row) => ({
        ...row,
        displayLabel: buildSafehouseLabel(row),
      })),
    [data],
  );
  const forecastChartRows = useMemo<Array<ChartRow & { displayLabel: string }>>(
    () =>
      (data?.safehouse.incidentForecast ?? []).map((row) => ({
        ...row,
        displayLabel: buildSafehouseLabel(row),
      })),
    [data],
  );
  const lapseRiskRows = useMemo<Array<ChartRow>>(() => {
    const source = data?.donation.lapseRisk ?? [];
    const highRisk = source.filter((row) => String(row.lapse_band ?? "").toLowerCase() === "high");
    return (highRisk.length ? highRisk : source)
      .sort((left, right) => Number(right.lapse_score ?? 0) - Number(left.lapse_score ?? 0))
      .slice(0, 10)
      .map((row) => ({
        ...row,
        label: row.supporter_name ?? "Supporter",
        value: Math.round(Number(row.lapse_score ?? 0) * 100),
      }));
  }, [data]);
  const donorUpgradeRows = useMemo<Array<ChartRow>>(() => {
    const source = data?.donation.donorUpgradeOpportunities ?? [];
    return source
      .map((row) => ({
        ...row,
        supporter_name: row.supporter_name ?? row.supporterName ?? "Supporter",
        label: row.supporter_name ?? row.supporterName ?? "Supporter",
        value: Math.round(Number((row.upgrade_probability ?? row.upgradeScore ?? 0)) * 100),
      }))
      .sort((left, right) => Number(right.value ?? 0) - Number(left.value ?? 0))
      .slice(0, 10);
  }, [data]);
  const pipelineReadinessRows = useMemo<Array<ChartRow>>(() => {
    const source = data?.reintegration.readiness ?? [];
    return source
      .map((row) => ({
        ...row,
        label: row.internal_code ?? row.safehouseName ?? "Resident",
        value: Number(row.readinessScore ?? 0),
      }))
      .sort((left, right) => Number(right.value ?? 0) - Number(left.value ?? 0))
      .slice(0, 10);
  }, [data]);
  const heuristicReadinessRows = useMemo<Array<ChartRow>>(() => {
    const source = data?.reintegration.heuristicReadiness ?? [];
    return source
      .map((row) => ({
        ...row,
        label: row.internal_code ?? row.safehouseName ?? "Resident",
        value: Number(row.readinessScore ?? 0),
      }))
      .sort((left, right) => Number(right.value ?? 0) - Number(left.value ?? 0))
      .slice(0, 10);
  }, [data]);

  const kpiDetails = useMemo<Record<string, DetailConfig>>(() => {
    if (!data) return {} as Record<string, DetailConfig>;
    return {
      donationsYtd: {
        title: "Donation trend",
        description: "This chart shows the donation value trend for the current reporting scope and the monthly values behind the KPI.",
        chartType: "line",
        data: data.donation.trends,
        rows: data.donation.trends,
        xKey: "label",
        dataKey: "value",
      },
      activeResidents: {
        title: "Resident risk distribution",
        description: "Current resident risk levels and caseload weighting.",
        chartType: "pie",
        data: data.residentOutcomes.riskLevelDistribution,
      },
      reintegrationSuccessRate: {
        title: "Reintegration funnel",
        description: "How residents are moving through reintegration stages.",
        chartType: "bar",
        data: data.reintegration.funnel,
      },
      avgEducationProgress: {
        title: "Education trend",
        description: "Latest education progress trend across residents.",
        chartType: "line",
        data: data.residentOutcomes.educationTrend,
        xKey: "label",
        dataKey: "value",
      },
      avgHealthScore: {
        title: "Health trend",
        description: "Latest health trend across residents.",
        chartType: "line",
        data: data.residentOutcomes.healthTrend,
        xKey: "label",
        dataKey: "value",
      },
      activeSafehouses: {
        title: "Safehouse occupancy",
        description: "This compares current safehouse occupancy pressure across the filtered safehouse set. Higher percentages indicate tighter operating conditions.",
        chartType: "bar",
        data: occupancyChartRows.map((row) => ({
          label: row.displayLabel,
          value: row.occupancyRatio,
        })),
        rows: occupancyChartRows,
      },
      activeCampaigns: {
        title: "Campaign performance",
        description: "Most recent campaign performance and forecasted value.",
        chartType: "bar",
        data: data.donation.campaignPerformance.slice(-8).map((row) => ({
          label: row.campaign_name ?? row.label,
          value: row.forecastNextValue ?? row.donationValue,
        })),
      },
      atRiskResidents: {
        title: "At-risk residents",
        description: "This ranks residents surfaced by current risk and readiness signals. Use it as decision support for follow-up and triage, not as a standalone clinical judgment.",
        chartType: "bar",
        data: data.reintegration.readiness.slice(0, 10).map((row) => ({
          label: row.internal_code ?? row.safehouseName ?? "Resident",
          value: row.readinessScore ?? 0,
        })),
        rows: data.reintegration.readiness,
      },
    };
  }, [data]);

  const topCampaigns = useMemo(() => {
    if (!data?.donation.campaignPerformance?.length) return [];
    const latestByCampaign = new Map<string, ChartRow>();
    data.donation.campaignPerformance.forEach((row) => {
      const key = String(row.campaign_name ?? row.label ?? "Campaign");
      latestByCampaign.set(key, row);
    });
    return Array.from(latestByCampaign.values())
      .slice(-8)
      .map((row) => ({
        label: row.campaign_name ?? row.label ?? "Campaign",
        value: row.forecastNextValue ?? row.donationValue ?? 0,
      }));
  }, [data]);

  const campaignDetailRows = useMemo<Array<ChartRow>>(
    () =>
      topCampaigns.map((row) => ({
        label: row.label,
        value: row.value,
      })),
    [topCampaigns],
  );

  const exportAnnual = async () => {
    try {
      await downloadAnnual();
      toast.success("Opened the annual report print view.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to open the annual report print view.");
    }
  };

  const openSupporter = (supporterId: string | number | null | undefined) => {
    if (!supporterId) return;
    navigate(`/admin?tab=donations&donationsSubTab=supporters&supporterId=${supporterId}&supporterModal=1`);
    setDetail(null);
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-warm lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground">Reports & Analytics</h2>
            <p className="text-sm text-muted-foreground">
              Leadership reporting, outcome intelligence, and annual accomplishment reporting in one place.
            </p>
            {data ? (
              <p className="mt-2 text-xs text-muted-foreground">Last generated {formatDateTime(data.generatedAt)}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="rounded-xl" onClick={exportAnnual}>
              <Download className="mr-2 h-4 w-4" />
              Annual report
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-warm">
          <div className="flex items-center gap-2 text-primary">
            <Filter className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">Dashboard filters</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="grid gap-2 text-sm">
              <span className="sr-only">Reports date from</span>
              <Input
                aria-label="Reports date from"
                type="date"
                value={filters.dateFrom}
                onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="sr-only">Reports date to</span>
              <Input
                aria-label="Reports date to"
                type="date"
                value={filters.dateTo}
                onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="sr-only">Filter by safehouse</span>
              <select
                aria-label="Filter by safehouse"
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.safehouseId}
                onChange={(event) => setFilters((current) => ({ ...current, safehouseId: event.target.value }))}
              >
                <option value="">All safehouses</option>
                {data?.availableFilters.safehouses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              <span className="sr-only">Filter by campaign</span>
              <select
                aria-label="Filter by campaign"
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.campaignName}
                onChange={(event) => setFilters((current) => ({ ...current, campaignName: event.target.value }))}
              >
                <option value="">All campaigns</option>
                {data?.availableFilters.campaigns.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() =>
                setFilters({
                  dateFrom: "",
                  dateTo: "",
                  safehouseId: "",
                  campaignName: "",
                })
              }
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        {summaryQuery.isLoading ? (
          <div className="rounded-2xl bg-card p-8 shadow-warm">
            <p className="text-sm text-foreground/75">Loading the latest reports and analytics summary...</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 shadow-warm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <p className="font-semibold text-foreground">The reports dashboard needs a live backend response.</p>
                <p className="mt-1 text-sm text-foreground/75">{error.message}</p>
              </div>
            </div>
          </div>
        ) : null}

        {data ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
              {data.kpis.map((kpi, index) => (
                <motion.button
                  key={kpi.key}
                  type="button"
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  onClick={() => setDetail(kpiDetails[kpi.key] ?? null)}
                  className="rounded-2xl border border-border/70 bg-card p-5 text-left shadow-warm transition-transform hover:-translate-y-0.5"
                >
                  <p className="text-sm text-foreground/75">{kpi.label}</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{formatNumber(kpi.value, kpi.unit)}</p>
                  <p className="mt-2 text-xs leading-5 text-foreground/70">{kpi.detail}</p>
                </motion.button>
              ))}
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-xl font-semibold text-foreground">Donation analytics</h3>
                  <p className="text-sm text-foreground/75">Donation trends, donor retention, allocation mix, and campaign opportunity signals.</p>
                </div>
              </div>
              <div className="grid gap-6 xl:grid-cols-2">
                <MetricCard
                  title="Donation trends over time"
                  description="Month-by-month donation value in the filtered reporting scope."
                  icon={LineChartIcon}
                  onClick={() => setDetail({ title: "Donation trends over time", description: "Donation value by month.", chartType: "line", data: data.donation.trends, xKey: "label", dataKey: "value" })}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.donation.trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </MetricCard>

                <MetricCard
                  title="Donor retention and lapse risk"
                  description="Supporters currently most likely to lapse in the filtered reporting scope."
                  icon={ShieldAlert}
                  onClick={() =>
                    setDetail({
                      title: "Donor retention and lapse risk",
                      description: "This view ranks supporters by pipeline-backed reactivation and upgrade opportunity signals so fundraising staff can decide who needs follow-up and who may be ready for a larger ask.",
                      views: [
                        {
                          key: "lapse-risk",
                          label: "Lapse risk",
                          description: "This chart ranks supporters by lapse risk so fundraising staff can see who most needs reactivation outreach.",
                          chartType: "bar",
                          data: lapseRiskRows,
                          rows: lapseRiskRows,
                          labelKey: "label",
                          valueKey: "value",
                          searchable: true,
                        },
                        {
                          key: "upgrade-potential",
                          label: "Upgrade potential",
                          description: "This chart ranks supporters by donor-upgrade probability and helps staff identify who may be ready for a higher ask.",
                          chartType: "bar",
                          data: donorUpgradeRows,
                          rows: donorUpgradeRows,
                          labelKey: "label",
                          valueKey: "value",
                          searchable: true,
                        },
                      ],
                      searchable: true,
                      rowAction: { label: "Open supporter", type: "supporter", idKey: "supporter_id", textKey: "supporter_name" },
                    })
                  }
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lapseRiskRows} layout="vertical" margin={{ left: 16, right: 18 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--secondary))" radius={[0, 12, 12, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </MetricCard>

                <MetricCard
                  title="Allocation by program area"
                  description="Program areas receiving the most allocation support."
                  icon={BarChart3}
                  onClick={() => setDetail({ title: "Allocation by program area", description: "This shows which program areas received the most funding in the filtered reporting scope.", chartType: "bar", data: data.donation.allocationByProgramArea, rows: data.donation.allocationByProgramArea, labelKey: "label", valueKey: "value" })}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.donation.allocationByProgramArea}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </MetricCard>

                <MetricCard
                  title="Campaign performance"
                  description="Recent campaign performance with forecast-style momentum view."
                  icon={Megaphone}
                  onClick={() => setDetail({ title: "Campaign performance", description: "This compares recent campaign performance using the latest forecast-style values across campaigns.", chartType: "bar", data: topCampaigns, rows: campaignDetailRows, labelKey: "label", valueKey: "value" })}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCampaigns}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--secondary))" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </MetricCard>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="font-heading text-xl font-semibold text-foreground">Resident outcome analytics</h3>
              <div className="grid gap-6 xl:grid-cols-2">
                <MetricCard title="Education trend" description="Average resident education progress over time." icon={Users} onClick={() => setDetail({ title: "Education trend", description: "This chart shows average education progress by month for residents in the current reporting scope.", chartType: "line", data: data.residentOutcomes.educationTrend, rows: data.residentOutcomes.educationTrend, xKey: "label", dataKey: "value" })}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.residentOutcomes.educationTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </MetricCard>

                <MetricCard title="Health trend" description="Average resident health trend over time." icon={HeartPulse} onClick={() => setDetail({ title: "Health trend", description: "This chart shows average health score by month for residents in the current reporting scope.", chartType: "line", data: data.residentOutcomes.healthTrend, rows: data.residentOutcomes.healthTrend, xKey: "label", dataKey: "value" })}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.residentOutcomes.healthTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--secondary))" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </MetricCard>

                <MetricCard title="Process recording progress" description="Progress and concerns from process recordings." icon={Activity} onClick={() => setDetail({ title: "Process recording progress", description: "This chart compares process-record progress rates with concern rates by month.", chartType: "line", data: data.residentOutcomes.processProgress, rows: data.residentOutcomes.processProgress, xKey: "label", dataKey: "progressRate", secondaryKey: "concernRate" })}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.residentOutcomes.processProgress}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="progressRate" stroke="hsl(var(--primary))" strokeWidth={3} />
                      <Line type="monotone" dataKey="concernRate" stroke="hsl(var(--destructive))" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </MetricCard>

                <MetricCard title="Incident and risk distribution" description="Incident trend plus current risk-level distribution." icon={ShieldAlert} onClick={() => setDetail({ title: "Incident and risk distribution", description: "Compare recent incident volume with the current resident risk distribution.", views: [{ key: "incidents", label: "Incident trend", description: "This chart shows incident counts over time in the filtered reporting scope.", chartType: "line", data: data.residentOutcomes.incidentTrend, rows: data.residentOutcomes.incidentTrend, xKey: "label", dataKey: "incidentCount", secondaryKey: "unresolvedCount" }, { key: "risk-distribution", label: "Risk distribution", description: "This shows how residents are currently distributed across risk levels in the filtered scope.", chartType: "pie", data: data.residentOutcomes.riskLevelDistribution, rows: data.residentOutcomes.riskLevelDistribution, labelKey: "label", valueKey: "value" }] })}>
                  <div className="grid h-full gap-4 md:grid-cols-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.residentOutcomes.incidentTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="incidentCount" stroke="hsl(var(--destructive))" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip />
                        <Pie data={data.residentOutcomes.riskLevelDistribution} dataKey="value" nameKey="label" innerRadius={42} outerRadius={80}>
                          {data.residentOutcomes.riskLevelDistribution.map((entry, index) => (
                            <Cell key={`${entry.label}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </MetricCard>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="font-heading text-xl font-semibold text-foreground">Safehouse performance</h3>
              <div className="grid gap-6 xl:grid-cols-2">
                <MetricCard title="Occupancy vs capacity" description="Safehouse occupancy pressure at the latest monthly snapshot." icon={Home} onClick={() => setDetail({ title: "Occupancy vs capacity", description: "This compares current safehouse occupancy ratios and helps surface houses running close to capacity. The drill-down includes clearer house labels and sortable row details.", chartType: "bar", data: occupancyChartRows.map((row) => ({ label: row.displayLabel, value: row.occupancyRatio })), rows: occupancyChartRows, labelKey: "label", valueKey: "value" })}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={occupancyChartRows} layout="vertical" margin={{ left: 16, right: 18 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="displayLabel" width={180} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="occupancyRatio" fill="hsl(var(--primary))" radius={[0, 12, 12, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </MetricCard>

                <MetricCard title="Incident forecast" description="Pressure-oriented forecast adapted from safehouse pressure logic." icon={AlertCircle} onClick={() => setDetail({ title: "Incident forecast", description: "This compares safehouse pressure scores and predicted incident load from the latest forecast logic. Use the expanded view to compare exact house-level values.", chartType: "bar", data: forecastChartRows.map((row) => ({ label: row.displayLabel, value: row.pressureScore })), rows: forecastChartRows, labelKey: "label", valueKey: "value" })}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forecastChartRows} layout="vertical" margin={{ left: 16, right: 18 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="displayLabel" width={180} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="pressureScore" fill="hsl(var(--secondary))" radius={[0, 12, 12, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </MetricCard>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="font-heading text-xl font-semibold text-foreground">Reintegration + case risk</h3>
              <div className="grid gap-6 xl:grid-cols-2">
                <MetricCard title="Readiness score" description="Residents with the strongest reintegration readiness signals." icon={Users} onClick={() => setDetail({ title: "Readiness score", description: "This compares the deployed reintegration-readiness pipeline with the original heuristic readiness view so staff can review both perspectives.", views: [{ key: "pipeline", label: "ML readiness", description: "This chart ranks residents by the deployed reintegration-readiness pipeline output.", chartType: "bar", data: pipelineReadinessRows, rows: data.reintegration.readiness, labelKey: "label", valueKey: "value" }, { key: "heuristic", label: "Heuristic readiness", description: "This chart keeps the legacy readiness formula visible for comparison with the pipeline output.", chartType: "bar", data: heuristicReadinessRows, rows: data.reintegration.heuristicReadiness ?? [], labelKey: "label", valueKey: "value" }] })}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipelineReadinessRows.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </MetricCard>

                <MetricCard title="Funnel and intervention completion" description="Case progression and plan completion status." icon={BarChart3} onClick={() => setDetail({ title: "Reintegration funnel and intervention completion", description: "Review both case-stage distribution and intervention-plan completion status.", views: [{ key: "funnel", label: "Reintegration funnel", description: "This shows how residents are distributed across reintegration stages in the current reporting scope.", chartType: "bar", data: data.reintegration.funnel, rows: data.reintegration.funnel, labelKey: "label", valueKey: "value" }, { key: "completion", label: "Intervention completion", description: "This shows intervention-plan completion status distribution.", chartType: "pie", data: data.reintegration.interventionCompletion, rows: data.reintegration.interventionCompletion, labelKey: "label", valueKey: "value" }] })}>
                  <div className="grid h-full gap-4 md:grid-cols-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.reintegration.funnel}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--secondary))" radius={[12, 12, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip />
                        <Pie data={data.reintegration.interventionCompletion} dataKey="value" nameKey="label" innerRadius={40} outerRadius={78}>
                          {data.reintegration.interventionCompletion.map((entry, index) => (
                            <Cell key={`${entry.label}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </MetricCard>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="font-heading text-xl font-semibold text-foreground">Outreach + public impact</h3>
              <div className="grid gap-6">
                <MetricCard title="Best platforms and posting time" description="Reused from outreach analytics and social intelligence artifacts." icon={Megaphone} onClick={() => setDetail({ title: "Conversion by post type", description: "This compares donation-conversion performance across post types in the outreach analytics layer.", chartType: "bar", data: data.outreachImpact.conversionByPostType.map((row) => ({ label: row.postType, value: row.referralRate })), rows: data.outreachImpact.conversionByPostType, labelKey: "label", valueKey: "value" })}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-muted/25 p-4">
                      <p className="text-sm text-foreground/75">Best platform</p>
                      <p className="mt-2 text-2xl font-bold text-foreground">{data.outreachImpact.bestPlatform ?? "N/A"}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/25 p-4">
                      <p className="text-sm text-foreground/75">Best posting time</p>
                      <p className="mt-2 text-2xl font-bold text-foreground">{data.outreachImpact.bestPostingTime ?? "N/A"}</p>
                    </div>
                  </div>
                  <div className="mt-4 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.outreachImpact.conversionByPostType}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="postType" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="referralRate" fill="hsl(var(--primary))" radius={[12, 12, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </MetricCard>

              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-xl font-semibold text-foreground">Annual accomplishment report</h3>
                  <p className="text-sm text-foreground/75">Caring, Healing, Teaching, beneficiary counts, and service totals.</p>
                </div>
                <Button className="rounded-xl" onClick={exportAnnual}>
                  <Download className="mr-2 h-4 w-4" />
                  Print annual report
                </Button>
              </div>
              <div className="grid gap-6">
                <MetricCard title="Service buckets" description="Mission-aligned service activity across Caring, Healing, and Teaching." icon={Sparkles} onClick={() => setDetail({ title: "Annual service buckets", description: "This shows how annual service activity distributes across Caring, Healing, and Teaching.", chartType: "bar", data: data.annualReport.serviceBuckets.map((row) => ({ label: row.label, value: row.count })), rows: data.annualReport.serviceBuckets, labelKey: "label", valueKey: "value" })}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.annualReport.serviceBuckets}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </MetricCard>
              </div>
            </section>
          </>
        ) : null}
      </div>

      <DetailDialog detail={detail} open={Boolean(detail)} onOpenChange={(open) => (!open ? setDetail(null) : null)} onSupporterOpen={openSupporter} />
    </>
  );
}
