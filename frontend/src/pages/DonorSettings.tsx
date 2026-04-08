import { useEffect, useMemo, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, Loader2, Pencil, Plus, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function DonorSettings() {
  const { isLoading: authLoading, userId, userEmail, firstName, lastName, displayName, initials } = useAuth();

  const [newsletter, setNewsletter] = useState(true);
  const [impactAlerts, setImpactAlerts] = useState(true);

  const sessionName = useMemo(() => {
    const combined = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (combined) return combined;
    return displayName?.trim() ?? "";
  }, [firstName, lastName, displayName]);

  const sessionEmail = userEmail?.trim() ?? "";

  const [profileDraft, setProfileDraft] = useState({ name: "", email: "" });
  const [profileSaved, setProfileSaved] = useState({ name: "", email: "" });
  const [profileIsEditing, setProfileIsEditing] = useState(false);
  const [profileIsSaving, setProfileIsSaving] = useState(false);

  /** Hydrate from auth when the session is known; do not clobber drafts while editing. */
  useEffect(() => {
    if (authLoading || !sessionEmail) return;
    const next = { name: sessionName, email: sessionEmail };
    if (!profileIsEditing) {
      setProfileSaved(next);
      setProfileDraft(next);
    }
  }, [authLoading, userId, sessionEmail, sessionName, profileIsEditing]);

  const [billingAddress, setBillingAddress] = useState<string>("");
  const [billingDraft, setBillingDraft] = useState({
    street: "",
    city: "",
    region: "",
    postal: "",
  });
  const [billingIsEditing, setBillingIsEditing] = useState(false);
  const [billingIsSaving, setBillingIsSaving] = useState(false);

  const [savedCards, setSavedCards] = useState<{ brand: "Visa"; last4: string; expiry: string }[]>([]);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardDraft, setCardDraft] = useState({ number: "", expiry: "", cvv: "" });
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardIsSaving, setCardIsSaving] = useState(false);

  const profileNameError = useMemo(() => {
    if (!profileDraft.name.trim()) return "Name is required.";
    if (profileDraft.name.trim().length < 2) return "Name must be at least 2 characters.";
    return null;
  }, [profileDraft.name]);

  const profileEmailError = useMemo(() => {
    const email = profileDraft.email.trim();
    if (!email) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
    return null;
  }, [profileDraft.email]);

  const canSaveProfile = profileIsEditing && !profileIsSaving && !profileNameError && !profileEmailError;

  const showProfileSkeleton = authLoading;
  const identityMissing = !authLoading && !sessionEmail;

  const inputClassName =
    "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground " +
    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 disabled:opacity-60";

  const resetCardDraft = () => {
    setCardDraft({ number: "", expiry: "", cvv: "" });
    setCardError(null);
    setCardIsSaving(false);
  };

  const openCardModal = () => {
    resetCardDraft();
    setCardModalOpen(true);
  };

  const digitsOnly = (value: string) => value.replace(/\D/g, "");

  const deriveLast4 = (value: string) => {
    const digits = digitsOnly(value);
    const last4 = digits.slice(-4);
    return last4.length === 4 ? last4 : "4242";
  };

  const validateCardDraft = () => {
    const numberDigits = digitsOnly(cardDraft.number);
    if (numberDigits.length < 12) return "Card number looks too short.";
    if (!/^\d{2}\/\d{2}$/.test(cardDraft.expiry.trim())) return "Expiry must be in MM/YY format.";
    if (!/^\d{3,4}$/.test(digitsOnly(cardDraft.cvv))) return "CVV must be 3–4 digits.";
    return null;
  };

  const formatExpiryMasked = (raw: string) => {
    const digits = digitsOnly(raw).slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const parseAddressFromString = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return { street: "", city: "", region: "", postal: "" };

    const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
    const street = parts[0] ?? "";
    const city = parts[1] ?? "";
    const regionAndPostal = parts.slice(2).join(" ").trim();
    const match = regionAndPostal.match(/^(.*?)(?:\s+(\S+))?$/);
    const region = (match?.[1] ?? "").trim();
    const postal = (match?.[2] ?? "").trim();
    return { street, city, region, postal };
  };

  const formatAddressString = (a: { street: string; city: string; region: string; postal: string }) => {
    const street = a.street.trim();
    const city = a.city.trim();
    const region = a.region.trim();
    const postal = a.postal.trim();

    const line1 = street;
    const line2 = [city, [region, postal].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    return [line1, line2].filter(Boolean).join(", ");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-card rounded-2xl p-6 shadow-warm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-base font-semibold text-foreground mb-1">Personal Info</h3>
            <p className="text-sm text-muted-foreground">Basic account information used for your donor profile.</p>

            {showProfileSkeleton ? (
              <div className="mt-5 flex items-center gap-4">
                <div className="h-14 w-14 shrink-0 rounded-full bg-muted animate-pulse" aria-hidden />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-40 max-w-full rounded bg-muted animate-pulse" />
                  <div className="h-3 w-56 max-w-full rounded bg-muted animate-pulse" />
                </div>
              </div>
            ) : identityMissing ? (
              <div className="mt-5 flex items-center gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-muted/30 text-sm font-semibold text-muted-foreground"
                  aria-hidden
                >
                  —
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Profile details aren&apos;t available yet.</p>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex items-center gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-warm"
                  aria-hidden
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{sessionName || "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{sessionEmail}</p>
                </div>
              </div>
            )}
          </div>

          {!showProfileSkeleton && !identityMissing && !profileIsEditing ? (
            <button
              type="button"
              onClick={() => {
                setProfileDraft({ ...profileSaved });
                setProfileIsEditing(true);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 transition-colors shrink-0"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
            {showProfileSkeleton ? (
              <div className="mt-3 h-5 w-3/4 max-w-[12rem] rounded bg-muted animate-pulse" />
            ) : identityMissing ? (
              <p className="mt-1 text-sm text-muted-foreground">—</p>
            ) : profileIsEditing ? (
              <div className="mt-2">
                <input
                  value={profileDraft.name}
                  onChange={(e) => setProfileDraft((current) => ({ ...current, name: e.target.value }))}
                  disabled={profileIsSaving}
                  className={inputClassName}
                  placeholder="Full name"
                />
                {profileNameError ? <p className="mt-2 text-xs text-destructive">{profileNameError}</p> : null}
              </div>
            ) : (
              <p className="mt-1 text-sm font-semibold text-foreground">{profileSaved.name || "—"}</p>
            )}
          </div>
          <div className="rounded-xl border border-border/70 bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
            {showProfileSkeleton ? (
              <div className="mt-3 h-5 w-full max-w-[14rem] rounded bg-muted animate-pulse" />
            ) : identityMissing ? (
              <p className="mt-1 text-sm text-muted-foreground">—</p>
            ) : profileIsEditing ? (
              <div className="mt-2">
                <input
                  value={profileDraft.email}
                  onChange={(e) => setProfileDraft((current) => ({ ...current, email: e.target.value }))}
                  disabled={profileIsSaving}
                  className={inputClassName}
                  placeholder="email@example.com"
                />
                {profileEmailError ? <p className="mt-2 text-xs text-destructive">{profileEmailError}</p> : null}
              </div>
            ) : (
              <p className="mt-1 text-sm font-semibold text-foreground">{profileSaved.email || "—"}</p>
            )}
          </div>
        </div>

        {!showProfileSkeleton && !identityMissing && profileIsEditing ? (
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={profileIsSaving}
              onClick={() => {
                setProfileDraft(profileSaved);
                setProfileIsEditing(false);
              }}
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSaveProfile}
              onClick={async () => {
                setProfileIsSaving(true);
                await new Promise((r) => setTimeout(r, 1000));
                setProfileSaved({ name: profileDraft.name.trim(), email: profileDraft.email.trim() });
                setProfileIsSaving(false);
                setProfileIsEditing(false);
                toast.success("Changes saved successfully!");
              }}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-warm hover:shadow-warm-hover transition-shadow disabled:opacity-60 inline-flex items-center gap-2"
            >
              {profileIsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {profileIsSaving ? "Saving..." : "Save"}
            </button>
          </div>
        ) : null}
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-warm">
        <h3 className="font-heading text-base font-semibold text-foreground mb-1">Payment &amp; Billing</h3>
        <p className="text-sm text-muted-foreground">Saved payment methods and billing details will appear here.</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Saved cards</p>
            {savedCards.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-muted/40 p-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">No payment methods yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Add a card for faster checkout during the demo.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openCardModal}
                  className="shrink-0 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-warm hover:shadow-warm-hover transition-shadow"
                >
                  <Plus className="h-4 w-4" />
                  Add Card
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {savedCards.map((card) => (
                  <div key={`${card.brand}-${card.last4}-${card.expiry}`} className="rounded-xl border border-border/70 bg-background p-4">
                    <p className="text-sm font-semibold text-foreground">
                      {card.brand} ending in {card.last4}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Expires {card.expiry}</p>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={openCardModal}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add another card
                </button>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border/70 bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Billing address</p>
            {!billingIsEditing ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">{billingAddress.trim() ? billingAddress : "Not on file."}</p>
                <button
                  type="button"
                  onClick={() => {
                    const next = billingAddress.trim()
                      ? parseAddressFromString(billingAddress)
                      : {
                          street: "123 Bella Way",
                          city: "Manila",
                          region: "Metro Manila",
                          postal: "1000",
                        };
                    setBillingDraft(next);
                    setBillingIsEditing(true);
                  }}
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  {billingAddress.trim() ? "Edit" : "Add Address"} →
                </button>
              </>
            ) : (
              <div className="mt-3">
                <div className="grid gap-3">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-foreground">Street Address</span>
                    <input
                      value={billingDraft.street}
                      onChange={(e) => setBillingDraft((c) => ({ ...c, street: e.target.value }))}
                      disabled={billingIsSaving}
                      className={inputClassName}
                      placeholder="123 Bella Way"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-foreground">City</span>
                      <input
                        value={billingDraft.city}
                        onChange={(e) => setBillingDraft((c) => ({ ...c, city: e.target.value }))}
                        disabled={billingIsSaving}
                        className={inputClassName}
                        placeholder="Manila"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-foreground">State/Province</span>
                      <input
                        value={billingDraft.region}
                        onChange={(e) => setBillingDraft((c) => ({ ...c, region: e.target.value }))}
                        disabled={billingIsSaving}
                        className={inputClassName}
                        placeholder="Metro Manila"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-foreground">Zip/Postal Code</span>
                    <input
                      value={billingDraft.postal}
                      onChange={(e) => setBillingDraft((c) => ({ ...c, postal: e.target.value }))}
                      disabled={billingIsSaving}
                      className={inputClassName}
                      placeholder="1000"
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={billingIsSaving}
                    onClick={() => {
                      setBillingDraft({ street: "", city: "", region: "", postal: "" });
                      setBillingIsEditing(false);
                    }}
                    className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={billingIsSaving || !billingDraft.street.trim() || !billingDraft.city.trim()}
                    onClick={async () => {
                      setBillingIsSaving(true);
                      await new Promise((r) => setTimeout(r, 500));
                      setBillingAddress(formatAddressString(billingDraft));
                      setBillingIsSaving(false);
                      setBillingIsEditing(false);
                      toast.success("Changes saved successfully!");
                    }}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-warm hover:shadow-warm-hover transition-shadow disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {billingIsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {billingIsSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-warm">
        <h3 className="font-heading text-base font-semibold text-foreground mb-1">Communication</h3>
        <p className="text-sm text-muted-foreground">Choose what updates you want to receive.</p>

        <div className="mt-5 space-y-3">
          <label className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Newsletter</p>
              <p className="text-xs text-muted-foreground mt-1">Monthly updates and stories from the foundation.</p>
            </div>
            <input
              type="checkbox"
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
              className="h-5 w-5 accent-[hsl(var(--primary))]"
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Impact alerts</p>
              <p className="text-xs text-muted-foreground mt-1">Occasional messages when your giving powers new programs.</p>
            </div>
            <input
              type="checkbox"
              checked={impactAlerts}
              onChange={(e) => setImpactAlerts(e.target.checked)}
              className="h-5 w-5 accent-[hsl(var(--primary))]"
            />
          </label>
        </div>
      </div>

      <Dialog
        open={cardModalOpen}
        onOpenChange={(open) => {
          setCardModalOpen(open);
          if (!open) resetCardDraft();
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-border p-0">
          <div className="p-6 sm:p-7">
            <DialogHeader className="pr-8">
              <DialogTitle className="font-heading text-2xl text-foreground">Add payment method</DialogTitle>
              <DialogDescription>This is a demo form. No real payment details are stored.</DialogDescription>
            </DialogHeader>

            <form
              className="mt-6 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setCardError(null);

                const err = validateCardDraft();
                if (err) {
                  setCardError(err);
                  return;
                }

                setCardIsSaving(true);
                await new Promise((r) => setTimeout(r, 900));

                setSavedCards((current) => [
                  { brand: "Visa", last4: deriveLast4(cardDraft.number), expiry: cardDraft.expiry.trim() || "12/34" },
                  ...current,
                ]);
                setCardIsSaving(false);
                setCardModalOpen(false);
                toast.success("Changes saved successfully!");
              }}
            >
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Card Number</span>
                <input
                  value={cardDraft.number}
                  onChange={(e) => setCardDraft((c) => ({ ...c, number: e.target.value }))}
                  disabled={cardIsSaving}
                  placeholder="4242 4242 4242 4242"
                  className={inputClassName}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-foreground">Expiry</span>
                  <input
                    value={cardDraft.expiry}
                    onChange={(e) => setCardDraft((c) => ({ ...c, expiry: formatExpiryMasked(e.target.value) }))}
                    disabled={cardIsSaving}
                    placeholder="MM/YY"
                    className={inputClassName}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-foreground">CVV</span>
                  <input
                    value={cardDraft.cvv}
                    onChange={(e) => setCardDraft((c) => ({ ...c, cvv: e.target.value }))}
                    disabled={cardIsSaving}
                    placeholder="123"
                    className={inputClassName}
                  />
                </label>
              </div>

              {cardError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {cardError}
                </div>
              ) : null}

              {cardIsSaving ? (
                <div className="rounded-2xl bg-primary/5 p-4 text-sm text-primary">Processing...</div>
              ) : null}

              <DialogFooter className="gap-2 sm:gap-2">
                <button
                  type="button"
                  disabled={cardIsSaving}
                  onClick={() => setCardModalOpen(false)}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cardIsSaving}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-warm hover:shadow-warm-hover transition-shadow disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {cardIsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {cardIsSaving ? "Saving..." : "Save Card"}
                </button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

