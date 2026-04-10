import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  Brain,
  Clock3,
  Megaphone,
  Plus,
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
import { HarborLoadingState } from "@/components/HarborLoadingState";
import { Input } from "@/components/ui/input";
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
  platformMediaChart?: Array<{
    platform: string;
    mediaType: string;
    posts: number;
    referralRate: number | null;
    avgDonationValuePhp: number | null;
    stabilityFlag: string;
  }>;
  platformTrustedMedia?: Array<{
    platform: string;
    bestMediaType: string;
    posts: number;
    referralRate: number | null;
    avgDonationValuePhp: number | null;
    stabilityFlag: string;
  }>;
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

type SocialScoreResponse = {
  prediction: {
    predictedReferralProbability: number | null;
    predictedReferralCount: number | null;
    predictedDonationValuePhp: number | null;
    likelyReferralDriver: boolean;
  };
  selectedPlatform?: string | null;
  selectedPlatformMedia?: Array<{
    mediaType: string;
    posts: number;
    referralRate: number | null;
    avgDonationValuePhp: number | null;
    stabilityFlag: string;
  }>;
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
  platformMediaChart?: Array<{
    platform: string;
    mediaType: string;
    posts: number;
    avgCommunityReachScore: number | null;
    likelyCommunityReferralRate: number | null;
    avgShareRate: number | null;
    stabilityFlag: string;
  }>;
  platformTrustedMedia?: Array<{
    platform: string;
    bestMediaType: string;
    posts: number;
    avgCommunityReachScore: number | null;
    likelyCommunityReferralRate: number | null;
    avgShareRate: number | null;
    stabilityFlag: string;
  }>;
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

type CommunityScoreResponse = {
  prediction: {
    predictedCommunityReachScore: number | null;
    predictedCommunityReferralProbability: number | null;
    predictedShareRate: number | null;
    likelyAwarenessDriver: boolean;
  };
  selectedPlatform?: string | null;
  selectedPlatformMedia?: Array<{
    mediaType: string;
    posts: number;
    avgCommunityReachScore: number | null;
    likelyCommunityReferralRate: number | null;
    avgShareRate: number | null;
    stabilityFlag: string;
  }>;
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

type DraftPostScoreFormState = {
  platform: string;
  day_of_week: string;
  post_hour: string;
  post_type: string;
  media_type: string;
  num_hashtags: string;
  has_call_to_action: string;
  call_to_action_type: string;
  content_topic: string;
  sentiment_tone: string;
  caption: string;
  caption_length: string;
  features_resident_story: string;
  campaign_name: string;
  is_boosted: string;
  boost_budget_php: string;
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

const EMPTY_DRAFT_SCORE_FORM: DraftPostScoreFormState = {
  platform: "Instagram",
  day_of_week: "Wednesday",
  post_hour: "13",
  post_type: "ImpactStory",
  media_type: "Reel",
  num_hashtags: "3",
  has_call_to_action: "true",
  call_to_action_type: "Donate",
  content_topic: "Education",
  sentiment_tone: "Emotional",
  caption: "",
  caption_length: "",
  features_resident_story: "true",
  campaign_name: "",
  is_boosted: "false",
  boost_budget_php: "",
};

const FALLBACK_PLATFORMS = ["Facebook", "Instagram", "Twitter", "LinkedIn", "TikTok", "WhatsApp", "YouTube"];
const FALLBACK_POST_TYPES = ["ImpactStory", "Campaign", "FundraisingAppeal", "ThankYou", "EducationalContent", "EventPromotion"];
const FALLBACK_MEDIA_TYPES = ["Photo", "Video", "Text", "Carousel", "Reel", "Graphic"];
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

function formatLiftIncrease(withRate: number | null | undefined, withoutRate: number | null | undefined) {
  if (withRate == null || withoutRate == null || withoutRate <= 0) return "N/A";
  const lift = ((withRate - withoutRate) / withoutRate) * 100;
  return `${lift >= 0 ? "+" : ""}${Math.round(lift)}%`;
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

async function scoreDonationPost(payload: Record<string, unknown>): Promise<SocialScoreResponse> {
  const response = await fetchWithAuth("/api/ml/social/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Unable to score the planned post.");
  }

  return response.json();
}

async function scoreCommunityPost(payload: Record<string, unknown>): Promise<CommunityScoreResponse> {
  const response = await fetchWithAuth("/api/ml/social/community/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Unable to score the planned outreach post.");
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

function validateDraftPost(form: DraftPostScoreFormState): string | null {
  if (!form.platform.trim()) return "Platform is required.";
  if (!form.day_of_week.trim()) return "Day of week is required.";
  if (!form.post_type.trim()) return "Post type is required.";
  if (!form.media_type.trim()) return "Media type is required.";
  if (!form.content_topic.trim()) return "Content topic is required.";
  if (!form.sentiment_tone.trim()) return "Sentiment tone is required.";

  const hour = Number(form.post_hour);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return "Post hour must be between 0 and 23.";

  const numericFields: Array<[string, string]> = [
    ["num_hashtags", form.num_hashtags],
    ["caption_length", form.caption_length],
    ["boost_budget_php", form.boost_budget_php],
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

function buildCommunityScoredRows(socialPosts: SocialPostRow[]) {
  const numericColumns = {
    reach: socialPosts.map((post) => toNumber(post.reach)),
    shares: socialPosts.map((post) => toNumber(post.shares)),
    saves: socialPosts.map((post) => toNumber(post.saves)),
    forwards: socialPosts.map((post) => toNumber(post.forwards)),
    clicks: socialPosts.map((post) => toNumber(post.click_throughs)),
  };

  const bounds = Object.fromEntries(
    Object.entries(numericColumns).map(([key, values]) => [key, { min: Math.min(...values), max: Math.max(...values) }]),
  ) as Record<string, { min: number; max: number }>;

  const sharesSorted = [...numericColumns.shares].sort((left, right) => left - right);
  const clicksSorted = [...numericColumns.clicks].sort((left, right) => left - right);
  const shareMedian = sharesSorted[Math.floor(sharesSorted.length / 2)] ?? 0;
  const clickMedian = clicksSorted[Math.floor(clicksSorted.length / 2)] ?? 0;

  const scale = (value: number, min: number, max: number) => (max > min ? (value - min) / (max - min) : 0);

  return socialPosts.map((post) => {
    const reach = toNumber(post.reach);
    const shares = toNumber(post.shares);
    const saves = toNumber(post.saves);
    const forwards = toNumber(post.forwards);
    const clicks = toNumber(post.click_throughs);
    const communityReachScore =
      0.3 * scale(reach, bounds.reach.min, bounds.reach.max) +
      0.25 * scale(shares, bounds.shares.min, bounds.shares.max) +
      0.2 * scale(saves, bounds.saves.min, bounds.saves.max) +
      0.15 * scale(forwards, bounds.forwards.min, bounds.forwards.max) +
      0.1 * scale(clicks, bounds.clicks.min, bounds.clicks.max);

    return {
      ...post,
      communityReachScore,
      likelyCommunityReferral: shares >= shareMedian && clicks >= clickMedian ? 1 : 0,
      shareRate: reach > 0 ? shares / reach : 0,
    };
  });
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

function PlannerLoadingState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return <HarborLoadingState className="mt-5" title={title} description={description} />;
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
                    <h3 className="font-heading text-lg font-semibold text-foreground">{detail.chartTitle}</h3>
                    <p className="text-sm text-foreground/75">This drill-down expands the planning signal behind the selected KPI or chart.</p>
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

function DonationPlannerDialog({
  open,
  onOpenChange,
  socialPosts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  socialPosts: SocialPostRow[];
}) {
  const [draftForm, setDraftForm] = useState<DraftPostScoreFormState>(EMPTY_DRAFT_SCORE_FORM);
  const [draftCaptionLengthEdited, setDraftCaptionLengthEdited] = useState(false);

  const scoreMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => scoreDonationPost(payload),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to score the planned post.");
    },
  });

  const platformOptions = useMemo(() => uniqueOptions(socialPosts.map((post) => post.platform), FALLBACK_PLATFORMS), [socialPosts]);
  const draftPayload = useMemo(
    () => ({
      platform: draftForm.platform,
      day_of_week: draftForm.day_of_week,
      post_hour: Number(draftForm.post_hour),
      post_type: draftForm.post_type,
      media_type: draftForm.media_type,
      num_hashtags: toNullableNumber(draftForm.num_hashtags) ?? 0,
      has_call_to_action: toNullableBoolean(draftForm.has_call_to_action) ?? false,
      call_to_action_type: draftForm.has_call_to_action === "true" ? draftForm.call_to_action_type || null : null,
      content_topic: draftForm.content_topic || null,
      sentiment_tone: draftForm.sentiment_tone || null,
      caption: draftForm.caption || null,
      caption_length: toNullableNumber(draftForm.caption_length) ?? draftForm.caption.length,
      features_resident_story: toNullableBoolean(draftForm.features_resident_story) ?? false,
      campaign_name: draftForm.campaign_name || null,
      is_boosted: toNullableBoolean(draftForm.is_boosted) ?? false,
      boost_budget_php: draftForm.is_boosted === "true" ? toNullableNumber(draftForm.boost_budget_php) : null,
    }),
    [draftForm],
  );

  const draftValidationError = useMemo(() => validateDraftPost(draftForm), [draftForm]);

  useEffect(() => {
    if (draftCaptionLengthEdited) return;
    setDraftForm((current) => ({ ...current, caption_length: current.caption.length ? String(current.caption.length) : "" }));
  }, [draftForm.caption, draftCaptionLengthEdited]);

  useEffect(() => {
    if (!open || !hasLiveApi || draftValidationError) return;
    const timer = window.setTimeout(() => {
      scoreMutation.mutate(draftPayload);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open, draftPayload, draftValidationError]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto rounded-2xl border-border/80 bg-background">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl text-foreground">Live Donation Post Planner</DialogTitle>
          <DialogDescription>
            Adjust the post features below and the predictions update live as you change the draft.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label htmlFor="donation-planner-platform" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Platform</span>
              <select id="donation-planner-platform" value={draftForm.platform} onChange={(event) => setDraftForm((current) => ({ ...current, platform: event.target.value }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                {platformOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="donation-planner-day-of-week" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Day of week</span>
              <select id="donation-planner-day-of-week" value={draftForm.day_of_week} onChange={(event) => setDraftForm((current) => ({ ...current, day_of_week: event.target.value }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Post hour</span>
              <Input type="number" min={0} max={23} value={draftForm.post_hour} onChange={(event) => setDraftForm((current) => ({ ...current, post_hour: event.target.value }))} className="h-11 rounded-xl border-border/80" />
            </label>

            <label htmlFor="donation-planner-post-type" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Post type</span>
              <select id="donation-planner-post-type" value={draftForm.post_type} onChange={(event) => setDraftForm((current) => ({ ...current, post_type: event.target.value }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                {FALLBACK_POST_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="donation-planner-media-type" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Media type</span>
              <select id="donation-planner-media-type" value={draftForm.media_type} onChange={(event) => setDraftForm((current) => ({ ...current, media_type: event.target.value }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                {FALLBACK_MEDIA_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Hashtags</span>
              <Input type="number" min={0} value={draftForm.num_hashtags} onChange={(event) => setDraftForm((current) => ({ ...current, num_hashtags: event.target.value }))} className="h-11 rounded-xl border-border/80" />
            </label>

            <label htmlFor="donation-planner-cta" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">CTA</span>
              <select id="donation-planner-cta" value={draftForm.has_call_to_action} onChange={(event) => setDraftForm((current) => ({ ...current, has_call_to_action: event.target.value, call_to_action_type: event.target.value === "true" ? current.call_to_action_type || "Donate" : "" }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>

            {draftForm.has_call_to_action === "true" ? (
              <label htmlFor="donation-planner-cta-type" className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">CTA type</span>
                <select id="donation-planner-cta-type" value={draftForm.call_to_action_type} onChange={(event) => setDraftForm((current) => ({ ...current, call_to_action_type: event.target.value }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                  {FALLBACK_CTA_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label htmlFor="donation-planner-content-topic" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Content topic</span>
              <select id="donation-planner-content-topic" value={draftForm.content_topic} onChange={(event) => setDraftForm((current) => ({ ...current, content_topic: event.target.value }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                {FALLBACK_TOPICS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="donation-planner-tone" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Tone</span>
              <select id="donation-planner-tone" value={draftForm.sentiment_tone} onChange={(event) => setDraftForm((current) => ({ ...current, sentiment_tone: event.target.value }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                {FALLBACK_TONES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="donation-planner-resident-story" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Resident story</span>
              <select id="donation-planner-resident-story" value={draftForm.features_resident_story} onChange={(event) => setDraftForm((current) => ({ ...current, features_resident_story: event.target.value }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                <option value="true">Included</option>
                <option value="false">Not included</option>
              </select>
            </label>

            <label htmlFor="donation-planner-boosted" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Boosted</span>
              <select id="donation-planner-boosted" value={draftForm.is_boosted} onChange={(event) => setDraftForm((current) => ({ ...current, is_boosted: event.target.value, boost_budget_php: event.target.value === "true" ? current.boost_budget_php : "" }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                <option value="false">Organic</option>
                <option value="true">Boosted</option>
              </select>
            </label>

            {draftForm.is_boosted === "true" ? (
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Boost budget (PHP)</span>
                <Input type="number" min={0} value={draftForm.boost_budget_php} onChange={(event) => setDraftForm((current) => ({ ...current, boost_budget_php: event.target.value }))} className="h-11 rounded-xl border-border/80" />
              </label>
            ) : null}

            <label className="grid gap-2 text-sm md:col-span-2 xl:col-span-3">
              <span className="font-medium text-foreground">Caption</span>
              <Textarea value={draftForm.caption} onChange={(event) => setDraftForm((current) => ({ ...current, caption: event.target.value }))} className="min-h-[96px] rounded-2xl border-border/80" placeholder="Write the draft caption here..." />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Caption length</span>
              <Input
                type="number"
                min={0}
                value={draftForm.caption_length}
                onChange={(event) => {
                  setDraftCaptionLengthEdited(true);
                  setDraftForm((current) => ({ ...current, caption_length: event.target.value }));
                }}
                className="h-11 rounded-xl border-border/80"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Campaign name</span>
              <Input value={draftForm.campaign_name} onChange={(event) => setDraftForm((current) => ({ ...current, campaign_name: event.target.value }))} className="h-11 rounded-xl border-border/80" placeholder="Optional campaign label" />
            </label>
          </div>

          <div className="space-y-4">
            {draftValidationError ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-sm text-destructive">{draftValidationError}</p>
              </div>
            ) : null}

            {scoreMutation.isPending ? (
              <PlannerLoadingState
                title="Scoring donation draft"
                description="The planner is recalculating referral probability, likely referrals, and expected donation value for your current selections."
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-2xl bg-muted/25 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-primary">Referral probability</p>
                    <p className="mt-3 text-3xl font-bold text-foreground">{scoreMutation.data ? formatPercent(scoreMutation.data.prediction.predictedReferralProbability) : "..."}</p>
                    <p className="mt-2 text-xs leading-5 text-foreground/70">Likelihood that the post produces at least one donation referral.</p>
                  </div>
                  <div className="rounded-2xl bg-muted/25 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-primary">Likely referrals</p>
                    <p className="mt-3 text-3xl font-bold text-foreground">{scoreMutation.data ? formatDecimal(scoreMutation.data.prediction.predictedReferralCount) : "..."}</p>
                    <p className="mt-2 text-xs leading-5 text-foreground/70">Predicted donation referrals for a post with this setup.</p>
                  </div>
                  <div className="rounded-2xl bg-muted/25 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-primary">Expected donation value</p>
                    <p className="mt-3 text-3xl font-bold text-foreground">{scoreMutation.data ? formatPeso(scoreMutation.data.prediction.predictedDonationValuePhp) : "..."}</p>
                    <p className="mt-2 text-xs leading-5 text-foreground/70">Expected donation value tied to the same draft configuration.</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-primary/6 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-primary">Live read</p>
                  <p className="mt-3 text-sm leading-6 text-foreground">
                    {scoreMutation.data
                      ? scoreMutation.data.prediction.likelyReferralDriver
                        ? "This draft currently looks referral-first. To keep that edge, hold onto the CTA and story choices that are already boosting conversion."
                        : "This draft currently looks more value-oriented than referral-oriented. To push it toward more direct referrals, try a stronger CTA or the best media type for the selected platform."
                      : "Predictions update live as you change the settings on the left."}
                  </p>
                </div>
              </>
            )}

            {scoreMutation.data?.selectedPlatformMedia?.length && !scoreMutation.isPending ? (
              <div className="rounded-2xl bg-muted/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Selected platform benchmark</p>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreMutation.data.selectedPlatformMedia} layout="vertical" margin={{ left: 18, right: 18 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 1]} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />
                      <YAxis type="category" dataKey="mediaType" width={120} />
                      <Tooltip formatter={(value: number) => `${Math.round(value * 100)}%`} />
                      <Bar dataKey="referralRate" fill="hsl(var(--primary))" radius={[0, 12, 12, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommunityPlannerDialog({
  open,
  onOpenChange,
  socialPosts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  socialPosts: SocialPostRow[];
}) {
  const [draftForm, setDraftForm] = useState<DraftPostScoreFormState>(EMPTY_DRAFT_SCORE_FORM);
  const [draftCaptionLengthEdited, setDraftCaptionLengthEdited] = useState(false);

  const scoreMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => scoreCommunityPost(payload),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to score the planned outreach post.");
    },
  });

  const platformOptions = useMemo(() => uniqueOptions(socialPosts.map((post) => post.platform), FALLBACK_PLATFORMS), [socialPosts]);
  const draftPayload = useMemo(
    () => ({
      platform: draftForm.platform,
      day_of_week: draftForm.day_of_week,
      post_hour: Number(draftForm.post_hour),
      post_type: draftForm.post_type,
      media_type: draftForm.media_type,
      num_hashtags: toNullableNumber(draftForm.num_hashtags) ?? 0,
      has_call_to_action: toNullableBoolean(draftForm.has_call_to_action) ?? false,
      call_to_action_type: draftForm.has_call_to_action === "true" ? draftForm.call_to_action_type || null : null,
      content_topic: draftForm.content_topic || null,
      sentiment_tone: draftForm.sentiment_tone || null,
      caption: draftForm.caption || null,
      caption_length: toNullableNumber(draftForm.caption_length) ?? draftForm.caption.length,
      features_resident_story: toNullableBoolean(draftForm.features_resident_story) ?? false,
      campaign_name: draftForm.campaign_name || null,
      is_boosted: toNullableBoolean(draftForm.is_boosted) ?? false,
      boost_budget_php: draftForm.is_boosted === "true" ? toNullableNumber(draftForm.boost_budget_php) : null,
    }),
    [draftForm],
  );
  const draftValidationError = useMemo(() => validateDraftPost(draftForm), [draftForm]);

  useEffect(() => {
    if (draftCaptionLengthEdited) return;
    setDraftForm((current) => ({ ...current, caption_length: current.caption.length ? String(current.caption.length) : "" }));
  }, [draftForm.caption, draftCaptionLengthEdited]);

  useEffect(() => {
    if (!open || !hasLiveApi || draftValidationError) return;
    const timer = window.setTimeout(() => {
      scoreMutation.mutate(draftPayload);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open, draftPayload, draftValidationError]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto rounded-2xl border-border/80 bg-background">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl text-foreground">Live Community Outreach Planner</DialogTitle>
          <DialogDescription>
            Change the planned outreach post settings and the awareness predictions update live.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label htmlFor="community-planner-platform" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Platform</span>
              <select id="community-planner-platform" value={draftForm.platform} onChange={(event) => setDraftForm((current) => ({ ...current, platform: event.target.value }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                {platformOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="community-planner-day-of-week" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Day of week</span>
              <select id="community-planner-day-of-week" value={draftForm.day_of_week} onChange={(event) => setDraftForm((current) => ({ ...current, day_of_week: event.target.value }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Post hour</span>
              <Input type="number" min={0} max={23} value={draftForm.post_hour} onChange={(event) => setDraftForm((current) => ({ ...current, post_hour: event.target.value }))} className="h-11 rounded-xl border-border/80" />
            </label>
            <label htmlFor="community-planner-post-type" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Post type</span>
              <select id="community-planner-post-type" value={draftForm.post_type} onChange={(event) => setDraftForm((current) => ({ ...current, post_type: event.target.value }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                {FALLBACK_POST_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="community-planner-media-type" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Media type</span>
              <select id="community-planner-media-type" value={draftForm.media_type} onChange={(event) => setDraftForm((current) => ({ ...current, media_type: event.target.value }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                {FALLBACK_MEDIA_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Hashtags</span>
              <Input type="number" min={0} value={draftForm.num_hashtags} onChange={(event) => setDraftForm((current) => ({ ...current, num_hashtags: event.target.value }))} className="h-11 rounded-xl border-border/80" />
            </label>
            <label htmlFor="community-planner-cta" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">CTA</span>
              <select id="community-planner-cta" value={draftForm.has_call_to_action} onChange={(event) => setDraftForm((current) => ({ ...current, has_call_to_action: event.target.value, call_to_action_type: event.target.value === "true" ? current.call_to_action_type || "LearnMore" : "" }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
            {draftForm.has_call_to_action === "true" ? (
              <label htmlFor="community-planner-cta-type" className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">CTA type</span>
                <select id="community-planner-cta-type" value={draftForm.call_to_action_type} onChange={(event) => setDraftForm((current) => ({ ...current, call_to_action_type: event.target.value }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                  {FALLBACK_CTA_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label htmlFor="community-planner-content-topic" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Content topic</span>
              <select id="community-planner-content-topic" value={draftForm.content_topic} onChange={(event) => setDraftForm((current) => ({ ...current, content_topic: event.target.value }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                {FALLBACK_TOPICS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="community-planner-tone" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Tone</span>
              <select id="community-planner-tone" value={draftForm.sentiment_tone} onChange={(event) => setDraftForm((current) => ({ ...current, sentiment_tone: event.target.value }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                {FALLBACK_TONES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="community-planner-resident-story" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Resident story</span>
              <select id="community-planner-resident-story" value={draftForm.features_resident_story} onChange={(event) => setDraftForm((current) => ({ ...current, features_resident_story: event.target.value }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                <option value="true">Included</option>
                <option value="false">Not included</option>
              </select>
            </label>
            <label htmlFor="community-planner-boosted" className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Boosted</span>
              <select id="community-planner-boosted" value={draftForm.is_boosted} onChange={(event) => setDraftForm((current) => ({ ...current, is_boosted: event.target.value, boost_budget_php: event.target.value === "true" ? current.boost_budget_php : "" }))} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                <option value="false">Organic</option>
                <option value="true">Boosted</option>
              </select>
            </label>
            {draftForm.is_boosted === "true" ? (
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Boost budget (PHP)</span>
                <Input type="number" min={0} value={draftForm.boost_budget_php} onChange={(event) => setDraftForm((current) => ({ ...current, boost_budget_php: event.target.value }))} className="h-11 rounded-xl border-border/80" />
              </label>
            ) : null}
            <label className="grid gap-2 text-sm md:col-span-2 xl:col-span-3">
              <span className="font-medium text-foreground">Caption</span>
              <Textarea value={draftForm.caption} onChange={(event) => setDraftForm((current) => ({ ...current, caption: event.target.value }))} className="min-h-[96px] rounded-2xl border-border/80" placeholder="Write the outreach draft caption here..." />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Caption length</span>
              <Input type="number" min={0} value={draftForm.caption_length} onChange={(event) => { setDraftCaptionLengthEdited(true); setDraftForm((current) => ({ ...current, caption_length: event.target.value })); }} className="h-11 rounded-xl border-border/80" />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Campaign name</span>
              <Input value={draftForm.campaign_name} onChange={(event) => setDraftForm((current) => ({ ...current, campaign_name: event.target.value }))} className="h-11 rounded-xl border-border/80" placeholder="Optional outreach campaign" />
            </label>
          </div>

          <div className="space-y-4">
            {draftValidationError ? <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4"><p className="text-sm text-destructive">{draftValidationError}</p></div> : null}
            {scoreMutation.isPending ? (
              <PlannerLoadingState
                title="Scoring outreach draft"
                description="The planner is recalculating awareness reach, community referral potential, and share-friendly performance for your current selections."
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-2xl bg-muted/25 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-primary">Community reach score</p>
                    <p className="mt-3 text-3xl font-bold text-foreground">{scoreMutation.data ? formatDisplayPercent((scoreMutation.data.prediction.predictedCommunityReachScore ?? 0) * 100) : "..."}</p>
                    <p className="mt-2 text-xs leading-5 text-foreground/70">Predicted blended awareness score for this outreach draft.</p>
                  </div>
                  <div className="rounded-2xl bg-muted/25 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-primary">Referral potential</p>
                    <p className="mt-3 text-3xl font-bold text-foreground">{scoreMutation.data ? formatPercent(scoreMutation.data.prediction.predictedCommunityReferralProbability) : "..."}</p>
                    <p className="mt-2 text-xs leading-5 text-foreground/70">Likelihood the post crosses the community-referral proxy threshold.</p>
                  </div>
                  <div className="rounded-2xl bg-muted/25 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-primary">Share-friendly strength</p>
                    <p className="mt-3 text-3xl font-bold text-foreground">{scoreMutation.data ? `${Math.round((scoreMutation.data.prediction.predictedShareRate ?? 0) * 1000)} per 1k` : "..."}</p>
                    <p className="mt-2 text-xs leading-5 text-foreground/70">Expected shares per 1,000 reaches, which reads better than a tiny raw share rate.</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-primary/6 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-primary">Live read</p>
                  <p className="mt-3 text-sm leading-6 text-foreground">
                    {scoreMutation.data
                      ? scoreMutation.data.prediction.likelyAwarenessDriver
                        ? "This draft currently looks strong for awareness-building. Keep the story angle and native media format if broad reach is the goal."
                        : "This draft looks weaker for community spread right now. Try the strongest media type for the selected platform, or add a resident story or CTA if that fits the message."
                      : "Predictions update live as you change the settings on the left."}
                  </p>
                </div>
              </>
            )}
            {scoreMutation.data?.selectedPlatformMedia?.length && !scoreMutation.isPending ? (
              <div className="rounded-2xl bg-muted/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Selected platform benchmark</p>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreMutation.data.selectedPlatformMedia} layout="vertical" margin={{ left: 18, right: 18 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 1]} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />
                      <YAxis type="category" dataKey="mediaType" width={120} />
                      <Tooltip formatter={(value: number) => `${Math.round(value * 100)}%`} />
                      <Bar dataKey="avgCommunityReachScore" fill="hsl(var(--primary))" radius={[0, 12, 12, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
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
  const [selectedPlatform, setSelectedPlatform] = useState<string>("Instagram");
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [strategyResidentStoryOnly, setStrategyResidentStoryOnly] = useState(false);
  const [strategyCtaOnly, setStrategyCtaOnly] = useState(false);
  const [strategyImpactStoryOnly, setStrategyImpactStoryOnly] = useState(false);
  const [strategyBoostedOnly, setStrategyBoostedOnly] = useState(false);

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

  const platformMediaSummary = useMemo(() => {
    if (data.platformMediaChart?.length) {
      return data.platformMediaChart
        .map((row) => ({
          platform: row.platform,
          mediaType: row.mediaType,
          posts: row.posts,
          referralRate: row.referralRate ?? 0,
          avgDonationValuePhp: row.avgDonationValuePhp ?? 0,
          stabilityFlag: row.stabilityFlag || "Observe",
        }))
        .sort((left, right) => right.referralRate - left.referralRate);
    }

    const grouped = new Map<string, { posts: number; referredPosts: number; donationValueTotal: number }>();
    for (const post of socialPosts) {
      const platform = String(post.platform ?? "").trim();
      const mediaType = String(post.media_type ?? "").trim();
      if (!platform || !mediaType) continue;
      const key = `${platform}|||${mediaType}`;
      const current = grouped.get(key) ?? { posts: 0, referredPosts: 0, donationValueTotal: 0 };
      current.posts += 1;
      if (toNumber(post.donation_referrals) > 0) current.referredPosts += 1;
      current.donationValueTotal += toNumber(post.estimated_donation_value_php);
      grouped.set(key, current);
    }

    return Array.from(grouped.entries())
      .map(([key, metrics]) => {
        const [platform, mediaType] = key.split("|||");
        return {
          platform,
          mediaType,
          posts: metrics.posts,
          referralRate: metrics.posts ? metrics.referredPosts / metrics.posts : 0,
          avgDonationValuePhp: metrics.posts ? metrics.donationValueTotal / metrics.posts : 0,
          stabilityFlag: metrics.posts >= 12 ? "Trusted" : metrics.posts >= 8 ? "Promising" : "Use caution",
        };
      })
      .sort((left, right) => right.referralRate - left.referralRate);
  }, [data.platformMediaChart, socialPosts]);

  const trustedPlatformDefaults = useMemo(() => {
    if (data.platformTrustedMedia?.length) {
      return data.platformTrustedMedia.map((row) => ({
        platform: row.platform,
        mediaType: row.bestMediaType,
        posts: row.posts,
        referralRate: row.referralRate ?? 0,
        avgDonationValuePhp: row.avgDonationValuePhp ?? 0,
        stabilityFlag: row.stabilityFlag || "Trusted",
      }));
    }

    const grouped = new Map<string, typeof platformMediaSummary>();
    for (const row of platformMediaSummary.filter((item) => item.posts >= 12)) {
      const current = grouped.get(row.platform) ?? [];
      current.push(row);
      grouped.set(row.platform, current);
    }

    return Array.from(grouped.entries())
      .map(([platform, rows]) => {
        const best = [...rows].sort((left, right) => right.referralRate - left.referralRate)[0];
        return { ...best, platform };
      })
      .sort((left, right) => right.referralRate - left.referralRate);
  }, [data.platformTrustedMedia, platformMediaSummary]);

  const platformOptions = useMemo(() => {
    const options = new Set<string>([...platformMediaSummary.map((item) => item.platform), ...FALLBACK_PLATFORMS]);
    return Array.from(options).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [platformMediaSummary]);

  useEffect(() => {
    if (!platformOptions.includes(selectedPlatform)) {
      setSelectedPlatform(platformOptions[0] ?? "Instagram");
    }
  }, [platformOptions, selectedPlatform]);

  const topReferralType = data.postTypeReferralChart[0];
  const topValueType = data.postTypeValueChart[0];
  const bestReferralHour = data.timingSignals.find((signal) => signal.label === "Best referral hour");
  const bestValueHour = data.timingSignals.find((signal) => signal.label === "Best donation-value hour");
  const bestReferralTone = data.timingSignals.find((signal) => signal.label === "Best referral tone");
  const bestValueTone = data.timingSignals.find((signal) => signal.label === "Best donation-value tone");
  const residentStoryMetric = data.liftMetrics[0];
  const ctaMetric = data.liftMetrics[1];
  const topDonationPlatform = platformDonationChart[0];
  const selectedPlatformMedia = platformMediaSummary.filter((row) => row.platform === selectedPlatform).sort((left, right) => right.referralRate - left.referralRate);
  const selectedPlatformBestMedia = selectedPlatformMedia[0];
  const overallBestPlatformMedia = trustedPlatformDefaults[0];
  const strategyChartData = useMemo(() => {
    const filtered = socialPosts.filter((post) => {
      if (String(post.platform ?? "").trim() !== selectedPlatform) return false;
      if (strategyResidentStoryOnly && !asBoolean(post.features_resident_story)) return false;
      if (strategyCtaOnly && !asBoolean(post.has_call_to_action)) return false;
      if (strategyImpactStoryOnly && String(post.post_type ?? "").trim() !== "ImpactStory") return false;
      if (strategyBoostedOnly && !asBoolean(post.is_boosted)) return false;
      return true;
    });

    const grouped = new Map<string, { posts: number; referredPosts: number; donationValueTotal: number }>();
    for (const post of filtered) {
      const mediaType = String(post.media_type ?? "").trim();
      if (!mediaType) continue;
      const current = grouped.get(mediaType) ?? { posts: 0, referredPosts: 0, donationValueTotal: 0 };
      current.posts += 1;
      if (toNumber(post.donation_referrals) > 0) current.referredPosts += 1;
      current.donationValueTotal += toNumber(post.estimated_donation_value_php);
      grouped.set(mediaType, current);
    }

    return Array.from(grouped.entries())
      .map(([mediaType, metrics]) => ({
        mediaType,
        posts: metrics.posts,
        referralRate: metrics.posts ? metrics.referredPosts / metrics.posts : 0,
        avgDonationValuePhp: metrics.posts ? metrics.donationValueTotal / metrics.posts : 0,
      }))
      .sort((left, right) => right.referralRate - left.referralRate);
  }, [selectedPlatform, socialPosts, strategyResidentStoryOnly, strategyCtaOnly, strategyImpactStoryOnly, strategyBoostedOnly]);
  const strategyBestMedia = strategyChartData[0];

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
      label: "Best platform-media pair",
      value: overallBestPlatformMedia ? `${overallBestPlatformMedia.platform} · ${overallBestPlatformMedia.mediaType}` : "N/A",
      detail: overallBestPlatformMedia
        ? `${formatPercent(overallBestPlatformMedia.referralRate)} referral rate across ${overallBestPlatformMedia.posts.toLocaleString()} posts`
        : "Trusted platform-media recommendations are not available yet",
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
            overallBestPlatformMedia ? `${overallBestPlatformMedia.platform} ${overallBestPlatformMedia.mediaType} is the strongest trusted platform-media combination.` : "No trusted platform-media recommendation is available yet.",
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
            topDonationPlatform ? `${topDonationPlatform.label} is the strongest channel for donation value.` : "No channel leader is available yet.",
            bestValueHour ? `${bestValueHour.label} is currently ${formatHourLabel(bestValueHour.value)}.` : "Best donation-value hour is not available yet.",
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
            topDonationPlatform ? `${topDonationPlatform.label} currently leads at ${formatPeso(topDonationPlatform.avgDonationValuePhp)} average donation value per post.` : "No leading donation platform is available yet.",
            topDonationPlatform ? `${formatPercent(topDonationPlatform.referralRate)} of ${topDonationPlatform.posts.toLocaleString()} tracked posts on ${topDonationPlatform.label} produced at least one referral.` : "Platform referral context is not available yet.",
            "Use this when choosing where to place the next high-value fundraising push.",
          ],
        };
      case "Best platform-media pair":
        return {
          title: "Best platform-media pair",
          description: "This KPI surfaces the strongest trusted combination of platform and media type from the notebook's reliability-filtered analysis.",
          chartTitle: "Trusted referral rate by platform-media pair",
          chartType: "percent",
          chartData: trustedPlatformDefaults.map((point) => ({ label: `${point.platform} · ${point.mediaType}`, value: point.referralRate ?? 0 })),
          highlights: [
            overallBestPlatformMedia ? `${overallBestPlatformMedia.platform} ${overallBestPlatformMedia.mediaType} currently leads trusted referral performance at ${formatPercent(overallBestPlatformMedia.referralRate)}.` : "No trusted platform-media leader is available yet.",
            "These recommendations exclude tiny samples so the planner stays more statistically believable.",
            "Use this to choose both the channel and the native content format together.",
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
      value: residentStoryMetric ? formatLiftIncrease(residentStoryMetric.withRate, residentStoryMetric.withoutRate) : "N/A",
      detail: residentStoryMetric ? `${residentStoryMetric.withLabel}: ${formatPercent(residentStoryMetric.withRate)}. ${residentStoryMetric.withoutLabel}: ${formatPercent(residentStoryMetric.withoutRate)}.` : "No resident-story comparison is available yet.",
      icon: Sparkles,
      chartType: "percent" as DetailChartType,
      miniChartData: residentStoryMetric ? [{ label: residentStoryMetric.withLabel, value: residentStoryMetric.withRate ?? 0 }, { label: residentStoryMetric.withoutLabel, value: residentStoryMetric.withoutRate ?? 0 }] : [],
    },
    {
      id: "cta",
      title: "CTA lift",
      value: ctaMetric ? formatLiftIncrease(ctaMetric.withRate, ctaMetric.withoutRate) : "N/A",
      detail: ctaMetric ? `${ctaMetric.withLabel}: ${formatPercent(ctaMetric.withRate)}. ${ctaMetric.withoutLabel}: ${formatPercent(ctaMetric.withoutRate)}.` : "No CTA comparison is available yet.",
      icon: Sparkles,
      chartType: "percent" as DetailChartType,
      miniChartData: ctaMetric ? [{ label: ctaMetric.withLabel, value: ctaMetric.withRate ?? 0 }, { label: ctaMetric.withoutLabel, value: ctaMetric.withoutRate ?? 0 }] : [],
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
      id: "selected-platform-media",
      title: `${selectedPlatform} best media`,
      value: selectedPlatformBestMedia?.mediaType ?? "N/A",
      detail: selectedPlatformBestMedia ? `${formatPercent(selectedPlatformBestMedia.referralRate)} referral rate across ${selectedPlatformBestMedia.posts.toLocaleString()} posts` : `No media-type benchmark is available for ${selectedPlatform}.`,
      icon: BarChart3,
      chartType: "percent" as DetailChartType,
      miniChartData: selectedPlatformMedia.slice(0, 5).map((point) => ({ label: point.mediaType, value: point.referralRate ?? 0 })),
    },
  ];

  const activeInsight = insightCards.find((card) => card.id === activeInsightId) ?? null;

  const insightDetail: DetailConfig | null = (() => {
    if (activeInsightId === "resident-story" && residentStoryMetric) {
      return {
        title: "Resident story lift",
        description: "This compares referral performance when posts include a resident story versus when they do not.",
        chartTitle: "Referral rate with vs without resident story",
        chartType: "percent",
        chartData: [{ label: residentStoryMetric.withLabel, value: residentStoryMetric.withRate ?? 0 }, { label: residentStoryMetric.withoutLabel, value: residentStoryMetric.withoutRate ?? 0 }],
        highlights: [
          `Resident-story posts show a ${formatLiftIncrease(residentStoryMetric.withRate, residentStoryMetric.withoutRate)} relative referral lift.`,
          `Posts with a resident story convert at ${formatPercent(residentStoryMetric.withRate)} versus ${formatPercent(residentStoryMetric.withoutRate)} without one.`,
          "This is a relationship signal, not proof of causation, but it is strong enough to guide content planning.",
        ],
      };
    }
    if (activeInsightId === "cta" && ctaMetric) {
      return {
        title: "CTA lift",
        description: "This compares referral performance for posts with a call to action versus posts without one.",
        chartTitle: "Referral rate with vs without CTA",
        chartType: "percent",
        chartData: [{ label: ctaMetric.withLabel, value: ctaMetric.withRate ?? 0 }, { label: ctaMetric.withoutLabel, value: ctaMetric.withoutRate ?? 0 }],
        highlights: [
          `CTA posts show a ${formatLiftIncrease(ctaMetric.withRate, ctaMetric.withoutRate)} relative referral lift.`,
          `Posts with a CTA convert at ${formatPercent(ctaMetric.withRate)} versus ${formatPercent(ctaMetric.withoutRate)} without one.`,
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
          "Use this as a planning default, then layer in platform-native media and creative choices.",
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
          "ImpactStory remains a strong overall pattern, especially when paired with the right platform-native media type.",
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
          topDonationPlatform ? `${topDonationPlatform.label} currently leads at ${formatPeso(topDonationPlatform.avgDonationValuePhp)} average donation value per post.` : "No leading donation platform is available yet.",
          topDonationPlatform ? `${formatPercent(topDonationPlatform.referralRate)} of ${topDonationPlatform.posts.toLocaleString()} tracked posts on ${topDonationPlatform.label} produced at least one referral.` : "Platform referral context is not available yet.",
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
            <p className="text-sm text-foreground/75">{kpi.label}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{kpi.value}</p>
            <p className="mt-3 text-xs leading-5 text-foreground/70">{kpi.detail}</p>
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
              <h3 className="font-heading text-lg font-semibold text-foreground">Best post types for referral rate</h3>
              <p className="text-sm text-foreground/75">Which post formats are most likely to produce at least one referral.</p>
            </div>
            <Target aria-hidden="true" className="h-5 w-5 text-foreground/65" />
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
              <h3 className="font-heading text-lg font-semibold text-foreground">Best platforms for donation value</h3>
              <p className="text-sm text-foreground/75">Which channel currently delivers the strongest donation value per post.</p>
            </div>
            <BarChart3 aria-hidden="true" className="h-5 w-5 text-foreground/65" />
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
              onClick={() => {
                if (card.id === "selected-platform-media") {
                  setStrategyOpen(true);
                  return;
                }
                setActiveInsightId(card.id);
              }}
              className="rounded-2xl border border-border/70 bg-card p-5 text-left shadow-warm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{card.title}</p>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-3xl font-bold text-foreground">{card.value}</p>
              <p className="mt-2 text-xs leading-5 text-foreground/70">{card.detail}</p>
              <MiniPreviewChart data={card.miniChartData} chartType={card.chartType} />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setStrategyOpen(true)}
        className="w-full rounded-2xl bg-card p-6 text-left shadow-warm transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary">What To Post Next</p>
            <h3 className="mt-2 font-heading text-2xl font-bold text-foreground">{data.summary.headline}</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/75">
              Use referral probability to choose which content is most likely to convert, then use expected donation value to prioritize the strongest upside among those top candidates. Click this section to open the deeper strategy view with platform, media, CTA, and story toggles.
            </p>
          </div>
          <div className="rounded-2xl bg-primary/8 px-4 py-3 text-right">
            <p className="text-xs text-foreground/70">Best overall format</p>
            <p className="text-2xl font-bold text-foreground">{data.summary.bestOverallFormat}</p>
            <p className="text-xs text-foreground/70">Trusted combo: {overallBestPlatformMedia ? `${overallBestPlatformMedia.platform} ${overallBestPlatformMedia.mediaType}` : "Not available"}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-muted/25 p-4">
            <div className="flex items-center gap-2 text-primary">
              <Brain className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Recommendation</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground">
              Start with <span className="font-semibold">{topReferralType?.postType ?? data.summary.bestOverallFormat}</span> posts, and use <span className="font-semibold">{selectedPlatformBestMedia?.mediaType ?? "the strongest media type"}</span> when publishing on <span className="font-semibold">{selectedPlatform}</span>.
            </p>
          </div>

          <div className="rounded-2xl bg-muted/25 p-4">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Creative driver</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground">
              {residentStoryMetric ? `Including a resident story is linked to a ${formatLiftIncrease(residentStoryMetric.withRate, residentStoryMetric.withoutRate)} referral lift.` : "Resident-story lift is not available yet."}
            </p>
          </div>

          <div className="rounded-2xl bg-muted/25 p-4">
            <div className="flex items-center gap-2 text-primary">
              <Target className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Platform note</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground">
              {selectedPlatformBestMedia ? `${selectedPlatform} currently favors ${selectedPlatformBestMedia.mediaType} over other media types, with ${formatPercent(selectedPlatformBestMedia.referralRate)} referral performance on a ${selectedPlatformBestMedia.stabilityFlag.toLowerCase()} sample.` : `No platform-native media recommendation is available for ${selectedPlatform} yet.`}
            </p>
          </div>

          <div className="rounded-2xl bg-muted/25 p-4">
            <div className="flex items-center gap-2 text-primary">
              <Clock3 className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Timing cue</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground">
              {bestReferralHour ? `Default to ${formatHourLabel(bestReferralHour.value)} when you need a referral-first posting window, then adjust by platform and campaign context.` : "Best referral hour is not available yet."}
            </p>
          </div>
        </div>
      </button>

      <Dialog open={strategyOpen} onOpenChange={setStrategyOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto rounded-2xl border-border/80 bg-background">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-foreground">What to post next strategy view</DialogTitle>
            <DialogDescription>
              Switch platforms and toggle high-impact post features to see how the best media type changes for donation referrals.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6">
            <div className="flex flex-wrap gap-2">
              {platformOptions.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setSelectedPlatform(platform)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                    selectedPlatform === platform
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/70 bg-background text-foreground/75 hover:border-primary/35 hover:text-foreground",
                  )}
                  aria-pressed={selectedPlatform === platform}
                >
                  {platform}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "Resident story", active: strategyResidentStoryOnly, setActive: setStrategyResidentStoryOnly },
                { label: "CTA", active: strategyCtaOnly, setActive: setStrategyCtaOnly },
                { label: "ImpactStory", active: strategyImpactStoryOnly, setActive: setStrategyImpactStoryOnly },
                { label: "Boosted", active: strategyBoostedOnly, setActive: setStrategyBoostedOnly },
              ].map((toggle) => (
                <button
                  key={toggle.label}
                  type="button"
                  onClick={() => toggle.setActive(!toggle.active)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                    toggle.active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/70 bg-background text-foreground/75 hover:border-primary/35 hover:text-foreground",
                  )}
                  aria-pressed={toggle.active}
                >
                  {toggle.label}
                </button>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-muted/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Best media now</p>
                <p className="mt-3 text-3xl font-bold text-foreground">{strategyBestMedia?.mediaType ?? "N/A"}</p>
                <p className="mt-2 text-xs leading-5 text-foreground/70">
                  {strategyBestMedia ? `${formatPercent(strategyBestMedia.referralRate)} referral rate across ${strategyBestMedia.posts.toLocaleString()} posts.` : "No posts match the current filter set."}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Avg donation value</p>
                <p className="mt-3 text-3xl font-bold text-foreground">{formatPeso(strategyBestMedia?.avgDonationValuePhp)}</p>
                <p className="mt-2 text-xs leading-5 text-foreground/70">Average donation value for the current best media choice.</p>
              </div>
              <div className="rounded-2xl bg-muted/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Recommendation read</p>
                <p className="mt-3 text-sm leading-6 text-foreground">
                  {strategyBestMedia
                    ? `On ${selectedPlatform}, ${strategyBestMedia.mediaType} is the strongest current format under these feature filters.`
                    : `No tracked posts match the current ${selectedPlatform} filter combination yet.`}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-warm">
              <h3 className="font-heading text-lg font-semibold text-foreground">Referral rate by media type on {selectedPlatform}</h3>
              <p className="mt-1 text-sm text-foreground/75">The chart updates as you change platform and feature toggles above.</p>
              <div className="mt-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={strategyChartData} layout="vertical" margin={{ left: 18, right: 18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 1]} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />
                    <YAxis type="category" dataKey="mediaType" width={130} />
                    <Tooltip formatter={(value: number) => `${Math.round(value * 100)}%`} />
                    <Bar dataKey="referralRate" fill="hsl(var(--primary))" radius={[0, 12, 12, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
  const [selectedPlatform, setSelectedPlatform] = useState<string>("Instagram");
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [strategyResidentStoryOnly, setStrategyResidentStoryOnly] = useState(false);
  const [strategyCtaOnly, setStrategyCtaOnly] = useState(false);
  const [strategyImpactStoryOnly, setStrategyImpactStoryOnly] = useState(false);
  const [strategyBoostedOnly, setStrategyBoostedOnly] = useState(false);

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
  const communityRows = useMemo(() => buildCommunityScoredRows(socialPosts), [socialPosts]);
  const platformMediaSummary = useMemo(() => {
    if (data.platformMediaChart?.length) {
      return data.platformMediaChart.map((row) => ({
        platform: row.platform,
        mediaType: row.mediaType,
        posts: row.posts,
        avgCommunityReachScore: row.avgCommunityReachScore ?? 0,
        likelyCommunityReferralRate: row.likelyCommunityReferralRate ?? 0,
        avgShareRate: row.avgShareRate ?? 0,
        stabilityFlag: row.stabilityFlag || "Observe",
      }));
    }

    const grouped = new Map<string, { posts: number; scoreTotal: number; referralTotal: number; shareRateTotal: number }>();
    for (const post of communityRows) {
      const platform = String(post.platform ?? "").trim();
      const mediaType = String(post.media_type ?? "").trim();
      if (!platform || !mediaType) continue;
      const key = `${platform}|||${mediaType}`;
      const current = grouped.get(key) ?? { posts: 0, scoreTotal: 0, referralTotal: 0, shareRateTotal: 0 };
      current.posts += 1;
      current.scoreTotal += post.communityReachScore;
      current.referralTotal += post.likelyCommunityReferral;
      current.shareRateTotal += post.shareRate;
      grouped.set(key, current);
    }
    return Array.from(grouped.entries()).map(([key, metrics]) => {
      const [platform, mediaType] = key.split("|||");
      return {
        platform,
        mediaType,
        posts: metrics.posts,
        avgCommunityReachScore: metrics.posts ? metrics.scoreTotal / metrics.posts : 0,
        likelyCommunityReferralRate: metrics.posts ? metrics.referralTotal / metrics.posts : 0,
        avgShareRate: metrics.posts ? metrics.shareRateTotal / metrics.posts : 0,
        stabilityFlag: metrics.posts >= 12 ? "Trusted default" : metrics.posts >= 8 ? "Promising, low sample" : "Too few posts",
      };
    });
  }, [communityRows, data.platformMediaChart]);
  const platformOptions = useMemo(() => {
    const options = new Set<string>([...platformMediaSummary.map((item) => item.platform), ...FALLBACK_PLATFORMS]);
    return Array.from(options).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [platformMediaSummary]);
  useEffect(() => {
    if (!platformOptions.includes(selectedPlatform)) setSelectedPlatform(platformOptions[0] ?? "Instagram");
  }, [platformOptions, selectedPlatform]);

  const topPlatform = data.platformReachChart[0];
  const topFormat = data.postTypeReachChart[0];
  const topTimeBucket = data.timeBucketChart[0];
  const bestTimeBucket = data.timingSignals.find((signal) => signal.label === "Best time bucket");
  const boostedWinner = data.timingSignals.find((signal) => signal.label === "Boosted winner");
  const topDriver = (data.topDrivers ?? data.model.topDrivers ?? [])[0];
  const topSharePlatform = shareRateByPlatform[0];
  const selectedPlatformMedia = platformMediaSummary
    .filter((row) => row.platform === selectedPlatform)
    .sort((left, right) => right.avgCommunityReachScore - left.avgCommunityReachScore);
  const selectedPlatformBestMedia = selectedPlatformMedia[0];
  const strategyChartData = useMemo(() => {
    const filtered = communityRows.filter((post) => {
      if (String(post.platform ?? "").trim() !== selectedPlatform) return false;
      if (strategyResidentStoryOnly && !asBoolean(post.features_resident_story)) return false;
      if (strategyCtaOnly && !asBoolean(post.has_call_to_action)) return false;
      if (strategyImpactStoryOnly && String(post.post_type ?? "").trim() !== "ImpactStory") return false;
      if (strategyBoostedOnly && !asBoolean(post.is_boosted)) return false;
      return true;
    });

    const grouped = new Map<string, { posts: number; scoreTotal: number; referralTotal: number; shareRateTotal: number }>();
    for (const post of filtered) {
      const mediaType = String(post.media_type ?? "").trim();
      if (!mediaType) continue;
      const current = grouped.get(mediaType) ?? { posts: 0, scoreTotal: 0, referralTotal: 0, shareRateTotal: 0 };
      current.posts += 1;
      current.scoreTotal += post.communityReachScore;
      current.referralTotal += post.likelyCommunityReferral;
      current.shareRateTotal += post.shareRate;
      grouped.set(mediaType, current);
    }
    return Array.from(grouped.entries())
      .map(([mediaType, metrics]) => ({
        mediaType,
        posts: metrics.posts,
        avgCommunityReachScore: metrics.posts ? metrics.scoreTotal / metrics.posts : 0,
        likelyCommunityReferralRate: metrics.posts ? metrics.referralTotal / metrics.posts : 0,
        avgShareRate: metrics.posts ? metrics.shareRateTotal / metrics.posts : 0,
      }))
      .sort((left, right) => right.avgCommunityReachScore - left.avgCommunityReachScore);
  }, [communityRows, selectedPlatform, strategyResidentStoryOnly, strategyCtaOnly, strategyImpactStoryOnly, strategyBoostedOnly]);
  const strategyBestMedia = strategyChartData[0];

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
      value: data.liftMetrics[0] ? formatLiftIncrease(data.liftMetrics[0].withRate, data.liftMetrics[0].withoutRate) : "N/A",
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
      value: data.liftMetrics[1] ? formatLiftIncrease(data.liftMetrics[1].withRate, data.liftMetrics[1].withoutRate) : "N/A",
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
      id: "selected-platform-media",
      title: `${selectedPlatform} best media`,
      value: selectedPlatformBestMedia?.mediaType ?? "N/A",
      detail: selectedPlatformBestMedia
        ? `${formatDisplayPercent((selectedPlatformBestMedia.avgCommunityReachScore ?? 0) * 100)} reach score across ${selectedPlatformBestMedia.posts.toLocaleString()} posts`
        : `No media-type benchmark is available for ${selectedPlatform}.`,
      icon: Brain,
      chartType: "score" as DetailChartType,
      miniChartData: selectedPlatformMedia.slice(0, 5).map((point) => ({
        label: point.mediaType,
        value: point.avgCommunityReachScore ?? 0,
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
          `${metric.factor} shows a ${formatLiftIncrease(metric.withRate, metric.withoutRate)} relative lift in the current dataset.`,
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
          `${metric.factor} shows a ${formatLiftIncrease(metric.withRate, metric.withoutRate)} relative lift in the community-referral proxy.`,
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
            <p className="text-sm text-foreground/75">{kpi.label}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{kpi.value}</p>
            <p className="mt-3 text-xs leading-5 text-foreground/70">{kpi.detail}</p>
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
              <h3 className="font-heading text-lg font-semibold text-foreground">Best post types for community reach</h3>
              <p className="text-sm text-foreground/75">Which formats travel furthest across the community-awareness score.</p>
            </div>
            <Users aria-hidden="true" className="h-5 w-5 text-foreground/65" />
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
              <h3 className="font-heading text-lg font-semibold text-foreground">Best platforms for community outreach</h3>
              <p className="text-sm text-foreground/75">Which platform currently delivers the strongest awareness and sharing profile.</p>
            </div>
            <BarChart3 aria-hidden="true" className="h-5 w-5 text-foreground/65" />
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
              onClick={() => {
                if (card.id === "selected-platform-media") {
                  setStrategyOpen(true);
                  return;
                }
                setActiveInsightId(card.id);
              }}
              className="rounded-2xl border border-border/70 bg-card p-5 text-left shadow-warm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{card.title}</p>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-3xl font-bold text-foreground">{card.value}</p>
              <p className="mt-2 text-xs leading-5 text-foreground/70">{card.detail}</p>
              <MiniPreviewChart data={card.miniChartData} chartType={card.chartType} />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setStrategyOpen(true)}
        className="w-full rounded-2xl bg-card p-6 text-left shadow-warm transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary">What To Post Next</p>
            <h3 className="mt-2 font-heading text-2xl font-bold text-foreground">{data.summary.headline}</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/75">
              Use the community reach score to choose formats that spread awareness, then use platform and timing signals to put those posts where local networks are most likely to see and share them. Click this section to open the deeper strategy view with platform, media, story, CTA, and boost toggles.
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
              <Badge variant="secondary" className={cn("rounded-full", data.model.isTrained ? "bg-primary/15 text-primary" : "bg-muted text-foreground/75")}>
                {data.model.isTrained ? "Model ready" : "Snapshot only"}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground/75">
              The community planner is optimized for awareness and sharing, not donation conversion, so it helps the outreach team choose what to publish to reach more people.
            </p>
          </div>
        </div>
      </button>

      <Dialog open={strategyOpen} onOpenChange={setStrategyOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto rounded-2xl border-border/80 bg-background">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-foreground">Community outreach strategy view</DialogTitle>
            <DialogDescription>
              Switch platforms and toggle key outreach features to see how the best media type changes for awareness and community referral potential.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6">
            <div className="flex flex-wrap gap-2">
              {platformOptions.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setSelectedPlatform(platform)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                    selectedPlatform === platform
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/70 bg-background text-foreground/75 hover:border-primary/35 hover:text-foreground",
                  )}
                  aria-pressed={selectedPlatform === platform}
                >
                  {platform}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "Resident story", active: strategyResidentStoryOnly, setActive: setStrategyResidentStoryOnly },
                { label: "CTA", active: strategyCtaOnly, setActive: setStrategyCtaOnly },
                { label: "ImpactStory", active: strategyImpactStoryOnly, setActive: setStrategyImpactStoryOnly },
                { label: "Boosted", active: strategyBoostedOnly, setActive: setStrategyBoostedOnly },
              ].map((toggle) => (
                <button
                  key={toggle.label}
                  type="button"
                  onClick={() => toggle.setActive(!toggle.active)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                    toggle.active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/70 bg-background text-foreground/75 hover:border-primary/35 hover:text-foreground",
                  )}
                  aria-pressed={toggle.active}
                >
                  {toggle.label}
                </button>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-muted/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Best media now</p>
                <p className="mt-3 text-3xl font-bold text-foreground">{strategyBestMedia?.mediaType ?? "N/A"}</p>
                <p className="mt-2 text-xs leading-5 text-foreground/70">
                  {strategyBestMedia ? `${formatDisplayPercent((strategyBestMedia.avgCommunityReachScore ?? 0) * 100)} reach score across ${strategyBestMedia.posts.toLocaleString()} posts.` : "No posts match the current filter set."}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Share rate</p>
                <p className="mt-3 text-3xl font-bold text-foreground">{formatPercent(strategyBestMedia?.avgShareRate)}</p>
                <p className="mt-2 text-xs leading-5 text-foreground/70">Average share rate for the current best media choice.</p>
              </div>
              <div className="rounded-2xl bg-muted/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Recommendation read</p>
                <p className="mt-3 text-sm leading-6 text-foreground">
                  {strategyBestMedia ? `On ${selectedPlatform}, ${strategyBestMedia.mediaType} is the strongest current outreach format under these feature filters.` : `No tracked posts match the current ${selectedPlatform} filter combination yet.`}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-warm">
              <h3 className="font-heading text-lg font-semibold text-foreground">Community reach score by media type on {selectedPlatform}</h3>
              <p className="mt-1 text-sm text-foreground/75">The chart updates as you change platform and feature toggles above.</p>
              <div className="mt-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={strategyChartData} layout="vertical" margin={{ left: 18, right: 18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 1]} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />
                    <YAxis type="category" dataKey="mediaType" width={130} />
                    <Tooltip formatter={(value: number) => `${Math.round(value * 100)}%`} />
                    <Bar dataKey="avgCommunityReachScore" fill="hsl(var(--primary))" radius={[0, 12, 12, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
  const [plannerDialogOpen, setPlannerDialogOpen] = useState(false);
  const [communityPlannerDialogOpen, setCommunityPlannerDialogOpen] = useState(false);
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

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => insertRecord("social_media_posts", payload),
    onSuccess: async () => {
      setFormOpen(false);
      setForm(EMPTY_FORM);
      setCaptionLengthEdited(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-workspace"] });
      toast.success("Historical post added.");
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
            "Open the live planner to test an outreach draft before it goes out. As you change platform, media type, CTA, resident story, and timing, the awareness predictions update to show likely reach and community-referral potential.",
          primaryBadge: "",
          secondaryBadge: "",
        }
      : {
          title: "Social Media Intelligence",
          description:
            "Open the live planner to test a draft post before it goes out. As you change platform, media type, CTA, resident story, and other settings, the predictions update to show likely referrals and donation value.",
          primaryBadge: "",
          secondaryBadge: "",
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

            <div
              aria-label="Outreach planning modes"
              className="flex w-fit flex-wrap gap-2 rounded-2xl border border-border/70 bg-muted/20 p-1"
            >
              <button
                type="button"
                onClick={() => setPlannerMode("donation")}
                aria-pressed={plannerMode === "donation"}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                  plannerMode === "donation"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/85 hover:bg-background hover:text-foreground",
                )}
              >
                Donation posts
              </button>
              <button
                type="button"
                onClick={() => setPlannerMode("community")}
                aria-pressed={plannerMode === "community"}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                  plannerMode === "community"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/85 hover:bg-background hover:text-foreground",
                )}
              >
                Community outreach
              </button>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">{plannerCopy.title}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-foreground/85">{plannerCopy.description}</p>
              {plannerMode === "donation" ? (
                <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={() => setPlannerDialogOpen(true)}>
                  <Brain className="mr-2 h-4 w-4" />
                  Open live planner
                </Button>
              ) : plannerMode === "community" ? (
                <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={() => setCommunityPlannerDialogOpen(true)}>
                  <Brain className="mr-2 h-4 w-4" />
                  Open live planner
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/80">
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
          </div>
        </div>
      </div>

      {activeError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 shadow-warm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="font-semibold text-foreground">{plannerMode === "community" ? "Community outreach analytics could not be loaded." : "Donation social analytics could not be loaded."}</p>
              <p className="mt-1 text-sm text-foreground/75">{activeError instanceof Error ? activeError.message : "Unknown error."}</p>
            </div>
          </div>
        </div>
      ) : null}

      {plannerMode === "donation" ? (
        donationQuery.data ? (
          <DonationAnalyticsView data={donationQuery.data} socialPosts={socialPosts} />
        ) : donationQuery.isLoading ? (
          <div className="rounded-2xl bg-card p-6 shadow-warm">
            <p className="text-sm text-foreground/75">Loading the latest donation social analytics snapshot...</p>
          </div>
        ) : null
      ) : communityQuery.data ? (
        <CommunityAnalyticsView data={communityQuery.data} socialPosts={socialPosts} />
      ) : communityQuery.isLoading ? (
        <div className="rounded-2xl bg-card p-6 shadow-warm">
          <p className="text-sm text-foreground/75">Loading the latest community outreach analytics snapshot...</p>
        </div>
      ) : null}

      <DonationPlannerDialog open={plannerDialogOpen} onOpenChange={setPlannerDialogOpen} socialPosts={socialPosts} />
      <CommunityPlannerDialog open={communityPlannerDialogOpen} onOpenChange={setCommunityPlannerDialogOpen} socialPosts={socialPosts} />

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
              <label htmlFor="historical-post-platform" className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Platform *</span>
                <select
                  id="historical-post-platform"
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

              <label htmlFor="historical-post-type" className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Post type *</span>
                <select
                  id="historical-post-type"
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

              <label htmlFor="historical-post-media-type" className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Media type *</span>
                <select
                  id="historical-post-media-type"
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

              <label htmlFor="historical-post-cta-enabled" className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">CTA enabled</span>
                <select
                  id="historical-post-cta-enabled"
                  value={form.has_call_to_action}
                  onChange={(event) => setForm((current) => ({ ...current, has_call_to_action: event.target.value }))}
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </label>

              {form.has_call_to_action === "true" ? (
                <label htmlFor="historical-post-cta-type" className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">CTA type *</span>
                  <select
                    id="historical-post-cta-type"
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

              <label htmlFor="historical-post-content-topic" className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Content topic *</span>
                <select
                  id="historical-post-content-topic"
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

              <label htmlFor="historical-post-sentiment-tone" className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Sentiment tone *</span>
                <select
                  id="historical-post-sentiment-tone"
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

              <label htmlFor="historical-post-resident-story" className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Resident story</span>
                <select
                  id="historical-post-resident-story"
                  value={form.features_resident_story}
                  onChange={(event) => setForm((current) => ({ ...current, features_resident_story: event.target.value }))}
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </label>

              <label htmlFor="historical-post-campaign-name" className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Campaign name</span>
                <select
                  id="historical-post-campaign-name"
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

              <label htmlFor="historical-post-boosted" className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Boosted</span>
                <select
                  id="historical-post-boosted"
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
