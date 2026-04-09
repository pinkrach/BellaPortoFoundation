import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { findOrCreateSupporter } from "@/lib/supporterRecord";
import { isMissingDonationWorkflowColumnMessage, stripDonationWorkflowFields } from "@/lib/donationInsertCompat";
import {
  DONOR_DONATION_FALLBACK_CAMPAIGNS,
  DONOR_NON_MONETARY_DONATION_TYPE_OPTIONS,
  IN_KIND_ITEM_CATEGORY_OPTIONS,
} from "@/lib/donorDonationFormOptions";

type BaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userEmail: string | null;
  firstName: string | null;
  lastName: string | null;
  onRecorded: () => void;
};

const selectClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60";

function useMergedCampaignOptions(open: boolean) {
  const campaignsFromDbQuery = useQuery({
    queryKey: ["donor-donations-distinct-campaigns"],
    queryFn: async () => {
      if (!supabase) return [] as string[];
      const { data, error } = await supabase.from("donations").select("campaign_name");
      if (error) return [];
      const names = new Set<string>();
      for (const row of data ?? []) {
        const c = typeof row.campaign_name === "string" ? row.campaign_name.trim() : "";
        if (c) names.add(c);
      }
      return Array.from(names).sort((a, b) => a.localeCompare(b));
    },
    enabled: open && Boolean(supabase),
  });

  return useMemo(() => {
    const merged = new Set<string>([...DONOR_DONATION_FALLBACK_CAMPAIGNS]);
    for (const c of campaignsFromDbQuery.data ?? []) merged.add(c);
    return Array.from(merged).sort((a, b) => a.localeCompare(b));
  }, [campaignsFromDbQuery.data]);
}

