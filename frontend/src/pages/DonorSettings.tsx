import { useEffect, useMemo, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { CheckCircle2, ChevronRight, Loader2, Pencil, Save, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { findOrCreateSupporter } from "@/lib/supporterRecord";

const autoCapitalizeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());

const digitsOnly = (value: string) => value.replace(/\D/g, "");

function displayRecordValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value).trim();
  return text.length ? text : "—";
}

export default function DonorSettings() {
  const { isLoading: authLoading, userId, userEmail, firstName, lastName, displayName, initials, role, setAuthFromProfile } = useAuth();

  const [newsletter, setNewsletter] = useState(true);
  const [impactAlerts, setImpactAlerts] = useState(true);
  const [savedCommunication, setSavedCommunication] = useState({ newsletter: true, impactAlerts: true });
  const [preferencesIsSaving, setPreferencesIsSaving] = useState(false);

  const sessionName = useMemo(() => {
    const combined = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (combined) return combined;
    return displayName?.trim() ?? "";
  }, [firstName, lastName, displayName]);

  const sessionEmail = userEmail?.trim() ?? "";

  const [profileDraft, setProfileDraft] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    email: "",
    phone: "",
    region: "",
    country: "",
    organizationName: "",
  });
  const [profileSaved, setProfileSaved] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    email: "",
    phone: "",
    region: "",
    country: "",
    organizationName: "",
  });
  const [profileIsEditing, setProfileIsEditing] = useState(false);
  const [profileIsSaving, setProfileIsSaving] = useState(false);

  /** Baseline hydrate from auth until DB rows load; do not clobber drafts while editing. */
  useEffect(() => {
    if (authLoading || !sessionEmail) return;
    const next = {
      firstName: firstName?.trim() ?? "",
      lastName: lastName?.trim() ?? "",
      displayName: displayName?.trim() ?? "",
      email: sessionEmail,
      phone: "",
      region: "",
      country: "",
      organizationName: "",
    };
    if (!profileIsEditing) {
      setProfileSaved(next);
      setProfileDraft(next);
    }
  }, [authLoading, displayName, firstName, lastName, sessionEmail, profileIsEditing]);

  useEffect(() => {
    if (!userId) return;
    const key = `donor-communication-preferences:${userId}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{ newsletter: boolean; impactAlerts: boolean }>;
      const next = {
        newsletter: parsed.newsletter !== false,
        impactAlerts: parsed.impactAlerts !== false,
      };
      setNewsletter(next.newsletter);
      setImpactAlerts(next.impactAlerts);
      setSavedCommunication(next);
    } catch {
      // Ignore malformed local storage and keep defaults.
    }
  }, [userId]);

  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerifiedActive, setMfaVerifiedActive] = useState(false);
  const [profileRecord, setProfileRecord] = useState<Record<string, unknown> | null>(null);
  const [supporterRecord, setSupporterRecord] = useState<Record<string, unknown> | null>(null);
  const [recordIsLoading, setRecordIsLoading] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [additionalInfoOpen, setAdditionalInfoOpen] = useState(false);

  useEffect(() => {
    if (authLoading || !sessionEmail || !supabase) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (cancelled || error) return;
      const verifiedTotp = data?.totp?.some((f) => f.status === "verified") ?? false;
      if (!cancelled) setMfaVerifiedActive(verifiedTotp);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, sessionEmail, userId]);

  useEffect(() => {
    if (!supabase || !userId) {
      setProfileRecord(null);
      setSupporterRecord(null);
      setRecordError(null);
      setRecordIsLoading(false);
      return;
    }

    let cancelled = false;
    setRecordIsLoading(true);
    setRecordError(null);

    (async () => {
      const { data: profileRow, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (cancelled) return;
      if (profileErr) {
        setRecordError(profileErr.message || "Could not load profile record.");
        setRecordIsLoading(false);
        return;
      }

      setProfileRecord((profileRow as Record<string, unknown>) ?? null);

      const supporterIdRaw = profileRow?.supporter_id;
      const supporterId = supporterIdRaw == null ? null : Number(supporterIdRaw);
      const normalizedEmail = (profileRow?.email ?? userEmail ?? "").toString().trim();

      let supporterRow: Record<string, unknown> | null = null;
      if (Number.isFinite(supporterId)) {
        const { data, error } = await supabase
          .from("supporters")
          .select("*")
          .eq("supporter_id", supporterId as number)
          .maybeSingle();
        if (!error && data) supporterRow = data as Record<string, unknown>;
      } else if (normalizedEmail) {
        const { data, error } = await supabase
          .from("supporters")
          .select("*")
          .eq("email", normalizedEmail)
          .maybeSingle();
        if (!error && data) supporterRow = data as Record<string, unknown>;
      }

      if (cancelled) return;
      setSupporterRecord(supporterRow);
      const next = {
        firstName: String(supporterRow?.first_name ?? "").trim(),
        lastName: String(supporterRow?.last_name ?? "").trim(),
        displayName: String(supporterRow?.display_name ?? "").trim(),
        email: String(profileRow?.email ?? userEmail ?? "").trim(),
        phone: String(supporterRow?.phone ?? "").trim(),
        region: String(supporterRow?.region ?? "").trim(),
        country: String(supporterRow?.country ?? "").trim(),
        organizationName: String(supporterRow?.organization_name ?? "").trim(),
      };
      if (!profileIsEditing) {
        setProfileSaved(next);
        setProfileDraft(next);
      }
      setRecordIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [firstName, lastName, profileIsEditing, userEmail, userId]);

  const profileFirstNameError = useMemo(() => {
    if (!profileDraft.firstName.trim()) return "First name is required.";
    if (profileDraft.firstName.trim().length < 2) return "First name must be at least 2 characters.";
    return null;
  }, [profileDraft.firstName]);

  const profileLastNameError = useMemo(() => {
    if (!profileDraft.lastName.trim()) return "Last name is required.";
    if (profileDraft.lastName.trim().length < 2) return "Last name must be at least 2 characters.";
    return null;
  }, [profileDraft.lastName]);

  const profileEmailError = useMemo(() => {
    const email = profileDraft.email.trim();
    if (!email) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
    return null;
  }, [profileDraft.email]);

  const canSaveProfile =
    profileIsEditing &&
    !profileIsSaving &&
    !profileFirstNameError &&
    !profileLastNameError &&
    !profileEmailError;
  const canSavePreferences =
    !preferencesIsSaving &&
    (newsletter !== savedCommunication.newsletter || impactAlerts !== savedCommunication.impactAlerts);

  const showProfileSkeleton = authLoading;
  const identityMissing = !authLoading && !sessionEmail;
  const displayFullName = `${profileSaved.firstName} ${profileSaved.lastName}`.trim() || sessionName || "—";

  const inputClassName =
    "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground " +
    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 disabled:opacity-60";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-card rounded-2xl p-6 shadow-warm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-base font-semibold text-foreground mb-1">Personal Info</h3>

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
                  <p className="text-sm font-semibold text-foreground truncate">
                    {displayFullName}
                    {role ? ` - ${role === "donor" ? "Donor" : "Admin"}` : ""}
                  </p>
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
          {[
            { key: "firstName", label: "First Name", required: true, placeholder: "First name" },
            { key: "lastName", label: "Last Name", required: true, placeholder: "Last name" },
            { key: "displayName", label: "Display Name (optional)", required: false, placeholder: "Display name" },
            { key: "email", label: "Email", required: true, placeholder: "email@example.com" },
            { key: "phone", label: "Phone", required: false, placeholder: "Phone number" },
            { key: "region", label: "Region", required: false, placeholder: "Region" },
            { key: "country", label: "Country", required: false, placeholder: "Country" },
            { key: "organizationName", label: "Organization Name (optional)", required: false, placeholder: "Organization" },
          ].map((field) => (
            <div key={field.key} className="rounded-xl border border-border/70 bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</p>
              {showProfileSkeleton ? (
                <div className="mt-3 h-5 w-3/4 max-w-[12rem] rounded bg-muted animate-pulse" />
              ) : identityMissing ? (
                <p className="mt-1 text-sm text-muted-foreground">—</p>
              ) : profileIsEditing ? (
                <div className="mt-2">
                  <input
                    value={String(profileDraft[field.key as keyof typeof profileDraft] ?? "")}
                    onChange={(e) =>
                      setProfileDraft((current) => ({
                        ...current,
                        [field.key]:
                          field.key === "firstName" || field.key === "lastName"
                            ? autoCapitalizeName(e.target.value)
                            : e.target.value,
                      }))
                    }
                    disabled={profileIsSaving}
                    className={inputClassName}
                    placeholder={field.placeholder}
                  />
                  {field.key === "firstName" && profileFirstNameError ? (
                    <p className="mt-2 text-xs text-destructive">{profileFirstNameError}</p>
                  ) : null}
                  {field.key === "lastName" && profileLastNameError ? (
                    <p className="mt-2 text-xs text-destructive">{profileLastNameError}</p>
                  ) : null}
                  {field.key === "email" && profileEmailError ? (
                    <p className="mt-2 text-xs text-destructive">{profileEmailError}</p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {displayRecordValue(profileSaved[field.key as keyof typeof profileSaved])}
                </p>
              )}
            </div>
          ))}
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
                try {
                  if (!supabase || !userId) {
                    throw new Error("Profile save is unavailable right now.");
                  }

                  const nextFirst = profileDraft.firstName.trim().replace(/\s+/g, " ");
                  const nextLast = profileDraft.lastName.trim().replace(/\s+/g, " ");
                  const nextDisplayName = profileDraft.displayName.trim().replace(/\s+/g, " ");
                  const nextEmail = profileDraft.email.trim();
                  const nextPhone = profileDraft.phone.trim();
                  const nextRegion = profileDraft.region.trim();
                  const nextCountry = profileDraft.country.trim();
                  const nextOrganizationName = profileDraft.organizationName.trim();

                  let supporterId = Number(profileRecord?.supporter_id ?? supporterRecord?.supporter_id ?? NaN);
                  if (!Number.isFinite(supporterId)) {
                    supporterId = await findOrCreateSupporter({
                      userId,
                      email: nextEmail,
                      firstName: nextFirst || null,
                      lastName: nextLast || null,
                    });
                  }

                  const { error: profileUpdateError } = await supabase
                    .from("profiles")
                    .update({
                      email: nextEmail,
                    })
                    .eq("id", userId);

                  if (profileUpdateError) throw profileUpdateError;

                  const { error: supporterUpdateError } = await supabase
                    .from("supporters")
                    .update({
                      first_name: nextFirst || null,
                      last_name: nextLast || null,
                      email: nextEmail,
                      display_name: nextDisplayName || null,
                      phone: nextPhone || null,
                      region: nextRegion || null,
                      country: nextCountry || null,
                      organization_name: nextOrganizationName || null,
                    })
                    .eq("supporter_id", supporterId);

                  if (supporterUpdateError) throw supporterUpdateError;

                  // Keep auth email in sync so future sessions show the new value.
                  if (nextEmail !== sessionEmail) {
                    const { error: authUpdateError } = await supabase.auth.updateUser({ email: nextEmail });
                    if (authUpdateError) throw authUpdateError;
                  }

                  setAuthFromProfile({
                    userId,
                    email: nextEmail,
                    role: role ?? "donor",
                    firstName: nextFirst || null,
                    lastName: nextLast || null,
                    displayName: nextDisplayName || null,
                    organizationName: nextOrganizationName || null,
                  });
                  const savedNext = {
                    firstName: nextFirst,
                    lastName: nextLast,
                    displayName: nextDisplayName,
                    email: nextEmail,
                    phone: nextPhone,
                    region: nextRegion,
                    country: nextCountry,
                    organizationName: nextOrganizationName,
                  };
                  setProfileSaved(savedNext);
                  setProfileDraft(savedNext);
                  setProfileRecord((current) =>
                    current
                      ? { ...current, email: nextEmail }
                      : current,
                  );
                  setSupporterRecord((current) => ({
                    ...(current ?? {}),
                    supporter_id: supporterId,
                    first_name: nextFirst || null,
                    last_name: nextLast || null,
                    email: nextEmail,
                    display_name: nextDisplayName || null,
                    phone: nextPhone || null,
                    region: nextRegion || null,
                    country: nextCountry || null,
                    organization_name: nextOrganizationName || null,
                  }));
                  setProfileIsEditing(false);
                  toast.success("Changes saved successfully!");
                } catch (e) {
                  const msg = e instanceof Error ? e.message : "Unable to save profile changes.";
                  toast.error(msg);
                } finally {
                  setProfileIsSaving(false);
                }
              }}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-warm hover:shadow-warm-hover transition-shadow disabled:opacity-60 inline-flex items-center gap-2"
            >
              {profileIsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {profileIsSaving ? "Saving..." : "Save"}
            </button>
          </div>
        ) : null}

        <div className="mt-6 border-t border-border/70 pt-4">
          <button
            type="button"
            onClick={() => setAdditionalInfoOpen((current) => !current)}
            className="flex w-full items-center justify-between rounded-xl border border-transparent bg-transparent px-4 py-3 text-left hover:bg-transparent transition-colors"
            aria-expanded={additionalInfoOpen}
          >
            <span className="text-sm font-medium text-foreground">Additional info</span>
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${additionalInfoOpen ? "rotate-90" : ""}`} />
          </button>

          {additionalInfoOpen ? (
            recordIsLoading ? (
              <div className="mt-3 rounded-xl border border-border/70 bg-background p-4 text-sm text-muted-foreground">
                Loading supporter details...
              </div>
            ) : recordError ? (
              <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {recordError}
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Supporter Type", value: supporterRecord?.supporter_type },
                  { label: "Relationship Type", value: supporterRecord?.relationship_type },
                  { label: "Created At", value: supporterRecord?.created_at },
                  { label: "First Donation Date", value: supporterRecord?.first_donation_date },
                  { label: "Acquisition Channel", value: supporterRecord?.acquisition_channel },
                ].map((row) => (
                  <div key={row.label} className="rounded-xl border border-border/70 bg-background p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{row.label}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{displayRecordValue(row.value)}</p>
                  </div>
                ))}
              </div>
            )
          ) : null}
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
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={!canSavePreferences}
            onClick={async () => {
              if (!userId) {
                toast.error("Please sign in again to save your preferences.");
                return;
              }
              setPreferencesIsSaving(true);
              try {
                const next = { newsletter, impactAlerts };
                window.localStorage.setItem(`donor-communication-preferences:${userId}`, JSON.stringify(next));
                setSavedCommunication(next);
                toast.success("Communication preferences saved.");
              } finally {
                setPreferencesIsSaving(false);
              }
            }}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-warm hover:shadow-warm-hover transition-shadow disabled:opacity-60 inline-flex items-center gap-2"
          >
            {preferencesIsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {preferencesIsSaving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-warm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted/40 p-2">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-base font-semibold text-foreground mb-1">Security</h3>
            <p className="text-sm text-muted-foreground">
              Protect your donor account with a code from an app like Google Authenticator or 1Password. Add a second step at sign-in with
              an authenticator app (TOTP).
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-border/70 bg-background p-4">
          {!supabase ? (
            <p className="text-sm text-muted-foreground">Sign-in is not configured; MFA is unavailable.</p>
          ) : mfaVerifiedActive ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
              MFA Protected
            </div>
          ) : mfaFactorId && mfaQrCode ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Scan this QR code with your authenticator app, then enter the 6-digit code to finish.
              </p>
              <div className="flex justify-center rounded-xl border border-border/60 bg-muted/20 p-4">
                <img src={mfaQrCode} alt="Scan to enroll authenticator" className="h-44 w-44 object-contain" />
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Verification code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(digitsOnly(e.target.value).slice(0, 6))}
                  disabled={mfaVerifying}
                  placeholder="000000"
                  className={inputClassName + " tracking-widest text-center text-lg font-mono"}
                />
              </label>
              {mfaError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{mfaError}</div>
              ) : null}
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  disabled={mfaVerifying}
                  onClick={() => {
                    setMfaFactorId(null);
                    setMfaQrCode(null);
                    setMfaCode("");
                    setMfaError(null);
                  }}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={mfaVerifying || mfaCode.length !== 6 || !mfaFactorId}
                  onClick={async () => {
                    if (!supabase || !mfaFactorId) return;
                    setMfaError(null);
                    setMfaVerifying(true);
                    try {
                      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                        factorId: mfaFactorId,
                      });
                      if (challengeError || !challengeData?.id) {
                        throw new Error(challengeError?.message || "Could not start MFA challenge.");
                      }
                      const { error: verifyError } = await supabase.auth.mfa.verify({
                        factorId: mfaFactorId,
                        challengeId: challengeData.id,
                        code: mfaCode,
                      });
                      if (verifyError) {
                        throw new Error(verifyError.message || "Invalid code. Try again.");
                      }
                      setMfaVerifiedActive(true);
                      setMfaFactorId(null);
                      setMfaQrCode(null);
                      setMfaCode("");
                      toast.success("Multi-factor authentication is now enabled.");
                    } catch (e) {
                      setMfaError(e instanceof Error ? e.message : "Verification failed.");
                    } finally {
                      setMfaVerifying(false);
                    }
                  }}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-warm hover:shadow-warm-hover transition-shadow disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {mfaVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {mfaVerifying ? "Verifying…" : "Verify & Activate"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {mfaError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{mfaError}</div>
              ) : null}
              <button
                type="button"
                disabled={mfaEnrolling || !sessionEmail}
                onClick={async () => {
                  if (!supabase) return;
                  setMfaError(null);
                  setMfaEnrolling(true);
                  try {
                    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app" });
                    if (error || !data?.id) {
                      throw new Error(error?.message || "Could not start MFA enrollment.");
                    }
                    const qr = data.totp?.qr_code;
                    if (!qr) {
                      throw new Error("No QR code was returned. Check that TOTP MFA is enabled for your Supabase project.");
                    }
                    setMfaFactorId(data.id);
                    setMfaQrCode(qr);
                    setMfaCode("");
                  } catch (e) {
                    setMfaError(e instanceof Error ? e.message : "Enrollment failed.");
                  } finally {
                    setMfaEnrolling(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-warm hover:shadow-warm-hover transition-shadow disabled:opacity-60"
              >
                {mfaEnrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {mfaEnrolling ? "Starting…" : "Enable Multi-Factor Authentication"}
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

