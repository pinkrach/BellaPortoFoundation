import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft, ChevronRight, HandCoins, Pencil, Trash2, Users } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { fetchWithAuth } from "@/lib/api";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  likely_to_stop_donating?: boolean | null;
  donation_risk_reason?: string | null;
  days_since_last_donation?: number | null;
  gifts_last_365_days?: number | null;
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

type DonationAllocation = {
  allocation_id: number;
  donation_id: number | null;
  safehouse_id: number | null;
  program_area: string | null;
  amount_allocated: number | string | null;
  allocation_date: string | null;
  allocation_notes: string | null;
  safehouses?: {
    name?: string | null;
  } | null;
  donations?: {
    donation_id?: number | null;
    supporter_id?: number | null;
    donation_type?: string | null;
    donation_date?: string | null;
    supporters?: {
      display_name?: string | null;
      organization_name?: string | null;
      first_name?: string | null;
      last_name?: string | null;
    } | null;
  } | null;
};

type ViewMode = "summary" | "supporters" | "donations" | "allocations";

function getSupporterName(supporter: Supporter) {
  const display = supporter.display_name?.trim();
  if (display) return display;

  const org = supporter.organization_name?.trim();
  if (org) return org;

  const fullName = [supporter.first_name, supporter.last_name].filter(Boolean).join(" ").trim();
  return fullName || "Unknown";
}

async function fetchSupporters(): Promise<Supporter[]> {
  const response = await fetchWithAuth("/api/supporters");

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to load supporters from the backend.");
  }

  return response.json();
}

async function fetchDonations(): Promise<Donation[]> {
  const response = await fetchWithAuth("/api/donations");

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to load donations from the backend.");
  }

  return response.json();
}

async function fetchSupporterDonations(supporterId: number): Promise<Donation[]> {
  const response = await fetchWithAuth(`/api/donations?supporterId=${supporterId}`);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to load this supporter's donations.");
  }

  return response.json();
}

async function fetchDonationAllocations(donationId?: number): Promise<DonationAllocation[]> {
  const response = await fetchWithAuth(`/api/donation-allocations${donationId != null ? `?donationId=${donationId}` : ""}`);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to load donation allocations from the backend.");
  }

  return response.json();
}

async function refreshSupporterRiskScores(): Promise<{ status?: string; upserted_rows?: number }> {
  const response = await fetchWithAuth("/api/ml/supporter-risk/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to refresh supporter risk scores.");
  }

  return response.json();
}

