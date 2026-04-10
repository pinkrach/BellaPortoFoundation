import { useEffect, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";

export type AnalyticsChartRow = Record<string, string | number | null | undefined>;

export type AnalyticsChartView = {
  key: string;
  label: string;
  description?: string;
  chartType: "line" | "bar" | "pie";
  data: AnalyticsChartRow[];
  rows?: AnalyticsChartRow[];
  xKey?: string;
  dataKey?: string;
  secondaryKey?: string;
  labelKey?: string;
  valueKey?: string;
  searchable?: boolean;
};

export type AnalyticsMiniKpi = {
  label: string;
  value: string;
  detail?: string;
};

export type AnalyticsDetailConfig = {
  title: string;
  description: string;
  miniKpis?: AnalyticsMiniKpi[];
  views: AnalyticsChartView[];
  rowAction?: {
    label: string;
    type: "supporter";
    idKey: string;
    textKey: string;
  };
};

const PIE_COLORS = ["#5A8FA0", "#C17A3A", "#4A7A52", "#C06080", "#9B7FC0", "#406B83"];

function SharedChartRenderer({ view, chartData }: { view: AnalyticsChartView; chartData: AnalyticsChartRow[] }) {
  const labelKey = view.labelKey ?? view.xKey ?? "label";
  const valueKey = view.valueKey ?? view.dataKey ?? "value";

  if (view.chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={view.xKey ?? "label"} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={view.dataKey ?? "value"} stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
          {view.secondaryKey ? <Line type="monotone" dataKey={view.secondaryKey} stroke="hsl(var(--secondary))" strokeWidth={3} dot={false} /> : null}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (view.chartType === "pie") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip />
          <Legend />
          <Pie data={chartData} dataKey={valueKey} nameKey={labelKey} innerRadius={55} outerRadius={110} paddingAngle={3}>
            {chartData.map((entry, index) => (
              <Cell key={`${String(entry[labelKey] ?? "slice")}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        <YAxis type="category" dataKey={labelKey} width={180} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey={valueKey} fill="hsl(var(--primary))" radius={[0, 12, 12, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AnalyticsDetailDialog({
  detail,
  open,
  onOpenChange,
  onSupporterOpen,
}: {
  detail: AnalyticsDetailConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSupporterOpen?: (supporterId: string | number | null | undefined) => void;
}) {
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState("10");
  const [viewKey, setViewKey] = useState<string>("");

  useEffect(() => {
    if (!detail) {
      setViewKey("");
      setSearch("");
      setLimit("10");
      return;
    }
    setViewKey(detail.views[0]?.key || "");
    setSearch("");
    setLimit("10");
  }, [detail]);

  const activeView = useMemo(() => {
    if (!detail) return null;
    return detail.views.find((view) => view.key === viewKey) ?? detail.views[0] ?? null;
  }, [detail, viewKey]);

  const filteredChartData = useMemo(() => {
    if (!activeView) return [];
    const normalizedSearch = search.trim().toLowerCase();
    const labelKey = activeView.labelKey ?? activeView.xKey ?? "label";
    const valueKey = activeView.valueKey ?? activeView.dataKey ?? "value";
    let rows = activeView.data.filter((row) => {
      if (!normalizedSearch) return true;
      return String(row[labelKey] ?? row[detail?.rowAction?.textKey ?? ""] ?? "").toLowerCase().includes(normalizedSearch);
    });
    if (activeView.chartType !== "line") {
      rows = [...rows].sort((left, right) => Number(right[valueKey] ?? 0) - Number(left[valueKey] ?? 0));
    }
    if (limit !== "all") {
      rows = rows.slice(0, Number(limit));
    }
    return rows;
  }, [activeView, detail, limit, search]);

  const filteredRows = useMemo(() => {
    if (!activeView) return [];
    const source = activeView.rows ?? activeView.data;
    const normalizedSearch = search.trim().toLowerCase();
    const labelKey = activeView.labelKey ?? activeView.xKey ?? "label";
    const valueKey = activeView.valueKey ?? activeView.dataKey ?? "value";
    let rows = source.filter((row) => {
      if (!normalizedSearch) return true;
      return String(row[labelKey] ?? row[detail?.rowAction?.textKey ?? ""] ?? "").toLowerCase().includes(normalizedSearch);
    });
    if (activeView.chartType !== "line") {
      rows = [...rows].sort((left, right) => Number(right[valueKey] ?? 0) - Number(left[valueKey] ?? 0));
    }
    if (limit !== "all") {
      rows = rows.slice(0, Number(limit));
    }
    return rows;
  }, [activeView, detail, limit, search]);

  const hasMeaningfulRows = useMemo(() => {
    if (!activeView) return false;
    return filteredRows.some((row) => {
      const labelKey = activeView.labelKey ?? activeView.xKey ?? "label";
      const primaryKey = activeView.dataKey ?? activeView.valueKey ?? "value";
      const actionText = detail?.rowAction ? row[detail.rowAction.textKey] : null;
      const primaryValue = row[primaryKey];
      const secondaryValue = activeView.secondaryKey ? row[activeView.secondaryKey] : null;
      return (
        row.lapse_score != null ||
        row.days_since_last_donation != null ||
        actionText != null ||
        row[labelKey] != null ||
        primaryValue != null ||
        secondaryValue != null
      );
    });
  }, [activeView, detail, filteredRows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto rounded-2xl border-border/80 bg-background">
        {detail && activeView ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl text-foreground">{detail.title}</DialogTitle>
              <DialogDescription>{activeView.description ?? detail.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {detail.miniKpis?.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {detail.miniKpis.map((kpi) => (
                    <div key={kpi.label} className="rounded-2xl border border-border/70 bg-card p-4 shadow-warm">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{kpi.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{kpi.value}</p>
                      {kpi.detail ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{kpi.detail}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {(detail.views.length > 1 || activeView.searchable || (((activeView.rows ?? []).length > 5) && hasMeaningfulRows)) ? (
                <div className={cn("grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4", detail.views.length > 1 || activeView.searchable ? "md:grid-cols-3" : "md:grid-cols-1")}>
                  {detail.views.length > 1 ? (
                    <select
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={activeView.key}
                      onChange={(event) => setViewKey(event.target.value)}
                    >
                      {detail.views.map((view) => (
                        <option key={view.key} value={view.key}>
                          {view.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {activeView.searchable ? (
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search names or labels" />
                  ) : null}
                  {((activeView.rows ?? []).length > 5 && hasMeaningfulRows) ? (
                    <select
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={limit}
                      onChange={(event) => setLimit(event.target.value)}
                    >
                      <option value="5">Show 5 rows</option>
                      <option value="10">Show 10 rows</option>
                      <option value="20">Show 20 rows</option>
                      <option value="all">Show all rows</option>
                    </select>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-warm">
                <div className="h-80 w-full">
                  <SharedChartRenderer key={`${detail.title}-${activeView.key}-${filteredChartData.length}`} view={activeView} chartData={filteredChartData} />
                </div>
              </div>

              {hasMeaningfulRows ? (
                <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-warm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-heading text-lg font-semibold text-foreground">Detailed rows</h4>
                      <p className="text-sm text-muted-foreground">Use these records to inspect exactly what the expanded chart is displaying.</p>
                    </div>
                    <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/5 text-primary">
                      {filteredRows.length} visible
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-2">
                    {filteredRows.map((row, index) => {
                      const labelKey = activeView.labelKey ?? activeView.xKey ?? "label";
                      const primaryKey = activeView.dataKey ?? activeView.valueKey ?? "value";
                      const actionText = detail.rowAction ? row[detail.rowAction.textKey] : null;
                      const actionId = detail.rowAction ? row[detail.rowAction.idKey] : null;
                      const meaningful =
                        row.lapse_score != null ||
                        row.days_since_last_donation != null ||
                        actionText != null ||
                        row[labelKey] != null ||
                        row[primaryKey] != null ||
                        (activeView.secondaryKey ? row[activeView.secondaryKey] != null : false);
                      if (!meaningful) return null;
                      const canOpenSupporter = Boolean(detail.rowAction && actionId && onSupporterOpen);
                      return (
                        <div key={`${String(row[labelKey] ?? actionText ?? "row")}-${index}`} className="rounded-xl bg-muted/25 px-4 py-3">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              {canOpenSupporter ? (
                                <button
                                  type="button"
                                  className="font-medium text-foreground transition-colors hover:text-primary"
                                  onClick={() => onSupporterOpen?.(actionId)}
                                >
                                  {String(row[labelKey] ?? actionText ?? "Record")}
                                </button>
                              ) : (
                                <p className="font-medium text-foreground">{String(row[labelKey] ?? actionText ?? "Record")}</p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                {row.lapse_score != null
                                  ? `Lapse score: ${String(row.lapse_score)} • ${String(row.lapse_band ?? "Unrated")}`
                                  : `Primary value: ${String(row[primaryKey] ?? "N/A")}${activeView.secondaryKey ? ` • Secondary value: ${String(row[activeView.secondaryKey] ?? "N/A")}` : ""}`}
                              </p>
                              {row.days_since_last_donation != null ? (
                                <p className="text-xs text-muted-foreground">Days since last donation: {String(row.days_since_last_donation)}</p>
                              ) : null}
                            </div>
                            {canOpenSupporter ? (
                              <Button variant="outline" className="rounded-xl" onClick={() => onSupporterOpen?.(actionId)}>
                                {detail.rowAction?.label ?? "Open"}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
