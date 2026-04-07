import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft, ChevronRight, HandCoins, Pencil, Trash2, Users } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Supporter = {
  supporter_id: number;
  supporter_type: string | null;
  display_name: string | null;
  organization_name: string | null;
  first_name: string | null;
  last_name: string | null;
  relationship_type: string | null;
  region: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  first_donation_date: string | null;
  acquisition_channel: string | null;
  created_at: string | null;
};

type Donation = {
  donation_id: number;
  supporter_id: number | null;
  donation_type: string | null;
  donation_date: string | null;
  is_recurring: boolean | null;
  campaign_name: string | null;
  channel_source: string | null;
  currency_code: string | null;
  amount: number | string | null;
  estimated_value: number | string | null;
  impact_unit: string | null;
  notes: string | null;
  referral_post_id: number | string | null;
  supporters?: {
    display_name?: string | null;
    organization_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

type ViewMode = "supporters" | "donations";

const isLocalHost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (isLocalHost ? "http://localhost:5250" : "");

function getSupporterName(supporter: Supporter) {
  const display = supporter.display_name?.trim();
  if (display) return display;

  const org = supporter.organization_name?.trim();
  if (org) return org;

  const fullName = [supporter.first_name, supporter.last_name].filter(Boolean).join(" ").trim();
  return fullName || "Unknown";
}

async function fetchSupporters(): Promise<Supporter[]> {
  const endpoint = apiBaseUrl ? `${apiBaseUrl}/api/supporters` : "/api/supporters";
  const response = await fetch(endpoint);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to load supporters from the backend.");
  }

  return response.json();
}

async function fetchDonations(): Promise<Donation[]> {
  const endpoint = apiBaseUrl ? `${apiBaseUrl}/api/donations` : "/api/donations";
  const response = await fetch(endpoint);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to load donations from the backend.");
  }

  return response.json();
}

async function fetchSupporterDonations(supporterId: number): Promise<Donation[]> {
  const endpoint = apiBaseUrl
    ? `${apiBaseUrl}/api/donations?supporterId=${supporterId}`
    : `/api/donations?supporterId=${supporterId}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to load this supporter's donations.");
  }

  return response.json();
}

async function updateSupporter(
  supporterId: number,
  updates: Record<string, string | null>,
): Promise<Supporter> {
  const endpoint = apiBaseUrl ? `${apiBaseUrl}/api/supporters/${supporterId}` : `/api/supporters/${supporterId}`;
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to update supporter.");
  }

  return response.json();
}

async function deleteSupporter(supporterId: number): Promise<void> {
  const endpoint = apiBaseUrl ? `${apiBaseUrl}/api/supporters/${supporterId}` : `/api/supporters/${supporterId}`;
  const response = await fetch(endpoint, { method: "DELETE" });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to delete supporter.");
  }
}

async function updateDonation(
  donationId: number,
  updates: Record<string, string | number | boolean | null>,
): Promise<Donation> {
  const endpoint = apiBaseUrl ? `${apiBaseUrl}/api/donations/${donationId}` : `/api/donations/${donationId}`;
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to update donation.");
  }

  return response.json();
}

async function deleteDonation(donationId: number): Promise<void> {
  const endpoint = apiBaseUrl ? `${apiBaseUrl}/api/donations/${donationId}` : `/api/donations/${donationId}`;
  const response = await fetch(endpoint, { method: "DELETE" });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to delete donation.");
  }
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function formatCurrency(value: number | string | null | undefined, code = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function getDonationSupporterName(donation: Donation) {
  const display = donation.supporters?.display_name?.trim();
  if (display) return display;
  const org = donation.supporters?.organization_name?.trim();
  if (org) return org;
  const full = [donation.supporters?.first_name, donation.supporters?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return full || (donation.supporter_id != null ? `Supporter #${donation.supporter_id}` : "Unknown");
}