async function updateSupporter(
  supporterId: number,
  updates: Record<string, string | null>,
): Promise<Supporter> {
  const response = await fetchWithAuth(`/api/supporters/${supporterId}`, {
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
  const response = await fetchWithAuth(`/api/supporters/${supporterId}`, { method: "DELETE" });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to delete supporter.");
  }
}

async function updateDonation(
  donationId: number,
  updates: Record<string, string | number | boolean | null>,
): Promise<Donation> {
  const response = await fetchWithAuth(`/api/donations/${donationId}`, {
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
  const response = await fetchWithAuth(`/api/donations/${donationId}`, { method: "DELETE" });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to delete donation.");
  }
}

async function updateDonationAllocation(
  allocationId: number,
  updates: Record<string, string | number | null>,
): Promise<DonationAllocation> {
  const response = await fetchWithAuth(`/api/donation-allocations/${allocationId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to update donation allocation.");
  }

  return response.json();
}

async function deleteDonationAllocation(allocationId: number): Promise<void> {
  const response = await fetchWithAuth(`/api/donation-allocations/${allocationId}`, { method: "DELETE" });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to delete donation allocation.");
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

function getAllocationSupporterName(allocation: DonationAllocation) {
  const supporter = allocation.donations?.supporters;
  const display = supporter?.display_name?.trim();
  if (display) return display;
  const org = supporter?.organization_name?.trim();
  if (org) return org;
  const full = [supporter?.first_name, supporter?.last_name].filter(Boolean).join(" ").trim();
  return full || "Unknown";
}

function formatFieldLabel(label: string) {
  return label
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

const AdminDonors = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>(
    searchParams.get("view") === "summary"
      ? "summary"
      : searchParams.get("view") === "donations"
      ? "donations"
      : searchParams.get("view") === "allocations"
        ? "allocations"
        : searchParams.get("view") === "supporters"
          ? "supporters"
          : "summary",
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [donationFiltersOpen, setDonationFiltersOpen] = useState(false);
  const [allocationFiltersOpen, setAllocationFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [donationSearchTerm, setDonationSearchTerm] = useState("");
  const [allocationSearchTerm, setAllocationSearchTerm] = useState("");
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [relationshipFilters, setRelationshipFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [regionFilters, setRegionFilters] = useState<string[]>([]);
  const [countryFilters, setCountryFilters] = useState<string[]>([]);
  const [donationTypeFilters, setDonationTypeFilters] = useState<string[]>([]);
  const [donationRecurringFilters, setDonationRecurringFilters] = useState<string[]>([]);
  const [donationCampaignFilters, setDonationCampaignFilters] = useState<string[]>([]);
  const [donationChannelFilters, setDonationChannelFilters] = useState<string[]>([]);
  const [donationAllocationFilters, setDonationAllocationFilters] = useState<string[]>([]);
  const [donationAmountMin, setDonationAmountMin] = useState("");
  const [donationAmountMax, setDonationAmountMax] = useState("");
  const [allocationProgramFilters, setAllocationProgramFilters] = useState<string[]>([]);
  const [allocationSafehouseFilters, setAllocationSafehouseFilters] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(50);
  const [supportersPage, setSupportersPage] = useState(1);
  const [donationsPage, setDonationsPage] = useState(1);
  const [allocationsPage, setAllocationsPage] = useState(1);
  const [selectedSupporter, setSelectedSupporter] = useState<Supporter | null>(null);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [selectedAllocation, setSelectedAllocation] = useState<DonationAllocation | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [isDonationEditMode, setIsDonationEditMode] = useState(false);
  const [donationEditValues, setDonationEditValues] = useState<Record<string, string>>({});
  const [isAllocationEditMode, setIsAllocationEditMode] = useState(false);
  const [allocationEditValues, setAllocationEditValues] = useState<Record<string, string>>({});

  const supportersQuery = useQuery({
    queryKey: ["supporters"],
    queryFn: fetchSupporters,
    enabled: viewMode === "supporters" || viewMode === "summary",
  });

  const donationsQuery = useQuery({
    queryKey: ["donations"],
    queryFn: fetchDonations,
    enabled: viewMode === "donations" || viewMode === "summary",
  });

  const allocationsQuery = useQuery({
    queryKey: ["donation-allocations"],
    queryFn: async () => fetchDonationAllocations(),
    enabled:
      viewMode === "allocations" ||
      viewMode === "donations" ||
      viewMode === "summary" ||
      selectedDonation != null ||
      selectedSupporter != null,
  });

  const donationAllocationsForDonationQuery = useQuery({
    queryKey: ["donation-allocations", "donation", selectedDonation?.donation_id],
    queryFn: async () => fetchDonationAllocations(selectedDonation!.donation_id),
    enabled: selectedDonation != null,
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

  const saveAllocationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAllocation) throw new Error("No allocation selected.");
      const payload: Record<string, string | number | null> = {};

      Object.entries(allocationEditValues).forEach(([key, raw]) => {
        const value = raw.trim();
        if (value === "") {
          payload[key] = null;
          return;
        }

        if (["donation_id", "safehouse_id", "amount_allocated"].includes(key)) {
          const parsed = Number(value);
          payload[key] = Number.isFinite(parsed) ? parsed : null;
          return;
        }

        payload[key] = value;
      });

      return updateDonationAllocation(selectedAllocation.allocation_id, payload);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["donation-allocations"] });
      setSelectedAllocation(updated);
      setIsAllocationEditMode(false);
    },
  });

  const deleteAllocationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAllocation) throw new Error("No allocation selected.");
      await deleteDonationAllocation(selectedAllocation.allocation_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donation-allocations"] });
      setSelectedAllocation(null);
      setIsAllocationEditMode(false);
    },
  });

  const refreshRiskMutation = useMutation({
    mutationFn: refreshSupporterRiskScores,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supporters"] });
      if (selectedSupporter) {
        queryClient.invalidateQueries({ queryKey: ["supporter-donations", selectedSupporter.supporter_id] });
      }
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

  useEffect(() => {
    if (!selectedAllocation) {
      setAllocationEditValues({});
      setIsAllocationEditMode(false);
      return;
    }

    setAllocationEditValues({
      donation_id: selectedAllocation.donation_id?.toString() ?? "",
      safehouse_id: selectedAllocation.safehouse_id?.toString() ?? "",
      program_area: selectedAllocation.program_area ?? "",
      amount_allocated: selectedAllocation.amount_allocated?.toString() ?? "",
      allocation_date: selectedAllocation.allocation_date ?? "",
      allocation_notes: selectedAllocation.allocation_notes ?? "",
    });
  }, [selectedAllocation]);

  const totalDonated = useMemo(() => {
    if (!donationsQuery.data) return 0;
    return donationsQuery.data.reduce((sum, donation) => {
      if (donation.donation_type === "Monetary") return sum + toNumber(donation.amount);
      return sum + toNumber(donation.estimated_value);
    }, 0);
  }, [donationsQuery.data]);

  const totalAllocations = useMemo(() => {
    const allocations = allocationsQuery.data ?? [];
    return allocations.reduce((sum, allocation) => sum + toNumber(allocation.amount_allocated), 0);
  }, [allocationsQuery.data]);

  const donationCategoryTotals = useMemo(() => {
    const donations = donationsQuery.data ?? [];
    return donations.reduce(
      (acc, donation) => {
        const amount =
          donation.donation_type === "Monetary" ? toNumber(donation.amount) : toNumber(donation.estimated_value);
        if (donation.donation_type === "Monetary") {
          acc.monetary += amount;
        } else {
          acc.other += amount;
        }
        return acc;
      },
      { monetary: 0, other: 0 },
    );
  }, [donationsQuery.data]);

  const recurringRate = useMemo(() => {
    const donations = donationsQuery.data ?? [];
    if (donations.length === 0) return 0;
    const recurringCount = donations.filter((donation) => donation.is_recurring === true).length;
    return (recurringCount / donations.length) * 100;
  }, [donationsQuery.data]);

  const activeSupporters = useMemo(() => {
    const supporters = supportersQuery.data ?? [];
    return supporters.filter((supporter) => (supporter.status ?? "").toLowerCase() === "active").length;
  }, [supportersQuery.data]);

  const donationTrendData = useMemo(() => {
    const donations = donationsQuery.data ?? [];
    const monthTotals = new Map<string, number>();

    donations.forEach((donation) => {
      if (!donation.donation_date) return;
      const parsed = new Date(donation.donation_date);
      if (Number.isNaN(parsed.getTime())) return;

      const monthKey = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
      const amount =
        donation.donation_type === "Monetary" ? toNumber(donation.amount) : toNumber(donation.estimated_value);
      monthTotals.set(monthKey, (monthTotals.get(monthKey) ?? 0) + amount);
    });

    return Array.from(monthTotals.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([monthKey, total]) => {
        const [year, month] = monthKey.split("-").map(Number);
        return {
          month: new Date(year, month - 1, 1).toLocaleDateString("en-PH", { month: "short" }),
          total,
        };
      });
  }, [donationsQuery.data]);

  const sourceBreakdownData = useMemo(() => {
    const supporters = supportersQuery.data ?? [];
    const grouped = supporters.reduce<Record<string, number>>((acc, supporter) => {
      const type = supporter.supporter_type?.trim() || "Unknown";
      acc[type] = (acc[type] ?? 0) + 1;
      return acc;
    }, {});

    const colors = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#14B8A6", "#EF4444"];
    const rows = Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], index) => ({ name, value, color: colors[index % colors.length] }));

    return rows.length > 0 ? rows : [{ name: "No data", value: 1, color: "#94A3B8" }];
  }, [supportersQuery.data]);

  const allocationByProgramData = useMemo(() => {
    const allocations = allocationsQuery.data ?? [];
    const grouped = allocations.reduce<Record<string, number>>((acc, allocation) => {
      const area = allocation.program_area?.trim() || "Unspecified";
      acc[area] = (acc[area] ?? 0) + toNumber(allocation.amount_allocated);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([area, amount]) => ({ area, amount }));
  }, [allocationsQuery.data]);

  const allocationByLocationData = useMemo(() => {
    const allocations = allocationsQuery.data ?? [];
    const grouped = allocations.reduce<Record<string, number>>((acc, allocation) => {
      const location =
        allocation.safehouses?.name?.trim() ||
        (allocation.safehouse_id != null ? `Safehouse #${allocation.safehouse_id}` : "Unspecified");
      acc[location] = (acc[location] ?? 0) + toNumber(allocation.amount_allocated);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([location, amount]) => ({ location, amount }));
  }, [allocationsQuery.data]);

  const isLoading =
    viewMode === "summary"
      ? supportersQuery.isLoading || donationsQuery.isLoading || allocationsQuery.isLoading
      : viewMode === "supporters"
      ? supportersQuery.isLoading
      : viewMode === "donations"
        ? donationsQuery.isLoading
        : allocationsQuery.isLoading;
  const error =
    viewMode === "summary"
      ? supportersQuery.error ?? donationsQuery.error ?? allocationsQuery.error
      : viewMode === "supporters"
      ? supportersQuery.error
      : viewMode === "donations"
        ? donationsQuery.error
        : allocationsQuery.error;

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
      allocationStatus: ["fully_allocated", "partially_allocated", "unallocated"],
    };
  }, [donationsQuery.data]);

  const allocationFilterOptions = useMemo(() => {
    const allocations = allocationsQuery.data ?? [];
    const unique = (values: (string | null | undefined)[]) =>
      Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim())))).sort();

    return {
      programs: unique(allocations.map((a) => a.program_area)),
      safehouses: unique(allocations.map((a) => a.safehouses?.name)),
    };
  }, [allocationsQuery.data]);

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

  const donationAllocationTotalsById = useMemo(() => {
    const allocations = allocationsQuery.data ?? [];
    return allocations.reduce<Map<number, number>>((acc, allocation) => {
      const donationId = allocation.donation_id;
      if (donationId == null) return acc;
      acc.set(donationId, (acc.get(donationId) ?? 0) + toNumber(allocation.amount_allocated));
      return acc;
    }, new Map<number, number>());
  }, [allocationsQuery.data]);

  const filteredDonations = useMemo(() => {
    const donations = donationsQuery.data ?? [];
    const q = donationSearchTerm.trim().toLowerCase();
    const minAmount = donationAmountMin.trim() === "" ? null : Number(donationAmountMin);
    const maxAmount = donationAmountMax.trim() === "" ? null : Number(donationAmountMax);

    return donations.filter((donation) => {
      const donationType = donation.donation_type ?? "";
      const recurring = donation.is_recurring == null ? "" : String(donation.is_recurring);
      const campaign = donation.campaign_name ?? "";
      const channel = donation.channel_source ?? "";
      const amountForFilter =
        donation.donation_type === "Monetary" ? toNumber(donation.amount) : toNumber(donation.estimated_value);
      const target = donation.donation_type === "Monetary" ? toNumber(donation.amount) : toNumber(donation.estimated_value);
      const allocated = donationAllocationTotalsById.get(donation.donation_id) ?? 0;
      const remainder = target - allocated;
      const allocationStatus =
        allocated <= 0.01
          ? "unallocated"
          : target > 0 && Math.abs(remainder) <= 0.01
            ? "fully_allocated"
            : "partially_allocated";

      if (donationTypeFilters.length > 0 && !donationTypeFilters.includes(donationType)) return false;
      if (donationRecurringFilters.length > 0 && !donationRecurringFilters.includes(recurring)) return false;
      if (donationCampaignFilters.length > 0 && !donationCampaignFilters.includes(campaign)) return false;
      if (donationChannelFilters.length > 0 && !donationChannelFilters.includes(channel)) return false;
      if (donationAllocationFilters.length > 0 && !donationAllocationFilters.includes(allocationStatus)) return false;
      if (minAmount != null && Number.isFinite(minAmount) && amountForFilter < minAmount) return false;
      if (maxAmount != null && Number.isFinite(maxAmount) && amountForFilter > maxAmount) return false;

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
    donationAllocationFilters,
    donationAmountMin,
    donationAmountMax,
    donationAllocationTotalsById,
  ]);

  const showCampaignColumn = donationCampaignFilters.length > 0;
  const showAmountColumns = donationAmountMin.trim() !== "" || donationAmountMax.trim() !== "";

  const allocatedByDonationId = useMemo(() => {
    const allocations = allocationsQuery.data ?? [];
    return allocations.reduce<Map<number, number>>((acc, allocation) => {
      const donationId = allocation.donation_id;
      if (donationId == null) return acc;
      acc.set(donationId, (acc.get(donationId) ?? 0) + toNumber(allocation.amount_allocated));
      return acc;
    }, new Map<number, number>());
  }, [allocationsQuery.data]);

  const getDonationTargetTotal = (donation: Donation) => {
    if (donation.donation_type === "Monetary") return toNumber(donation.amount);
    return toNumber(donation.estimated_value);
  };

  const getDonationAllocationStatus = (donation: Donation) => {
    const target = getDonationTargetTotal(donation);
    const allocated = allocatedByDonationId.get(donation.donation_id) ?? 0;
    const remainder = target - allocated;

    if (allocated <= 0.01) {
      return { label: "Unallocated", tone: "muted", allocated, remainder };
    }
    if (target > 0 && Math.abs(remainder) <= 0.01) {
      return { label: "Fully Allocated", tone: "success", allocated, remainder };
    }
    return { label: "Partially Allocated", tone: "warning", allocated, remainder };
  };

  const donationsPageCount = Math.max(1, Math.ceil(filteredDonations.length / pageSize));
  const safeDonationsPage = Math.min(donationsPage, donationsPageCount);
  const pagedDonations = useMemo(() => {
    const start = (safeDonationsPage - 1) * pageSize;
    return filteredDonations.slice(start, start + pageSize);
  }, [filteredDonations, safeDonationsPage, pageSize]);

  const filteredAllocations = useMemo(() => {
    const allocations = allocationsQuery.data ?? [];
    const q = allocationSearchTerm.trim().toLowerCase();

    return allocations.filter((allocation) => {
      const programArea = allocation.program_area ?? "";
      const safehouseName = allocation.safehouses?.name ?? "";

      if (allocationProgramFilters.length > 0 && !allocationProgramFilters.includes(programArea)) return false;
      if (allocationSafehouseFilters.length > 0 && !allocationSafehouseFilters.includes(safehouseName)) return false;

      if (!q) return true;

      return (
        getAllocationSupporterName(allocation).toLowerCase().includes(q) ||
        safehouseName.toLowerCase().includes(q) ||
        programArea.toLowerCase().includes(q) ||
        (allocation.allocation_date ?? "").toLowerCase().includes(q) ||
        String(allocation.allocation_id).includes(q) ||
        String(allocation.donation_id ?? "").includes(q)
      );
    });
  }, [
    allocationsQuery.data,
    allocationSearchTerm,
    allocationProgramFilters,
    allocationSafehouseFilters,
  ]);

  const allocationsPageCount = Math.max(1, Math.ceil(filteredAllocations.length / pageSize));
  const safeAllocationsPage = Math.min(allocationsPage, allocationsPageCount);
  const pagedAllocations = useMemo(() => {
    const start = (safeAllocationsPage - 1) * pageSize;
    return filteredAllocations.slice(start, start + pageSize);
  }, [filteredAllocations, safeAllocationsPage, pageSize]);

  const selectedDonationAllocatedTotal = useMemo(() => {
    const rows = donationAllocationsForDonationQuery.data ?? [];
    return rows.reduce((sum, row) => sum + toNumber(row.amount_allocated), 0);
  }, [donationAllocationsForDonationQuery.data]);

  const selectedDonationBudgetTotal = useMemo(() => {
    if (!selectedDonation) return 0;
    if (selectedDonation.donation_type === "Monetary") return toNumber(selectedDonation.amount);
    return toNumber(selectedDonation.estimated_value);
  }, [selectedDonation]);
  const selectedDonationRemainingUnallocated = useMemo(
    () => selectedDonationBudgetTotal - selectedDonationAllocatedTotal,
    [selectedDonationBudgetTotal, selectedDonationAllocatedTotal],
  );
  const selectedDonationAllocationStatus = useMemo(() => {
    if (!selectedDonation) return null;
    return getDonationAllocationStatus(selectedDonation);
  }, [selectedDonation, allocatedByDonationId]);

  const selectedSupporterAllocations = useMemo(() => {
    if (!selectedSupporter) return [];
    const allocations = allocationsQuery.data ?? [];
    return allocations.filter((allocation) => allocation.donations?.supporter_id === selectedSupporter.supporter_id);
  }, [selectedSupporter, allocationsQuery.data]);
  const selectedSupporterAllocationTotal = useMemo(
    () => selectedSupporterAllocations.reduce((sum, allocation) => sum + toNumber(allocation.amount_allocated), 0),
    [selectedSupporterAllocations],
  );
  const selectedSupporterAllocationByLocation = useMemo(() => {
    const grouped = selectedSupporterAllocations.reduce<Record<string, number>>((acc, allocation) => {
      const safehouseName = allocation.safehouses?.name?.trim() || "Unspecified";
      acc[safehouseName] = (acc[safehouseName] ?? 0) + toNumber(allocation.amount_allocated);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({ name, amount }));
  }, [selectedSupporterAllocations]);
  const selectedSupporterAllocationByProgram = useMemo(() => {
    const grouped = selectedSupporterAllocations.reduce<Record<string, number>>((acc, allocation) => {
      const programArea = allocation.program_area?.trim() || "Unspecified";
      acc[programArea] = (acc[programArea] ?? 0) + toNumber(allocation.amount_allocated);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({ name, amount }));
  }, [selectedSupporterAllocations]);

  const unallocatedDonations = useMemo(() => {
    const donations = donationsQuery.data ?? [];
    return donations
      .map((donation) => {
        const target = getDonationTargetTotal(donation);
        const allocated = allocatedByDonationId.get(donation.donation_id) ?? 0;
        const remaining = target - allocated;
        return {
          donation,
          target,
          allocated,
          remaining,
        };
      })
      .filter((row) => row.remaining > 0.01)
      .sort((a, b) => b.remaining - a.remaining);
  }, [donationsQuery.data, allocatedByDonationId]);

  const toggleFilterValue = (
    value: string,
    setValue: Dispatch<SetStateAction<string[]>>,
  ) => {
    setValue((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const supporterDetailFields: Array<{ label: string; value: string | number | boolean | null | undefined }> =
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
          { label: "likely_to_stop_donating", value: selectedSupporter.likely_to_stop_donating },
          { label: "donation_risk_reason", value: selectedSupporter.donation_risk_reason },
          { label: "days_since_last_donation", value: selectedSupporter.days_since_last_donation },
          { label: "gifts_last_365_days", value: selectedSupporter.gifts_last_365_days },
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

  const allocationDetailFields: Array<{ label: string; value: string | number | null | undefined }> =
    selectedAllocation
      ? [
          { label: "allocation_id", value: selectedAllocation.allocation_id },
          { label: "donation_id", value: selectedAllocation.donation_id },
          { label: "supporter", value: getAllocationSupporterName(selectedAllocation) },
          { label: "safehouse_name", value: selectedAllocation.safehouses?.name ?? null },
          { label: "safehouse_id", value: selectedAllocation.safehouse_id },
          { label: "program_area", value: selectedAllocation.program_area },
          { label: "amount_allocated", value: selectedAllocation.amount_allocated },
          { label: "allocation_date", value: selectedAllocation.allocation_date },
          { label: "allocation_notes", value: selectedAllocation.allocation_notes },
        ]
      : [];

  const editableAllocationFields: Array<{ key: keyof DonationAllocation; label: string }> = [
    { key: "donation_id", label: "donation_id" },
    { key: "safehouse_id", label: "safehouse_id" },
    { key: "program_area", label: "program_area" },
    { key: "amount_allocated", label: "amount_allocated" },
    { key: "allocation_date", label: "allocation_date" },
    { key: "allocation_notes", label: "allocation_notes" },
  ];

  const hasAllocationUnsavedChanges = useMemo(() => {
    if (!selectedAllocation || !isAllocationEditMode) return false;

    return editableAllocationFields.some((field) => {
      const original = (selectedAllocation[field.key] ?? "").toString();
      const current = (allocationEditValues[field.key] ?? "").toString();
      return original !== current;
    });
  }, [selectedAllocation, isAllocationEditMode, editableAllocationFields, allocationEditValues]);

  const closeAllocationDetailView = () => {
    if (isAllocationEditMode && hasAllocationUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave without saving?",
      );
      if (!confirmed) return;
    }

    setSelectedAllocation(null);
    setIsAllocationEditMode(false);
  };

  useEffect(() => {
    const viewQuery = searchParams.get("view");
    const urlViewMode: ViewMode =
      viewQuery === "donations"
        ? "donations"
        : viewQuery === "allocations"
          ? "allocations"
          : viewQuery === "supporters"
            ? "supporters"
            : "summary";
    if (urlViewMode !== viewMode) {
      setViewMode(urlViewMode);
    }
  }, [searchParams, viewMode]);

  const handleViewModeChange = (nextMode: ViewMode) => {
    setViewMode(nextMode);
    const next = new URLSearchParams(searchParams);
    if (nextMode === "donations" || nextMode === "allocations" || nextMode === "supporters") {
      next.set("view", nextMode);
    } else {
      next.delete("view");
    }
    setSearchParams(next, { replace: true });
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
                {viewMode === "summary" ? (
                  <HandCoins className="h-5 w-5 text-primary" />
                ) : viewMode === "supporters" ? (
                  <Users className="h-5 w-5 text-primary" />
                ) : viewMode === "donations" ? (
                  <HandCoins className="h-5 w-5 text-primary" />
                ) : (
                  <HandCoins className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  {viewMode === "summary"
                    ? "Summary Statistics"
                    : viewMode === "supporters"
                    ? "Supporters"
                    : viewMode === "donations"
                      ? "Total Donations"
                      : "Donation Allocations"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {viewMode === "summary"
                    ? "Live totals and trends from supporters, donations, and allocation records."
                    : viewMode === "supporters"
                    ? "Browse all supporters currently stored in the database."
                    : viewMode === "donations"
                      ? "Browse all donations currently stored in the donations table."
                      : "Browse all donation allocations including supporter and safehouse details."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => refreshRiskMutation.mutate()}
                disabled={refreshRiskMutation.isPending}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshRiskMutation.isPending ? "Refreshing Risk..." : "Refresh Risk Scores"}
              </button>
              <Link
                to={
                  viewMode === "supporters"
                    ? "/admin/donors/new-supporter"
                    : viewMode === "donations"
                      ? "/admin/donors/new-donation"
                      : viewMode === "allocations"
                        ? "/admin/donors/new-allocation"
                        : "/admin/donors/new-donation"
                }
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {viewMode === "supporters"
                  ? "Add Contributor"
                  : viewMode === "donations"
                    ? "Add Donation"
                    : viewMode === "allocations"
                      ? "Add Allocation"
                      : "Add Donation"}
              </Link>
              <div className="inline-flex rounded-xl border border-border bg-background p-1">
                <button
                  onClick={() => handleViewModeChange("summary")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "summary"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Summary Statistics
                </button>
                <button
                onClick={() => handleViewModeChange("supporters")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "supporters"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Supporters
                </button>
                <button
                onClick={() => handleViewModeChange("donations")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "donations"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Total Donations
                </button>
                <button
                  onClick={() => handleViewModeChange("allocations")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "allocations"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Allocations
                </button>
              </div>
            </div>
          </div>
          {(refreshRiskMutation.error || refreshRiskMutation.isSuccess) && (
            <div className="mt-3">
              {refreshRiskMutation.error ? (
                <p className="text-sm text-destructive">
                  {(refreshRiskMutation.error as Error).message}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Risk scores refreshed. Updated supporters data now reflects the latest model scoring run.
                </p>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="rounded-2xl bg-card p-6 shadow-warm">
            <p className="text-sm text-muted-foreground">
              {viewMode === "summary"
                ? "Loading summary statistics..."
                : viewMode === "supporters"
                ? "Loading supporters..."
                : viewMode === "donations"
                  ? "Loading donations..."
                  : "Loading donation allocations..."}
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-warm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <p className="font-semibold text-foreground">
                  {viewMode === "summary"
                    ? "Unable to load summary statistics right now."
                    : viewMode === "supporters"
                    ? "Unable to load supporters right now."
                    : viewMode === "donations"
                      ? "Unable to load donations right now."
                      : "Unable to load donation allocations right now."}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{(error as Error).message}</p>
              </div>
            </div>
          </div>
        ) : null}

        {viewMode === "summary" && supportersQuery.data && donationsQuery.data && allocationsQuery.data ? (
          <div className="space-y-6">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-warm">
                <p className="text-sm text-muted-foreground">Total Donations</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(totalDonated)}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-warm">
                <p className="text-sm text-muted-foreground">Active Supporters</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{activeSupporters}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-warm">
                <p className="text-sm text-muted-foreground">Recurring Gift Rate</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{recurringRate.toFixed(1)}%</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-warm">
                <p className="text-sm text-muted-foreground">Total Allocated</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(totalAllocations)}</p>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl bg-card p-6 shadow-warm">
                <h3 className="font-heading text-lg font-semibold text-foreground">Donation Trend (Last 6 Months)</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={donationTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl bg-card p-6 shadow-warm">
                <h3 className="font-heading text-lg font-semibold text-foreground">Supporter Type Mix</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sourceBreakdownData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={94}>
                        {sourceBreakdownData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl bg-card p-6 shadow-warm">
                <h3 className="font-heading text-lg font-semibold text-foreground">Donations by Category</h3>
                <p className="mt-1 text-sm text-muted-foreground">Monetary vs non-monetary contribution totals.</p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-background p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Monetary</p>
                    <p className="mt-1 text-xl font-bold text-foreground">
                      {formatCurrency(donationCategoryTotals.monetary)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Other</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{formatCurrency(donationCategoryTotals.other)}</p>
                  </div>
                </div>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { category: "Monetary", amount: donationCategoryTotals.monetary },
                        { category: "Other", amount: donationCategoryTotals.other },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="category" />
                      <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl bg-card p-6 shadow-warm">
                <h3 className="font-heading text-lg font-semibold text-foreground">Allocation by Location</h3>
                <p className="mt-1 text-sm text-muted-foreground">Allocated amount grouped by safehouse/location.</p>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={allocationByLocationData} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                      <YAxis dataKey="location" type="category" width={130} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="amount" fill="hsl(var(--secondary))" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-card p-6 shadow-warm">
              <h3 className="font-heading text-lg font-semibold text-foreground">Allocation by Program Area</h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allocationByProgramData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="area" />
                    <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="amount" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl bg-card p-6 shadow-warm">
              <h3 className="font-heading text-lg font-semibold text-foreground">Donations Not Fully Allocated</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Donations where remaining allocation is still greater than zero.
              </p>
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Donation ID</TableHead>
                      <TableHead>Supporter</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Total Donation</TableHead>
                      <TableHead>Total Allocated</TableHead>
                      <TableHead>Unallocated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unallocatedDonations.map((row) => (
                      <TableRow key={row.donation.donation_id}>
                        <TableCell>{row.donation.donation_id}</TableCell>
                        <TableCell className="font-medium">{getDonationSupporterName(row.donation)}</TableCell>
                        <TableCell>{row.donation.donation_type ?? "-"}</TableCell>
                        <TableCell>
                          {formatCurrency(
                            row.target,
                            row.donation.currency_code ?? "PHP",
                          )}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(
                            row.allocated,
                            row.donation.currency_code ?? "PHP",
                          )}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(
                            row.remaining,
                            row.donation.currency_code ?? "PHP",
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {unallocatedDonations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          All donations are fully allocated.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </section>
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
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Supporter ID</p>
                      <p className="mt-1 text-sm text-foreground">{selectedSupporter.supporter_id}</p>
                    </div>

                    {(isEditMode ? editableSupporterFields : supporterDetailFields.filter((f) => f.label !== "supporter_id")).map(
                      (field) => (
                        <div key={field.label} className="rounded-xl border border-border bg-muted/20 p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {formatFieldLabel(field.label)}
                          </p>
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

              <div className="rounded-2xl bg-card p-6 shadow-warm">
                <h4 className="font-heading text-xl text-foreground">
                  Donation Allocations by {getSupporterName(selectedSupporter)}
                </h4>

                {allocationsQuery.isLoading ? (
                  <div className="mt-4 text-sm text-muted-foreground">Loading donation allocations...</div>
                ) : null}

                {allocationsQuery.error ? (
                  <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {(allocationsQuery.error as Error).message}
                  </div>
                ) : null}

                {selectedSupporterAllocations ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-border bg-muted/20 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Allocated</p>
                        <p className="mt-1 text-xl font-bold text-foreground">
                          {formatCurrency(selectedSupporterAllocationTotal)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/20 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Locations Supported</p>
                        <p className="mt-1 text-xl font-bold text-foreground">
                          {selectedSupporterAllocationByLocation.length}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/20 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Programs Supported</p>
                        <p className="mt-1 text-xl font-bold text-foreground">
                          {selectedSupporterAllocationByProgram.length}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-border p-4">
                        <p className="text-sm font-semibold text-foreground">By Location</p>
                        <div className="mt-3 space-y-2">
                          {selectedSupporterAllocationByLocation.slice(0, 6).map((row) => (
                            <div key={row.name} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{row.name}</span>
                              <span className="font-medium text-foreground">{formatCurrency(row.amount)}</span>
                            </div>
                          ))}
                          {selectedSupporterAllocationByLocation.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No location allocations yet.</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-xl border border-border p-4">
                        <p className="text-sm font-semibold text-foreground">By Program</p>
                        <div className="mt-3 space-y-2">
                          {selectedSupporterAllocationByProgram.slice(0, 6).map((row) => (
                            <div key={row.name} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{row.name}</span>
                              <span className="font-medium text-foreground">{formatCurrency(row.amount)}</span>
                            </div>
                          ))}
                          {selectedSupporterAllocationByProgram.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No program allocations yet.</p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Donation ID</TableHead>
                            <TableHead>Safehouse</TableHead>
                            <TableHead>Program Area</TableHead>
                            <TableHead>Amount Allocated</TableHead>
                            <TableHead>Allocation Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedSupporterAllocations.map((allocation) => (
                            <TableRow key={allocation.allocation_id}>
                              <TableCell>{allocation.donation_id ?? "-"}</TableCell>
                              <TableCell>{allocation.safehouses?.name ?? "-"}</TableCell>
                              <TableCell>{allocation.program_area ?? "-"}</TableCell>
                              <TableCell>
                                {allocation.amount_allocated == null
                                  ? "-"
                                  : formatCurrency(allocation.amount_allocated)}
                              </TableCell>
                              <TableCell>{allocation.allocation_date ?? "-"}</TableCell>
                            </TableRow>
                          ))}
                          {selectedSupporterAllocations.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground">
                                No donation allocations found for this supporter.
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </TableBody>
                      </Table>
                    </div>
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
                    <TableHead>At Risk</TableHead>
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
                      <TableCell>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            supporter.likely_to_stop_donating
                              ? "bg-amber-500/15 text-amber-700"
                              : "bg-sage/20 text-sage"
                          }`}
                        >
                          {supporter.likely_to_stop_donating ? "Likely" : "No"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pagedSupporters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
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
                    <div>
                      <h3 className="font-heading text-2xl text-foreground">
                        Donation #{selectedDonation.donation_id}
                      </h3>
                      {selectedDonationAllocationStatus ? (
                        <span
                          className={`mt-2 inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                            selectedDonationAllocationStatus.tone === "success"
                              ? "bg-sage/20 text-sage"
                              : selectedDonationAllocationStatus.tone === "warning"
                                ? "bg-amber-500/15 text-amber-700"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {selectedDonationAllocationStatus.label}
                        </span>
                      ) : null}
                    </div>
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
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {formatFieldLabel(field.label)}
                            </p>
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
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {formatFieldLabel(field.label)}
                            </p>
                            <p className="mt-1 text-sm text-foreground">
                              {field.value == null || field.value === "" ? "-" : String(field.value)}
                            </p>
                          </div>
                        ))}
                  </div>

                  <div className="mt-6 rounded-xl border border-border p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
                      <span className="font-semibold text-foreground">Allocation Breakdown</span>
                      <span className="text-muted-foreground">
                        Total Allocated:{" "}
                        <span className="font-semibold text-foreground">
                          {formatCurrency(selectedDonationAllocatedTotal, selectedDonation.currency_code ?? "PHP")}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        Total Unallocated:{" "}
                        <span className="font-semibold text-foreground">
                          {formatCurrency(
                            selectedDonationRemainingUnallocated,
                            selectedDonation.currency_code ?? "PHP",
                          )}
                        </span>
                      </span>
                      {selectedDonationRemainingUnallocated > 0.01 ? (
                        <Link
                          to={`/admin/donors/new-allocation?donationId=${selectedDonation.donation_id}&supporterId=${selectedDonation.supporter_id ?? ""}&remainingAmount=${selectedDonationRemainingUnallocated}`}
                          className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          Allocate Remaining Resources
                        </Link>
                      ) : null}
                    </div>

                    {donationAllocationsForDonationQuery.isLoading ? (
                      <div className="text-sm text-muted-foreground">Loading donation allocations...</div>
                    ) : null}

                    {donationAllocationsForDonationQuery.error ? (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                        {(donationAllocationsForDonationQuery.error as Error).message}
                      </div>
                    ) : null}

                    {donationAllocationsForDonationQuery.data ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Safehouse</TableHead>
                            <TableHead>Program Area</TableHead>
                            <TableHead>Amount Allocated</TableHead>
                            <TableHead>Allocation Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {donationAllocationsForDonationQuery.data.map((allocation) => (
                            <TableRow key={allocation.allocation_id}>
                              <TableCell>{allocation.safehouses?.name ?? "-"}</TableCell>
                              <TableCell>{allocation.program_area ?? "-"}</TableCell>
                              <TableCell>
                                {allocation.amount_allocated == null
                                  ? "-"
                                  : formatCurrency(allocation.amount_allocated, selectedDonation.currency_code ?? "PHP")}
                              </TableCell>
                              <TableCell>{allocation.allocation_date ?? "-"}</TableCell>
                            </TableRow>
                          ))}
                          {donationAllocationsForDonationQuery.data.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                No allocations found for this donation.
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </TableBody>
                      </Table>
                    ) : null}
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
                    <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <input
                        type="text"
                        value={donationSearchTerm}
                        onChange={(e) => setDonationSearchTerm(e.target.value)}
                        placeholder="Search supporter, type, campaign, channel, date, ID..."
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-primary lg:col-span-2"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setDonationSearchTerm("");
                          setDonationTypeFilters([]);
                          setDonationRecurringFilters([]);
                          setDonationCampaignFilters([]);
                          setDonationChannelFilters([]);
                          setDonationAllocationFilters([]);
                          setDonationAmountMin("");
                          setDonationAmountMax("");
                        }}
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                      >
                        Clear filters
                      </button>
                      <input
                        type="number"
                        step="0.01"
                        value={donationAmountMin}
                        onChange={(e) => setDonationAmountMin(e.target.value)}
                        placeholder="Min amount"
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-primary"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={donationAmountMax}
                        onChange={(e) => setDonationAmountMax(e.target.value)}
                        placeholder="Max amount"
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-primary"
                      />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-5">
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

                      <div className="rounded-lg border border-border p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Allocation</p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={donationAllocationFilters.length === 0}
                              onChange={() => setDonationAllocationFilters([])}
                            />
                            <span>All allocation statuses</span>
                          </label>
                          {donationFilterOptions.allocationStatus.map((value) => (
                            <label key={value} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={donationAllocationFilters.includes(value)}
                                onChange={() => toggleFilterValue(value, setDonationAllocationFilters)}
                              />
                              <span>
                                {value === "fully_allocated"
                                  ? "Fully Allocated"
                                  : value === "partially_allocated"
                                    ? "Partially Allocated"
                                    : "Unallocated"}
                              </span>
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

              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead>Supporter</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Recurring</TableHead>
                    <TableHead className={showCampaignColumn ? "" : "hidden lg:table-cell"}>Campaign</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead className={showAmountColumns ? "" : "hidden lg:table-cell"}>Amount</TableHead>
                    <TableHead className={showAmountColumns ? "" : "hidden lg:table-cell"}>Estimated Value</TableHead>
                    <TableHead className="w-[180px]">Allocation Flag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedDonations.map((donation) => {
                    const allocationStatus = getDonationAllocationStatus(donation);
                    return (
                    <TableRow
                      key={donation.donation_id}
                      className="cursor-pointer"
                      onClick={() => setSelectedDonation(donation)}
                    >
                      <TableCell className="font-medium">{getDonationSupporterName(donation)}</TableCell>
                      <TableCell>{donation.donation_type ?? "-"}</TableCell>
                      <TableCell>{donation.donation_date ?? "-"}</TableCell>
                      <TableCell>{donation.is_recurring ? "Yes" : "No"}</TableCell>
                      <TableCell className={showCampaignColumn ? "truncate" : "hidden lg:table-cell"}>
                        {donation.campaign_name ?? "-"}
                      </TableCell>
                      <TableCell>{donation.channel_source ?? "-"}</TableCell>
                      <TableCell className={showAmountColumns ? "" : "hidden lg:table-cell"}>
                        {donation.amount == null
                          ? "-"
                          : formatCurrency(donation.amount, donation.currency_code ?? "PHP")}
                      </TableCell>
                      <TableCell className={showAmountColumns ? "" : "hidden lg:table-cell"}>
                        {donation.estimated_value == null
                          ? "-"
                          : formatCurrency(donation.estimated_value, donation.currency_code ?? "PHP")}
                      </TableCell>
                      <TableCell className="w-[180px]">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                            allocationStatus.tone === "success"
                              ? "bg-sage/20 text-sage"
                              : allocationStatus.tone === "warning"
                                ? "bg-amber-500/15 text-amber-700"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {allocationStatus.label}
                        </span>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {pagedDonations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
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

        {viewMode === "allocations" && allocationsQuery.data ? (
          selectedAllocation ? (
            <div className="space-y-6">
              <div className="rounded-2xl bg-card shadow-warm">
                <div className="border-b border-border bg-muted/40 px-6 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="font-heading text-2xl text-foreground">
                      Allocation #{selectedAllocation.allocation_id}
                    </h3>
                    <button
                      type="button"
                      onClick={closeAllocationDetailView}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back to allocations
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!isAllocationEditMode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsAllocationEditMode(true)}
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Are you sure you want to delete allocation #${selectedAllocation.allocation_id}?`,
                            );
                            if (!confirmed) return;
                            deleteAllocationMutation.mutate();
                          }}
                          disabled={deleteAllocationMutation.isPending}
                          className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          {deleteAllocationMutation.isPending ? "Deleting..." : "Delete"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (hasAllocationUnsavedChanges) {
                              const confirmed = window.confirm(
                                "You have unsaved changes. Cancel editing and discard them?",
                              );
                              if (!confirmed) return;
                            }
                            setIsAllocationEditMode(false);
                            if (selectedAllocation) {
                              setAllocationEditValues({
                                donation_id: selectedAllocation.donation_id?.toString() ?? "",
                                safehouse_id: selectedAllocation.safehouse_id?.toString() ?? "",
                                program_area: selectedAllocation.program_area ?? "",
                                amount_allocated: selectedAllocation.amount_allocated?.toString() ?? "",
                                allocation_date: selectedAllocation.allocation_date ?? "",
                                allocation_notes: selectedAllocation.allocation_notes ?? "",
                              });
                            }
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveAllocationMutation.mutate()}
                          disabled={saveAllocationMutation.isPending}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                          {saveAllocationMutation.isPending ? "Saving..." : "Save"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  {(saveAllocationMutation.error || deleteAllocationMutation.error) && (
                    <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                      {(
                        (saveAllocationMutation.error as Error | null)?.message ??
                        (deleteAllocationMutation.error as Error | null)?.message
                      ) || "Request failed."}
                    </div>
                  )}

                  <div className={`grid gap-3 sm:grid-cols-2 ${isAllocationEditMode ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
                    {isAllocationEditMode
                      ? editableAllocationFields.map((field) => (
                          <div key={field.label} className="rounded-xl border border-border bg-muted/20 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {formatFieldLabel(field.label)}
                            </p>
                            <input
                              type="text"
                              value={allocationEditValues[field.key] ?? ""}
                              onChange={(e) =>
                                setAllocationEditValues((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                              className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                            />
                          </div>
                        ))
                      : allocationDetailFields.map((field) => (
                          <div key={field.label} className="rounded-xl border border-border bg-muted/20 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {formatFieldLabel(field.label)}
                            </p>
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
                  onClick={() => setAllocationFiltersOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-foreground">Filters</span>
                  <span className="text-xs text-muted-foreground">{allocationFiltersOpen ? "Hide" : "Show"}</span>
                </button>

                {allocationFiltersOpen ? (
                  <div className="border-t border-border p-4">
                    <div className="mb-4 grid gap-3 md:grid-cols-2">
                      <input
                        type="text"
                        value={allocationSearchTerm}
                        onChange={(e) => setAllocationSearchTerm(e.target.value)}
                        placeholder="Search supporter, safehouse, program, allocation date, IDs..."
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAllocationSearchTerm("");
                          setAllocationProgramFilters([]);
                          setAllocationSafehouseFilters([]);
                        }}
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                      >
                        Clear filters
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-lg border border-border p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Program Area</p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={allocationProgramFilters.length === 0}
                              onChange={() => setAllocationProgramFilters([])}
                            />
                            <span>All programs</span>
                          </label>
                          {allocationFilterOptions.programs.map((value) => (
                            <label key={value} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={allocationProgramFilters.includes(value)}
                                onChange={() => toggleFilterValue(value, setAllocationProgramFilters)}
                              />
                              <span>{value}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Safehouse</p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={allocationSafehouseFilters.length === 0}
                              onChange={() => setAllocationSafehouseFilters([])}
                            />
                            <span>All safehouses</span>
                          </label>
                          {allocationFilterOptions.safehouses.map((value) => (
                            <label key={value} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={allocationSafehouseFilters.includes(value)}
                                onChange={() => toggleFilterValue(value, setAllocationSafehouseFilters)}
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
                  Showing <span className="font-semibold text-foreground">{filteredAllocations.length}</span> of{" "}
                  <span className="font-semibold text-foreground">{(allocationsQuery.data ?? []).length}</span> allocations
                </div>
              </div>

              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setAllocationsPage(1);
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
                    onClick={() => setAllocationsPage((p) => Math.max(1, p - 1))}
                    disabled={safeAllocationsPage <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {safeAllocationsPage} of {allocationsPageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAllocationsPage((p) => Math.min(allocationsPageCount, p + 1))}
                    disabled={safeAllocationsPage >= allocationsPageCount}
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
                    <TableHead>Safehouse</TableHead>
                    <TableHead>Program Area</TableHead>
                    <TableHead>Amount Allocated</TableHead>
                    <TableHead>Allocation Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedAllocations.map((allocation) => (
                    <TableRow
                      key={allocation.allocation_id}
                      className="cursor-pointer"
                      onClick={() => setSelectedAllocation(allocation)}
                    >
                      <TableCell className="font-medium">{getAllocationSupporterName(allocation)}</TableCell>
                      <TableCell>{allocation.safehouses?.name ?? "-"}</TableCell>
                      <TableCell>{allocation.program_area ?? "-"}</TableCell>
                      <TableCell>{allocation.amount_allocated == null ? "-" : formatCurrency(allocation.amount_allocated)}</TableCell>
                      <TableCell>{allocation.allocation_date ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                  {pagedAllocations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No donation allocations found.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )
        ) : null}

      </div>
    </AdminLayout>
  );
};

export default AdminDonors;
