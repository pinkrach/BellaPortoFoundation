import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Clock,
  Heart,
  History,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Gift,
  Info,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DonorGivingHistory from "@/pages/DonorGivingHistory";
import DonorSettings from "@/pages/DonorSettings";
import { DonationModal } from "@/components/DonationModal";
import { DonationDetailsModal } from "@/components/DonationDetailsModal";
import {
  countsTowardVerifiedImpact,
  donorDonationDataQueryKey,
  fetchDonorDonationData,
  normalizedSubmissionStatus,
  type DonationRow,
} from "@/lib/donorQueries";
import { DonorInKindGiftModal, DonorVolunteerTimeModal } from "@/components/DonorNonCashModals";
import { supabase } from "@/lib/supabaseClient";
import safehouseImage from "@/assets/hero/portofino-watercolor-hero.png";
import houseLogo from "@/assets/icons/houseIcon.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

const supporterTypeOptions = ["Individual", "Organization", "Corporate", "Foundation"] as const;
const relationshipTypeOptions = ["MonetaryDonor", "InKindDonor", "Volunteer", "Partner"] as const;
const acquisitionChannelOptions = ["Referral", "Social Media", "Website", "Event", "Email", "Walk-in"] as const;

const autoCapitalizeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());

function donationEstimatedValue(row: DonationRow): number {
  return toNumber(row.estimated_value);
}

