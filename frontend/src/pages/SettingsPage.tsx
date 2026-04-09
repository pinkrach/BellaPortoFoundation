import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { fetchJsonWithAuth } from "@/lib/api";
import { Building2, Lock, Save, ShieldCheck, Users, RefreshCcw, Mail } from "lucide-react";
import DonorSettings from "@/pages/DonorSettings";

type UserRole = "admin" | "donor";

type ProfileRecord = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: UserRole | null;
};

type SettingsState = {
  organization: {
    foundationName: string;
    logoUrl: string;
    contactEmail: string;
    phone: string;
    address: string;
    website: string;
    facebook: string;
    instagram: string;
    mission: string;
    receiptName: string;
    receiptTaxId: string;
  };
  security: {
    minPasswordLength: string;
    requireUppercase: boolean;
    requireSpecialCharacter: boolean;
    sessionTimeoutMinutes: string;
    mfaEnabled: boolean;
    loginActivityVisible: boolean;
  };
  donations: {
    defaultCurrency: string;
    donationCategories: string;
    recurringDonationsEnabled: boolean;
    receiptTemplate: string;
    acknowledgementMessage: string;
  };
};

const SETTINGS_STORAGE_KEY = "bella-bay-admin-settings-v1";

const defaultSettings: SettingsState = {
  organization: {
    foundationName: "Bella Bay Foundation",
    logoUrl: "",
    contactEmail: "support@bellabay.org",
    phone: "+63 912 345 6789",
    address: "Davao City, Philippines",
    website: "https://bellabay.org",
    facebook: "https://facebook.com/bellabayfoundation",
    instagram: "https://instagram.com/bellabayfoundation",
    mission:
      "Provide trauma-informed shelter, restoration, and long-term opportunity for girls and young women recovering from exploitation.",
    receiptName: "Bella Bay Foundation, Inc.",
    receiptTaxId: "TIN-000-000-000",
  },
  security: {
    minPasswordLength: "8",
    requireUppercase: true,
    requireSpecialCharacter: true,
    sessionTimeoutMinutes: "30",
    mfaEnabled: false,
    loginActivityVisible: true,
  },
  donations: {
    defaultCurrency: "PHP",
    donationCategories: "General fund\nEducation\nHealth\nSafehouse operations\nEmergency response",
    recurringDonationsEnabled: true,
    receiptTemplate: "Standard acknowledgment",
    acknowledgementMessage: "Thank you for helping protect and restore vulnerable girls.",
  },
};

