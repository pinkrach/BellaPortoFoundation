import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { fetchWithAuth } from "@/lib/api";

const AddDonationPage = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    supporter_id: "",
    donation_type: "",
    donation_date: "",
    is_recurring: "false",
    campaign_name: "",
    channel_source: "",
    currency_code: "PHP",
    amount: "",
    estimated_value: "",
    impact_unit: "",
    notes: "",
    referral_post_id: "",
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSaving(true);

    const payload: Record<string, string | number | boolean | null> = {
      supporter_id: form.supporter_id.trim() === "" ? null : Number(form.supporter_id),
      donation_type: form.donation_type.trim() || null,
      donation_date: form.donation_date.trim() || null,
      is_recurring: form.is_recurring === "true",
      campaign_name: form.campaign_name.trim() || null,
      channel_source: form.channel_source.trim() || null,
      currency_code: form.currency_code.trim() || null,
      amount: form.amount.trim() === "" ? null : Number(form.amount),
      estimated_value: form.estimated_value.trim() === "" ? null : Number(form.estimated_value),
      impact_unit: form.impact_unit.trim() || null,
      notes: form.notes.trim() || null,
      referral_post_id: form.referral_post_id.trim() === "" ? null : Number(form.referral_post_id),
    };

    try {
      const response = await fetchWithAuth("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || "Unable to create donation.");
      }

      navigate("/admin/donors?view=donations");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create donation.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout title="Add Donation" subtitle="Create a new donation record">
      <div className="rounded-2xl bg-card p-6 shadow-warm">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Supporter ID" required>
              <input
                type="number"
                value={form.supporter_id}
                onChange={(event) => setForm((current) => ({ ...current, supporter_id: event.target.value }))}
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
            </Field>
            <Field label="Donation Type" required>
              <input
                type="text"
                value={form.donation_type}
                onChange={(event) => setForm((current) => ({ ...current, donation_type: event.target.value }))}
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
            </Field>
            <Field label="Donation Date" required>
              <input
                type="date"
                value={form.donation_date}
                onChange={(event) => setForm((current) => ({ ...current, donation_date: event.target.value }))}
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
            </Field>
            <Field label="Is Recurring" required>
              <select
                value={form.is_recurring}
                onChange={(event) => setForm((current) => ({ ...current, is_recurring: event.target.value }))}
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              >
                <option value="false">false</option>
                <option value="true">true</option>
              </select>
            </Field>
            <Field label="Campaign Name">
              <input
                type="text"
                value={form.campaign_name}
                onChange={(event) => setForm((current) => ({ ...current, campaign_name: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
            </Field>
            <Field label="Channel Source">
              <input
                type="text"
                value={form.channel_source}
                onChange={(event) => setForm((current) => ({ ...current, channel_source: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
            </Field>
            <Field label="Currency Code" required>
              <input
                type="text"
                value={form.currency_code}
                onChange={(event) => setForm((current) => ({ ...current, currency_code: event.target.value }))}
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
            </Field>
            <Field label="Amount">
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
            </Field>
            <Field label="Estimated Value">
              <input
                type="number"
                step="0.01"
                value={form.estimated_value}
                onChange={(event) => setForm((current) => ({ ...current, estimated_value: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
            </Field>
            <Field label="Impact Unit">
              <input
                type="text"
                value={form.impact_unit}
                onChange={(event) => setForm((current) => ({ ...current, impact_unit: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
            </Field>
            <Field label="Referral Post ID">
              <input
                type="number"
                value={form.referral_post_id}
                onChange={(event) => setForm((current) => ({ ...current, referral_post_id: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
            />
          </Field>

          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate("/admin/donors?view=donations")}
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Create donation"}
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

export default AddDonationPage;