const DonorDashboard = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") || "impact").toLowerCase();

  const { userId, userEmail, displayName, firstName, lastName, supporterDisplayName, supporterOrganizationName, initials, role, logout } =
    useAuth();
  const queryClient = useQueryClient();
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [volunteerModalOpen, setVolunteerModalOpen] = useState(false);
  const [inKindModalOpen, setInKindModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<DonationRow | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<"hidden" | "info" | "donate">("hidden");
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [supporterForm, setSupporterForm] = useState({
    first_name: "",
    last_name: "",
    display_name: "",
    email: "",
    phone: "",
    region: "",
    country: "",
    organization_name: "",
    supporter_type: "",
    relationship_type: "",
    acquisition_channel: "",
  });

  // Match AdminLayout behavior (collapsible sidebar + mobile overlay)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (params.get("donate") !== "1") return;
    setDonationModalOpen(true);
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("donate");
      return next;
    });
  }, [params, setParams]);

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
    queryKey: donorDonationDataQueryKey(userId, userEmail),
    queryFn: () => fetchDonorDonationData(userId, userEmail),
    enabled: Boolean(userId || userEmail),
  });

  const onboardingProfileQuery = useQuery({
    queryKey: ["donor-onboarding-profile", userId],
    enabled: Boolean(supabase && userId),
    queryFn: async () => {
      if (!supabase || !userId) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("supporter_id,email,supporter_onboarding_completed,supporter_onboarding_existing")
        .eq("id", userId)
        .maybeSingle();
      if (!profile) return null;
      const profileSupporterId = profile.supporter_id != null ? Number(profile.supporter_id) : null;
      const lookupEmail = (profile.email ?? userEmail ?? "").toString().trim();
      const supporterRow = profileSupporterId
        ? await supabase
            .from("supporters")
            .select("*")
            .eq("supporter_id", profileSupporterId)
            .maybeSingle()
        : await supabase
            .from("supporters")
            .select("*")
            .ilike("email", lookupEmail)
            .maybeSingle();
      return {
        profile,
        supporter: supporterRow.data ?? null,
      };
    },
  });

  const donations = data?.donations ?? [];
  const verifiedDonations = useMemo(() => donations.filter(countsTowardVerifiedImpact), [donations]);
  const monetaryDonations = useMemo(
    () => verifiedDonations.filter((d) => (d.donation_type ?? "").trim() === "Monetary"),
    [verifiedDonations],
  );
  const timeDonations = useMemo(() => verifiedDonations.filter((d) => (d.donation_type ?? "").trim() === "Time"), [verifiedDonations]);
  const inKindDonations = useMemo(
    () =>
      verifiedDonations.filter(
        (d) => (d.donation_type ?? "").trim() === "In-Kind" || (d.donation_type ?? "").trim() === "In-Kind Donation",
      ),
    [verifiedDonations],
  );
  const donationCount = verifiedDonations.length;
  const pendingNonCash = useMemo(
    () =>
      donations.filter((d) => {
        if (normalizedSubmissionStatus(d) !== "pending") return false;
        const t = (d.donation_type ?? "").trim();
        return t === "Time" || t === "In-Kind" || t === "In-Kind Donation";
      }),
    [donations],
  );

  const totalEstimatedImpact = useMemo(() => {
    let total = 0;
    for (const d of monetaryDonations) total += donationEstimatedValue(d);
    return total;
  }, [monetaryDonations]);

  const totalServiceValue = useMemo(() => {
    let total = 0;
    for (const d of timeDonations) total += donationEstimatedValue(d);
    return total;
  }, [timeDonations]);

  // Service hours are derived from Time donations at $15/hr, rounded up.
  const serviceHours = useMemo(() => Math.max(0, Math.ceil(totalServiceValue / 15)), [totalServiceValue]);

  const inKindTotalValue = useMemo(() => {
    let total = 0;
    for (const d of inKindDonations) total += donationEstimatedValue(d);
    return total;
  }, [inKindDonations]);

  const supporterGreetingQuery = useQuery({
    queryKey: ["donor-dashboard-supporter-greeting", userId, userEmail],
    enabled: Boolean(supabase && (userId || userEmail)),
    queryFn: async () => {
      if (!supabase) return null;

      let supporterId: number | null = null;
      let profileEmail: string | null = null;

      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("supporter_id,email")
          .eq("id", userId)
          .maybeSingle();
        supporterId = profile?.supporter_id != null ? Number(profile.supporter_id) : null;
        profileEmail = typeof profile?.email === "string" ? profile.email : null;
      }

      const email = (profileEmail ?? userEmail ?? "").trim();

      if (Number.isFinite(supporterId)) {
        const { data } = await supabase
          .from("supporters")
          .select("display_name,first_name,last_name,organization_name")
          .eq("supporter_id", supporterId as number)
          .maybeSingle();
        if (data) return data;
      }

      if (!email) return null;
      const { data } = await supabase
        .from("supporters")
        .select("display_name,first_name,last_name,organization_name")
        .ilike("email", email)
        .maybeSingle();
      return data ?? null;
    },
  });

  useEffect(() => {
    const payload = onboardingProfileQuery.data;
    const pendingKey = userId ? `donor-onboarding-pending:${userId}` : null;
    const seedKey = userId ? `donor-onboarding-seed:${userId}` : null;
    const hasPendingLocalFlag = pendingKey ? window.localStorage.getItem(pendingKey) === "true" : false;
    const seedRaw = seedKey ? window.localStorage.getItem(seedKey) : null;
    let seed: { first_name?: string; last_name?: string; email?: string } | null = null;
    if (seedRaw) {
      try {
        seed = JSON.parse(seedRaw) as { first_name?: string; last_name?: string; email?: string };
      } catch {
        seed = null;
      }
    }
    if (!payload) {
      if (hasPendingLocalFlag) {
        if (seed) {
          setSupporterForm((current) => ({
            ...current,
            first_name: String(seed.first_name ?? current.first_name ?? "").trim(),
            last_name: String(seed.last_name ?? current.last_name ?? "").trim(),
            email: String(seed.email ?? current.email ?? "").trim(),
          }));
        }
        setOnboardingStep("info");
      }
      return;
    }
    const completed = payload.profile?.supporter_onboarding_completed === true;
    if (completed) {
      if (pendingKey) window.localStorage.removeItem(pendingKey);
      setOnboardingStep("hidden");
      return;
    }

    const s = (payload.supporter ?? {}) as Record<string, unknown>;
    setSupporterForm({
      first_name: String(s.first_name ?? seed?.first_name ?? "").trim(),
      last_name: String(s.last_name ?? seed?.last_name ?? "").trim(),
      display_name: String(s.display_name ?? "").trim(),
      email: String(s.email ?? seed?.email ?? payload.profile?.email ?? userEmail ?? "").trim(),
      phone: String(s.phone ?? "").trim(),
      region: String(s.region ?? "").trim(),
      country: String(s.country ?? "").trim(),
      organization_name: String(s.organization_name ?? "").trim(),
      supporter_type: String(s.supporter_type ?? "").trim(),
      relationship_type: String(s.relationship_type ?? "").trim(),
      acquisition_channel: String(s.acquisition_channel ?? "").trim(),
    });
    setOnboardingStep("info");
  }, [onboardingProfileQuery.data, userEmail, userId]);

  const supporterFullName = useMemo(() => {
    const combined = [firstName, lastName].filter(Boolean).join(" ").trim();
    return combined || null;
  }, [firstName, lastName]);

  const greetingName = useMemo(() => {
    const queryDisplay = supporterGreetingQuery.data?.display_name?.trim();
    if (queryDisplay) return queryDisplay;
    const queryFull = [supporterGreetingQuery.data?.first_name, supporterGreetingQuery.data?.last_name].filter(Boolean).join(" ").trim();
    if (queryFull) return queryFull;
    const queryOrg = supporterGreetingQuery.data?.organization_name?.trim();
    if (queryOrg) return queryOrg;

    const byDisplay = supporterDisplayName?.trim();
    if (byDisplay) return byDisplay;
    if (supporterFullName) return supporterFullName;
    const byOrg = supporterOrganizationName?.trim();
    if (byOrg) return byOrg;
    const fallbackDisplay = displayName?.trim();
    if (fallbackDisplay && !fallbackDisplay.includes("@")) return fallbackDisplay;
    return "";
  }, [displayName, supporterDisplayName, supporterFullName, supporterOrganizationName, supporterGreetingQuery.data]);

  const onSelectTab = (next: "impact" | "history" | "settings") => {
    const nextParams = new URLSearchParams(params);
    if (next === "impact") nextParams.delete("tab");
    else nextParams.set("tab", next);
    setParams(nextParams, { replace: true });
    setSidebarOpen(false);
  };

  const showHistory = tab === "history";
  const showSettings = tab === "settings";
  const showImpact = !showHistory && !showSettings;
  const isExistingSupporter = onboardingProfileQuery.data?.profile?.supporter_onboarding_existing === true;

  const saveOnboardingInfo = async () => {
    if (!supabase || !userId) return;
    setOnboardingError(null);

    const email = supporterForm.email.trim();
    const first = supporterForm.first_name.trim();
    const last = supporterForm.last_name.trim();

    if (!email || !first || !last) {
      setOnboardingError("First name, last name, and email are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setOnboardingError("Please enter a valid email address.");
      return;
    }
    if (!supporterForm.supporter_type.trim()) {
      setOnboardingError("Supporter type is required.");
      return;
    }
    if (!supporterForm.relationship_type.trim()) {
      setOnboardingError("Relationship type is required.");
      return;
    }
    if (!supporterForm.acquisition_channel.trim()) {
      setOnboardingError("Acquisition channel is required.");
      return;
    }

    setOnboardingSaving(true);
    try {
      const currentSupporterIdRaw = onboardingProfileQuery.data?.profile?.supporter_id;
      const currentSupporterId = currentSupporterIdRaw != null ? Number(currentSupporterIdRaw) : null;

      let supporterId = Number.isFinite(currentSupporterId) ? (currentSupporterId as number) : null;
      if (!supporterId) {
        const { data: match } = await supabase.from("supporters").select("supporter_id").ilike("email", email).maybeSingle();
        supporterId = match?.supporter_id != null ? Number(match.supporter_id) : null;
      }

      if (supporterId) {
        const { error } = await supabase
          .from("supporters")
          .update({
            first_name: first,
            last_name: last,
            display_name: supporterForm.display_name.trim() || null,
            email,
            phone: supporterForm.phone.trim() || null,
            region: supporterForm.region.trim() || null,
            country: supporterForm.country.trim() || null,
            organization_name: supporterForm.organization_name.trim() || null,
            supporter_type: supporterForm.supporter_type.trim() || null,
            relationship_type: supporterForm.relationship_type.trim() || null,
            acquisition_channel: supporterForm.acquisition_channel.trim() || null,
            status: "Active",
          })
          .eq("supporter_id", supporterId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("supporters")
          .insert({
            first_name: first,
            last_name: last,
            display_name: supporterForm.display_name.trim() || null,
            email,
            phone: supporterForm.phone.trim() || null,
            region: supporterForm.region.trim() || null,
            country: supporterForm.country.trim() || null,
            organization_name: supporterForm.organization_name.trim() || null,
            supporter_type: supporterForm.supporter_type.trim() || null,
            relationship_type: supporterForm.relationship_type.trim() || null,
            acquisition_channel: supporterForm.acquisition_channel.trim() || null,
            status: "Active",
          })
          .select("supporter_id")
          .single();
        if (error) throw error;
        supporterId = Number(inserted?.supporter_id);
      }

      await supabase
        .from("profiles")
        .update({
          supporter_id: supporterId,
          email,
          supporter_onboarding_completed: true,
        })
        .eq("id", userId);

      window.localStorage.removeItem(`donor-onboarding-pending:${userId}`);
      window.localStorage.removeItem(`donor-onboarding-seed:${userId}`);
      setOnboardingStep("donate");
      await onboardingProfileQuery.refetch();
    } catch (error) {
      setOnboardingError(error instanceof Error ? error.message : "Could not save your information.");
    } finally {
      setOnboardingSaving(false);
    }
  };

  const sidebarItems = [
    { key: "impact", label: "My Impact", icon: Heart },
    { key: "history", label: "Giving History", icon: History },
    { key: "settings", label: "Settings", icon: Settings },
  ] as const;

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
            <img src={houseLogo} alt="" aria-hidden="true" className="h-7 w-7 shrink-0 object-contain brightness-0 invert" />
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

          <button
            type="button"
            onClick={() => setDonationModalOpen(true)}
            className={`mt-2 inline-flex w-full items-center justify-center rounded-lg bg-[#ad4f6e] text-white shadow-md transition hover:bg-[#9c4562] ${
              sidebarCollapsed ? "px-2 py-3" : "px-3 py-2.5"
            } text-sm font-semibold`}
            aria-label="Make a Donation"
            title={sidebarCollapsed ? "Make a Donation" : "Create an account to donate"}
          >
            <Gift className={`h-5 w-5 ${sidebarCollapsed ? "" : "mr-2"}`} />
            <span className={sidebarCollapsed ? "hidden" : ""}>Make a Donation</span>
          </button>
        </nav>
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
                {showImpact ? (greetingName ? `Welcome back, ${greetingName}` : "Welcome back") : showHistory ? "Giving History" : "Settings"}
              </h1>
              {showImpact ? (
                <p className="mt-0.5 text-sm italic text-muted-foreground">
                  Thank you for your ongoing commitment to our mission.
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  title={displayName ?? userEmail ?? "Signed-in user"}
                  aria-label={displayName ? `Signed in as ${displayName}` : "Signed-in user"}
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl">
                {role === "admin" ? (
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Return to admin view
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => onSelectTab("settings")} className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    navigate("/login");
                  }}
                  className="flex items-center gap-2 text-destructive hover:text-black focus:text-black"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {showHistory ? (
            <DonorGivingHistory onOpenDonationForm={() => setDonationModalOpen(true)} />
          ) : showSettings ? (
            <DonorSettings />
          ) : (
            <>
              <motion.div
                custom={0}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="mb-8 rounded-2xl bg-gradient-to-br from-card via-card to-muted/25 p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-heading text-lg font-semibold text-foreground">Donation Summary</h3>
                    <p className="mt-1 text-sm text-muted-foreground">A quick snapshot of your giving impact.</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setVolunteerModalOpen(true)}
                      className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40"
                    >
                      Log service
                    </button>
                    <button
                      type="button"
                      onClick={() => setInKindModalOpen(true)}
                      className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40"
                    >
                      Log in-kind gift
                    </button>
                    <button
                      type="button"
                      onClick={() => setDonationModalOpen(true)}
                      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
                    >
                      Give money
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 items-stretch">
                  {[
                    {
                      label: "Total Impact",
                      value: userEmail && data ? formatUsd(totalEstimatedImpact) : "—",
                      icon: Heart,
                      tone: "bg-[#9B7FC0]",
                      iconTone: "bg-white/20 text-white",
                    },
                    {
                      label: "Giving Frequency",
                      value: userEmail && data ? `${donationCount}` : "—",
                      icon: History,
                      tone: "bg-[#5A8FA0]",
                      iconTone: "bg-white/20 text-white",
                    },
                  ].map((kpi) => (
                    <div key={kpi.label} className={`rounded-2xl ${kpi.tone} py-3 px-4 shadow-sm`}>
                      <div className={`mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg ${kpi.iconTone}`}>
                        <kpi.icon className="h-4 w-4" />
                      </div>
                      <p className="text-xl font-bold leading-tight text-white">{kpi.value}</p>
                      <p className="mt-0.5 text-xs text-white/85">{kpi.label}</p>
                    </div>
                  ))}
                  <div className="rounded-2xl bg-[#4A7A52] py-3 px-4 shadow-sm">
                    <div className="mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white">
                      <Clock className="h-4 w-4" />
                    </div>
                    <p className="text-xl font-bold leading-tight text-white">
                      {serviceHours} {serviceHours === 1 ? "Hour" : "Hours"}
                    </p>
                    <p className="mt-0.5 text-xs text-white/85">Volunteer service</p>
                  </div>
                  <div className="rounded-2xl bg-[#C17A3A] py-3 px-4 shadow-sm">
                    <div className="mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white">
                      <Gift className="h-4 w-4" />
                    </div>
                    <p className="text-lg font-bold leading-tight text-white sm:text-xl">
                      {inKindDonations.length} Batches · {formatUsd(inKindTotalValue)}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/85">
                      <span>In-kind contributions</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex shrink-0 items-center justify-center rounded-full text-white/85 hover:text-white transition-colors"
                            aria-label="How in-kind contributions are counted"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs">
                          Reflects the total count of donation batches and their estimated fair market value. (e.g., One bulk food drop-off is counted as 1 donation batch).
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                {pendingNonCash.length > 0 ? (
                  <div className="mt-6 rounded-2xl bg-amber-500/10 p-4">
                    <p className="text-sm font-semibold text-foreground">Pending staff review</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      These service or in-kind submissions are recorded but not yet confirmed. They do not count toward impact totals until
                      approved.
                    </p>
                    <ul className="mt-3 space-y-2 text-sm">
                      {pendingNonCash.map((d) => (
                        <li key={d.donation_id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0">
                          <span className="font-medium text-foreground">
                            {(d.donation_type ?? "Gift").trim()}
                            {d.goods_receipt_status === "not_received" ? (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">· not yet received</span>
                            ) : null}
                          </span>
                          <button
                            type="button"
                            className="text-xs font-semibold text-primary hover:underline"
                            onClick={() => {
                              setSelectedDonation(d);
                              setDetailsOpen(true);
                            }}
                          >
                            View details
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </motion.div>

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
                  <div className="h-full flex flex-col rounded-2xl bg-white p-6 shadow-warm">
                    <div className="relative overflow-hidden rounded-2xl bg-muted/15 flex-1 min-h-[320px]">
                      <img
                        src={safehouseImage}
                        alt="Safehouse placeholder"
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/15 to-transparent" />
                      <div className="absolute left-4 right-4 bottom-4 sm:left-5 sm:right-5 sm:bottom-5">
                        <div className="rounded-2xl bg-white/95 p-5 shadow-sm backdrop-blur-sm">
                          <p className="text-sm text-stone-600">Your impact</p>
                          {data.allocationRollup.hasAllocations ? (
                            <>
                              <p className="mt-1 text-lg font-semibold leading-snug text-[#1C2B35]">
                                Here is how your confirmed gifts have been allocated so far.
                              </p>
                              {data.allocationRollup.safehouses.length > 0 ? (
                                <div className="mt-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Safehouses</p>
                                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-sm leading-relaxed text-stone-700">
                                    {data.allocationRollup.safehouses.map((label) => (
                                      <li key={label}>{label}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              {data.allocationRollup.programAreas.length > 0 ? (
                                <div className="mt-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Program categories</p>
                                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-sm leading-relaxed text-stone-700">
                                    {data.allocationRollup.programAreas.map((area) => (
                                      <li key={area}>{area}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <p className="mt-1 text-lg font-semibold leading-snug text-[#1C2B35]">
                              Thank you for your generosity. Your support helps keep safe housing, education, and healing care
                              available for girls on the path to recovery. When your gifts are allocated to specific homes and
                              categories, those details will appear here.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="h-full flex flex-col">
                    {/* Recent Donations (match AdminDashboard table formatting) */}
                    <div className="h-full flex flex-col rounded-2xl bg-white p-6 shadow-warm">
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
                              <tr
                                key={d.donation_id}
                                className={`border-b border-border/50 cursor-pointer hover:bg-muted/40 transition-colors ${
                                  i % 2 === 0 ? "bg-muted/30" : ""
                                }`}
                                onClick={() => {
                                  setSelectedDonation(d);
                                  setDetailsOpen(true);
                                }}
                              >
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

      <Dialog open={onboardingStep !== "hidden"} onOpenChange={() => {}}>
        <DialogContent
          className={onboardingStep === "info" ? "max-w-2xl [&>button]:hidden" : "max-w-lg"}
          onEscapeKeyDown={onboardingStep === "info" ? (event) => event.preventDefault() : undefined}
          onPointerDownOutside={onboardingStep === "info" ? (event) => event.preventDefault() : undefined}
        >
          {onboardingStep === "info" ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {isExistingSupporter ? "Please verify your supporter information" : "Welcome! Complete your supporter profile"}
                </DialogTitle>
                <DialogDescription>
                  {isExistingSupporter
                    ? "We found an existing supporter record for your email. Please confirm or update your details before continuing."
                    : "Please complete your supporter details before continuing to your dashboard."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">First Name *</span>
                  <input
                    value={supporterForm.first_name}
                    onChange={(e) =>
                      setSupporterForm((current) => ({ ...current, first_name: autoCapitalizeName(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="First name"
                    disabled={onboardingSaving}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Last Name *</span>
                  <input
                    value={supporterForm.last_name}
                    onChange={(e) =>
                      setSupporterForm((current) => ({ ...current, last_name: autoCapitalizeName(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Last name"
                    disabled={onboardingSaving}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Display Name (optional)</span>
                  <input
                    value={supporterForm.display_name}
                    onChange={(e) => setSupporterForm((current) => ({ ...current, display_name: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Display name"
                    disabled={onboardingSaving}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Email *</span>
                  <input
                    type="email"
                    value={supporterForm.email}
                    onChange={(e) => setSupporterForm((current) => ({ ...current, email: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="email@example.com"
                    disabled={onboardingSaving}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Supporter Type *</span>
                  <select
                    value={supporterForm.supporter_type}
                    onChange={(e) => setSupporterForm((current) => ({ ...current, supporter_type: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    disabled={onboardingSaving}
                  >
                    <option value="">Select the option that most closely matches you</option>
                    {supporterTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Relationship Type *</span>
                  <select
                    value={supporterForm.relationship_type}
                    onChange={(e) => setSupporterForm((current) => ({ ...current, relationship_type: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    disabled={onboardingSaving}
                  >
                    <option value="">Select the option that most closely matches you</option>
                    {relationshipTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Acquisition Channel *</span>
                  <select
                    value={supporterForm.acquisition_channel}
                    onChange={(e) => setSupporterForm((current) => ({ ...current, acquisition_channel: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    disabled={onboardingSaving}
                  >
                    <option value="">Select the option that most closely matches you</option>
                    {acquisitionChannelOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Phone</span>
                  <input
                    value={supporterForm.phone}
                    onChange={(e) => setSupporterForm((current) => ({ ...current, phone: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Phone number"
                    disabled={onboardingSaving}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Region</span>
                  <input
                    value={supporterForm.region}
                    onChange={(e) => setSupporterForm((current) => ({ ...current, region: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Region"
                    disabled={onboardingSaving}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Country</span>
                  <input
                    value={supporterForm.country}
                    onChange={(e) => setSupporterForm((current) => ({ ...current, country: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Country"
                    disabled={onboardingSaving}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Organization Name (optional)</span>
                  <input
                    value={supporterForm.organization_name}
                    onChange={(e) => setSupporterForm((current) => ({ ...current, organization_name: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Organization"
                    disabled={onboardingSaving}
                  />
                </label>
              </div>

              {onboardingError ? <p className="text-sm text-destructive">{onboardingError}</p> : null}

              <DialogFooter>
                <button
                  type="button"
                  onClick={saveOnboardingInfo}
                  disabled={onboardingSaving}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {onboardingSaving ? "Saving..." : "Confirm and continue"}
                </button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{isExistingSupporter ? "Make a donation" : "Make your first donation"}</DialogTitle>
                <DialogDescription>
                  Your profile is ready. You can donate now, or close this and return to it later from the dashboard.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setOnboardingStep("hidden")}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOnboardingStep("hidden");
                    setDonationModalOpen(true);
                  }}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Open donation form
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <DonationModal
        open={donationModalOpen}
        onOpenChange={setDonationModalOpen}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: donorDonationDataQueryKey(userId, userEmail) });
          await queryClient.refetchQueries({ queryKey: donorDonationDataQueryKey(userId, userEmail) });
        }}
      />

      <DonorVolunteerTimeModal
        open={volunteerModalOpen}
        onOpenChange={setVolunteerModalOpen}
        userId={userId}
        userEmail={userEmail}
        firstName={firstName}
        lastName={lastName}
        onRecorded={() => {
          void queryClient.invalidateQueries({ queryKey: donorDonationDataQueryKey(userId, userEmail) });
        }}
      />
      <DonorInKindGiftModal
        open={inKindModalOpen}
        onOpenChange={setInKindModalOpen}
        userId={userId}
        userEmail={userEmail}
        firstName={firstName}
        lastName={lastName}
        onRecorded={() => {
          void queryClient.invalidateQueries({ queryKey: donorDonationDataQueryKey(userId, userEmail) });
        }}
      />

      <DonationDetailsModal
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedDonation(null);
        }}
        donation={selectedDonation}
      />
    </div>
  );
};

export default DonorDashboard;

