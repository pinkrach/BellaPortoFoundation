import { AdminLayout } from "@/components/AdminLayout";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BarChart3,
  Brain,
  Clock3,
  Megaphone,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Kpi = {
  label: string;
  value: number | null;
  detail: string;
  unit?: string;
};

type PostTypeReferralPoint = {
  postType: string;
  posts: number;
  referralRate: number | null;
};

type PostTypeValuePoint = {
  postType: string;
  posts: number;
  avgDonationValuePhp: number | null;
};

type LiftMetric = {
  factor: string;
  withLabel: string;
  withoutLabel: string;
  withRate: number | null;
  withoutRate: number | null;
  liftPoints: number | null;
};

type HourPerformancePoint = {
  label: string;
  posts: number;
  referralRate: number | null;
};

type TimingSignal = {
  label: string;
  value: string;
  detail: string;
};

type SummaryCard = {
  headline: string;
  bestOverallFormat: string;
  bestValueFormat: string;
};

type ScoredPost = {
  label: string;
  platform: string | null;
  postType: string | null;
  createdAt: string | null;
  predictedReferralProbability: number | null;
  actualDonationValuePhp: number | null;
  predictedDonationValuePhp: number | null;
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
  kpis: Kpi[];
  postTypeReferralChart: PostTypeReferralPoint[];
  postTypeValueChart: PostTypeValuePoint[];
  liftMetrics: LiftMetric[];
  hourPerformance: HourPerformancePoint[];
  timingSignals: TimingSignal[];
  summary: SummaryCard;
  recommendations: string[];
  scoredPosts: ScoredPost[];
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5250";

async function fetchLatestSocialAnalytics(): Promise<SocialAnalyticsResponse> {
  const response = await fetch(`${apiBaseUrl}/api/ml/social/latest`);

  if (response.status === 404) {
    throw new Error("No saved analytics yet. Press refresh analytics to generate the first live report.");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Unable to load social analytics.");
  }

  return response.json();
}

async function refreshSocialAnalytics(): Promise<SocialAnalyticsResponse> {
  const response = await fetch(`${apiBaseUrl}/api/ml/social/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Unable to refresh social analytics.");
  }

  return response.json();
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.06, duration: 0.35 },
  }),
};

function formatKpiValue(kpi: Kpi) {
  if (kpi.value == null) return "N/A";
  if (kpi.unit === "%") return `${kpi.value}%`;
  if (kpi.unit === "PHP") return `PHP ${Math.round(kpi.value).toLocaleString()}`;
  return kpi.value.toLocaleString();
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "N/A";
  return `${Math.round(value * 100)}%`;
}

function formatPeso(value: number | null | undefined) {
  if (value == null) return "N/A";
  return `PHP ${Math.round(value).toLocaleString()}`;
}

function formatHourLabel(value: string) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return value;
  const suffix = parsed >= 12 ? "PM" : "AM";
  const hour = parsed % 12 === 0 ? 12 : parsed % 12;
  return `${hour} ${suffix}`;
}

function formatDate(value: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

const SocialMediaDashboard = () => {
  const queryClient = useQueryClient();

  const analyticsQuery = useQuery({
    queryKey: ["social-analytics"],
    queryFn: fetchLatestSocialAnalytics,
    retry: false,
  });

  const refreshMutation = useMutation({
    mutationFn: refreshSocialAnalytics,
    onSuccess: (freshData) => {
      queryClient.setQueryData(["social-analytics"], freshData);
    },
  });

  const data = analyticsQuery.data;
  const isBusy = analyticsQuery.isLoading || refreshMutation.isPending;
  const error = refreshMutation.error ?? analyticsQuery.error;

  return (
    <AdminLayout
      title="Social Media Intelligence"
      subtitle="Live campaign analytics and machine learning refreshes from the current social media dataset"
    >
      <div className="space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground">Social media performance</h2>
            <p className="text-sm text-muted-foreground">
              Refresh the models and charts whenever new posts are added to the database.
            </p>
          </div>
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCw className={`h-4 w-4 ${isBusy ? "animate-spin" : ""}`} />
            Refresh analytics
          </button>
        </div>

        {analyticsQuery.isLoading ? (
          <div className="rounded-2xl bg-card p-8 shadow-warm">
            <p className="text-sm text-muted-foreground">Loading the latest saved social analytics...</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 shadow-warm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <p className="font-semibold text-foreground">The social analytics page needs a live backend response.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {(error as Error).message}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Make sure the backend API is running on `http://localhost:5250`, then press `Refresh analytics`.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {data ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {data.kpis.map((kpi, index) => (
                <motion.div
                  key={kpi.label}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  className="rounded-2xl border border-border/70 bg-card p-5 shadow-warm"
                >
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{formatKpiValue(kpi)}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{kpi.detail}</p>
                </motion.div>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-card p-6 shadow-warm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-foreground">Best post types for referral rate</h3>
                    <p className="text-sm text-muted-foreground">
                      Which post formats are currently most likely to generate at least one donation referral.
                    </p>
                  </div>
                  <Target className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="mt-5 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.postTypeReferralChart} layout="vertical" margin={{ left: 18, right: 18 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        type="number"
                        domain={[0, 1]}
                        tickFormatter={(value) => `${Math.round(value * 100)}%`}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis
                        type="category"
                        dataKey="postType"
                        stroke="hsl(var(--muted-foreground))"
                        width={130}
                      />
                      <Tooltip formatter={(value: number) => `${Math.round(value * 100)}%`} />
                      <Bar dataKey="referralRate" radius={[0, 12, 12, 0]} fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-card p-6 shadow-warm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-foreground">Best post types for donation value</h3>
                    <p className="text-sm text-muted-foreground">
                      Which post formats are currently creating the highest average donation value.
                    </p>
                  </div>
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="mt-5 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.postTypeValueChart} layout="vertical" margin={{ left: 18, right: 18 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis
                        type="category"
                        dataKey="postType"
                        stroke="hsl(var(--muted-foreground))"
                        width={130}
                      />
                      <Tooltip formatter={(value: number) => formatPeso(value)} />
                      <Bar dataKey="avgDonationValuePhp" radius={[0, 12, 12, 0]} fill="hsl(var(--secondary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-card p-6 shadow-warm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-foreground">Biggest conversion lifts</h3>
                    <p className="text-sm text-muted-foreground">
                      Compare posts with each feature against posts without it in the current dataset.
                    </p>
                  </div>
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="mt-5 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.liftMetrics} margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="factor" stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        domain={[0, 1]}
                        tickFormatter={(value) => `${Math.round(value * 100)}%`}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip formatter={(value: number) => `${Math.round(value * 100)}%`} />
                      <Bar dataKey="withRate" name="With feature" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="withoutRate" name="Without feature" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-card p-6 shadow-warm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-foreground">Best posting hours</h3>
                    <p className="text-sm text-muted-foreground">
                      Hour-by-hour referral performance from the current social media dataset.
                    </p>
                  </div>
                  <Clock3 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="mt-5 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.hourPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="label"
                        tickFormatter={(value) => formatHourLabel(String(value))}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis
                        domain={[0, 1]}
                        tickFormatter={(value) => `${Math.round(value * 100)}%`}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip
                        formatter={(value: number) => `${Math.round(value * 100)}%`}
                        labelFormatter={(value) => formatHourLabel(String(value))}
                      />
                      <Bar dataKey="referralRate" radius={[8, 8, 0, 0]}>
                        {data.hourPerformance.map((entry, index) => (
                          <Cell
                            key={`${entry.label}-${index}`}
                            fill={index === 0 ? "hsl(var(--primary))" : "hsl(var(--accent))"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-card p-6 shadow-warm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-primary">Best Next Posts</p>
                    <h3 className="mt-2 font-heading text-2xl font-bold text-foreground">{data.summary.headline}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      These recommendations are generated from the current dataset and refresh whenever the models are rerun.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-primary/8 px-4 py-3 text-right">
                    <p className="text-xs text-foreground/70">Best overall format</p>
                    <p className="text-2xl font-bold text-foreground">{data.summary.bestOverallFormat}</p>
                    <p className="text-xs text-foreground/70">Best value format: {data.summary.bestValueFormat}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {data.liftMetrics.map((metric) => (
                    <div key={metric.factor} className="rounded-2xl bg-muted/25 p-4">
                      <Brain className="h-5 w-5 text-primary" />
                      <p className="mt-3 text-sm font-semibold text-foreground">{metric.factor}</p>
                      <p className="mt-1 text-2xl font-bold text-foreground">
                        {metric.liftPoints == null ? "N/A" : `${metric.liftPoints > 0 ? "+" : ""}${metric.liftPoints} pts`}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {metric.withLabel}: {formatPercent(metric.withRate)}. {metric.withoutLabel}: {formatPercent(metric.withoutRate)}.
                      </p>
                    </div>
                  ))}
                  <div className="rounded-2xl bg-muted/25 p-4">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <p className="mt-3 text-sm font-semibold text-foreground">Posts above threshold</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {data.dataset.postsAboveThreshold?.toLocaleString() ?? "N/A"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Posts currently scoring above the model’s {Math.round(data.model.threshold * 100)}% referral threshold.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-card p-6 shadow-warm"
              >
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-secondary" />
                  <h3 className="font-heading text-lg font-semibold text-foreground">Decision Checklist</h3>
                </div>
                <div className="mt-5 space-y-3">
                  {data.recommendations.map((item) => (
                    <div key={item} className="rounded-xl bg-muted/30 p-4 text-sm leading-6 text-foreground">
                      {item}
                    </div>
                  ))}
                </div>
              </motion.div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-card p-6 shadow-warm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-foreground">Timing and tone signals</h3>
                    <p className="text-sm text-muted-foreground">
                      Quick scheduling and framing signals learned from the latest refresh.
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {data.timingSignals.map((signal) => (
                    <div key={signal.label} className="rounded-xl bg-muted/25 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-primary">{signal.label}</p>
                      <p className="mt-2 text-2xl font-bold text-foreground">
                        {signal.label.toLowerCase().includes("hour") ? formatHourLabel(signal.value) : signal.value}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{signal.detail}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-card p-6 shadow-warm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-foreground">High-potential posts</h3>
                    <p className="text-sm text-muted-foreground">
                      Top posts ranked by the latest model refresh using the current dataset.
                    </p>
                  </div>
                </div>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-3 font-medium">Post</th>
                        <th className="pb-3 font-medium">Type</th>
                        <th className="pb-3 font-medium">Predicted referral</th>
                        <th className="pb-3 font-medium">Predicted value</th>
                        <th className="pb-3 font-medium">Actual value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.scoredPosts.map((post, index) => (
                        <tr key={`${post.label}-${index}`} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                          <td className="py-4 pr-4">
                            <p className="font-semibold text-foreground">{post.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {post.platform ?? "Unknown"} · {formatDate(post.createdAt)}
                            </p>
                          </td>
                          <td className="py-4 pr-4 text-foreground">{post.postType ?? "N/A"}</td>
                          <td className="py-4 pr-4 font-semibold text-foreground">
                            {formatPercent(post.predictedReferralProbability)}
                          </td>
                          <td className="py-4 pr-4 text-foreground">{formatPeso(post.predictedDonationValuePhp)}</td>
                          <td className="py-4 pr-4 text-muted-foreground">{formatPeso(post.actualDonationValuePhp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </section>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default SocialMediaDashboard;