const SettingsPage = () => {
  const { userId } = useAuth();
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [profileAdminMessage, setProfileAdminMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<SettingsState>;
      setSettings({
        ...defaultSettings,
        organization: { ...defaultSettings.organization, ...(parsed.organization ?? {}) },
        security: { ...defaultSettings.security, ...(parsed.security ?? {}) },
        donations: { ...defaultSettings.donations, ...(parsed.donations ?? {}) },
      });
    } catch {
      toast.error("Saved settings could not be loaded. Using defaults instead.");
    }
  }, []);

  useEffect(() => {
    const loadProfiles = async () => {
      setLoadingProfiles(true);
      setProfileAdminMessage(null);
      try {
        const data = await fetchJsonWithAuth<ProfileRecord[]>("/api/profiles");
        setProfiles(data ?? []);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load users right now.";
        if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
          setProfileAdminMessage(
            "User management needs SUPABASE_SERVICE_ROLE_KEY on the API (e.g. in frontend/.env for local dotnet run—use the plain name, not VITE_—or set it in your deployed backend environment).",
          );
        } else {
          toast.error(message);
        }
        setProfiles([]);
      } finally {
        setLoadingProfiles(false);
      }
    };

    loadProfiles();
  }, []);

  const totalAdmins = useMemo(
    () => profiles.filter((profile) => profile.role === "admin").length,
    [profiles],
  );
  const totalDonors = useMemo(
    () => profiles.filter((profile) => profile.role === "donor").length,
    [profiles],
  );

  const updateSection = <K extends keyof SettingsState>(
    section: K,
    value: SettingsState[K],
  ) => {
    setSettings((current) => ({
      ...current,
      [section]: value,
    }));
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      toast.success("Settings saved on this device.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRoleChange = async (profile: ProfileRecord, nextRole: UserRole) => {
    if (profile.id === userId && profile.role === "admin" && nextRole !== "admin") {
      toast.error("You cannot remove your own admin access from this screen.");
      return;
    }

    setUpdatingUserId(profile.id);
    try {
      await fetchJsonWithAuth<ProfileRecord>(`/api/profiles/${profile.id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: nextRole }),
      });

      setProfiles((current) =>
        current.map((item) => (item.id === profile.id ? { ...item, role: nextRole } : item)),
      );

      toast.success(`Updated ${profileLabel(profile)} to ${nextRole}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update that role right now.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const showPlannedAction = (action: string) => {
    toast.message(`${action} is not wired yet. This will need a secure admin backend flow.`);
  };

  return (
    <AdminLayout
      title="Settings"
      subtitle="Your profile, organization setup, and access rules"
    >
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { label: "Organization profile", value: settings.organization.foundationName, icon: Building2 },
            { label: "User accounts", value: `${profiles.length} total`, icon: Users },
            { label: "Security mode", value: settings.security.mfaEnabled ? "Elevated" : "Standard", icon: ShieldCheck },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-border/70 bg-card p-5 shadow-warm">
              <card.icon className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-xl font-bold text-foreground">{card.value}</p>
            </div>
          ))}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-warm">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">Admin settings console</h2>
            <p className="text-sm text-muted-foreground">
              Role changes update live profiles now. The other settings below save locally on this device until we add a shared settings table.
            </p>
          </div>
          <button
            type="button"
            onClick={saveSettings}
            disabled={savingSettings}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {savingSettings ? "Saving..." : "Save settings"}
          </button>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-2xl bg-muted/70 p-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="access">Access</TabsTrigger>
            <TabsTrigger value="personal">Personal</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-6">
            <DonorSettings />
          </TabsContent>

          <TabsContent value="general" className="space-y-6">
            <section className="grid gap-6 lg:grid-cols-2">
              <Card title="Organization profile" description="Public-facing foundation details and receipt information.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Foundation name">
                    <input
                      value={settings.organization.foundationName}
                      onChange={(event) =>
                        updateSection("organization", { ...settings.organization, foundationName: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Logo URL">
                    <input
                      value={settings.organization.logoUrl}
                      onChange={(event) =>
                        updateSection("organization", { ...settings.organization, logoUrl: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Contact email">
                    <input
                      type="email"
                      value={settings.organization.contactEmail}
                      onChange={(event) =>
                        updateSection("organization", { ...settings.organization, contactEmail: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      value={settings.organization.phone}
                      onChange={(event) =>
                        updateSection("organization", { ...settings.organization, phone: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Address">
                    <input
                      value={settings.organization.address}
                      onChange={(event) =>
                        updateSection("organization", { ...settings.organization, address: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Website">
                    <input
                      value={settings.organization.website}
                      onChange={(event) =>
                        updateSection("organization", { ...settings.organization, website: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Facebook">
                    <input
                      value={settings.organization.facebook}
                      onChange={(event) =>
                        updateSection("organization", { ...settings.organization, facebook: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Instagram">
                    <input
                      value={settings.organization.instagram}
                      onChange={(event) =>
                        updateSection("organization", { ...settings.organization, instagram: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                </div>
                <Field label="Mission statement">
                  <textarea
                    value={settings.organization.mission}
                    onChange={(event) =>
                      updateSection("organization", { ...settings.organization, mission: event.target.value })
                    }
                    rows={4}
                    className={textareaClassName}
                  />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Receipt business name">
                    <input
                      value={settings.organization.receiptName}
                      onChange={(event) =>
                        updateSection("organization", { ...settings.organization, receiptName: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Tax or business ID">
                    <input
                      value={settings.organization.receiptTaxId}
                      onChange={(event) =>
                        updateSection("organization", { ...settings.organization, receiptTaxId: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                </div>
              </Card>

              <Card title="Donations and finance" description="Campaign labels, currency defaults, and donor messaging.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Default currency">
                    <input
                      value={settings.donations.defaultCurrency}
                      onChange={(event) =>
                        updateSection("donations", { ...settings.donations, defaultCurrency: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Receipt template">
                    <input
                      value={settings.donations.receiptTemplate}
                      onChange={(event) =>
                        updateSection("donations", { ...settings.donations, receiptTemplate: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                </div>
                <Field label="Donation categories and campaign labels">
                  <textarea
                    value={settings.donations.donationCategories}
                    onChange={(event) =>
                      updateSection("donations", { ...settings.donations, donationCategories: event.target.value })
                    }
                    rows={5}
                    className={textareaClassName}
                  />
                </Field>
                <Toggle
                  label="Recurring donations enabled"
                  description="Control whether recurring donation flows are available."
                  checked={settings.donations.recurringDonationsEnabled}
                  onChange={(checked) =>
                    updateSection("donations", { ...settings.donations, recurringDonationsEnabled: checked })
                  }
                />
                <Field label="Acknowledgment message">
                  <textarea
                    value={settings.donations.acknowledgementMessage}
                    onChange={(event) =>
                      updateSection("donations", { ...settings.donations, acknowledgementMessage: event.target.value })
                    }
                    rows={4}
                    className={textareaClassName}
                  />
                </Field>
              </Card>
            </section>
          </TabsContent>

          <TabsContent value="access" className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
              <Card title="User and access management" description="View accounts and change who is an admin or donor.">
                {profileAdminMessage ? (
                  <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {profileAdminMessage}
                  </div>
                ) : null}
                <div className="mb-4 grid gap-4 sm:grid-cols-3">
                  <MiniStat label="Total accounts" value={String(profiles.length)} />
                  <MiniStat label="Admins" value={String(totalAdmins)} />
                  <MiniStat label="Donors" value={String(totalDonors)} />
                </div>

                <div className="rounded-2xl border border-border/70">
                  <div className="grid grid-cols-[minmax(0,1.3fr)_120px_120px] gap-3 border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Account</span>
                    <span>Status</span>
                    <span>Role</span>
                  </div>

                  {loadingProfiles ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">Loading users...</div>
                  ) : profiles.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">No profiles were returned from Supabase.</div>
                  ) : (
                    profiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="grid grid-cols-[minmax(0,1.3fr)_120px_120px] items-center gap-3 border-b border-border/50 px-4 py-3 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{profileLabel(profile)}</p>
                          <p className="truncate text-sm text-muted-foreground">{profile.email ?? "No email on file"}</p>
                        </div>
                        <span className="inline-flex w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                          Active
                        </span>
                        <select
                          value={profile.role === "admin" ? "admin" : "donor"}
                          disabled={updatingUserId === profile.id}
                          onChange={(event) => handleRoleChange(profile, event.target.value as UserRole)}
                          className={inputClassName}
                        >
                          <option value="admin">admin</option>
                          <option value="donor">donor</option>
                        </select>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card title="Admin actions" description="These actions need secure server-side auth workflows before they can be turned on.">
                <div className="space-y-3">
                  <ActionButton
                    icon={Mail}
                    title="Invite user"
                    description="Send a new account invitation by email."
                    onClick={() => showPlannedAction("Inviting users")}
                  />
                  <ActionButton
                    icon={Lock}
                    title="Disable account"
                    description="Suspend access without deleting the profile."
                    onClick={() => showPlannedAction("Disabling accounts")}
                  />
                  <ActionButton
                    icon={RefreshCcw}
                    title="Reset access"
                    description="Force a password or access reset for a selected user."
                    onClick={() => showPlannedAction("Resetting user access")}
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-dashed border-border/70 bg-background px-4 py-4 text-sm text-muted-foreground">
                  Right now, the live part of access management is role updates on existing profiles. Invite, disable, and reset actions should be added through a protected backend or Supabase admin function so donors cannot trigger them from the browser.
                </div>
              </Card>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

const inputClassName =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25";

const textareaClassName =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25";

const Card = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl bg-card p-6 shadow-warm">
    <h2 className="font-heading text-2xl font-bold text-foreground">{title}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    <div className="mt-5 space-y-4">{children}</div>
  </section>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>
    {children}
  </label>
);

const Toggle = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex items-start gap-3 rounded-xl border border-border/70 bg-background px-3 py-3">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-1"
    />
    <span>
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <span className="block text-xs text-muted-foreground">{description}</span>
    </span>
  </label>
);

const MiniStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
  </div>
);

const ActionButton = ({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-start gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
  >
    <Icon className="mt-0.5 h-5 w-5 text-primary" />
    <span>
      <span className="block text-sm font-medium text-foreground">{title}</span>
      <span className="block text-xs text-muted-foreground">{description}</span>
    </span>
  </button>
);

const profileLabel = (profile: ProfileRecord) => {
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return fullName || profile.email || "Unnamed user";
};

export default SettingsPage;
