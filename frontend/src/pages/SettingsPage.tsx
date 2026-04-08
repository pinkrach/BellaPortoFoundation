import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { fetchJsonWithAuth } from "@/lib/api";
import {
  Activity,
  Bell,
  Building2,
  Globe,
  HeartHandshake,
  Lock,
  Save,
  Server,
  ShieldCheck,
  Users,
  RefreshCcw,
  Mail,
} from "lucide-react";

type UserRole = "admin" | "donor";

type ProfileRecord = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: UserRole | null;
};

type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
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
  workflow: {
    defaultCaseStatus: string;
    defaultRiskLevel: string;
    defaultSafehouse: string;
    socialWorkerAssignmentDefault: string;
    visitTypeOptions: string;
    sessionTypeOptions: string;
    conferenceStatusOptions: string;
    residentFieldsRequired: boolean;
    recordingFieldsRequired: boolean;
    visitationFieldsRequired: boolean;
    restrictedNotesAdminsOnly: boolean;
    defaultSortOrder: string;
    paginationSize: string;
    archiveBehavior: string;
  };
  notifications: {
    newDonationAlerts: boolean;
    highRiskResidentAlerts: boolean;
    caseConferenceReminders: boolean;
    overdueVisitationsAlerts: boolean;
    missingRecordingsAlerts: boolean;
  };
  analytics: {
    modelRefreshEnabled: boolean;
    lastRefreshTime: string;
    highPotentialThreshold: string;
    analyticsDataSource: string;
    refreshAccess: string;
  };
  donations: {
    defaultCurrency: string;
    donationCategories: string;
    recurringDonationsEnabled: boolean;
    receiptTemplate: string;
    acknowledgementMessage: string;
  };
  privacy: {
    cookieConsentText: string;
    privacyPolicyUrl: string;
    dataRetentionPolicy: string;
    exportDeleteRules: string;
    restrictedNotesAccess: string;
  };
  integrations: {
    supabaseStatus: string;
    backendApiStatus: string;
    emailProviderStatus: string;
    stripeStatus: string;
    metaStatus: string;
    googleSheetsStatus: string;
  };
  system: {
    environmentStatus: string;
    backendReachable: string;
    lastSyncTime: string;
    buildVersion: string;
  };
  auditLog: AuditEntry[];
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
  workflow: {
    defaultCaseStatus: "Open",
    defaultRiskLevel: "Medium",
    defaultSafehouse: "Auto-select current safehouse",
    socialWorkerAssignmentDefault: "Manual assignment",
    visitTypeOptions: "Home visit\nCase conference\nSchool coordination\nHospital visit",
    sessionTypeOptions: "Individual counseling\nGroup processing\nIntake\nReintegration planning",
    conferenceStatusOptions: "Scheduled\nCompleted\nRescheduled\nCancelled",
    residentFieldsRequired: true,
    recordingFieldsRequired: true,
    visitationFieldsRequired: true,
    restrictedNotesAdminsOnly: true,
    defaultSortOrder: "Most recent first",
    paginationSize: "25",
    archiveBehavior: "Soft archive",
  },
  notifications: {
    newDonationAlerts: true,
    highRiskResidentAlerts: true,
    caseConferenceReminders: true,
    overdueVisitationsAlerts: true,
    missingRecordingsAlerts: true,
  },
  analytics: {
    modelRefreshEnabled: true,
    lastRefreshTime: "Not yet refreshed",
    highPotentialThreshold: "0.75",
    analyticsDataSource: "Saved snapshot",
    refreshAccess: "Admins only",
  },
  donations: {
    defaultCurrency: "PHP",
    donationCategories: "General fund\nEducation\nHealth\nSafehouse operations\nEmergency response",
    recurringDonationsEnabled: true,
    receiptTemplate: "Standard acknowledgment",
    acknowledgementMessage: "Thank you for helping protect and restore vulnerable girls.",
  },
  privacy: {
    cookieConsentText:
      "We use essential and analytics cookies to improve donor experience and measure site performance.",
    privacyPolicyUrl: "/privacy",
    dataRetentionPolicy: "Retain resident case data for the policy-approved operational window.",
    exportDeleteRules: "Sensitive resident exports require admin review before release or deletion.",
    restrictedNotesAccess: "Admins only",
  },
  integrations: {
    supabaseStatus: "Connected",
    backendApiStatus: "Connected",
    emailProviderStatus: "Needs setup",
    stripeStatus: "Not connected",
    metaStatus: "Not connected",
    googleSheetsStatus: "Not connected",
  },
  system: {
    environmentStatus: "Production",
    backendReachable: "Reachable",
    lastSyncTime: "Not tracked yet",
    buildVersion: "v1",
  },
  auditLog: [],
};

