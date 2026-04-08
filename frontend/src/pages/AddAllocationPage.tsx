import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { fetchWithAuth } from "@/lib/api";
const programAreaOptions = [
  "Safehouse Operations",
  "Education",
  "Health & Wellbeing",
  "Case Management",
  "Reintegration",
  "Emergency Response",
  "Other",
];

type SafehouseOption = {
  safehouse_id: number;
  name: string | null;
  safehouse_code: string | null;
  region: string | null;
  city: string | null;
  status: string | null;
};

type DonationLookup = {
  donation_id: number;
  donation_type: string | null;
  currency_code: string | null;
  impact_unit: string | null;
};

async function fetchSafehouses(): Promise<SafehouseOption[]> {
  const response = await fetchWithAuth("/api/safehouses");
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to load safehouses.");
  }
  return response.json();
}

async function fetchDonationsForLookup(): Promise<DonationLookup[]> {
  const response = await fetchWithAuth("/api/donations");
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Unable to load donations.");
  }
  return response.json();
}

const AddAllocationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillDonationId = searchParams.get("donationId") ?? "";
  const prefillSupporterId = searchParams.get("supporterId") ?? "";
  const prefillRemainingAmount = searchParams.get("remainingAmount") ?? "";
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const safehousesQuery = useQuery({
    queryKey: ["safehouses"],
    queryFn: fetchSafehouses,
  });
  const donationsLookupQuery = useQuery({
    queryKey: ["donations-lookup"],
    queryFn: fetchDonationsForLookup,
  });
  const [form, setForm] = useState({
    donation_id: prefillDonationId,
    safehouse_id: "",
    program_area: "",
    amount_allocated: prefillRemainingAmount,
    allocation_date: new Date().toISOString().slice(0, 10),
    allocation_notes: "",
  });
  const selectedDonation = (donationsLookupQuery.data ?? []).find(
    (donation) => String(donation.donation_id) === form.donation_id,
  );
  const selectedDonationUnits =
    selectedDonation?.donation_type === "Monetary"
      ? selectedDonation.currency_code || "Currency not set"
      : selectedDonation?.impact_unit || "Impact unit not set";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSaving(true);

    const payload: Record<string, string | number | null> = {
      donation_id: form.donation_id.trim() === "" ? null : Number(form.donation_id),
      safehouse_id: form.safehouse_id.trim() === "" ? null : Number(form.safehouse_id),
      program_area: form.program_area.trim() || null,
      amount_allocated: form.amount_allocated.trim() === "" ? null : Number(form.amount_allocated),
      allocation_date: form.allocation_date.trim() || null,
      allocation_notes: form.allocation_notes.trim() || null,
    };

    try {
      const response = await fetchWithAuth("/api/donation-allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || "Unable to create donation allocation.");
      }

      navigate("/admin/donors?view=allocations");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create donation allocation.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout title="Add Donation Allocation" subtitle="Create a new allocation tied to a donation and safehouse">
      <div className="rounded-2xl bg-card p-6 shadow-warm">
        {prefillSupporterId ? (
          <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Supporter ID: <span className="font-semibold text-foreground">{prefillSupporterId}</span>
          </div>
        ) : null}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Donation ID" required>
              <input
                type="number"
                required
                value={form.donation_id}
                onChange={(event) => setForm((current) => ({ ...current, donation_id: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
            </Field>
            <Field label="Safehouse ID" required>
              <select
                required
                value={form.safehouse_id}
                onChange={(event) => setForm((current) => ({ ...current, safehouse_id: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              >
                <option value="">
                  {safehousesQuery.isLoading ? "Loading safehouses..." : "Select safehouse"}
                </option>
                {(safehousesQuery.data ?? []).map((safehouse) => (
                  <option key={safehouse.safehouse_id} value={String(safehouse.safehouse_id)}>
                    {safehouse.name?.trim() || `Safehouse #${safehouse.safehouse_id}`} (ID {safehouse.safehouse_id})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Program Area">
              <select
                value={form.program_area}
                onChange={(event) => setForm((current) => ({ ...current, program_area: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              >
                <option value="">Select program area</option>
                {programAreaOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Amount Allocated" required>
              <input
                type="number"
                step="0.01"
                required
                value={form.amount_allocated}
                onChange={(event) => setForm((current) => ({ ...current, amount_allocated: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
            </Field>
            <Field label="Allocation Date" required>
              <input
                type="date"
                required
                value={form.allocation_date}
                onChange={(event) => setForm((current) => ({ ...current, allocation_date: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Donation Type">
              <input
                type="text"
                readOnly
                value={selectedDonation?.donation_type ?? ""}
                placeholder={donationsLookupQuery.isLoading ? "Loading donation type..." : "Select a Donation ID"}
                className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground"
              />
            </Field>
            <Field label="Units">
              <input
                type="text"
                readOnly
                value={selectedDonation ? selectedDonationUnits : ""}
                placeholder={donationsLookupQuery.isLoading ? "Loading units..." : "Select a Donation ID"}
                className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground"
              />
            </Field>
          </div>

          <Field label="Allocation Notes">
            <textarea
              rows={4}
              value={form.allocation_notes}
              onChange={(event) => setForm((current) => ({ ...current, allocation_notes: event.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
            />
          </Field>

          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}
          {safehousesQuery.error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {(safehousesQuery.error as Error).message}
            </div>
          ) : null}
          {donationsLookupQuery.error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {(donationsLookupQuery.error as Error).message}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate("/admin/donors?view=allocations")}
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Create allocation"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-foreground">
      {label}
      {required ? <span className="ml-1 text-destructive">*</span> : null}
    </span>
    {children}
  </label>
);

export default AddAllocationPage;
