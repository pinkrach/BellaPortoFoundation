import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";

const isLocalHost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (isLocalHost ? "http://localhost:5250" : "");
const supporterTypeOptions = ["Individual", "Organization", "Corporate", "Foundation"];
const relationshipTypeOptions = ["MonetaryDonor", "InKindDonor", "Volunteer", "Partner"];
const statusOptions = ["Active", "Prospect", "Inactive"];
const acquisitionChannelOptions = ["Referral", "Social Media", "Website", "Event", "Email", "Walk-in"];

const AddSupporterPage = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    supporter_type: "",
    display_name: "",
    organization_name: "",
    first_name: "",
    last_name: "",
    relationship_type: "",
    region: "",
    country: "",
    email: "",
    phone: "",
    status: "",
    first_donation_date: "",
    acquisition_channel: "",
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSaving(true);

    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim() === "" ? null : value.trim()]),
    );

    try {
      const endpoint = apiBaseUrl ? `${apiBaseUrl}/api/supporters` : "/api/supporters";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || "Unable to create supporter.");
      }

      navigate("/admin/donors");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create supporter.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout title="Add Contributor" subtitle="Create a new supporter record">
      <div className="rounded-2xl bg-card p-6 shadow-warm">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Supporter Type" required>
              <select
                value={form.supporter_type}
                onChange={(event) => setForm((current) => ({ ...current, supporter_type: event.target.value }))}
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              >
                <option value="">Select supporter type</option>
                {supporterTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Display Name">
              <input
                type="text"
                value={form.display_name}
                onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </Field>

            <Field label="Organization Name">
              <input
                type="text"
                value={form.organization_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, organization_name: event.target.value }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </Field>

            <Field label="First Name">
              <input
                type="text"
                value={form.first_name}
                onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </Field>

            <Field label="Last Name">
              <input
                type="text"
                value={form.last_name}
                onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </Field>

            <Field label="Relationship Type" required>
              <select
                value={form.relationship_type}
                onChange={(event) =>
                  setForm((current) => ({ ...current, relationship_type: event.target.value }))
                }
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              >
                <option value="">Select relationship type</option>
                {relationshipTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Region">
              <input
                type="text"
                value={form.region}
                onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </Field>

            <Field label="Country">
              <input
                type="text"
                value={form.country}
                onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </Field>

            <Field label="Phone">
              <input
                type="text"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </Field>

            <Field label="Status" required>
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              >
                <option value="">Select status</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="First Donation Date">
              <input
                type="date"
                value={form.first_donation_date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, first_donation_date: event.target.value }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </Field>

            <Field label="Acquisition Channel" required>
              <select
                value={form.acquisition_channel}
                onChange={(event) =>
                  setForm((current) => ({ ...current, acquisition_channel: event.target.value }))
                }
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              >
                <option value="">Select acquisition channel</option>
                {acquisitionChannelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate("/admin/donors")}
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Create contributor"}
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

export default AddSupporterPage;
