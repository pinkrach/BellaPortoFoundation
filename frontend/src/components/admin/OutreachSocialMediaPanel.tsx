import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  Brain,
  Clock3,
  Megaphone,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { fetchWithAuth, apiBaseUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { insertRecord } from "@/services/databaseService";

type SocialPostRow = {
  post_id: number;
  platform: string | null;
  created_at: string | null;
  day_of_week?: string | null;
  post_hour?: number | string | null;
  post_type: string | null;
  media_type?: string | null;
  campaign_name: string | null;
  has_call_to_action?: boolean | string | null;
  features_resident_story?: boolean | string | null;
  is_boosted?: boolean | string | null;
  reach?: number | string | null;
  shares?: number | string | null;
  saves?: number | string | null;
  click_throughs?: number | string | null;
  profile_visits?: number | string | null;
  forwards?: number | string | null;
  engagement_rate: number | string | null;
  donation_referrals: number | string | null;
  estimated_donation_value_php: number | string | null;
};

type DetailChartType = "count" | "percent" | "currency" | "score";
type PlannerMode = "donation" | "community";

type DetailConfig = {
  title: string;
  description: string;
  chartTitle: string;
  chartType: DetailChartType;
  chartData: Array<{ label: string; value: number }>;
  highlights: string[];
};

type SocialAnalyticsResponse = {
  generatedAt: string;
  dataset: {
    rowCount: number;
    dateMin?: string | null;
    dateMax?: string | null;
    referralRate?: number | null;
    avgDonationValuePhp?: number | null;
    postsAboveThreshold?: number | null;
  };
  model: {
    isTrained: boolean;
    threshold: number;
    precision?: number | null;
    recall?: number | null;
    f1?: number | null;
    rocAuc?: number | null;
    averagePrecision?: number | null;
  };
  kpis: Array<{ label: string; value: number | null; detail: string }>;
  postTypeReferralChart: Array<{ postType: string; posts: number; referralRate: number | null }>;
  postTypeValueChart: Array<{ postType: string; posts: number; avgDonationValuePhp: number | null }>;
  hourPerformance?: Array<{ label: string; posts: number; referralRate: number | null }>;
  tonePerformance?: Array<{ label: string; posts: number; referralRate: number | null }>;
  liftMetrics: Array<{
    factor: string;
    withLabel: string;
    withoutLabel: string;
    withRate: number | null;
    withoutRate: number | null;
    liftPoints: number | null;
  }>;
  timingSignals: Array<{ label: string; value: string; detail: string }>;
  recommendations: string[];
  summary: {
    headline: string;
    bestOverallFormat: string;
    bestValueFormat: string;
  };
};

type CommunityAnalyticsResponse = {
  generatedAt: string;
  dataset: {
    rowCount: number;
    dateMin?: string | null;
    dateMax?: string | null;
    avgCommunityReachScore?: number | null;
    avgShareRate?: number | null;
    likelyCommunityReferralRate?: number | null;
  };
  model: {
    isTrained: boolean;
    testRmse?: number | null;
    testMae?: number | null;
    testR2?: number | null;
    topDrivers?: Array<{ feature: string; importance: number }>;
  };
  kpis: Array<{ label: string; value: number | null; detail: string; unit?: string }>;
  postTypeReachChart: Array<{ postType: string; posts: number; avgCommunityReachScore: number | null }>;
  platformReachChart: Array<{ platform: string; posts: number; avgCommunityReachScore: number | null; avgReach?: number | null }>;
  timeBucketChart: Array<{ timeBucket: string; posts: number; avgCommunityReachScore: number | null }>;
  liftMetrics: Array<{
    factor: string;
    withLabel: string;
    withoutLabel: string;
    withRate: number | null;
    withoutRate: number | null;
    liftPoints: number | null;
  }>;
  timingSignals: Array<{ label: string; value: string; detail: string }>;
  recommendations: string[];
  summary: {
    headline: string;
    bestPlatform: string;
    bestFormat: string;
  };
  topDrivers?: Array<{ feature: string; importance: number }>;
};

type HistoricalPostFormState = {
  platform: string;
  created_at: string;
  day_of_week: string;
  post_hour: string;
  post_type: string;
  media_type: string;
  caption: string;
  num_hashtags: string;
  has_call_to_action: string;
  call_to_action_type: string;
  content_topic: string;
  sentiment_tone: string;
  caption_length: string;
  features_resident_story: string;
  campaign_name: string;
  is_boosted: string;
  boost_budget_php: string;
  impressions: string;
  reach: string;
  likes: string;
  comments: string;
  shares: string;
  saves: string;
  click_throughs: string;
  profile_visits: string;
  forwards: string;
  watch_time_seconds: string;
  avg_view_duration_seconds: string;
  engagement_rate: string;
  donation_referrals: string;
  estimated_donation_value_php: string;
};

const EMPTY_FORM: HistoricalPostFormState = {
  platform: "",
  created_at: "",
  day_of_week: "",
  post_hour: "",
  post_type: "",
  media_type: "",
  caption: "",
  num_hashtags: "",
  has_call_to_action: "false",
  call_to_action_type: "",
  content_topic: "",
  sentiment_tone: "",
  caption_length: "",
  features_resident_story: "false",
  campaign_name: "",
  is_boosted: "false",
  boost_budget_php: "",
  impressions: "",
  reach: "",
  likes: "",
  comments: "",
  shares: "",
  saves: "",
  click_throughs: "",
  profile_visits: "",
  forwards: "",
  watch_time_seconds: "",
  avg_view_duration_seconds: "",
  engagement_rate: "",
  donation_referrals: "",
  estimated_donation_value_php: "",
};

const FALLBACK_PLATFORMS = ["Facebook", "Instagram", "Twitter", "LinkedIn", "TikTok", "WhatsApp", "YouTube"];
const FALLBACK_POST_TYPES = ["ImpactStory", "Campaign", "FundraisingAppeal", "ThankYou", "EducationalContent", "EventPromotion"];
const FALLBACK_MEDIA_TYPES = ["Photo", "Video", "Text", "Carousel", "Graphic"];
const FALLBACK_CTA_TYPES = ["Donate", "LearnMore", "Volunteer", "Share", "ReadMore"];
const FALLBACK_TOPICS = ["Education", "Health", "Shelter", "Rescue", "Advocacy", "Operations"];
const FALLBACK_TONES = ["Urgent", "Emotional", "Celebratory", "Grateful", "Informative", "Hopeful"];
const hasLiveApi = Boolean(apiBaseUrl);

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toNullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableBoolean(value: string) {
  if (!value.trim()) return null;
  return value === "true";
}

function asBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `${Math.round(value * 100)}%`;
}

function formatDisplayPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `${Math.round(value * 10) / 10}%`;
}

function formatPeso(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `PHP ${Math.round(value).toLocaleString()}`;
}