export function DonorVolunteerTimeModal({ open, onOpenChange, userId, userEmail, firstName, lastName, onRecorded }: BaseProps) {
  const [donationType, setDonationType] = useState("Time");
  const [isRecurring, setIsRecurring] = useState<"true" | "false">("false");
  const [campaignName, setCampaignName] = useState("");
  const [estimatedValueRaw, setEstimatedValueRaw] = useState("");
  const [donationDate, setDonationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const campaignOptions = useMergedCampaignOptions(open);

  const reset = () => {
    setDonationType("Time");
    setIsRecurring("false");
    setCampaignName("");
    setEstimatedValueRaw("");
    setDonationDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setErrorMessage(null);
    setSaving(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    if (!supabase || !userEmail?.trim()) {
      setErrorMessage("You need to be signed in to log this gift.");
      return;
    }
    if (!donationType.trim()) {
      setErrorMessage("Choose a donation type.");
      return;
    }
    const ev = Number(estimatedValueRaw);
    if (!Number.isFinite(ev) || ev < 0) {
      setErrorMessage("Enter a valid estimated value in USD (use 0 only if you are unsure — staff may adjust).");
      return;
    }
    if (!donationDate.trim()) {
      setErrorMessage("Choose the date this happened or is planned.");
      return;
    }

    setSaving(true);
    try {
      const supporter_id = await findOrCreateSupporter({
        userId,
        email: userEmail.trim(),
        firstName,
        lastName,
      });

      const payload: Record<string, unknown> = {
        supporter_id,
        donation_type: donationType.trim(),
        donation_date: donationDate.trim(),
        is_recurring: isRecurring === "true",
        channel_source: "donor_portal",
        campaign_name: campaignName.trim() || null,
        estimated_value: ev,
        notes: notes.trim() || null,
        submission_status: "pending",
      };

      let ins = await supabase.from("donations").insert(payload);
      if (ins.error && isMissingDonationWorkflowColumnMessage(ins.error.message)) {
        ins = await supabase.from("donations").insert(stripDonationWorkflowFields(payload));
      }
      if (ins.error) throw new Error(ins.error.message || "Could not save your entry.");
      onRecorded();
      onOpenChange(false);
      reset();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Could not save your entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-lg rounded-2xl border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-foreground">Log service or non-cash gift</DialogTitle>
          <DialogDescription>
            These fields match your donation record. Staff will review and confirm before it counts toward your public impact totals.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Donation type</span>
            <select
              value={donationType}
              onChange={(e) => setDonationType(e.target.value)}
              className={selectClass}
              disabled={saving}
              required
            >
              {DONOR_NON_MONETARY_DONATION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Recurring gift?</span>
            <select
              value={isRecurring}
              onChange={(e) => setIsRecurring(e.target.value as "true" | "false")}
              className={selectClass}
              disabled={saving}
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Campaign</span>
            <select
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className={selectClass}
              disabled={saving}
            >
              <option value="">— Select campaign (optional) —</option>
              {campaignOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Estimated value (USD)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={estimatedValueRaw}
              onChange={(e) => setEstimatedValueRaw(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              disabled={saving}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Date (completed or planned)</span>
            <input
              type="date"
              value={donationDate}
              onChange={(e) => setDonationDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              disabled={saving}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              disabled={saving}
              placeholder="Describe the service or gift (e.g. role, hours, or what you are giving)."
            />
          </label>

          {errorMessage ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{errorMessage}</p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/40"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Saving…" : "Submit for review"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DonorInKindGiftModal({ open, onOpenChange, userId, userEmail, firstName, lastName, onRecorded }: BaseProps) {
  const [donationDate, setDonationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState(IN_KIND_ITEM_CATEGORY_OPTIONS[0] ?? "");
  const [itemCategoryOther, setItemCategoryOther] = useState("");
  const [quantityRaw, setQuantityRaw] = useState("1");
  const [unitOfMeasure, setUnitOfMeasure] = useState("");
  const [estimatedUnitValueRaw, setEstimatedUnitValueRaw] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"ship" | "deliver_in_person">("ship");
  const [intendedUse, setIntendedUse] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setDonationDate(new Date().toISOString().slice(0, 10));
    setItemName("");
    setItemCategory(IN_KIND_ITEM_CATEGORY_OPTIONS[0] ?? "");
    setItemCategoryOther("");
    setQuantityRaw("1");
    setUnitOfMeasure("");
    setEstimatedUnitValueRaw("");
    setFulfillmentMethod("ship");
    setIntendedUse("");
    setNotes("");
    setErrorMessage(null);
    setSaving(false);
  };

  const resolvedItemCategory = () => {
    if (itemCategory === "Other") {
      const o = itemCategoryOther.trim();
      return o || null;
    }
    return itemCategory.trim() || null;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    if (!supabase || !userEmail?.trim()) {
      setErrorMessage("You need to be signed in to log an in-kind gift.");
      return;
    }
    if (!itemName.trim()) {
      setErrorMessage("Item name is required.");
      return;
    }
    if (itemCategory === "Other" && !itemCategoryOther.trim()) {
      setErrorMessage('Please describe the category when you choose "Other".');
      return;
    }
    const categoryFinal = resolvedItemCategory();
    if (!categoryFinal) {
      setErrorMessage("Category is required.");
      return;
    }
    const quantity = Number(quantityRaw);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setErrorMessage("Enter a valid quantity.");
      return;
    }
    const unitValue = Number(estimatedUnitValueRaw);
    if (!Number.isFinite(unitValue) || unitValue < 0) {
      setErrorMessage("Enter a fair estimated value per unit in USD (zero if unsure — we may adjust).");
      return;
    }
    if (!donationDate.trim()) {
      setErrorMessage("Choose the date you are logging this gift.");
      return;
    }

    setSaving(true);
    try {
      const supporter_id = await findOrCreateSupporter({
        userId,
        email: userEmail.trim(),
        firstName,
        lastName,
      });

      const lineTotal = Math.round(quantity * unitValue * 100) / 100;
      const combinedNotes = [notes.trim(), intendedUse.trim() ? `Intended use: ${intendedUse.trim()}` : ""]
        .filter(Boolean)
        .join("\n");

      const inKindDonationPayload: Record<string, unknown> = {
        supporter_id,
        donation_type: "In-Kind",
        donation_date: donationDate.trim(),
        is_recurring: false,
        channel_source: "donor_portal",
        submission_status: "pending",
        goods_receipt_status: "not_received",
        fulfillment_method: fulfillmentMethod,
        estimated_value: lineTotal,
        notes: combinedNotes || null,
      };

      let donationRes = await supabase.from("donations").insert(inKindDonationPayload).select("donation_id").single();
      if (donationRes.error && isMissingDonationWorkflowColumnMessage(donationRes.error.message)) {
        donationRes = await supabase
          .from("donations")
          .insert(stripDonationWorkflowFields(inKindDonationPayload))
          .select("donation_id")
          .single();
      }

      const donationRow = donationRes.data;
      const donErr = donationRes.error;

      if (donErr || donationRow?.donation_id == null) {
        throw new Error(donErr?.message || "Could not create the donation record.");
      }

      const donation_id = Number(donationRow.donation_id);
      const { error: itemErr } = await supabase.from("in_kind_donation_items").insert({
        donation_id,
        item_name: itemName.trim(),
        item_category: categoryFinal,
        quantity,
        unit_of_measure: unitOfMeasure.trim() || null,
        estimated_unit_value: unitValue,
        intended_use: intendedUse.trim() || null,
        received_condition: "Pending receipt",
      });

      if (itemErr) throw new Error(itemErr.message || "Could not save item details.");

      onRecorded();
      onOpenChange(false);
      reset();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Could not save your entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-lg rounded-2xl border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-foreground">Log an in-kind gift</DialogTitle>
          <DialogDescription>
            Describe the goods you are giving. If you are shipping them or bringing them in person, choose how they will arrive. Staff will
            confirm when they are received.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Gift date</span>
            <input
              type="date"
              value={donationDate}
              onChange={(e) => setDonationDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Item name</span>
            <input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              disabled={saving}
              placeholder="e.g. Baby formula, winter jackets"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Category</span>
            <select
              value={itemCategory}
              onChange={(e) => setItemCategory(e.target.value)}
              className={selectClass}
              disabled={saving}
            >
              {IN_KIND_ITEM_CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          {itemCategory === "Other" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Describe category</span>
              <input
                value={itemCategoryOther}
                onChange={(e) => setItemCategoryOther(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                disabled={saving}
                placeholder="e.g. Sports equipment, musical instruments"
              />
            </label>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Quantity</span>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={quantityRaw}
                onChange={(e) => setQuantityRaw(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                disabled={saving}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Unit of measure</span>
              <input
                value={unitOfMeasure}
                onChange={(e) => setUnitOfMeasure(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                disabled={saving}
                placeholder="e.g. box, pallet, item"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Estimated value per unit (USD)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={estimatedUnitValueRaw}
              onChange={(e) => setEstimatedUnitValueRaw(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>
          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-foreground">How will we receive this?</legend>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="fulfillment"
                  checked={fulfillmentMethod === "ship"}
                  onChange={() => setFulfillmentMethod("ship")}
                  disabled={saving}
                />
                I will ship it
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="fulfillment"
                  checked={fulfillmentMethod === "deliver_in_person"}
                  onChange={() => setFulfillmentMethod("deliver_in_person")}
                  disabled={saving}
                />
                I will deliver in person
              </label>
            </div>
          </fieldset>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Intended use (optional)</span>
            <input
              value={intendedUse}
              onChange={(e) => setIntendedUse(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>
          {errorMessage ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{errorMessage}</p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/40"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Saving…" : "Submit for review"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
