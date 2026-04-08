import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Anchor,
  Bell,
  Heart,
  History,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Gift,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DonorGivingHistory from "@/pages/DonorGivingHistory";
import DonorSettings from "@/pages/DonorSettings";
import { DonationModal } from "@/components/DonationModal";
import { donorDonationDataQueryKey, fetchDonorDonationData, type DonationRow } from "@/lib/donorQueries";
import safehouseImage from "@/assets/hero/portofino-watercolor-hero.png";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatDonationDate = (value: unknown) => {
  if (typeof value !== "string" || !value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
};

const formatUsd = (value: unknown) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(toNumber(value));

function donationEstimatedValue(row: DonationRow): number {
  return toNumber(row.estimated_value);
}

const DonorDashboard = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") || "impact").toLowerCase();

  const { userEmail, displayName, initials, logout } = useAuth();
  const queryClient = useQueryClient();
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Match AdminLayout behavior (collapsible sidebar + mobile overlay)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const savedState = window.localStorage.getItem("donor-sidebar-collapsed");
    setSidebarCollapsed(savedState === "true");
  }, []);

  const handleSidebarCollapse = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("donor-sidebar-collapsed", String(next));
      return next;
    });
  };

  const { data, isPending, isError } = useQuery({
    queryKey: donorDonationDataQueryKey(userEmail),
    queryFn: () => fetchDonorDonationData(userEmail),
    enabled: Boolean(userEmail),
  });

  const donations = data?.donations ?? [];
  const monetaryDonations = useMemo(
    () => donations.filter((d) => (d.donation_type ?? "").trim() === "Monetary"),
    [donations],
  );
  const donationCount = monetaryDonations.length;

  const totalEstimatedImpact = useMemo(() => {
    let total = 0;
    for (const d of monetaryDonations) total += donationEstimatedValue(d);
    return total;
  }, [monetaryDonations]);

  const nightsOfSafety = useMemo(() => Math.max(0, Math.floor(totalEstimatedImpact / 50)), [totalEstimatedImpact]);

  const onSelectTab = (next: "impact" | "history" | "settings") => {
    const nextParams = new URLSearchParams(params);
    if (next === "impact") nextParams.delete("tab");
    else nextParams.set("tab", next);
    setParams(nextParams, { replace: true });
    setSidebarOpen(false);
    setUserMenuOpen(false);
  };

  const showHistory = tab === "history";
  const showSettings = tab === "settings";
  const showImpact = !showHistory && !showSettings;

  const sidebarItems = [
    { key: "impact", label: "My Impact", icon: Heart },
    { key: "history", label: "Giving History", icon: History },
    { key: "settings", label: "Settings", icon: Settings },
  ] as const;

  useEffect(() => {
    if (!userMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (userMenuRef.current && userMenuRef.current.contains(target)) return;
      setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [userMenuOpen]);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar (matches AdminLayout styling) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground transition-[width,transform] duration-300 lg:sticky lg:top-0 ${
          sidebarCollapsed ? "lg:w-20" : "lg:w-64"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div
          className={`border-b border-sidebar-border px-4 py-5 ${
            sidebarCollapsed ? "flex flex-col items-center gap-3 lg:px-3" : "flex items-center justify-between gap-3"
          }`}
        >
          <Link
            to="/"
            onClick={() => setSidebarOpen(false)}
            className={`flex min-w-0 items-center gap-3 rounded-lg transition-opacity hover:opacity-90 ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
            aria-label="Go to home page"
          >
            <Anchor className="h-6 w-6 shrink-0 text-accent" />
            <span className={`font-heading text-lg font-bold ${sidebarCollapsed ? "hidden" : "truncate"}`}>Bella Bay</span>
          </Link>

          <button
            type="button"
            onClick={handleSidebarCollapse}
            className="hidden rounded-lg p-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground lg:inline-flex"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>

        <nav className={`flex-1 overflow-y-auto py-4 ${sidebarCollapsed ? "space-y-2 px-2" : "space-y-1 px-3"}`}>
          {sidebarItems.map((item) => {
            const active = tab === item.key || (item.key === "impact" && showImpact);
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectTab(item.key)}
                className={`flex w-full items-center rounded-lg transition-colors text-sm font-medium ${
                  sidebarCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2.5"
                } ${
                  active
                    ? "bg-sidebar-accent text-accent"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
                aria-label={item.label}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {Icon ? <Icon className="h-5 w-5" /> : null}
                <span className={sidebarCollapsed ? "hidden" : "truncate"}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={`px-3 pb-3 ${sidebarCollapsed ? "px-2" : ""}`}>
          <button
            type="button"
            onClick={() => setDonationModalOpen(true)}
            className={`w-full inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-warm hover:shadow-warm-hover transition-shadow text-sm font-semibold ${
              sidebarCollapsed ? "px-2 py-3" : "px-3 py-2.5"
            }`}
            aria-label="Make a Donation"
            title={sidebarCollapsed ? "Make a Donation" : undefined}
          >
            <Gift className={`h-5 w-5 ${sidebarCollapsed ? "" : "mr-2"}`} />
            <span className={sidebarCollapsed ? "hidden" : ""}>Make a Donation</span>
          </button>
        </div>
      </aside>

      {/* Main (matches AdminLayout styling) */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6 text-foreground" />
            </button>
            <div>
              <h1 className="font-heading text-lg font-semibold text-foreground">
                {showHistory ? "Giving History" : showSettings ? "Settings" : "Donor Dashboard"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative text-muted-foreground hover:text-foreground transition-colors" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-secondary rounded-full" />
            </button>
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className="group inline-flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1.5 hover:bg-muted/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-warm group-hover:shadow-warm-hover transition-shadow"
                  title={displayName ?? userEmail ?? "Signed-in user"}
                >
                  {initials}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>

              {userMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-background shadow-warm z-50"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => onSelectTab("settings")}
                    className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-muted/40 transition-colors flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Settings
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      setUserMenuOpen(false);
                      await logout();
                      navigate("/login");
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-muted/40 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4 text-muted-foreground" />
                    Sign Out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {showHistory ? (
            <DonorGivingHistory />
          ) : showSettings ? (
            <DonorSettings />
          ) : (
            <>
              {/* KPI Cards (match AdminDashboard bento style) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Total Impact", value: userEmail && data ? formatUsd(totalEstimatedImpact) : "—", icon: Heart },
                  { label: "Giving Frequency", value: userEmail && data ? `${donationCount}` : "—", icon: History },
                  {
                    label: "Current Foundation Needs",
                    value: userEmail && data ? "Safehouse #4 needs 20 new blankets" : "—",
                    icon: Gift,
                  },
                ].map((kpi, i) => (
                  <motion.div
                    key={kpi.label}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="bg-card rounded-2xl p-5 shadow-warm border-t-4 border-secondary hover:shadow-warm-hover transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <kpi.icon className="h-5 w-5 text-muted-foreground" />
                      {kpi.label === "Current Foundation Needs" ? (
                        <button
                          type="button"
                          onClick={() => setDonationModalOpen(true)}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Give Now →
                        </button>
                      ) : null}
                    </div>
                    <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{kpi.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Main content (match AdminDashboard structure) */}
              {!userEmail || isPending ? (
                <div className="text-sm text-muted-foreground py-8 text-center">Loading your donor dashboard…</div>
              ) : isError || !data ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
                  We couldn’t load your donations. Please try again later.
                </div>
              ) : (
                <div className="grid lg:grid-cols-2 gap-6 items-stretch">
                  {/* Impact visual */}
                  <div className="bg-card rounded-2xl p-6 shadow-warm h-full flex flex-col">
                    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted/20 flex-1 min-h-[320px]">
                      <img
                        src={safehouseImage}
                        alt="Safehouse placeholder"
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/15 to-transparent" />
                      <div className="absolute left-4 right-4 bottom-4 sm:left-5 sm:right-5 sm:bottom-5">
                        <div className="rounded-2xl border border-border/60 bg-background/55 backdrop-blur-md p-5 shadow-warm">
                          <p className="text-sm text-muted-foreground">Your impact</p>
                          <p className="mt-1 text-xl font-semibold text-foreground">
                            Your contributions have helped provide{" "}
                            <span className="text-primary font-bold">{nightsOfSafety}</span> nights of safety.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="h-full flex flex-col">
                    {/* Recent Donations (match AdminDashboard table formatting) */}
                    <div className="bg-card rounded-2xl p-6 shadow-warm h-full flex flex-col">
                      <h3 className="font-heading text-base font-semibold text-foreground mb-4">Recent Donations</h3>
                      <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-muted-foreground border-b border-border">
                              <th className="pb-2 font-medium">Amount</th>
                              <th className="pb-2 font-medium">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monetaryDonations.slice(0, 6).map((d, i) => (
                              <tr key={d.donation_id} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                                <td className="py-2.5 font-semibold text-foreground">
                                  {formatUsd(d.amount ?? d.estimated_value)}
                                </td>
                                <td className="py-2.5 text-muted-foreground">{formatDonationDate(d.donation_date)}</td>
                              </tr>
                            ))}

                            {monetaryDonations.length === 0 ? (
                              <tr>
                                <td className="py-2.5 text-muted-foreground" colSpan={2}>
                                  No monetary donations found.
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <DonationModal
        open={donationModalOpen}
        onOpenChange={setDonationModalOpen}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: donorDonationDataQueryKey(userEmail) });
        }}
      />
    </div>
  );
};

export default DonorDashboard;