const SettingsPage = () => {
  const { displayName, userId } = useAuth();
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
        ...parsed,
        organization: { ...defaultSettings.organization, ...(parsed.organization ?? {}) },
        security: { ...defaultSettings.security, ...(parsed.security ?? {}) },
        workflow: { ...defaultSettings.workflow, ...(parsed.workflow ?? {}) },
        notifications: { ...defaultSettings.notifications, ...(parsed.notifications ?? {}) },
        analytics: { ...defaultSettings.analytics, ...(parsed.analytics ?? {}) },
        donations: { ...defaultSettings.donations, ...(parsed.donations ?? {}) },
        privacy: { ...defaultSettings.privacy, ...(parsed.privacy ?? {}) },
        integrations: { ...defaultSettings.integrations, ...(parsed.integrations ?? {}) },
        system: { ...defaultSettings.system, ...(parsed.system ?? {}) },
        auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : [],
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
            "User management needs the backend SUPABASE_SERVICE_ROLE_KEY before it can list all users or change roles securely.",
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

  const pushAuditEntry = (entry: Omit<AuditEntry, "id" | "timestamp">) => {
    setSettings((current) => ({
      ...current,
      auditLog: [
        {
          ...entry,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
        ...current.auditLog,
      ].slice(0, 20),
    }));
  };

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
      pushAuditEntry({
        actor: displayName ?? "Current admin",
        action: "Saved settings",
        target: "Admin settings console",
      });
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

      pushAuditEntry({
        actor: displayName ?? "Current admin",
        action: `Changed role to ${nextRole}`,
        target: profileLabel(profile),
      });
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
      subtitle="Admin controls for organization setup, access rules, workflow defaults, alerts, and system visibility"
    >
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Organization profile", value: settings.organization.foundationName, icon: Building2 },
            { label: "User accounts", value: `${profiles.length} total`, icon: Users },
            { label: "Security mode", value: settings.security.mfaEnabled ? "Elevated" : "Standard", icon: ShieldCheck },
            { label: "System health", value: settings.system.backendReachable, icon: Server },
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
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

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

            <Card title="Authentication and security" description="Current password, session, and login visibility controls.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Minimum password length">
                  <input
                    type="number"
                    min={8}
                    max={32}
                    value={settings.security.minPasswordLength}
                    onChange={(event) =>
                      updateSection("security", { ...settings.security, minPasswordLength: event.target.value })
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="Session timeout (minutes)">
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={settings.security.sessionTimeoutMinutes}
                    onChange={(event) =>
                      updateSection("security", { ...settings.security, sessionTimeoutMinutes: event.target.value })
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="Login activity visibility">
                  <select
                    value={settings.security.loginActivityVisible ? "visible" : "hidden"}
                    onChange={(event) =>
                      updateSection("security", {
                        ...settings.security,
                        loginActivityVisible: event.target.value === "visible",
                      })
                    }
                    className={inputClassName}
                  >
                    <option value="visible">Visible to admins</option>
                    <option value="hidden">Hidden for now</option>
                  </select>
                </Field>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Toggle
                  label="Require uppercase letters"
                  description="Keep a stricter password policy."
                  checked={settings.security.requireUppercase}
                  onChange={(checked) =>
                    updateSection("security", { ...settings.security, requireUppercase: checked })
                  }
                />
                <Toggle
                  label="Require special characters"
                  description="Add symbols to the minimum password rules."
                  checked={settings.security.requireSpecialCharacter}
                  onChange={(checked) =>
                    updateSection("security", { ...settings.security, requireSpecialCharacter: checked })
                  }
                />
                <Toggle
                  label="MFA toggle"
                  description="Keep this ready for later rollout."
                  checked={settings.security.mfaEnabled}
                  onChange={(checked) => updateSection("security", { ...settings.security, mfaEnabled: checked })}
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="workflow" className="space-y-6">
            <section className="grid gap-6 lg:grid-cols-2">
              <Card title="Workflow defaults" description="Case, risk, safehouse, and assignment defaults.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Default case status">
                    <input
                      value={settings.workflow.defaultCaseStatus}
                      onChange={(event) =>
                        updateSection("workflow", { ...settings.workflow, defaultCaseStatus: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Default risk level">
                    <input
                      value={settings.workflow.defaultRiskLevel}
                      onChange={(event) =>
                        updateSection("workflow", { ...settings.workflow, defaultRiskLevel: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Safehouse default">
                    <input
                      value={settings.workflow.defaultSafehouse}
                      onChange={(event) =>
                        updateSection("workflow", { ...settings.workflow, defaultSafehouse: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Social worker assignment default">
                    <input
                      value={settings.workflow.socialWorkerAssignmentDefault}
                      onChange={(event) =>
                        updateSection("workflow", {
                          ...settings.workflow,
                          socialWorkerAssignmentDefault: event.target.value,
                        })
                      }
                      className={inputClassName}
                    />
                  </Field>
                </div>
              </Card>

              <Card title="Forms and workflow settings" description="Required fields, archive behavior, and note visibility.">
                <div className="space-y-3">
                  <Toggle
                    label="Residents require key fields"
                    description="Treat resident profile essentials as required."
                    checked={settings.workflow.residentFieldsRequired}
                    onChange={(checked) =>
                      updateSection("workflow", { ...settings.workflow, residentFieldsRequired: checked })
                    }
                  />
                  <Toggle
                    label="Process recordings require key fields"
                    description="Keep session records complete before saving."
                    checked={settings.workflow.recordingFieldsRequired}
                    onChange={(checked) =>
                      updateSection("workflow", { ...settings.workflow, recordingFieldsRequired: checked })
                    }
                  />
                  <Toggle
                    label="Visitations require key fields"
                    description="Reduce incomplete home visitation entries."
                    checked={settings.workflow.visitationFieldsRequired}
                    onChange={(checked) =>
                      updateSection("workflow", { ...settings.workflow, visitationFieldsRequired: checked })
                    }
                  />
                  <Toggle
                    label="Restricted notes visible only to admins"
                    description="Keep sensitive notes out of broader staff views."
                    checked={settings.workflow.restrictedNotesAdminsOnly}
                    onChange={(checked) =>
                      updateSection("workflow", { ...settings.workflow, restrictedNotesAdminsOnly: checked })
                    }
                  />
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <Field label="Default sort order">
                    <input
                      value={settings.workflow.defaultSortOrder}
                      onChange={(event) =>
                        updateSection("workflow", { ...settings.workflow, defaultSortOrder: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Pagination size">
                    <input
                      value={settings.workflow.paginationSize}
                      onChange={(event) =>
                        updateSection("workflow", { ...settings.workflow, paginationSize: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Archive behavior">
                    <input
                      value={settings.workflow.archiveBehavior}
                      onChange={(event) =>
                        updateSection("workflow", { ...settings.workflow, archiveBehavior: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                </div>
              </Card>
            </section>

            <Card title="Dropdown defaults and option lists" description="Editable text lists for visit, session, and conference options.">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="visit-types">
                  <AccordionTrigger>Visit type options</AccordionTrigger>
                  <AccordionContent>
                    <textarea
                      value={settings.workflow.visitTypeOptions}
                      onChange={(event) =>
                        updateSection("workflow", { ...settings.workflow, visitTypeOptions: event.target.value })
                      }
                      rows={5}
                      className={textareaClassName}
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="session-types">
                  <AccordionTrigger>Session type options</AccordionTrigger>
                  <AccordionContent>
                    <textarea
                      value={settings.workflow.sessionTypeOptions}
                      onChange={(event) =>
                        updateSection("workflow", { ...settings.workflow, sessionTypeOptions: event.target.value })
                      }
                      rows={5}
                      className={textareaClassName}
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="conference-status">
                  <AccordionTrigger>Conference status options</AccordionTrigger>
                  <AccordionContent>
                    <textarea
                      value={settings.workflow.conferenceStatusOptions}
                      onChange={(event) =>
                        updateSection("workflow", { ...settings.workflow, conferenceStatusOptions: event.target.value })
                      }
                      rows={5}
                      className={textareaClassName}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <section className="grid gap-6 lg:grid-cols-2">
              <Card title="Notifications" description="Operational alerts for donations and resident follow-up.">
                <div className="space-y-3">
                  <Toggle
                    label="Email alerts for new donations"
                    description="Notify admins when donations are received."
                    checked={settings.notifications.newDonationAlerts}
                    onChange={(checked) =>
                      updateSection("notifications", { ...settings.notifications, newDonationAlerts: checked })
                    }
                  />
                  <Toggle
                    label="Alerts for high-risk residents"
                    description="Highlight urgent resident risk changes."
                    checked={settings.notifications.highRiskResidentAlerts}
                    onChange={(checked) =>
                      updateSection("notifications", { ...settings.notifications, highRiskResidentAlerts: checked })
                    }
                  />
                  <Toggle
                    label="Reminders for case conferences"
                    description="Send reminders before scheduled conferences."
                    checked={settings.notifications.caseConferenceReminders}
                    onChange={(checked) =>
                      updateSection("notifications", { ...settings.notifications, caseConferenceReminders: checked })
                    }
                  />
                  <Toggle
                    label="Overdue visitation reminders"
                    description="Notify admins about late or missing visitations."
                    checked={settings.notifications.overdueVisitationsAlerts}
                    onChange={(checked) =>
                      updateSection("notifications", { ...settings.notifications, overdueVisitationsAlerts: checked })
                    }
                  />
                  <Toggle
                    label="Missing process recording reminders"
                    description="Flag counseling sessions missing documentation."
                    checked={settings.notifications.missingRecordingsAlerts}
                    onChange={(checked) =>
                      updateSection("notifications", { ...settings.notifications, missingRecordingsAlerts: checked })
                    }
                  />
                </div>
              </Card>

              <Card title="Social media analytics settings" description="Control model refreshes and threshold behavior.">
                <div className="space-y-4">
                  <Toggle
                    label="Allow model refresh"
                    description="Keep refresh controls available inside analytics."
                    checked={settings.analytics.modelRefreshEnabled}
                    onChange={(checked) =>
                      updateSection("analytics", { ...settings.analytics, modelRefreshEnabled: checked })
                    }
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Last refresh time">
                      <input
                        value={settings.analytics.lastRefreshTime}
                        onChange={(event) =>
                          updateSection("analytics", { ...settings.analytics, lastRefreshTime: event.target.value })
                        }
                        className={inputClassName}
                      />
                    </Field>
                    <Field label="High potential threshold">
                      <input
                        value={settings.analytics.highPotentialThreshold}
                        onChange={(event) =>
                          updateSection("analytics", {
                            ...settings.analytics,
                            highPotentialThreshold: event.target.value,
                          })
                        }
                        className={inputClassName}
                      />
                    </Field>
                    <Field label="Analytics data source">
                      <input
                        value={settings.analytics.analyticsDataSource}
                        onChange={(event) =>
                          updateSection("analytics", {
                            ...settings.analytics,
                            analyticsDataSource: event.target.value,
                          })
                        }
                        className={inputClassName}
                      />
                    </Field>
                    <Field label="Who can refresh models">
                      <input
                        value={settings.analytics.refreshAccess}
                        onChange={(event) =>
                          updateSection("analytics", { ...settings.analytics, refreshAccess: event.target.value })
                        }
                        className={inputClassName}
                      />
                    </Field>
                  </div>
                </div>
              </Card>
            </section>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <section className="grid gap-6 lg:grid-cols-2">
              <Card title="Privacy and compliance" description="Consent text, retention rules, and restricted-data handling.">
                <div className="space-y-4">
                  <Field label="Cookie consent text">
                    <textarea
                      value={settings.privacy.cookieConsentText}
                      onChange={(event) =>
                        updateSection("privacy", { ...settings.privacy, cookieConsentText: event.target.value })
                      }
                      rows={4}
                      className={textareaClassName}
                    />
                  </Field>
                  <Field label="Privacy policy link">
                    <input
                      value={settings.privacy.privacyPolicyUrl}
                      onChange={(event) =>
                        updateSection("privacy", { ...settings.privacy, privacyPolicyUrl: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Data retention rules">
                    <textarea
                      value={settings.privacy.dataRetentionPolicy}
                      onChange={(event) =>
                        updateSection("privacy", { ...settings.privacy, dataRetentionPolicy: event.target.value })
                      }
                      rows={3}
                      className={textareaClassName}
                    />
                  </Field>
                  <Field label="Export and delete rules">
                    <textarea
                      value={settings.privacy.exportDeleteRules}
                      onChange={(event) =>
                        updateSection("privacy", { ...settings.privacy, exportDeleteRules: event.target.value })
                      }
                      rows={3}
                      className={textareaClassName}
                    />
                  </Field>
                  <Field label="Restricted case note access">
                    <input
                      value={settings.privacy.restrictedNotesAccess}
                      onChange={(event) =>
                        updateSection("privacy", { ...settings.privacy, restrictedNotesAccess: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                </div>
              </Card>

              <Card title="Integrations and system health" description="Visibility into connected services and environment status.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Supabase status">
                    <input
                      value={settings.integrations.supabaseStatus}
                      onChange={(event) =>
                        updateSection("integrations", { ...settings.integrations, supabaseStatus: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Backend API status">
                    <input
                      value={settings.integrations.backendApiStatus}
                      onChange={(event) =>
                        updateSection("integrations", { ...settings.integrations, backendApiStatus: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Email provider status">
                    <input
                      value={settings.integrations.emailProviderStatus}
                      onChange={(event) =>
                        updateSection("integrations", {
                          ...settings.integrations,
                          emailProviderStatus: event.target.value,
                        })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Stripe status">
                    <input
                      value={settings.integrations.stripeStatus}
                      onChange={(event) =>
                        updateSection("integrations", { ...settings.integrations, stripeStatus: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Meta status">
                    <input
                      value={settings.integrations.metaStatus}
                      onChange={(event) =>
                        updateSection("integrations", { ...settings.integrations, metaStatus: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Google Sheets status">
                    <input
                      value={settings.integrations.googleSheetsStatus}
                      onChange={(event) =>
                        updateSection("integrations", {
                          ...settings.integrations,
                          googleSheetsStatus: event.target.value,
                        })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Environment">
                    <input
                      value={settings.system.environmentStatus}
                      onChange={(event) =>
                        updateSection("system", { ...settings.system, environmentStatus: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Backend reachable">
                    <input
                      value={settings.system.backendReachable}
                      onChange={(event) =>
                        updateSection("system", { ...settings.system, backendReachable: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Last sync time">
                    <input
                      value={settings.system.lastSyncTime}
                      onChange={(event) =>
                        updateSection("system", { ...settings.system, lastSyncTime: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Build version">
                    <input
                      value={settings.system.buildVersion}
                      onChange={(event) =>
                        updateSection("system", { ...settings.system, buildVersion: event.target.value })
                      }
                      className={inputClassName}
                    />
                  </Field>
                </div>
              </Card>
            </section>

            <Card title="Audit log" description="Recent admin actions recorded from this settings console.">
              {settings.auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No changes have been recorded yet from this device.</p>
              ) : (
                <div className="space-y-3">
                  {settings.auditLog.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-border/70 bg-background px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-foreground">{entry.action}</p>
                        <p className="text-xs text-muted-foreground">{formatAuditTimestamp(entry.timestamp)}</p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {entry.actor} · {entry.target}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
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

const formatAuditTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString();
};

export default SettingsPage;
