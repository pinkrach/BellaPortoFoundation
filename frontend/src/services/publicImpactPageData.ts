type ReportKpi = {
  key: string;
  label: string;
  value: number | null;
  detail: string;
  unit?: string;
};

type TrendRow = {
  label?: string;
  month?: string | null;
  value?: number | null;
  [key: string]: string | number | null | undefined;
};

type ReportsSummary = {
  asOf: string;
  kpis: ReportKpi[];
  donation: {
    allocationByProgramArea: Array<{
      label: string;
      value: number;
      allocations?: number;
      safehouses?: number;
    }>;
  };
  residentOutcomes: {
    educationTrend: TrendRow[];
    healthTrend: TrendRow[];
    processProgress: Array<TrendRow & { progressRate?: number | null; concernRate?: number | null; sessions?: number | null }>;
    homeVisitOutcomeTrend: Array<TrendRow & { favorableRate?: number | null; followupRate?: number | null; visitCount?: number | null }>;
  };
  annualReport: {
    serviceBuckets: Array<{
      label: string;
      count: number;
      detail?: {
        processSessions?: number;
        interventionPlans?: number;
      };
    }>;
    highlights: string[];
    narrativeSummary: string;
    outcomes: Array<{
      label: string;
      value: number;
      unit?: string;
    }>;
  };
  outreachImpact: {
    publicImpactSnapshots: TrendRow[];
  };
};

type PublicImpactSummary = {
  generatedAt: string;
  summary: {
    headline: string;
    suggestedHeadline: string;
    suggestedMetric: string;
  };
  recommendations: string[];
  impactTimeline: Array<{
    month: string | null;
    label: string;
    activeResidentsServed: number | null;
    avgHealthScore: number | null;
    avgEducationProgress: number | null;
    totalDonationImpact: number | null;
  }>;
};

export type DonationAllocationGroup = {
  label: string;
  value: number;
  percent: number;
  tone: string;
};

export type DonationImpactEstimate = {
  label: string;
  value: number;
  suffix: string;
  description: string;
};

export type PublicImpactPageData = {
  reportsSummary: ReportsSummary;
  publicImpactSummary: PublicImpactSummary;
  fundraising: {
    raised: number;
    goal: number;
    progressPercent: number;
  };
  kpiCards: Array<{
    label: string;
    value: number;
    format: "count" | "percent" | "score";
    description: string;
  }>;
  groupedAllocation: DonationAllocationGroup[];
  calculator: {
    presets: number[];
    defaultAmount: number;
    estimatesForAmount: (amount: number) => DonationImpactEstimate[];
  };
  trustSummary: {
    periodLabel: string;
    cards: Array<{
      label: string;
      value: string;
      summary: string;
      detail: string;
    }>;
  };
};