const AdminDonors = () => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("supporters");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [donationFiltersOpen, setDonationFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [donationSearchTerm, setDonationSearchTerm] = useState("");
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [relationshipFilters, setRelationshipFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [regionFilters, setRegionFilters] = useState<string[]>([]);
  const [countryFilters, setCountryFilters] = useState<string[]>([]);
  const [donationTypeFilters, setDonationTypeFilters] = useState<string[]>([]);
  const [donationRecurringFilters, setDonationRecurringFilters] = useState<string[]>([]);
  const [donationCampaignFilters, setDonationCampaignFilters] = useState<string[]>([]);
  const [donationChannelFilters, setDonationChannelFilters] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(50);
  const [supportersPage, setSupportersPage] = useState(1);
  const [donationsPage, setDonationsPage] = useState(1);
  const [selectedSupporter, setSelectedSupporter] = useState<Supporter | null>(null);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [isDonationEditMode, setIsDonationEditMode] = useState(false);
  const [donationEditValues, setDonationEditValues] = useState<Record<string, string>>({});

  const supportersQuery = useQuery({
    queryKey: ["supporters"],
    queryFn: fetchSupporters,
    enabled: viewMode === "supporters",
  });

  const donationsQuery = useQuery({
    queryKey: ["donations"],
    queryFn: fetchDonations,
    enabled: viewMode === "donations",
  });

  const supporterDonationsQuery = useQuery({
    queryKey: ["supporter-donations", selectedSupporter?.supporter_id],
    queryFn: async () => fetchSupporterDonations(selectedSupporter!.supporter_id),
    enabled: selectedSupporter != null,
  });

  const saveSupporterMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSupporter) throw new Error("No supporter selected.");
      const payload = Object.fromEntries(
        Object.entries(editValues).map(([key, value]) => [key, value.trim() === "" ? null : value]),
      );
      return updateSupporter(selectedSupporter.supporter_id, payload);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["supporters"] });
      setSelectedSupporter(updated);
      setIsEditMode(false);
    },
  });

  const deleteSupporterMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSupporter) throw new Error("No supporter selected.");
      await deleteSupporter(selectedSupporter.supporter_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supporters"] });
      setSelectedSupporter(null);
      setIsEditMode(false);
    },
  });

  const saveDonationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDonation) throw new Error("No donation selected.");
      const payload: Record<string, string | number | boolean | null> = {};

      Object.entries(donationEditValues).forEach(([key, raw]) => {
        const value = raw.trim();
        if (value === "") {
          payload[key] = null;
          return;
        }

        if (key === "is_recurring") {
          payload[key] = value.toLowerCase() === "true";
          return;
        }

        if (key === "supporter_id" || key === "amount" || key === "estimated_value" || key === "referral_post_id") {
          const parsed = Number(value);
          payload[key] = Number.isFinite(parsed) ? parsed : null;
          return;
        }

        payload[key] = value;
      });

      return updateDonation(selectedDonation.donation_id, payload);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      queryClient.invalidateQueries({ queryKey: ["supporter-donations"] });
      setSelectedDonation(updated);
      setIsDonationEditMode(false);
    },
  });

  const deleteDonationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDonation) throw new Error("No donation selected.");
      await deleteDonation(selectedDonation.donation_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      queryClient.invalidateQueries({ queryKey: ["supporter-donations"] });
      setSelectedDonation(null);
      setIsDonationEditMode(false);
    },
  });

  useEffect(() => {
    if (!selectedSupporter) {
      setEditValues({});
      setIsEditMode(false);
      return;
    }

    setEditValues({
      supporter_type: selectedSupporter.supporter_type ?? "",
      display_name: selectedSupporter.display_name ?? "",
      organization_name: selectedSupporter.organization_name ?? "",
      first_name: selectedSupporter.first_name ?? "",
      last_name: selectedSupporter.last_name ?? "",
      relationship_type: selectedSupporter.relationship_type ?? "",
      region: selectedSupporter.region ?? "",
      country: selectedSupporter.country ?? "",
      email: selectedSupporter.email ?? "",
      phone: selectedSupporter.phone ?? "",
      status: selectedSupporter.status ?? "",
      first_donation_date: selectedSupporter.first_donation_date ?? "",
      acquisition_channel: selectedSupporter.acquisition_channel ?? "",
      created_at: selectedSupporter.created_at ?? "",
    });
  }, [selectedSupporter]);

  useEffect(() => {
    if (!selectedDonation) {
      setDonationEditValues({});
      setIsDonationEditMode(false);
      return;
    }

    setDonationEditValues({
      supporter_id: selectedDonation.supporter_id?.toString() ?? "",
      donation_type: selectedDonation.donation_type ?? "",
      donation_date: selectedDonation.donation_date ?? "",
      is_recurring: selectedDonation.is_recurring == null ? "" : String(selectedDonation.is_recurring),
      campaign_name: selectedDonation.campaign_name ?? "",
      channel_source: selectedDonation.channel_source ?? "",
      currency_code: selectedDonation.currency_code ?? "",
      amount: selectedDonation.amount?.toString() ?? "",
      estimated_value: selectedDonation.estimated_value?.toString() ?? "",
      impact_unit: selectedDonation.impact_unit ?? "",
      notes: selectedDonation.notes ?? "",
      referral_post_id: selectedDonation.referral_post_id?.toString() ?? "",
    });
  }, [selectedDonation]);

  const totalDonated = useMemo(() => {
    if (!donationsQuery.data) return 0;
    return donationsQuery.data.reduce((sum, donation) => {
      if (donation.donation_type === "Monetary") return sum + toNumber(donation.amount);
      return sum + toNumber(donation.estimated_value);
    }, 0);
  }, [donationsQuery.data]);

  const isLoading = viewMode === "supporters" ? supportersQuery.isLoading : donationsQuery.isLoading;
  const error = viewMode === "supporters" ? supportersQuery.error : donationsQuery.error;

  const supporterFilterOptions = useMemo(() => {
    const supporters = supportersQuery.data ?? [];
    const unique = (values: (string | null | undefined)[]) =>
      Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim())))).sort();

    return {
      types: unique(supporters.map((s) => s.supporter_type)),
      relationships: unique(supporters.map((s) => s.relationship_type)),
      statuses: unique(supporters.map((s) => s.status)),
      regions: unique(supporters.map((s) => s.region)),
      countries: unique(supporters.map((s) => s.country)),
    };
  }, [supportersQuery.data]);

  const donationFilterOptions = useMemo(() => {
    const donations = donationsQuery.data ?? [];
    const unique = (values: (string | null | undefined)[]) =>
      Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim())))).sort();

    return {
      types: unique(donations.map((d) => d.donation_type)),
      recurring: ["true", "false"],
      campaigns: unique(donations.map((d) => d.campaign_name)),
      channels: unique(donations.map((d) => d.channel_source)),
    };
  }, [donationsQuery.data]);

  const filteredSupporters = useMemo(() => {
    const supporters = supportersQuery.data ?? [];
    const q = searchTerm.trim().toLowerCase();

    return supporters.filter((supporter) => {
      const supporterType = supporter.supporter_type ?? "";
      const relationship = supporter.relationship_type ?? "";
      const status = supporter.status ?? "";
      const regionValue = supporter.region ?? "";
      const countryValue = supporter.country ?? "";

      if (typeFilters.length > 0 && !typeFilters.includes(supporterType)) return false;
      if (relationshipFilters.length > 0 && !relationshipFilters.includes(relationship)) return false;
      if (statusFilters.length > 0 && !statusFilters.includes(status)) return false;
      if (regionFilters.length > 0 && !regionFilters.includes(regionValue)) return false;
      if (countryFilters.length > 0 && !countryFilters.includes(countryValue)) return false;

      if (!q) return true;

      const name = getSupporterName(supporter).toLowerCase();
      const email = (supporter.email ?? "").toLowerCase();
      const phone = (supporter.phone ?? "").toLowerCase();
      const region = (supporter.region ?? "").toLowerCase();
      const country = (supporter.country ?? "").toLowerCase();
      const supporterId = String(supporter.supporter_id);

      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        region.includes(q) ||
        country.includes(q) ||
        supporterId.includes(q)
      );
    });
  }, [supportersQuery.data, searchTerm, typeFilters, relationshipFilters, statusFilters, regionFilters, countryFilters]);

  const supporterPageCount = Math.max(1, Math.ceil(filteredSupporters.length / pageSize));
  const safeSupportersPage = Math.min(supportersPage, supporterPageCount);
  const pagedSupporters = useMemo(() => {
    const start = (safeSupportersPage - 1) * pageSize;
    return filteredSupporters.slice(start, start + pageSize);
  }, [filteredSupporters, safeSupportersPage, pageSize]);

  const filteredDonations = useMemo(() => {
    const donations = donationsQuery.data ?? [];
    const q = donationSearchTerm.trim().toLowerCase();

    return donations.filter((donation) => {
      const donationType = donation.donation_type ?? "";
      const recurring = donation.is_recurring == null ? "" : String(donation.is_recurring);
      const campaign = donation.campaign_name ?? "";
      const channel = donation.channel_source ?? "";

      if (donationTypeFilters.length > 0 && !donationTypeFilters.includes(donationType)) return false;
      if (donationRecurringFilters.length > 0 && !donationRecurringFilters.includes(recurring)) return false;
      if (donationCampaignFilters.length > 0 && !donationCampaignFilters.includes(campaign)) return false;
      if (donationChannelFilters.length > 0 && !donationChannelFilters.includes(channel)) return false;

      if (!q) return true;

      return (
        getDonationSupporterName(donation).toLowerCase().includes(q) ||
        donationType.toLowerCase().includes(q) ||
        campaign.toLowerCase().includes(q) ||
        channel.toLowerCase().includes(q) ||
        (donation.donation_date ?? "").toLowerCase().includes(q) ||
        String(donation.donation_id).includes(q)
      );
    });
  }, [
    donationsQuery.data,
    donationSearchTerm,
    donationTypeFilters,
    donationRecurringFilters,
    donationCampaignFilters,
    donationChannelFilters,
  ]);

  const donationsPageCount = Math.max(1, Math.ceil(filteredDonations.length / pageSize));
  const safeDonationsPage = Math.min(donationsPage, donationsPageCount);
  const pagedDonations = useMemo(() => {
    const start = (safeDonationsPage - 1) * pageSize;
    return filteredDonations.slice(start, start + pageSize);
  }, [filteredDonations, safeDonationsPage, pageSize]);

  const toggleFilterValue = (
    value: string,
    setValue: Dispatch<SetStateAction<string[]>>,
  ) => {
    setValue((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const supporterDetailFields: Array<{ label: string; value: string | number | null | undefined }> =
    selectedSupporter
      ? [
          { label: "supporter_id", value: selectedSupporter.supporter_id },
          { label: "supporter_type", value: selectedSupporter.supporter_type },
          { label: "display_name", value: selectedSupporter.display_name },
          { label: "organization_name", value: selectedSupporter.organization_name },
          { label: "first_name", value: selectedSupporter.first_name },
          { label: "last_name", value: selectedSupporter.last_name },
          { label: "relationship_type", value: selectedSupporter.relationship_type },
          { label: "region", value: selectedSupporter.region },
          { label: "country", value: selectedSupporter.country },
          { label: "email", value: selectedSupporter.email },
          { label: "phone", value: selectedSupporter.phone },
          { label: "status", value: selectedSupporter.status },
          { label: "first_donation_date", value: selectedSupporter.first_donation_date },
          { label: "acquisition_channel", value: selectedSupporter.acquisition_channel },
          { label: "created_at", value: selectedSupporter.created_at },
        ]
      : [];

  const editableSupporterFields: Array<{ key: keyof Supporter; label: string; readOnly?: boolean }> = [
    { key: "supporter_type", label: "supporter_type" },
    { key: "display_name", label: "display_name" },
    { key: "organization_name", label: "organization_name" },
    { key: "first_name", label: "first_name" },
    { key: "last_name", label: "last_name" },
    { key: "relationship_type", label: "relationship_type" },
    { key: "region", label: "region" },
    { key: "country", label: "country" },
    { key: "email", label: "email" },
    { key: "phone", label: "phone" },
    { key: "status", label: "status" },
    { key: "first_donation_date", label: "first_donation_date" },
    { key: "acquisition_channel", label: "acquisition_channel" },
    { key: "created_at", label: "created_at" },
  ];

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedSupporter || !isEditMode) return false;

    return editableSupporterFields.some((field) => {
      const original = (selectedSupporter[field.key] ?? "").toString();
      const current = (editValues[field.key] ?? "").toString();
      return original !== current;
    });
  }, [selectedSupporter, isEditMode, editableSupporterFields, editValues]);

  const closeSupporterDetailView = () => {
    if (isEditMode && hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave without saving?",
      );
      if (!confirmed) return;
    }

    setSelectedSupporter(null);
    setIsEditMode(false);
  };

  const donationDetailFields: Array<{ label: string; value: string | number | boolean | null | undefined }> =
    selectedDonation
      ? [
          { label: "donation_id", value: selectedDonation.donation_id },
          { label: "supporter", value: getDonationSupporterName(selectedDonation) },
          { label: "supporter_id", value: selectedDonation.supporter_id },
          { label: "donation_type", value: selectedDonation.donation_type },
          { label: "donation_date", value: selectedDonation.donation_date },
          { label: "is_recurring", value: selectedDonation.is_recurring },
          { label: "campaign_name", value: selectedDonation.campaign_name },
          { label: "channel_source", value: selectedDonation.channel_source },
          { label: "currency_code", value: selectedDonation.currency_code },
          { label: "amount", value: selectedDonation.amount },
          { label: "estimated_value", value: selectedDonation.estimated_value },
          { label: "impact_unit", value: selectedDonation.impact_unit },
          { label: "notes", value: selectedDonation.notes },
          { label: "referral_post_id", value: selectedDonation.referral_post_id },
        ]
      : [];

  const editableDonationFields: Array<{ key: keyof Donation; label: string }> = [
    { key: "supporter_id", label: "supporter_id" },
    { key: "donation_type", label: "donation_type" },
    { key: "donation_date", label: "donation_date" },
    { key: "is_recurring", label: "is_recurring (true/false)" },
    { key: "campaign_name", label: "campaign_name" },
    { key: "channel_source", label: "channel_source" },
    { key: "currency_code", label: "currency_code" },
    { key: "amount", label: "amount" },
    { key: "estimated_value", label: "estimated_value" },
    { key: "impact_unit", label: "impact_unit" },
    { key: "notes", label: "notes" },
    { key: "referral_post_id", label: "referral_post_id" },
  ];

  const hasDonationUnsavedChanges = useMemo(() => {
    if (!selectedDonation || !isDonationEditMode) return false;

    return editableDonationFields.some((field) => {
      const original = (selectedDonation[field.key] ?? "").toString();
      const current = (donationEditValues[field.key] ?? "").toString();
      return original !== current;
    });
  }, [selectedDonation, isDonationEditMode, editableDonationFields, donationEditValues]);

  const closeDonationDetailView = () => {
    if (isDonationEditMode && hasDonationUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave without saving?",
      );
      if (!confirmed) return;
    }

    setSelectedDonation(null);
    setIsDonationEditMode(false);
  };

  return (
    <AdminLayout
      title="Donors & Contributions"
      subtitle="Browse supporters and donations from Supabase through the backend API"
    >
      <div className="space-y-6">
        <div className="rounded-2xl bg-card p-6 shadow-warm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2">
                {viewMode === "supporters" ? (
                  <Users className="h-5 w-5 text-primary" />
                ) : (
                  <HandCoins className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  {viewMode === "supporters" ? "Supporters" : "Total Donations"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {viewMode === "supporters"
                    ? "Browse all supporters currently stored in the database."
                    : "Browse all donations currently stored in the donations table."}
                </p>
              </div>
            </div>

            <div className="inline-flex rounded-xl border border-border bg-background p-1">
              <button
                onClick={() => setViewMode("supporters")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "supporters"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Supporters
              </button>
              <button
                onClick={() => setViewMode("donations")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "donations"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Total Donations
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl bg-card p-6 shadow-warm">
            <p className="text-sm text-muted-foreground">
              {viewMode === "supporters" ? "Loading supporters..." : "Loading donations..."}
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-warm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <p className="font-semibold text-foreground">
                  {viewMode === "supporters"
                    ? "Unable to load supporters right now."
                    : "Unable to load donations right now."}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{(error as Error).message}</p>
              </div>
            </div>
          </div>
        ) : null}

        {viewMode === "supporters" && supportersQuery.data ? (
          selectedSupporter ? (
            <div className="space-y-6">
              <div className="rounded-2xl bg-card shadow-warm">
                <div className="border-b border-border bg-muted/40 px-6 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-heading text-2xl text-foreground">{getSupporterName(selectedSupporter)}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={closeSupporterDetailView}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back to supporters
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!isEditMode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditMode(true)}
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Are you sure you want to delete supporter #${selectedSupporter.supporter_id}?`,
                            );
                            if (!confirmed) return;
                            deleteSupporterMutation.mutate();
                          }}
                          disabled={deleteSupporterMutation.isPending}
                          className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          {deleteSupporterMutation.isPending ? "Deleting..." : "Delete"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (hasUnsavedChanges) {
                              const confirmed = window.confirm(
                                "You have unsaved changes. Cancel editing and discard them?",
                              );
                              if (!confirmed) return;
                            }
                            setIsEditMode(false);
                            if (selectedSupporter) {
                              setEditValues({
                                supporter_type: selectedSupporter.supporter_type ?? "",
                                display_name: selectedSupporter.display_name ?? "",
                                organization_name: selectedSupporter.organization_name ?? "",
                                first_name: selectedSupporter.first_name ?? "",
                                last_name: selectedSupporter.last_name ?? "",
                                relationship_type: selectedSupporter.relationship_type ?? "",
                                region: selectedSupporter.region ?? "",
                                country: selectedSupporter.country ?? "",
                                email: selectedSupporter.email ?? "",
                                phone: selectedSupporter.phone ?? "",
                                status: selectedSupporter.status ?? "",
                                first_donation_date: selectedSupporter.first_donation_date ?? "",
                                acquisition_channel: selectedSupporter.acquisition_channel ?? "",
                                created_at: selectedSupporter.created_at ?? "",
                              });
                            }
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveSupporterMutation.mutate()}
                          disabled={saveSupporterMutation.isPending}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                          {saveSupporterMutation.isPending ? "Saving..." : "Save"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {(saveSupporterMutation.error || deleteSupporterMutation.error) && (
                    <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                      {(
                        (saveSupporterMutation.error as Error | null)?.message ??
                        (deleteSupporterMutation.error as Error | null)?.message
                      ) || "Request failed."}
                    </div>
                  )}

                  <div className={`grid gap-3 sm:grid-cols-2 ${isEditMode ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">supporter_id</p>
                      <p className="mt-1 text-sm text-foreground">{selectedSupporter.supporter_id}</p>
                    </div>

                    {(isEditMode ? editableSupporterFields : supporterDetailFields.filter((f) => f.label !== "supporter_id")).map(
                      (field) => (
                        <div key={field.label} className="rounded-xl border border-border bg-muted/20 p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</p>
                          {isEditMode && "key" in field ? (
                            <input
                              type="text"
                              value={editValues[field.key] ?? ""}
                              onChange={(e) =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                              className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                            />
                          ) : (
                            <p className="mt-1 text-sm text-foreground">{("value" in field ? field.value : "") ?? "-"}</p>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-card p-6 shadow-warm">
                <h4 className="font-heading text-xl text-foreground">Donations by {getSupporterName(selectedSupporter)}</h4>

                {supporterDonationsQuery.isLoading ? (
                  <div className="mt-4 text-sm text-muted-foreground">Loading donations...</div>
                ) : null}

                {supporterDonationsQuery.error ? (
                  <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {(supporterDonationsQuery.error as Error).message}
                  </div>
                ) : null}

                {supporterDonationsQuery.data ? (
                  <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Channel</TableHead>
                          <TableHead>Recurring</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Estimated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supporterDonationsQuery.data.map((donation) => (
                          <TableRow key={donation.donation_id}>
                            <TableCell>{donation.donation_date ?? "-"}</TableCell>
                            <TableCell>{donation.donation_type ?? "-"}</TableCell>
                            <TableCell>{donation.campaign_name ?? "-"}</TableCell>
                            <TableCell>{donation.channel_source ?? "-"}</TableCell>
                            <TableCell>{donation.is_recurring ? "Yes" : "No"}</TableCell>
                            <TableCell>
                              {donation.amount == null ? "-" : formatCurrency(donation.amount, donation.currency_code ?? "PHP")}
                            </TableCell>
                            <TableCell>
                              {donation.estimated_value == null
                                ? "-"
                                : formatCurrency(donation.estimated_value, donation.currency_code ?? "PHP")}
                            </TableCell>
                          </TableRow>
                        ))}
                        {supporterDonationsQuery.data.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              No donations found for this supporter.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-card p-4 shadow-warm md:p-6">
              <div className="mb-4 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-foreground">Filters</span>
                  <span className="text-xs text-muted-foreground">{filtersOpen ? "Hide" : "Show"}</span>
                </button>

                {filtersOpen ? (
                  <div className="border-t border-border p-4">
                    <div className="mb-4 grid gap-3 md:grid-cols-2">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search name, email, phone, ID..."
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setTypeFilters([]);
                          setRelationshipFilters([]);
                          setStatusFilters([]);
                          setRegionFilters([]);
                          setCountryFilters([]);
                        }}
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                      >
                        Clear filters
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-5">
                      <div className="rounded-lg border border-border p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={typeFilters.length === 0}
                              onChange={() => setTypeFilters([])}
                            />
                            <span>All types</span>
                          </label>
                          {supporterFilterOptions.types.map((type) => (
                            <label key={type} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={typeFilters.includes(type)}
                                onChange={() => toggleFilterValue(type, setTypeFilters)}
                              />
                              <span>{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Relationship
                        </p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={relationshipFilters.length === 0}
                              onChange={() => setRelationshipFilters([])}
                            />
                            <span>All relationships</span>
                          </label>
                          {supporterFilterOptions.relationships.map((relationship) => (
                            <label key={relationship} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={relationshipFilters.includes(relationship)}
                                onChange={() => toggleFilterValue(relationship, setRelationshipFilters)}
                              />
                              <span>{relationship}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={statusFilters.length === 0}
                              onChange={() => setStatusFilters([])}
                            />
                            <span>All statuses</span>
                          </label>
                          {supporterFilterOptions.statuses.map((status) => (
                            <label key={status} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={statusFilters.includes(status)}
                                onChange={() => toggleFilterValue(status, setStatusFilters)}
                              />
                              <span>{status}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Region</p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={regionFilters.length === 0}
                              onChange={() => setRegionFilters([])}
                            />
                            <span>All regions</span>
                          </label>
                          {supporterFilterOptions.regions.map((region) => (
                            <label key={region} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={regionFilters.includes(region)}
                                onChange={() => toggleFilterValue(region, setRegionFilters)}
                              />
                              <span>{region}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Country</p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={countryFilters.length === 0}
                              onChange={() => setCountryFilters([])}
                            />
                            <span>All countries</span>
                          </label>
                          {supporterFilterOptions.countries.map((country) => (
                            <label key={country} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={countryFilters.includes(country)}
                                onChange={() => toggleFilterValue(country, setCountryFilters)}
                              />
                              <span>{country}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mb-3 text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">{filteredSupporters.length}</span> of{" "}
                <span className="font-semibold text-foreground">{supportersQuery.data.length}</span> supporters
              </div>

              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setSupportersPage(1);
                    }}
                    className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={75}>75</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSupportersPage((p) => Math.max(1, p - 1))}
                    disabled={safeSupportersPage <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {safeSupportersPage} of {supporterPageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSupportersPage((p) => Math.min(supporterPageCount, p + 1))}
                    disabled={safeSupportersPage >= supporterPageCount}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type of Contributor</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedSupporters.map((supporter) => (
                    <TableRow
                      key={supporter.supporter_id}
                      className="cursor-pointer"
                      onClick={() => setSelectedSupporter(supporter)}
                    >
                      <TableCell className="font-medium">{getSupporterName(supporter)}</TableCell>
                      <TableCell>{supporter.supporter_type ?? "-"}</TableCell>
                      <TableCell>{supporter.region ?? "-"}</TableCell>
                      <TableCell>{supporter.country ?? "-"}</TableCell>
                      <TableCell>{supporter.status ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                  {pagedSupporters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No supporters match the current search and filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>

              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSupportersPage((p) => Math.max(1, p - 1))}
                  disabled={safeSupportersPage <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {safeSupportersPage} of {supporterPageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setSupportersPage((p) => Math.min(supporterPageCount, p + 1))}
                  disabled={safeSupportersPage >= supporterPageCount}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        ) : null}

        {viewMode === "donations" && donationsQuery.data ? (
          selectedDonation ? (
            <div className="space-y-6">
              <div className="rounded-2xl bg-card shadow-warm">
                <div className="border-b border-border bg-muted/40 px-6 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="font-heading text-2xl text-foreground">
                      Donation #{selectedDonation.donation_id}
                    </h3>
                    <button
                      type="button"
                      onClick={closeDonationDetailView}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back to donations
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!isDonationEditMode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsDonationEditMode(true)}
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Are you sure you want to delete donation #${selectedDonation.donation_id}?`,
                            );
                            if (!confirmed) return;
                            deleteDonationMutation.mutate();
                          }}
                          disabled={deleteDonationMutation.isPending}
                          className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          {deleteDonationMutation.isPending ? "Deleting..." : "Delete"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (hasDonationUnsavedChanges) {
                              const confirmed = window.confirm(
                                "You have unsaved changes. Cancel editing and discard them?",
                              );
                              if (!confirmed) return;
                            }
                            setIsDonationEditMode(false);
                            if (selectedDonation) {
                              setDonationEditValues({
                                supporter_id: selectedDonation.supporter_id?.toString() ?? "",
                                donation_type: selectedDonation.donation_type ?? "",
                                donation_date: selectedDonation.donation_date ?? "",
                                is_recurring: selectedDonation.is_recurring == null ? "" : String(selectedDonation.is_recurring),
                                campaign_name: selectedDonation.campaign_name ?? "",
                                channel_source: selectedDonation.channel_source ?? "",
                                currency_code: selectedDonation.currency_code ?? "",
                                amount: selectedDonation.amount?.toString() ?? "",
                                estimated_value: selectedDonation.estimated_value?.toString() ?? "",
                                impact_unit: selectedDonation.impact_unit ?? "",
                                notes: selectedDonation.notes ?? "",
                                referral_post_id: selectedDonation.referral_post_id?.toString() ?? "",
                              });
                            }
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveDonationMutation.mutate()}
                          disabled={saveDonationMutation.isPending}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                          {saveDonationMutation.isPending ? "Saving..." : "Save"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  {(saveDonationMutation.error || deleteDonationMutation.error) && (
                    <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                      {(
                        (saveDonationMutation.error as Error | null)?.message ??
                        (deleteDonationMutation.error as Error | null)?.message
                      ) || "Request failed."}
                    </div>
                  )}

                  <div className={`grid gap-3 sm:grid-cols-2 ${isDonationEditMode ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
                    {isDonationEditMode
                      ? editableDonationFields.map((field) => (
                          <div key={field.label} className="rounded-xl border border-border bg-muted/20 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</p>
                            <input
                              type="text"
                              value={donationEditValues[field.key] ?? ""}
                              onChange={(e) =>
                                setDonationEditValues((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                              className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                            />
                          </div>
                        ))
                      : donationDetailFields.map((field) => (
                          <div key={field.label} className="rounded-xl border border-border bg-muted/20 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</p>
                            <p className="mt-1 text-sm text-foreground">
                              {field.value == null || field.value === "" ? "-" : String(field.value)}
                            </p>
                          </div>
                        ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-card p-4 shadow-warm md:p-6">
              <div className="mb-4 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setDonationFiltersOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-foreground">Filters</span>
                  <span className="text-xs text-muted-foreground">{donationFiltersOpen ? "Hide" : "Show"}</span>
                </button>

                {donationFiltersOpen ? (
                  <div className="border-t border-border p-4">
                    <div className="mb-4 grid gap-3 md:grid-cols-2">
                      <input
                        type="text"
                        value={donationSearchTerm}
                        onChange={(e) => setDonationSearchTerm(e.target.value)}
                        placeholder="Search supporter, type, campaign, channel, date, ID..."
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setDonationSearchTerm("");
                          setDonationTypeFilters([]);
                          setDonationRecurringFilters([]);
                          setDonationCampaignFilters([]);
                          setDonationChannelFilters([]);
                        }}
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                      >
                        Clear filters
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="rounded-lg border border-border p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={donationTypeFilters.length === 0}
                              onChange={() => setDonationTypeFilters([])}
                            />
                            <span>All types</span>
                          </label>
                          {donationFilterOptions.types.map((type) => (
                            <label key={type} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={donationTypeFilters.includes(type)}
                                onChange={() => toggleFilterValue(type, setDonationTypeFilters)}
                              />
                              <span>{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recurring</p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={donationRecurringFilters.length === 0}
                              onChange={() => setDonationRecurringFilters([])}
                            />
                            <span>All recurring values</span>
                          </label>
                          {donationFilterOptions.recurring.map((value) => (
                            <label key={value} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={donationRecurringFilters.includes(value)}
                                onChange={() => toggleFilterValue(value, setDonationRecurringFilters)}
                              />
                              <span>{value === "true" ? "Yes" : "No"}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Campaign</p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={donationCampaignFilters.length === 0}
                              onChange={() => setDonationCampaignFilters([])}
                            />
                            <span>All campaigns</span>
                          </label>
                          {donationFilterOptions.campaigns.map((value) => (
                            <label key={value} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={donationCampaignFilters.includes(value)}
                                onChange={() => toggleFilterValue(value, setDonationCampaignFilters)}
                              />
                              <span>{value}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Channel</p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={donationChannelFilters.length === 0}
                              onChange={() => setDonationChannelFilters([])}
                            />
                            <span>All channels</span>
                          </label>
                          {donationFilterOptions.channels.map((value) => (
                            <label key={value} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={donationChannelFilters.includes(value)}
                                onChange={() => toggleFilterValue(value, setDonationChannelFilters)}
                              />
                              <span>{value}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <div>
                  Showing <span className="font-semibold text-foreground">{filteredDonations.length}</span> of{" "}
                  <span className="font-semibold text-foreground">{donationsQuery.data.length}</span> donations
                </div>
                <div>
                  Total donation value:{" "}
                  <span className="font-semibold text-foreground">{formatCurrency(totalDonated)}</span>
                </div>
              </div>

              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setDonationsPage(1);
                    }}
                    className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={75}>75</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDonationsPage((p) => Math.max(1, p - 1))}
                    disabled={safeDonationsPage <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {safeDonationsPage} of {donationsPageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDonationsPage((p) => Math.min(donationsPageCount, p + 1))}
                    disabled={safeDonationsPage >= donationsPageCount}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supporter</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Recurring</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Estimated Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedDonations.map((donation) => (
                    <TableRow
                      key={donation.donation_id}
                      className="cursor-pointer"
                      onClick={() => setSelectedDonation(donation)}
                    >
                      <TableCell className="font-medium">{getDonationSupporterName(donation)}</TableCell>
                      <TableCell>{donation.donation_type ?? "-"}</TableCell>
                      <TableCell>{donation.donation_date ?? "-"}</TableCell>
                      <TableCell>{donation.is_recurring ? "Yes" : "No"}</TableCell>
                      <TableCell>{donation.campaign_name ?? "-"}</TableCell>
                      <TableCell>{donation.channel_source ?? "-"}</TableCell>
                      <TableCell>
                        {donation.amount == null
                          ? "-"
                          : formatCurrency(donation.amount, donation.currency_code ?? "PHP")}
                      </TableCell>
                      <TableCell>
                        {donation.estimated_value == null
                          ? "-"
                          : formatCurrency(donation.estimated_value, donation.currency_code ?? "PHP")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {pagedDonations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No donations match the current search and filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>

              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDonationsPage((p) => Math.max(1, p - 1))}
                  disabled={safeDonationsPage <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {safeDonationsPage} of {donationsPageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setDonationsPage((p) => Math.min(donationsPageCount, p + 1))}
                  disabled={safeDonationsPage >= donationsPageCount}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        ) : null}

      </div>
    </AdminLayout>
  );
};

export default AdminDonors;

