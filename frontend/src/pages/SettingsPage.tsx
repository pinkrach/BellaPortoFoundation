import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { fetchJsonWithAuth } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Lock, Mail, Pencil, RefreshCcw, Save, Trash2, Users } from "lucide-react";
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
  const [editUser, setEditUser] = useState<ProfileRecord | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingUserEdit, setSavingUserEdit] = useState(false);
  const [deleteUser, setDeleteUser] = useState<ProfileRecord | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<SettingsState>;
      setSettings({
        ...defaultSettings,
        organization: { ...defaultSettings.organization, ...(parsed.organization ?? {}) },
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
        setProfiles((data ?? []).map(normalizeProfileRecord));
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

  const openEditUser = (profile: ProfileRecord) => {
    setEditUser(profile);
    setEditFirstName(profile.first_name ?? "");
    setEditLastName(profile.last_name ?? "");
    setEditEmail(profile.email ?? "");
  };

  const handleSaveUserEdit = async () => {
    if (!editUser) return;
    const trimmedEmail = editEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }

    setSavingUserEdit(true);
    try {
      const updated = await fetchJsonWithAuth<ProfileRecord>(`/api/profiles/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: editFirstName.trim(),
          last_name: editLastName.trim(),
          email: trimmedEmail,
        }),
      });

      setProfiles((current) =>
        current.map((item) => (item.id === editUser.id ? normalizeProfileRecord(updated) : item)),
      );
      toast.success(`Updated ${profileLabel(normalizeProfileRecord(updated))}.`);
      setEditUser(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save changes.");
    } finally {
      setSavingUserEdit(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteUser) return;
    setDeletingUserId(deleteUser.id);
    try {
      await fetchJsonWithAuth<{ ok: boolean }>(`/api/profiles/${deleteUser.id}`, {
        method: "DELETE",
      });
      setProfiles((current) => current.filter((item) => item.id !== deleteUser.id));
      toast.success(`Removed ${profileLabel(deleteUser)}.`);
      setDeleteUser(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete that user.");
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleRoleChange = async (profile: ProfileRecord, nextRole: UserRole) => {
    if (profile.id === userId) {
      toast.error("You cannot change your own role here.");
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
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { label: "Organization profile", value: settings.organization.foundationName, icon: Building2 },
            { label: "User accounts", value: `${profiles.length} total`, icon: Users },
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
              <Card title="User and access management" description="Edit account details, assign roles, or remove users. Your own role stays fixed while you are signed in.">
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

                <div className="rounded-2xl border border-border/70 overflow-x-auto">
                  <div className="grid min-w-[640px] grid-cols-[minmax(0,1.35fr)_88px_minmax(0,120px)_minmax(0,108px)] gap-3 border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Account</span>
                    <span>Status</span>
                    <span>Role</span>
                    <span className="text-right sm:text-left">Actions</span>
                  </div>

                  {loadingProfiles ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">Loading users...</div>
                  ) : profiles.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">No profiles were returned from Supabase.</div>
                  ) : (
                    profiles.map((profile) => {
                      const rowIsSelf = profile.id === userId;
                      return (
                        <div
                          key={profile.id}
                          className="grid min-w-[640px] grid-cols-[minmax(0,1.35fr)_88px_minmax(0,120px)_minmax(0,108px)] items-center gap-3 border-b border-border/50 px-4 py-3 last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{profileLabel(profile)}</p>
                            <p className="truncate text-sm text-muted-foreground">{profile.email ?? "No email on file"}</p>
                          </div>
                          <span className="inline-flex w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                            Active
                          </span>
                          {rowIsSelf ? (
                            <div
                              className="flex items-center gap-2 text-sm text-muted-foreground"
                              title="You cannot change your own role here."
                            >
                              <Lock className="h-4 w-4 shrink-0 text-foreground/70" aria-hidden />
                              <span className="capitalize">{profile.role === "admin" ? "admin" : "donor"}</span>
                            </div>
                          ) : (
                            <select
                              value={profile.role === "admin" ? "admin" : "donor"}
                              disabled={updatingUserId === profile.id}
                              onChange={(event) => handleRoleChange(profile, event.target.value as UserRole)}
                              className={inputClassName}
                              aria-label={`Role for ${profileLabel(profile)}`}
                            >
                              <option value="admin">admin</option>
                              <option value="donor">donor</option>
                            </select>
                          )}
                          <div className="flex flex-wrap items-center justify-end gap-1 sm:justify-start">
                            <button
                              type="button"
                              onClick={() => openEditUser(profile)}
                              disabled={updatingUserId === profile.id || deletingUserId === profile.id}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-muted/60 disabled:opacity-50"
                              aria-label={`Edit ${profileLabel(profile)}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteUser(profile)}
                              disabled={rowIsSelf || updatingUserId === profile.id || deletingUserId === profile.id}
                              title={rowIsSelf ? "You cannot delete your own account here." : "Delete user"}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-40"
                              aria-label={`Delete ${profileLabel(profile)}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
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
                  Editing and deleting users run through the API with the service role. Deleting removes the Supabase Auth user (and linked profile when your database cascades). Invite, disable, and reset flows can be added the same way.
                </div>
              </Card>
            </section>

            <Dialog open={editUser !== null} onOpenChange={(open) => !open && setEditUser(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit user</DialogTitle>
                  <DialogDescription>Update their display name and sign-in email. Email changes apply in Supabase Auth.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <Field label="First name">
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className={inputClassName}
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Last name">
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className={inputClassName}
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className={inputClassName}
                      autoComplete="off"
                      required
                    />
                  </Field>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setEditUser(null)} disabled={savingUserEdit}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => void handleSaveUserEdit()} disabled={savingUserEdit}>
                    {savingUserEdit ? "Saving…" : "Save changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog open={deleteUser !== null} onOpenChange={(open) => !open && setDeleteUser(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {deleteUser
                      ? `This will permanently remove ${profileLabel(deleteUser)} (${deleteUser.email ?? "no email"}) from authentication. This cannot be undone.`
                      : null}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletingUserId !== null}>Cancel</AlertDialogCancel>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deletingUserId !== null}
                    onClick={() => void handleConfirmDeleteUser()}
                  >
                    {deletingUserId ? "Deleting…" : "Delete user"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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

function normalizeProfileRecord(raw: ProfileRecord | Record<string, unknown>): ProfileRecord {
  const r = raw as Record<string, unknown>;
  const roleVal = r.role;
  const role: UserRole | null = roleVal === "admin" || roleVal === "donor" ? roleVal : null;
  return {
    id: String(r.id ?? ""),
    email: r.email != null && r.email !== "" ? String(r.email) : null,
    first_name: r.first_name != null && r.first_name !== "" ? String(r.first_name) : null,
    last_name: r.last_name != null && r.last_name !== "" ? String(r.last_name) : null,
    role: role ?? "donor",
  };
}

export default SettingsPage;