function toPositiveNumber(value: unknown) {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function parseJsonWithNormalizedNumbers<T>(text: string) {
  return JSON.parse(
    text.replace(/\bNaN\b/g, "null").replace(/\b-Infinity\b/g, "null").replace(/\bInfinity\b/g, "null"),
  ) as T;
}

async function fetchBundledJson<T>(path: string) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}.`);
  }
  return parseJsonWithNormalizedNumbers<T>(await response.text());
}

async function fetchPublicImpactSummary() {
  return fetchBundledJson<PublicImpactSummary>("/public-impact-summary.json");
}

function getKpiValue(summary: ReportsSummary, key: string) {
  return summary.kpis.find((item) => item.key === key)?.value ?? 0;
}

function roundUp(value: number, increment: number) {
  return Math.ceil(value / increment) * increment;
}

function buildFundraising(raised: number) {
  const inferredGoal = roundUp(Math.max(raised * 2.75, 25_000), 2_500);
  return {
    raised,
    goal: inferredGoal,
    progressPercent: raised > 0 ? Math.min((raised / inferredGoal) * 100, 100) : 0,
  };
}

function buildGroupedAllocation(summary: ReportsSummary): DonationAllocationGroup[] {
  const grouped = new Map<string, number>();
  const areaMap: Record<string, string> = {
    Education: "Education",
    Wellbeing: "Wellbeing",
    Maintenance: "Housing & Shelter",
    Transport: "Housing & Shelter",
    Operations: "Operations & Outreach",
    Outreach: "Operations & Outreach",
  };

  for (const row of summary.donation.allocationByProgramArea) {
    const key = areaMap[row.label] ?? row.label;
    grouped.set(key, (grouped.get(key) ?? 0) + toPositiveNumber(row.value));
  }

  const total = Array.from(grouped.values()).reduce((sum, value) => sum + value, 0);
  const tones = ["#5A8FA0", "#9B7FC0", "#C17A3A", "#4A7A52"];

  return ["Education", "Wellbeing", "Housing & Shelter", "Operations & Outreach"].map((label, index) => {
    const value = grouped.get(label) ?? 0;
    return {
      label,
      value,
      percent: total > 0 ? (value / total) * 100 : 0,
      tone: tones[index],
    };
  });
}

function getAreaValue(summary: ReportsSummary, area: string) {
  return toPositiveNumber(summary.donation.allocationByProgramArea.find((row) => row.label === area)?.value);
}

function getAreaAllocationCount(summary: ReportsSummary, area: string) {
  return toPositiveNumber(summary.donation.allocationByProgramArea.find((row) => row.label === area)?.allocations);
}

function getServiceBucketCount(summary: ReportsSummary, label: string) {
  return toPositiveNumber(summary.annualReport.serviceBuckets.find((bucket) => bucket.label === label)?.count);
}

function buildImpactEstimator(summary: ReportsSummary) {
  const educationPerSupport = getAreaValue(summary, "Education") / Math.max(getServiceBucketCount(summary, "Teaching"), 1);
  const wellbeingPerSupport = getAreaValue(summary, "Wellbeing") / Math.max(getServiceBucketCount(summary, "Healing"), 1);

  const transportAverageAllocation =
    getAreaValue(summary, "Transport") / Math.max(getAreaAllocationCount(summary, "Transport"), 1);
  const shelterAverageAllocation =
    (getAreaValue(summary, "Maintenance") + getAreaValue(summary, "Operations")) /
    Math.max(getAreaAllocationCount(summary, "Maintenance") + getAreaAllocationCount(summary, "Operations"), 1);
  const outreachAverageAllocation =
    getAreaValue(summary, "Outreach") / Math.max(getAreaAllocationCount(summary, "Outreach"), 1);

  return (amount: number): DonationImpactEstimate[] => {
    const cleanAmount = Math.max(0, amount);
    const grouped = buildGroupedAllocation(summary);
    const percentLookup = new Map(grouped.map((item) => [item.label, item.percent / 100]));
    const educationAmount = cleanAmount * (percentLookup.get("Education") ?? 0);
    const wellbeingAmount = cleanAmount * (percentLookup.get("Wellbeing") ?? 0);
    const housingAmount = cleanAmount * (percentLookup.get("Housing & Shelter") ?? 0);
    const operationsAmount = cleanAmount * (percentLookup.get("Operations & Outreach") ?? 0);

    return [
      {
        label: "School support moments",
        value: Math.max(1, Math.round(educationAmount / Math.max(educationPerSupport, 1))),
        suffix: "supports",
        description: "Estimated from the historical Education allocation-to-teaching support ratio.",
      },
      {
        label: "Counseling and healing touchpoints",
        value: Math.max(1, Math.round(wellbeingAmount / Math.max(wellbeingPerSupport, 1))),
        suffix: "touchpoints",
        description: "Estimated from the historical Wellbeing allocation-to-healing service ratio.",
      },
      {
        label: "Transportation assists",
        value: Math.max(1, Math.round((cleanAmount * ((getAreaValue(summary, "Transport") / Math.max(grouped.reduce((sum, item) => sum + item.value, 0), 1)))) / Math.max(transportAverageAllocation, 1))),
        suffix: "assists",
        description: "Estimated using the average size of past Transport allocations.",
      },
      {
        label: "Shelter essentials prepared",
        value: Math.max(1, Math.round(housingAmount / Math.max(shelterAverageAllocation, 1))),
        suffix: "essentials blocks",
        description: "Estimated using the average size of combined housing, maintenance, and operations support blocks.",
      },
      {
        label: "Outreach follow-ups enabled",
        value: Math.max(1, Math.round(operationsAmount / Math.max(outreachAverageAllocation, 1))),
        suffix: "follow-ups",
        description: "Estimated using the average size of past Outreach allocations.",
      },
    ];
  };
}

function getLatestRow<T extends { label?: string }>(rows: T[]) {
  return rows.at(-1) ?? null;
}

export async function getPublicImpactPageData(): Promise<PublicImpactPageData> {
  const [reportsSummary, publicImpactSummary] = await Promise.all([
    fetchBundledJson<ReportsSummary>("/reports-summary.json"),
    fetchPublicImpactSummary(),
  ]);

  const raised = toPositiveNumber(getKpiValue(reportsSummary, "donationsYtd"));
  const fundraising = buildFundraising(raised);
  const groupedAllocation = buildGroupedAllocation(reportsSummary);
  const latestEducation = getLatestRow(reportsSummary.residentOutcomes.educationTrend);
  const latestHealth = getLatestRow(reportsSummary.residentOutcomes.healthTrend);
  const latestProgress = getLatestRow(reportsSummary.residentOutcomes.processProgress);
  const latestHomeVisit = getLatestRow(reportsSummary.residentOutcomes.homeVisitOutcomeTrend);

  return {
    reportsSummary,
    publicImpactSummary,
    fundraising,
    kpiCards: [
      {
        label: "Active residents supported",
        value: toPositiveNumber(getKpiValue(reportsSummary, "activeResidents")),
        format: "count",
        description: "Girls currently receiving daily shelter, guidance, and recovery support.",
      },
      {
        label: "Safehouses in operation",
        value: toPositiveNumber(getKpiValue(reportsSummary, "activeSafehouses")),
        format: "count",
        description: "Homes kept open, staffed, and ready to receive girls in need of protection.",
      },
      {
        label: "Avg education progress",
        value: toPositiveNumber(getKpiValue(reportsSummary, "avgEducationProgress")),
        format: "percent",
        description: "Latest education milestone progress across residents in care.",
      },
      {
        label: "Avg wellbeing score",
        value: toPositiveNumber(getKpiValue(reportsSummary, "avgHealthScore")),
        format: "score",
        description: "Latest public wellbeing and health score across residents in care.",
      },
    ],
    groupedAllocation,
    calculator: {
      presets: [500, 1000, 2500, 5000],
      defaultAmount: 1000,
      estimatesForAmount: buildImpactEstimator(reportsSummary),
    },
    trustSummary: {
      periodLabel: latestHomeVisit?.label ?? latestProgress?.label ?? reportsSummary.asOf,
      cards: [
        {
          label: "Caring supports",
          value: `${Math.round(toPositiveNumber(latestProgress?.sessions))} sessions`,
          summary: `${Math.round(toPositiveNumber(latestProgress?.progressRate))}% showed positive progress in the latest published process snapshot.`,
          detail:
            "Drawn from the resident process-progress pipeline and paired with annual Caring service volumes from the accomplishment report.",
        },
        {
          label: "Healing services",
          value: `${(toPositiveNumber(latestHealth?.value) || 0).toFixed(2)} wellbeing score`,
          summary: `${Math.round(toPositiveNumber(latestHomeVisit?.visitCount))} home visit check-ins were recorded in the latest home visitation snapshot.`,
          detail:
            "Grounded in the latest wellbeing trend and home visitation outcomes, then contextualized with Healing service totals from the annual report.",
        },
        {
          label: "Teaching progress",
          value: `${Math.round(toPositiveNumber(latestEducation?.value))}% progress`,
          summary: `${getServiceBucketCount(reportsSummary, "Teaching").toLocaleString()} teaching-focused supports were recorded in the latest annual accomplishment report.`,
          detail:
            "Combines the latest education trend point with the accomplishment report's Teaching service totals to show both current momentum and long-term scale.",
        },
      ],
    },
  };
}