function formatDecimal(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `${Math.round(value * 100) / 100}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function formatHourLabel(value: string) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return value;
  const suffix = parsed >= 12 ? "PM" : "AM";
  const hour = parsed % 12 === 0 ? 12 : parsed % 12;
  return `${hour} ${suffix}`;
}

function formatTimeBucketLabel(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Unknown";
}

function formatModelFeatureLabel(feature: string | null | undefined) {
  const raw = String(feature ?? "").trim();
  if (!raw) return "Unknown";
  const cleaned = raw.replace(/^.*__/, "").replace(/_/g, " ").replace(/\s*x\s*/gi, " x ").trim();
  const normalized = cleaned
    .split(/\s+/)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "php") return "PHP";
      if (lower === "cta") return "CTA";
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
  return normalized;
}

function uniqueOptions(values: Array<string | null | undefined>, fallbacks: string[]) {
  const derived = values.map((value) => String(value ?? "").trim()).filter(Boolean);
  return Array.from(new Set([...(derived.length ? derived : []), ...fallbacks])).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

async function fetchBundledDonationAnalytics(): Promise<SocialAnalyticsResponse> {
  const response = await fetch("/social-dashboard-summary.json");
  if (!response.ok) throw new Error("Unable to load the bundled donation social analytics snapshot.");
  return response.json();
}

async function fetchBundledCommunityAnalytics(): Promise<CommunityAnalyticsResponse> {
  const response = await fetch("/social-community-summary.json");
  if (!response.ok) throw new Error("Unable to load the bundled community outreach analytics snapshot.");
  return response.json();
}

async function fetchLatestDonationAnalytics(): Promise<SocialAnalyticsResponse> {
  if (!hasLiveApi) return fetchBundledDonationAnalytics();
  const response = await fetchWithAuth("/api/ml/social/latest");
  if (response.status === 404 || !response.ok) return fetchBundledDonationAnalytics();
  return response.json();
}

async function fetchLatestCommunityAnalytics(): Promise<CommunityAnalyticsResponse> {
  if (!hasLiveApi) return fetchBundledCommunityAnalytics();
  const response = await fetchWithAuth("/api/ml/social/community/latest");
  if (response.status === 404 || !response.ok) return fetchBundledCommunityAnalytics();
  return response.json();
}

async function refreshDonationAnalytics(): Promise<SocialAnalyticsResponse> {
  const response = await fetchWithAuth("/api/ml/social/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Unable to refresh donation social analytics.");
  }
  return response.json();
}

async function refreshCommunityAnalytics(): Promise<CommunityAnalyticsResponse> {
  const response = await fetchWithAuth("/api/ml/social/community/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Unable to refresh community outreach analytics.");
  }
  return response.json();
}

function validateHistoricalPost(form: HistoricalPostFormState): string | null {
  if (!form.platform.trim()) return "Platform is required.";
  if (!form.created_at.trim()) return "Post date and time are required.";
  if (!form.day_of_week.trim()) return "Day of week is required.";
  if (!form.post_type.trim()) return "Post type is required.";
  if (!form.media_type.trim()) return "Media type is required.";
  if (!form.content_topic.trim()) return "Content topic is required.";
  if (!form.sentiment_tone.trim()) return "Sentiment tone is required.";
  if (!form.caption.trim()) return "Caption is required.";
  if (!form.donation_referrals.trim()) return "Donation referrals are required for a historical post.";
  if (!form.estimated_donation_value_php.trim()) return "Estimated donation value is required for a historical post.";

  const hour = Number(form.post_hour);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return "Post hour must be between 0 and 23.";

  const numericFields: Array<[string, string]> = [
    ["num_hashtags", form.num_hashtags],
    ["caption_length", form.caption_length],
    ["boost_budget_php", form.boost_budget_php],
    ["impressions", form.impressions],
    ["reach", form.reach],
    ["likes", form.likes],
    ["comments", form.comments],
    ["shares", form.shares],
    ["saves", form.saves],
    ["click_throughs", form.click_throughs],
    ["profile_visits", form.profile_visits],
    ["forwards", form.forwards],
    ["watch_time_seconds", form.watch_time_seconds],
    ["avg_view_duration_seconds", form.avg_view_duration_seconds],
    ["engagement_rate", form.engagement_rate],
    ["donation_referrals", form.donation_referrals],
    ["estimated_donation_value_php", form.estimated_donation_value_php],
  ];

  for (const [label, value] of numericFields) {
    if (!value.trim()) continue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return `${label.replaceAll("_", " ")} must be a non-negative number.`;
  }

  if (form.has_call_to_action === "true" && !form.call_to_action_type.trim()) {
    return "Choose a call-to-action type when CTA is enabled.";
  }

  return null;
}

function formatChartValue(value: number, chartType: DetailChartType) {
  if (chartType === "percent") return `${Math.round(value * 100)}%`;
  if (chartType === "currency") return formatPeso(value);
  if (chartType === "score") return `${Math.round(value * 1000) / 10}%`;
  return value.toLocaleString();
}

function MiniPreviewChart({
  data,
  chartType,
}: {
  data: Array<{ label: string; value: number }>;
  chartType: DetailChartType;
}) {
  if (data.length === 0) return null;
  return (
    <div className="mt-4 h-20">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Tooltip formatter={(value: number) => formatChartValue(value, chartType)} />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
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
                    <p className="text-sm text-muted-foreground">This drill-down expands the planning signal behind the selected KPI or chart.</p>
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
                          if (detail.chartType === "percent") return `${Math.round(Number(value) * 100)}%`;
                          if (detail.chartType === "currency") return `${Math.round(Number(value) / 1000)}k`;
                          if (detail.chartType === "score") return `${Math.round(Number(value) * 100)}%`;
                          return Number(value).toLocaleString();
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
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">Planning note</span>
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

function DonationAnalyticsView({
  data,
  socialPosts,
}: {
  data: SocialAnalyticsResponse;
  socialPosts: SocialPostRow[];
}) {
  const [activeKpiLabel, setActiveKpiLabel] = useState<string | null>(null);
  const [activeInsightId, setActiveInsightId] = useState<string | null>(null);
  const [activeChartId, setActiveChartId] = useState<string | null>(null);

  const platformDonationChart = useMemo(() => {
    const grouped = new Map<string, { posts: number; donationValueTotal: number; referredPosts: number }>();
    for (const post of socialPosts) {
      const platform = String(post.platform ?? "").trim();
      if (!platform) continue;
      const current = grouped.get(platform) ?? { posts: 0, donationValueTotal: 0, referredPosts: 0 };
      current.posts += 1;
      current.donationValueTotal += toNumber(post.estimated_donation_value_php);
      if (toNumber(post.donation_referrals) > 0) current.referredPosts += 1;
      grouped.set(platform, current);
    }
    return Array.from(grouped.entries())
      .map(([label, metrics]) => ({
        label,
        posts: metrics.posts,
        avgDonationValuePhp: metrics.posts ? metrics.donationValueTotal / metrics.posts : 0,
        referralRate: metrics.posts ? metrics.referredPosts / metrics.posts : 0,
      }))
      .sort((left, right) => right.avgDonationValuePhp - left.avgDonationValuePhp);
  }, [socialPosts]);

  const topReferralType = data.postTypeReferralChart[0];
  const topValueType = data.postTypeValueChart[0];
  const bestReferralHour = data.timingSignals.find((signal) => signal.label === "Best referral hour");
  const bestValueHour = data.timingSignals.find((signal) => signal.label === "Best donation-value hour");
  const bestReferralTone = data.timingSignals.find((signal) => signal.label === "Best referral tone");
  const bestValueTone = data.timingSignals.find((signal) => signal.label === "Best donation-value tone");
  const topDonationPlatform = platformDonationChart[0];

  const topKpiCards = [
    {
      label: "Referral rate",
      value: formatDisplayPercent((data.dataset.referralRate ?? 0) * 100),
      detail: "Posts that generated at least one donation referral",
    },
    {
      label: "Avg donation value",
      value: formatPeso(data.dataset.avgDonationValuePhp),
      detail: "Average estimated donation value per post",
    },
    {
      label: "Best donation platform",
      value: topDonationPlatform?.label ?? "N/A",
      detail: topDonationPlatform
        ? `${formatPeso(topDonationPlatform.avgDonationValuePhp)} average donation value per post`
        : "Platform donation performance is not available yet",
    },
    {
      label: "Best referral format",
      value: topReferralType?.postType ?? "N/A",
      detail: topReferralType
        ? `${formatPercent(topReferralType.referralRate)} referral rate in the current dataset`
        : "Referral format performance is not available yet",
    },
  ];

  const kpiDetail: DetailConfig | null = (() => {
    switch (activeKpiLabel) {
      case "Referral rate":
        return {
          title: "Referral rate",
          description: "This KPI shows how often posts generated at least one donation referral and which formats drive that conversion rate.",
          chartTitle: "Referral rate by post type",
          chartType: "percent",
          chartData: data.postTypeReferralChart.map((point) => ({ label: point.postType, value: point.referralRate ?? 0 })),
          highlights: [
            topReferralType ? `${topReferralType.postType} is the strongest current referral format at ${formatPercent(topReferralType.referralRate)}.` : "No top referral format is available yet.",
            bestReferralHour ? `${bestReferralHour.label} is currently ${formatHourLabel(bestReferralHour.value)}.` : "Best referral hour is not available yet.",
            bestReferralTone ? `${bestReferralTone.label} is currently ${bestReferralTone.value}.` : "Best referral tone is not available yet.",
          ],
        };
      case "Avg donation value":
        return {
          title: "Average donation value",
          description: "This KPI estimates the fundraising upside tied to different post formats and helps break ties among strong referral candidates.",
          chartTitle: "Average donation value by post type",
          chartType: "currency",
          chartData: data.postTypeValueChart.map((point) => ({ label: point.postType, value: point.avgDonationValuePhp ?? 0 })),
          highlights: [
            topValueType ? `${topValueType.postType} currently leads expected value at ${formatPeso(topValueType.avgDonationValuePhp)} per post.` : "No value-leading post type is available yet.",
            bestValueHour ? `${bestValueHour.label} is currently ${formatHourLabel(bestValueHour.value)}.` : "Best donation-value hour is not available yet.",
            bestValueTone ? `${bestValueTone.label} is currently ${bestValueTone.value}.` : "Best donation-value tone is not available yet.",
          ],
        };
      case "Best donation platform":
        return {
          title: "Best donation platform",
          description: "This compares channel-level fundraising performance so the team knows where high-value donation posts tend to work best.",
          chartTitle: "Average donation value by platform",
          chartType: "currency",
          chartData: platformDonationChart.map((point) => ({ label: point.label, value: point.avgDonationValuePhp })),
          highlights: [
            topDonationPlatform
              ? `${topDonationPlatform.label} currently leads at ${formatPeso(topDonationPlatform.avgDonationValuePhp)} average donation value per post.`
              : "No leading donation platform is available yet.",
            topDonationPlatform
              ? `${formatPercent(topDonationPlatform.referralRate)} of ${topDonationPlatform.posts.toLocaleString()} tracked posts on ${topDonationPlatform.label} produced at least one referral.`
              : "Platform referral context is not available yet.",
            "Use this when choosing where to place the next high-value fundraising push.",
          ],
        };
      case "Best referral format":
        return {
          title: "Best referral format",
          description: "This shows which content format is currently most effective at generating at least one donation referral.",
          chartTitle: "Referral rate by post type",
          chartType: "percent",
          chartData: data.postTypeReferralChart.map((point) => ({ label: point.postType, value: point.referralRate ?? 0 })),
          highlights: [
            topReferralType ? `${topReferralType.postType} leads current referral performance at ${formatPercent(topReferralType.referralRate)}.` : "No leading referral format is available yet.",
            data.summary.bestOverallFormat ? `The planning summary also flags ${data.summary.bestOverallFormat} as the best overall format.` : "No overall format summary is available yet.",
            "This is the strongest KPI for deciding what type of post to create next.",
          ],
        };
      default:
        return null;
    }
  })();

  const insightCards = [
    {
      id: "resident-story",
      title: "Resident story",
      value: data.liftMetrics[0]?.liftPoints == null ? "N/A" : `${data.liftMetrics[0].liftPoints > 0 ? "+" : ""}${data.liftMetrics[0].liftPoints} pts`,
      detail: data.liftMetrics[0]
        ? `${data.liftMetrics[0].withLabel}: ${formatPercent(data.liftMetrics[0].withRate)}. ${data.liftMetrics[0].withoutLabel}: ${formatPercent(data.liftMetrics[0].withoutRate)}.`
        : "No resident-story comparison is available yet.",
      icon: Sparkles,
      chartType: "percent" as DetailChartType,
      miniChartData: data.liftMetrics[0]
        ? [
            { label: data.liftMetrics[0].withLabel, value: data.liftMetrics[0].withRate ?? 0 },
            { label: data.liftMetrics[0].withoutLabel, value: data.liftMetrics[0].withoutRate ?? 0 },
          ]
        : [],
    },
    {
      id: "cta",
      title: "CTA",
      value: data.liftMetrics[1]?.liftPoints == null ? "N/A" : `${data.liftMetrics[1].liftPoints > 0 ? "+" : ""}${data.liftMetrics[1].liftPoints} pts`,
      detail: data.liftMetrics[1]
        ? `${data.liftMetrics[1].withLabel}: ${formatPercent(data.liftMetrics[1].withRate)}. ${data.liftMetrics[1].withoutLabel}: ${formatPercent(data.liftMetrics[1].withoutRate)}.`
        : "No CTA comparison is available yet.",
      icon: Sparkles,
      chartType: "percent" as DetailChartType,
      miniChartData: data.liftMetrics[1]
        ? [
            { label: data.liftMetrics[1].withLabel, value: data.liftMetrics[1].withRate ?? 0 },
            { label: data.liftMetrics[1].withoutLabel, value: data.liftMetrics[1].withoutRate ?? 0 },
          ]
        : [],
    },
    {
      id: "best-referral-hour",
      title: "Best referral hour",
      value: bestReferralHour ? formatHourLabel(bestReferralHour.value) : "N/A",
      detail: bestReferralHour?.detail ?? "No hour breakdown is available yet.",
      icon: Clock3,
      chartType: "percent" as DetailChartType,
      miniChartData: (data.hourPerformance ?? []).slice(0, 6).map((point) => ({ label: point.label, value: point.referralRate ?? 0 })),
    },
    {
      id: "best-donation-tone",
      title: "Best donation-value tone",
      value: bestValueTone?.value ?? "N/A",
      detail: bestValueTone?.detail ?? "No tone performance comparison is available yet.",
      icon: BarChart3,
      chartType: "percent" as DetailChartType,
      miniChartData: (data.tonePerformance ?? []).slice(0, 5).map((point) => ({ label: point.label, value: point.referralRate ?? 0 })),
    },
  ];

  const activeInsight = insightCards.find((card) => card.id === activeInsightId) ?? null;

  const insightDetail: DetailConfig | null = (() => {
    if (activeInsightId === "resident-story" && data.liftMetrics[0]) {
      const metric = data.liftMetrics[0];
      return {
        title: "Resident story lift",
        description: "This compares referral performance when posts include a resident story versus when they do not.",
        chartTitle: "Referral rate with vs without resident story",
        chartType: "percent",
        chartData: [
          { label: metric.withLabel, value: metric.withRate ?? 0 },
          { label: metric.withoutLabel, value: metric.withoutRate ?? 0 },
        ],
        highlights: [
          `${metric.factor} adds ${metric.liftPoints ?? 0} points of referral lift in the current dataset.`,
          `Posts with a resident story convert at ${formatPercent(metric.withRate)} versus ${formatPercent(metric.withoutRate)} without one.`,
          "This is a relationship signal, not proof of causation, but it is strong enough to guide content planning.",
        ],
      };
    }

    if (activeInsightId === "cta" && data.liftMetrics[1]) {
      const metric = data.liftMetrics[1];
      return {
        title: "CTA lift",
        description: "This compares referral performance for posts with a call to action versus posts without one.",
        chartTitle: "Referral rate with vs without CTA",
        chartType: "percent",
        chartData: [
          { label: metric.withLabel, value: metric.withRate ?? 0 },
          { label: metric.withoutLabel, value: metric.withoutRate ?? 0 },
        ],
        highlights: [
          `${metric.factor} adds ${metric.liftPoints ?? 0} points of referral lift in the current dataset.`,
          `Posts with a CTA convert at ${formatPercent(metric.withRate)} versus ${formatPercent(metric.withoutRate)} without one.`,
          "This is most useful for deciding whether a post should ask for a donation action directly.",
        ],
      };
    }

    if (activeInsightId === "best-referral-hour") {
      return {
        title: "Best referral hour",
        description: "This highlights the posting hours currently associated with the strongest donation referral rates.",
        chartTitle: "Referral rate by posting hour",
        chartType: "percent",
        chartData: (data.hourPerformance ?? []).map((point) => ({ label: formatHourLabel(point.label), value: point.referralRate ?? 0 })),
        highlights: [
          bestReferralHour ? `${bestReferralHour.label} is currently ${formatHourLabel(bestReferralHour.value)}.` : "Best referral hour is not available yet.",
          bestValueHour ? `${bestValueHour.label} is ${formatHourLabel(bestValueHour.value)} for donation value.` : "Best donation-value hour is not available yet.",
          "Use this as a planning default, then layer in content type and CTA choices.",
        ],
      };
    }

    if (activeInsightId === "best-donation-tone") {
      return {
        title: "Best donation-value tone",
        description: "This compares message tones so the team can see which emotional framing tends to align with stronger fundraising results.",
        chartTitle: "Referral rate by tone",
        chartType: "percent",
        chartData: (data.tonePerformance ?? []).map((point) => ({ label: point.label, value: point.referralRate ?? 0 })),
        highlights: [
          bestValueTone ? `${bestValueTone.label} is currently ${bestValueTone.value}.` : "No leading donation-value tone is available yet.",
          bestReferralTone ? `${bestReferralTone.label} is currently ${bestReferralTone.value} for referral rate.` : "No leading referral tone is available yet.",
          "Use tone as a messaging choice after you have already picked the right platform and format.",
        ],
      };
    }

    return null;
  })();

  const chartDetail: DetailConfig | null = (() => {
    if (activeChartId === "referral-format-chart") {
      return {
        title: "Best post types for referral rate",
        description: "This chart compares content formats by how often they generate at least one donation referral.",
        chartTitle: "Referral rate by post type",
        chartType: "percent",
        chartData: data.postTypeReferralChart.map((point) => ({ label: point.postType, value: point.referralRate ?? 0 })),
        highlights: [
          topReferralType ? `${topReferralType.postType} is the strongest current referral format at ${formatPercent(topReferralType.referralRate)}.` : "No top referral format is available yet.",
          topReferralType ? `${topReferralType.posts.toLocaleString()} tracked posts contribute to that format benchmark.` : "No tracked-post count is available yet.",
          "Use this chart to decide what type of content to create next when the goal is getting donors to act.",
        ],
      };
    }

    if (activeChartId === "platform-value-chart") {
      return {
        title: "Best platforms for donation value",
        description: "This chart compares channels by average donation value so the team can decide where a fundraising message has the strongest upside.",
        chartTitle: "Average donation value by platform",
        chartType: "currency",
        chartData: platformDonationChart.map((point) => ({ label: point.label, value: point.avgDonationValuePhp })),
        highlights: [
          topDonationPlatform
            ? `${topDonationPlatform.label} currently leads at ${formatPeso(topDonationPlatform.avgDonationValuePhp)} average donation value per post.`
            : "No leading donation platform is available yet.",
          topDonationPlatform
            ? `${formatPercent(topDonationPlatform.referralRate)} of ${topDonationPlatform.posts.toLocaleString()} tracked posts on ${topDonationPlatform.label} produced at least one referral.`
            : "Platform referral context is not available yet.",
          "Use this after picking the right message format to decide where the post should run.",
        ],
      };
    }

    return null;
  })();

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {topKpiCards.map((kpi) => (
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
          onClick={() => setActiveChartId("referral-format-chart")}
          className="rounded-2xl bg-card p-6 text-left shadow-warm transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="font-heading text-lg font-semibold text-foreground">Best post types for referral rate</h4>
              <p className="text-sm text-muted-foreground">Which post formats are most likely to produce at least one referral.</p>
            </div>
            <Target className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.postTypeReferralChart} layout="vertical" margin={{ left: 18, right: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 1]} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />
                <YAxis type="category" dataKey="postType" width={130} />
                <Tooltip formatter={(value: number) => `${Math.round(value * 100)}%`} />
                <Bar dataKey="referralRate" fill="hsl(var(--primary))" radius={[0, 12, 12, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveChartId("platform-value-chart")}
          className="rounded-2xl bg-card p-6 text-left shadow-warm transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="font-heading text-lg font-semibold text-foreground">Best platforms for donation value</h4>
              <p className="text-sm text-muted-foreground">Which channel currently delivers the strongest donation value per post.</p>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformDonationChart} layout="vertical" margin={{ left: 18, right: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                <YAxis type="category" dataKey="label" width={130} />
                <Tooltip formatter={(value: number) => formatPeso(value)} />
                <Bar dataKey="avgDonationValuePhp" fill="hsl(var(--secondary))" radius={[0, 12, 12, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {insightCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setActiveInsightId(card.id)}
              className="rounded-2xl border border-border/70 bg-card p-5 text-left shadow-warm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{card.title}</p>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-3xl font-bold text-foreground">{card.value}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{card.detail}</p>
              <MiniPreviewChart data={card.miniChartData} chartType={card.chartType} />
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-card p-6 shadow-warm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary">What To Post Next</p>
            <h4 className="mt-2 font-heading text-2xl font-bold text-foreground">{data.summary.headline}</h4>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Use referral probability to choose which content is most likely to convert, then use expected donation value to prioritize the strongest upside among those top candidates.
            </p>
          </div>
          <div className="rounded-2xl bg-primary/8 px-4 py-3 text-right">
            <p className="text-xs text-foreground/70">Best overall format</p>
            <p className="text-2xl font-bold text-foreground">{data.summary.bestOverallFormat}</p>
            <p className="text-xs text-foreground/70">Best value format: {data.summary.bestValueFormat}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.recommendations.slice(0, 3).map((item, index) => (
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
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Model readiness</span>
            </div>
            <div className="mt-3">
              <Badge variant="secondary" className={cn("rounded-full", data.model.isTrained ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                {data.model.isTrained ? "Model ready" : "Snapshot only"}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The classifier uses a {Math.round(data.model.threshold * 100)}% threshold, and the KPI cards above open the supporting evidence behind each summary.
            </p>
          </div>
        </div>
      </div>

      <DetailDialog detail={kpiDetail} open={Boolean(kpiDetail)} onOpenChange={(open) => setActiveKpiLabel(open ? activeKpiLabel : null)} badgeLabel={topKpiCards.find((kpi) => kpi.label === activeKpiLabel)?.detail} />
      <DetailDialog detail={insightDetail} open={Boolean(insightDetail)} onOpenChange={(open) => setActiveInsightId(open ? activeInsightId : null)} badgeLabel={activeInsight?.title ?? null} />
      <DetailDialog detail={chartDetail} open={Boolean(chartDetail)} onOpenChange={(open) => setActiveChartId(open ? activeChartId : null)} badgeLabel="Chart detail" />
    </>
  );
}

function CommunityAnalyticsView({
  data,
  socialPosts,
}: {
  data: CommunityAnalyticsResponse;
  socialPosts: SocialPostRow[];
}) {
  const [activeKpiLabel, setActiveKpiLabel] = useState<string | null>(null);
  const [activeInsightId, setActiveInsightId] = useState<string | null>(null);
  const [activeChartId, setActiveChartId] = useState<string | null>(null);

  const shareRateByPlatform = useMemo(() => {
    const grouped = new Map<string, { shares: number; reach: number; posts: number }>();
    for (const post of socialPosts) {
      const platform = String(post.platform ?? "").trim();
      if (!platform) continue;
      const current = grouped.get(platform) ?? { shares: 0, reach: 0, posts: 0 };
      current.shares += toNumber(post.shares);
      current.reach += toNumber(post.reach);
      current.posts += 1;
      grouped.set(platform, current);
    }
    return Array.from(grouped.entries())
      .map(([label, metrics]) => ({
        label,
        posts: metrics.posts,
        shareRate: metrics.reach > 0 ? metrics.shares / metrics.reach : 0,
      }))
      .sort((left, right) => right.shareRate - left.shareRate);
  }, [socialPosts]);

  const topPlatform = data.platformReachChart[0];
  const topFormat = data.postTypeReachChart[0];
  const topTimeBucket = data.timeBucketChart[0];
  const bestTimeBucket = data.timingSignals.find((signal) => signal.label === "Best time bucket");
  const boostedWinner = data.timingSignals.find((signal) => signal.label === "Boosted winner");
  const topDriver = (data.topDrivers ?? data.model.topDrivers ?? [])[0];
  const topSharePlatform = shareRateByPlatform[0];

  const topKpiCards = [
    {
      label: "Avg community reach score",
      value: formatDisplayPercent(data.kpis[0]?.value),
      detail: data.kpis[0]?.detail ?? "Weighted score across reach, shares, saves, forwards, and clicks",
    },
    {
      label: "Avg share rate",
      value: formatDisplayPercent(data.kpis[1]?.value),
      detail: data.kpis[1]?.detail ?? "Average shares divided by reach",
    },
    {
      label: "Best outreach platform",
      value: data.summary.bestPlatform || topPlatform?.platform || "N/A",
      detail: topPlatform
        ? `${formatDisplayPercent((topPlatform.avgCommunityReachScore ?? 0) * 100)} average reach score`
        : "Platform reach comparison is not available yet",
    },
    {
      label: "Best outreach format",
      value: data.summary.bestFormat || topFormat?.postType || "N/A",
      detail: topFormat
        ? `${formatDisplayPercent((topFormat.avgCommunityReachScore ?? 0) * 100)} average reach score`
        : "Content-format reach comparison is not available yet",
    },
  ];

  const kpiDetail: DetailConfig | null = (() => {
    switch (activeKpiLabel) {
      case "Avg community reach score":
        return {
          title: "Average community reach score",
          description: "This KPI summarizes broad awareness performance using the notebook's blended outreach score.",
          chartTitle: "Community reach score by post type",
          chartType: "score",
          chartData: data.postTypeReachChart.map((point) => ({ label: point.postType, value: point.avgCommunityReachScore ?? 0 })),
          highlights: [
            topFormat ? `${topFormat.postType} currently leads the reach score at ${formatDisplayPercent((topFormat.avgCommunityReachScore ?? 0) * 100)}.` : "No leading outreach format is available yet.",
            topPlatform ? `${topPlatform.platform} is the strongest current platform for broad community reach.` : "No leading platform is available yet.",
            "This score blends reach, shares, saves, forwards, and click-through activity into one awareness-focused planning signal.",
          ],
        };
      case "Avg share rate":
        return {
          title: "Average share rate",
          description: "This KPI shows how shareable outreach content is across channels, which matters for community-to-community diffusion.",
          chartTitle: "Share rate by platform",
          chartType: "percent",
          chartData: shareRateByPlatform.map((point) => ({ label: point.label, value: point.shareRate })),
          highlights: [
            topSharePlatform ? `${topSharePlatform.label} currently has the strongest share rate at ${formatPercent(topSharePlatform.shareRate)}.` : "No platform share-rate leader is available yet.",
            bestTimeBucket ? `${formatTimeBucketLabel(bestTimeBucket.value)} is the strongest current posting window for community reach.` : "No time-bucket signal is available yet.",
            "If the goal is awareness and re-sharing, this KPI is often more useful than direct conversion rate.",
          ],
        };
      case "Best outreach platform":
        return {
          title: "Best outreach platform",
          description: "This compares channels by awareness-oriented reach score so the team can place posts where community spread is strongest.",
          chartTitle: "Community reach score by platform",
          chartType: "score",
          chartData: data.platformReachChart.map((point) => ({ label: point.platform, value: point.avgCommunityReachScore ?? 0 })),
          highlights: [
            topPlatform ? `${topPlatform.platform} currently leads community reach with a ${formatDisplayPercent((topPlatform.avgCommunityReachScore ?? 0) * 100)} score.` : "No leading outreach platform is available yet.",
            topPlatform?.avgReach != null ? `${topPlatform.platform} also averages ${Math.round(topPlatform.avgReach).toLocaleString()} direct reaches per post.` : "Average reach context is not available yet.",
            "Use this when the goal is broad awareness, community sharing, and discovery through local networks.",
          ],
        };
      case "Best outreach format":
        return {
          title: "Best outreach format",
          description: "This compares post formats by awareness performance to help outreach staff choose what kind of post to create next.",
          chartTitle: "Community reach score by post type",
          chartType: "score",
          chartData: data.postTypeReachChart.map((point) => ({ label: point.postType, value: point.avgCommunityReachScore ?? 0 })),
          highlights: [
            topFormat ? `${topFormat.postType} is the top current format for community reach.` : "No leading outreach format is available yet.",
            topTimeBucket ? `${formatTimeBucketLabel(topTimeBucket.timeBucket)} posts are currently outperforming other time windows.` : "No time-bucket leader is available yet.",
            "This is the clearest KPI for deciding what style of awareness content to build next.",
          ],
        };
      default:
        return null;
    }
  })();

  const insightCards = [
    {
      id: "resident-story",
      title: "Resident story lift",
      value: data.liftMetrics[0]?.liftPoints == null ? "N/A" : `${data.liftMetrics[0].liftPoints > 0 ? "+" : ""}${data.liftMetrics[0].liftPoints} pts`,
      detail: data.liftMetrics[0]
        ? `${data.liftMetrics[0].withLabel}: ${formatPercent(data.liftMetrics[0].withRate)}. ${data.liftMetrics[0].withoutLabel}: ${formatPercent(data.liftMetrics[0].withoutRate)}.`
        : "No resident-story lift is available yet.",
      icon: Users,
      chartType: "percent" as DetailChartType,
      miniChartData: data.liftMetrics[0]
        ? [
            { label: data.liftMetrics[0].withLabel, value: data.liftMetrics[0].withRate ?? 0 },
            { label: data.liftMetrics[0].withoutLabel, value: data.liftMetrics[0].withoutRate ?? 0 },
          ]
        : [],
    },
    {
      id: "cta",
      title: "CTA lift",
      value: data.liftMetrics[1]?.liftPoints == null ? "N/A" : `${data.liftMetrics[1].liftPoints > 0 ? "+" : ""}${data.liftMetrics[1].liftPoints} pts`,
      detail: data.liftMetrics[1]
        ? `${data.liftMetrics[1].withLabel}: ${formatPercent(data.liftMetrics[1].withRate)}. ${data.liftMetrics[1].withoutLabel}: ${formatPercent(data.liftMetrics[1].withoutRate)}.`
        : "No CTA lift is available yet.",
      icon: Target,
      chartType: "percent" as DetailChartType,
      miniChartData: data.liftMetrics[1]
        ? [
            { label: data.liftMetrics[1].withLabel, value: data.liftMetrics[1].withRate ?? 0 },
            { label: data.liftMetrics[1].withoutLabel, value: data.liftMetrics[1].withoutRate ?? 0 },
          ]
        : [],
    },
    {
      id: "best-time-bucket",
      title: "Best time bucket",
      value: bestTimeBucket ? formatTimeBucketLabel(bestTimeBucket.value) : "N/A",
      detail: bestTimeBucket?.detail ?? "No time-of-day breakdown is available yet.",
      icon: Clock3,
      chartType: "score" as DetailChartType,
      miniChartData: data.timeBucketChart.map((point) => ({ label: formatTimeBucketLabel(point.timeBucket), value: point.avgCommunityReachScore ?? 0 })),
    },
    {
      id: "top-driver",
      title: "Top model driver",
      value: topDriver?.feature ? formatModelFeatureLabel(topDriver.feature) : "N/A",
      detail: topDriver ? `Importance score ${Math.round((topDriver.importance ?? 0) * 100) / 100}` : "No top-driver summary is available yet.",
      icon: Brain,
      chartType: "count" as DetailChartType,
      miniChartData: (data.topDrivers ?? data.model.topDrivers ?? []).slice(0, 5).map((point) => ({
        label: formatModelFeatureLabel(point.feature),
        value: point.importance,
      })),
    },
  ];

  const activeInsight = insightCards.find((card) => card.id === activeInsightId) ?? null;

  const insightDetail: DetailConfig | null = (() => {
    if (activeInsightId === "resident-story" && data.liftMetrics[0]) {
      const metric = data.liftMetrics[0];
      return {
        title: "Resident story lift",
        description: "This compares the community-referral proxy when posts include a resident story versus when they do not.",
        chartTitle: "Community-referral proxy with vs without resident story",
        chartType: "percent",
        chartData: [
          { label: metric.withLabel, value: metric.withRate ?? 0 },
          { label: metric.withoutLabel, value: metric.withoutRate ?? 0 },
        ],
        highlights: [
          `${metric.factor} adds ${metric.liftPoints ?? 0} points of community-referral lift in the current dataset.`,
          `Resident-story posts currently outperform non-story posts for awareness and sharing.`,
          "This is still correlational, but it is a strong strategic cue for outreach storytelling.",
        ],
      };
    }

    if (activeInsightId === "cta" && data.liftMetrics[1]) {
      const metric = data.liftMetrics[1];
      return {
        title: "CTA lift",
        description: "This compares awareness-oriented outcomes for posts with a CTA versus posts without one.",
        chartTitle: "Community-referral proxy with vs without CTA",
        chartType: "percent",
        chartData: [
          { label: metric.withLabel, value: metric.withRate ?? 0 },
          { label: metric.withoutLabel, value: metric.withoutRate ?? 0 },
        ],
        highlights: [
          `${metric.factor} adds ${metric.liftPoints ?? 0} points of lift in the community-referral proxy.`,
          "For outreach campaigns, this helps staff decide whether a post should ask the audience to share, report, or learn more.",
          "This is most useful when paired with the best platform and best format signals above.",
        ],
      };
    }

    if (activeInsightId === "best-time-bucket") {
      return {
        title: "Best time bucket",
        description: "This compares the broad posting windows from the notebook so staff can see when awareness content tends to travel furthest.",
        chartTitle: "Community reach score by time bucket",
        chartType: "score",
        chartData: data.timeBucketChart.map((point) => ({ label: formatTimeBucketLabel(point.timeBucket), value: point.avgCommunityReachScore ?? 0 })),
        highlights: [
          bestTimeBucket ? `${formatTimeBucketLabel(bestTimeBucket.value)} currently leads the community reach score.` : "No time-bucket leader is available yet.",
          topTimeBucket ? `${topTimeBucket.posts.toLocaleString()} posts support that benchmark.` : "No supporting post count is available yet.",
          "Use this as a scheduling default before fine-tuning around platform-specific constraints.",
        ],
      };
    }

    if (activeInsightId === "top-driver") {
      const drivers = (data.topDrivers ?? data.model.topDrivers ?? []).slice(0, 8);
      return {
        title: "Top model drivers",
        description: "These are the strongest features in the community-reach model, showing what most influences predicted outreach performance.",
        chartTitle: "Top feature drivers",
        chartType: "count",
        chartData: drivers.map((point) => ({ label: formatModelFeatureLabel(point.feature), value: point.importance })),
        highlights: [
          topDriver ? `${formatModelFeatureLabel(topDriver.feature)} is the most influential current driver in the reach model.` : "No top feature driver is available yet.",
          boostedWinner ? `${boostedWinner.value} posts currently have the stronger community reach profile.` : "Boosted-vs-organic context is not available yet.",
          "Treat this as directional planning evidence rather than a causal claim.",
        ],
      };
    }

    return null;
  })();

  const chartDetail: DetailConfig | null = (() => {
    if (activeChartId === "reach-format-chart") {
      return {
        title: "Best post types for community reach",
        description: "This chart compares outreach content formats by the blended community reach score from the notebook.",
        chartTitle: "Community reach score by post type",
        chartType: "score",
        chartData: data.postTypeReachChart.map((point) => ({ label: point.postType, value: point.avgCommunityReachScore ?? 0 })),
        highlights: [
          topFormat ? `${topFormat.postType} currently leads the outreach score.` : "No leading outreach format is available yet.",
          topFormat ? `${topFormat.posts.toLocaleString()} posts support this benchmark.` : "No post-volume context is available yet.",
          "Use this when planning awareness-first content, especially campaigns aimed at local discovery and community sharing.",
        ],
      };
    }

    if (activeChartId === "platform-reach-chart") {
      return {
        title: "Best platforms for community outreach",
        description: "This chart compares social platforms by the average community reach score, helping the team decide where awareness content should run.",
        chartTitle: "Community reach score by platform",
        chartType: "score",
        chartData: data.platformReachChart.map((point) => ({ label: point.platform, value: point.avgCommunityReachScore ?? 0 })),
        highlights: [
          topPlatform ? `${topPlatform.platform} is the current platform leader for outreach performance.` : "No leading outreach platform is available yet.",
          topPlatform?.avgReach != null ? `Average direct reach on ${topPlatform.platform} is ${Math.round(topPlatform.avgReach).toLocaleString()} per post.` : "Average reach context is not available yet.",
          "This should drive channel choice when the goal is mission awareness rather than donation conversion.",
        ],
      };
    }

    return null;
  })();

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {topKpiCards.map((kpi) => (
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
          onClick={() => setActiveChartId("reach-format-chart")}
          className="rounded-2xl bg-card p-6 text-left shadow-warm transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="font-heading text-lg font-semibold text-foreground">Best post types for community reach</h4>
              <p className="text-sm text-muted-foreground">Which formats travel furthest across the community-awareness score.</p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.postTypeReachChart} layout="vertical" margin={{ left: 18, right: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />
                <YAxis type="category" dataKey="postType" width={130} />
                <Tooltip formatter={(value: number) => `${Math.round(value * 100)}%`} />
                <Bar dataKey="avgCommunityReachScore" fill="hsl(var(--primary))" radius={[0, 12, 12, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveChartId("platform-reach-chart")}
          className="rounded-2xl bg-card p-6 text-left shadow-warm transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="font-heading text-lg font-semibold text-foreground">Best platforms for community outreach</h4>
              <p className="text-sm text-muted-foreground">Which platform currently delivers the strongest awareness and sharing profile.</p>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.platformReachChart} layout="vertical" margin={{ left: 18, right: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />
                <YAxis type="category" dataKey="platform" width={130} />
                <Tooltip formatter={(value: number) => `${Math.round(value * 100)}%`} />
                <Bar dataKey="avgCommunityReachScore" fill="hsl(var(--secondary))" radius={[0, 12, 12, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {insightCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setActiveInsightId(card.id)}
              className="rounded-2xl border border-border/70 bg-card p-5 text-left shadow-warm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{card.title}</p>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-3xl font-bold text-foreground">{card.value}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{card.detail}</p>
              <MiniPreviewChart data={card.miniChartData} chartType={card.chartType} />
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-card p-6 shadow-warm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary">What To Post Next</p>
            <h4 className="mt-2 font-heading text-2xl font-bold text-foreground">{data.summary.headline}</h4>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Use the community reach score to choose formats that spread awareness, then use platform and timing signals to put those posts where local networks are most likely to see and share them.
            </p>
          </div>
          <div className="rounded-2xl bg-primary/8 px-4 py-3 text-right">
            <p className="text-xs text-foreground/70">Best outreach platform</p>
            <p className="text-2xl font-bold text-foreground">{data.summary.bestPlatform}</p>
            <p className="text-xs text-foreground/70">Best format: {data.summary.bestFormat}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.recommendations.slice(0, 3).map((item, index) => (
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
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Model readiness</span>
            </div>
            <div className="mt-3">
              <Badge variant="secondary" className={cn("rounded-full", data.model.isTrained ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                {data.model.isTrained ? "Model ready" : "Snapshot only"}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The community planner is optimized for awareness and sharing, not donation conversion, so it helps the outreach team choose what to publish to reach more people.
            </p>
          </div>
        </div>
      </div>

      <DetailDialog detail={kpiDetail} open={Boolean(kpiDetail)} onOpenChange={(open) => setActiveKpiLabel(open ? activeKpiLabel : null)} badgeLabel={topKpiCards.find((kpi) => kpi.label === activeKpiLabel)?.detail} />
      <DetailDialog detail={insightDetail} open={Boolean(insightDetail)} onOpenChange={(open) => setActiveInsightId(open ? activeInsightId : null)} badgeLabel={activeInsight?.title ?? null} />
      <DetailDialog detail={chartDetail} open={Boolean(chartDetail)} onOpenChange={(open) => setActiveChartId(open ? activeChartId : null)} badgeLabel="Chart detail" />
    </>
  );
}

export function OutreachSocialMediaPanel({ socialPosts }: { socialPosts: SocialPostRow[] }) {
  const queryClient = useQueryClient();
  const [plannerMode, setPlannerMode] = useState<PlannerMode>("donation");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<HistoricalPostFormState>(EMPTY_FORM);
  const [captionLengthEdited, setCaptionLengthEdited] = useState(false);

  const donationQuery = useQuery({
    queryKey: ["social-analytics", "donation"],
    queryFn: fetchLatestDonationAnalytics,
    retry: false,
  });

  const communityQuery = useQuery({
    queryKey: ["social-analytics", "community"],
    queryFn: fetchLatestCommunityAnalytics,
    retry: false,
  });

  const refreshMutation = useMutation({
    mutationFn: async (mode: PlannerMode) => {
      if (mode === "community") return { mode, data: await refreshCommunityAnalytics() };
      return { mode, data: await refreshDonationAnalytics() };
    },
    onSuccess: async ({ mode, data }) => {
      queryClient.setQueryData(["social-analytics", mode], data);
      await queryClient.invalidateQueries({ queryKey: ["admin-workspace"] });
      toast.success(mode === "community" ? "Community outreach analytics refreshed." : "Donation social analytics refreshed.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to refresh social analytics.");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => insertRecord("social_media_posts", payload),
    onSuccess: async () => {
      setFormOpen(false);
      setForm(EMPTY_FORM);
      setCaptionLengthEdited(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-workspace"] });
      toast.success("Historical post added. Refresh analytics to rerun the planner.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to create that social post.");
    },
  });

  const platformOptions = useMemo(() => uniqueOptions(socialPosts.map((post) => post.platform), FALLBACK_PLATFORMS), [socialPosts]);
  const postTypeOptions = useMemo(() => uniqueOptions(socialPosts.map((post) => post.post_type), FALLBACK_POST_TYPES), [socialPosts]);
  const campaignOptions = useMemo(
    () => uniqueOptions(socialPosts.map((post) => post.campaign_name), ["Year-End Hope", "Summer of Safety", "Back to School", "GivingTuesday"]),
    [socialPosts],
  );

  useEffect(() => {
    if (!form.created_at) return;
    const parsed = new Date(form.created_at);
    if (Number.isNaN(parsed.getTime())) return;
    const derivedDay = parsed.toLocaleDateString("en-US", { weekday: "long" });
    const derivedHour = String(parsed.getHours());
    setForm((current) => ({ ...current, day_of_week: derivedDay, post_hour: derivedHour }));
  }, [form.created_at]);

  useEffect(() => {
    if (captionLengthEdited) return;
    setForm((current) => ({ ...current, caption_length: current.caption.length ? String(current.caption.length) : "" }));
  }, [form.caption, captionLengthEdited]);

  const submitHistoricalPost = () => {
    const error = validateHistoricalPost(form);
    if (error) {
      toast.error(error);
      return;
    }

    const payload = {
      platform: form.platform || null,
      created_at: form.created_at || null,
      day_of_week: form.day_of_week || null,
      post_hour: toNullableNumber(form.post_hour),
      post_type: form.post_type || null,
      media_type: form.media_type || null,
      caption: form.caption || null,
      num_hashtags: toNullableNumber(form.num_hashtags),
      has_call_to_action: toNullableBoolean(form.has_call_to_action),
      call_to_action_type: form.has_call_to_action === "true" ? form.call_to_action_type || null : null,
      content_topic: form.content_topic || null,
      sentiment_tone: form.sentiment_tone || null,
      caption_length: toNullableNumber(form.caption_length),
      features_resident_story: toNullableBoolean(form.features_resident_story),
      campaign_name: form.campaign_name || null,
      is_boosted: toNullableBoolean(form.is_boosted),
      boost_budget_php: form.is_boosted === "true" ? toNullableNumber(form.boost_budget_php) : null,
      impressions: toNullableNumber(form.impressions),
      reach: toNullableNumber(form.reach),
      likes: toNullableNumber(form.likes),
      comments: toNullableNumber(form.comments),
      shares: toNullableNumber(form.shares),
      saves: toNullableNumber(form.saves),
      click_throughs: toNullableNumber(form.click_throughs),
      profile_visits: toNullableNumber(form.profile_visits),
      forwards: toNullableNumber(form.forwards),
      watch_time_seconds: toNullableNumber(form.watch_time_seconds),
      avg_view_duration_seconds: toNullableNumber(form.avg_view_duration_seconds),
      engagement_rate: toNullableNumber(form.engagement_rate),
      donation_referrals: toNullableNumber(form.donation_referrals),
      estimated_donation_value_php: toNullableNumber(form.estimated_donation_value_php),
    };

    createMutation.mutate(payload);
  };

  const activeQuery = plannerMode === "community" ? communityQuery : donationQuery;
  const generatedAt = activeQuery.data?.generatedAt;
  const activeError = activeQuery.error;

  const plannerCopy =
    plannerMode === "community"
      ? {
          title: "Community Outreach Intelligence",
          description:
            "Use the awareness-focused pipeline to identify what platform, posting window, and content style best expands reach, sharing, and community referrals.",
          primaryBadge: "Primary model: community reach regressor",
          secondaryBadge: "Secondary lens: community referral proxy",
        }
      : {
          title: "Social Media Intelligence",
          description:
            "Use referral probability to rank likely converting posts, then use expected donation value to break ties and prioritize stronger upside.",
          primaryBadge: "Primary model: donation referral classifier",
          secondaryBadge: "Secondary model: donation value regressor",
        };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-warm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Megaphone className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.22em]">Outreach Planning</span>
            </div>

            <Tabs value={plannerMode} onValueChange={(value) => setPlannerMode(value as PlannerMode)} className="w-fit">
              <TabsList className="h-auto gap-2 rounded-2xl border border-border/70 bg-muted/30 p-1">
                <TabsTrigger value="donation" className="rounded-xl px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Donation posts
                </TabsTrigger>
                <TabsTrigger value="community" className="rounded-xl px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Community outreach
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div>
              <h3 className="font-heading text-2xl font-bold text-foreground">{plannerCopy.title}</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{plannerCopy.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/5 text-primary">
                {plannerCopy.primaryBadge}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {plannerCopy.secondaryBadge}
              </Badge>
              <span>Last refreshed: {generatedAt ? formatDateTime(generatedAt) : "No refresh yet"}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setForm(EMPTY_FORM);
                setCaptionLengthEdited(false);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add historical post
            </Button>
            <Button
              type="button"
              className="rounded-full"
              disabled={refreshMutation.isPending || !hasLiveApi}
              onClick={() => refreshMutation.mutate(plannerMode)}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshMutation.isPending && "animate-spin")} />
              {hasLiveApi ? "Refresh analytics" : "Live API unavailable"}
            </Button>
          </div>
        </div>
      </div>

      {activeError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 shadow-warm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="font-semibold text-foreground">{plannerMode === "community" ? "Community outreach analytics could not be loaded." : "Donation social analytics could not be loaded."}</p>
              <p className="mt-1 text-sm text-muted-foreground">{activeError instanceof Error ? activeError.message : "Unknown error."}</p>
            </div>
          </div>
        </div>
      ) : null}

      {plannerMode === "donation" ? (
        donationQuery.data ? (
          <DonationAnalyticsView data={donationQuery.data} socialPosts={socialPosts} />
        ) : donationQuery.isLoading ? (
          <div className="rounded-2xl bg-card p-6 shadow-warm">
            <p className="text-sm text-muted-foreground">Loading the latest donation social analytics snapshot...</p>
          </div>
        ) : null
      ) : communityQuery.data ? (
        <CommunityAnalyticsView data={communityQuery.data} socialPosts={socialPosts} />
      ) : communityQuery.isLoading ? (
        <div className="rounded-2xl bg-card p-6 shadow-warm">
          <p className="text-sm text-muted-foreground">Loading the latest community outreach analytics snapshot...</p>
        </div>
      ) : null}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto rounded-2xl border-border/80 bg-background">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-foreground">Add Historical Social Post</DialogTitle>
            <DialogDescription>
              Create a completed post row with actual outcomes, then refresh analytics to retrain the outreach planners and show the updated recommendations.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Platform *</span>
                <select
                  value={form.platform}
                  onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))}
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select…</option>
                  {platformOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Created at *</span>
                <Input type="datetime-local" value={form.created_at} onChange={(event) => setForm((current) => ({ ...current, created_at: event.target.value }))} className="h-11 rounded-xl border-border/80" />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Day of week *</span>
                <Input value={form.day_of_week} onChange={(event) => setForm((current) => ({ ...current, day_of_week: event.target.value }))} className="h-11 rounded-xl border-border/80" />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Post hour *</span>
                <Input type="number" min={0} max={23} value={form.post_hour} onChange={(event) => setForm((current) => ({ ...current, post_hour: event.target.value }))} className="h-11 rounded-xl border-border/80" />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Post type *</span>
                <select
                  value={form.post_type}
                  onChange={(event) => setForm((current) => ({ ...current, post_type: event.target.value }))}
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select…</option>
                  {postTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Media type *</span>
                <select
                  value={form.media_type}
                  onChange={(event) => setForm((current) => ({ ...current, media_type: event.target.value }))}
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select…</option>
                  {FALLBACK_MEDIA_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm xl:col-span-3">
                <span className="font-medium text-foreground">Caption *</span>
                <Textarea value={form.caption} onChange={(event) => setForm((current) => ({ ...current, caption: event.target.value }))} className="min-h-[120px] rounded-2xl border-border/80" />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Hashtags</span>
                <Input type="number" min={0} value={form.num_hashtags} onChange={(event) => setForm((current) => ({ ...current, num_hashtags: event.target.value }))} className="h-11 rounded-xl border-border/80" />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">CTA enabled</span>
                <select
                  value={form.has_call_to_action}
                  onChange={(event) => setForm((current) => ({ ...current, has_call_to_action: event.target.value }))}
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </label>

              {form.has_call_to_action === "true" ? (
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">CTA type *</span>
                  <select
                    value={form.call_to_action_type}
                    onChange={(event) => setForm((current) => ({ ...current, call_to_action_type: event.target.value }))}
                    className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select…</option>
                    {FALLBACK_CTA_TYPES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Content topic *</span>
                <select
                  value={form.content_topic}
                  onChange={(event) => setForm((current) => ({ ...current, content_topic: event.target.value }))}
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select…</option>
                  {FALLBACK_TOPICS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Sentiment tone *</span>
                <select
                  value={form.sentiment_tone}
                  onChange={(event) => setForm((current) => ({ ...current, sentiment_tone: event.target.value }))}
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select…</option>
                  {FALLBACK_TONES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Caption length</span>
                <Input
                  type="number"
                  min={0}
                  value={form.caption_length}
                  onChange={(event) => {
                    setCaptionLengthEdited(true);
                    setForm((current) => ({ ...current, caption_length: event.target.value }));
                  }}
                  className="h-11 rounded-xl border-border/80"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Resident story</span>
                <select
                  value={form.features_resident_story}
                  onChange={(event) => setForm((current) => ({ ...current, features_resident_story: event.target.value }))}
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Campaign name</span>
                <select
                  value={form.campaign_name}
                  onChange={(event) => setForm((current) => ({ ...current, campaign_name: event.target.value }))}
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select…</option>
                  {campaignOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Boosted</span>
                <select
                  value={form.is_boosted}
                  onChange={(event) => setForm((current) => ({ ...current, is_boosted: event.target.value }))}
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </label>

              {form.is_boosted === "true" ? (
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Boost budget (PHP)</span>
                  <Input type="number" min={0} value={form.boost_budget_php} onChange={(event) => setForm((current) => ({ ...current, boost_budget_php: event.target.value }))} className="h-11 rounded-xl border-border/80" />
                </label>
              ) : null}

              {[
                ["Impressions", "impressions"],
                ["Reach", "reach"],
                ["Likes", "likes"],
                ["Comments", "comments"],
                ["Shares", "shares"],
                ["Saves", "saves"],
                ["Click-throughs", "click_throughs"],
                ["Profile visits", "profile_visits"],
                ["Forwards", "forwards"],
                ["Watch time (seconds)", "watch_time_seconds"],
                ["Avg view duration (seconds)", "avg_view_duration_seconds"],
                ["Engagement rate", "engagement_rate"],
                ["Donation referrals *", "donation_referrals"],
                ["Estimated donation value (PHP) *", "estimated_donation_value_php"],
              ].map(([label, key]) => (
                <label key={key} className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">{label}</span>
                  <Input
                    type="number"
                    min={0}
                    value={form[key as keyof HistoricalPostFormState]}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                    className="h-11 rounded-xl border-border/80"
                  />
                </label>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-full" disabled={createMutation.isPending} onClick={submitHistoricalPost}>
              {createMutation.isPending ? "Saving..." : "Save historical post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
