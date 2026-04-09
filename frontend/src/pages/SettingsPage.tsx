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
import { Building2, Lock, Pencil, Trash2, Users } from "lucide-react";
import DonorSettings from "@/pages/DonorSettings";

type UserRole = "admin" | "donor";

type ProfileRecord = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: UserRole | null;
};

/** Legacy key from when organization name was edited on this page; still read for the summary card. */
const LEGACY_ADMIN_SETTINGS_KEY = "bella-bay-admin-settings-v1";
const DEFAULT_FOUNDATION_NAME = "Bella Bay Foundation";

const SettingsPage = () => {
  const { userId } = useAuth();
  const [foundationName, setFoundationName] = useState(DEFAULT_FOUNDATION_NAME);
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
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
      const stored = window.localStorage.getItem(LEGACY_ADMIN_SETTINGS_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { organization?: { foundationName?: string } };
      const name = parsed.organization?.foundationName?.trim();
      if (name) {
        setFoundationName(name);
      }
    } catch {
      // ignore corrupt legacy payload
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

  return (
    <AdminLayout
      title="Settings"
      subtitle="Manage who can access the admin portal and your own account details"
    >
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { label: "Organization profile", value: foundationName, icon: Building2 },
            {
              label: "User accounts",
              value: loadingProfiles ? "…" : `${profiles.length} total`,
              icon: Users,
            },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-border/70 bg-card p-5 shadow-warm">
              <card.icon className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-xl font-bold text-foreground">{card.value}</p>
            </div>
          ))}
        </section>

        <Tabs defaultValue="access" className="space-y-4">
          <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-2xl bg-muted/70 p-2">
            <TabsTrigger value="access">Access</TabsTrigger>
            <TabsTrigger value="personal">Personal</TabsTrigger>
          </TabsList>

          <TabsContent value="access" className="space-y-6">
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

          <TabsContent value="personal" className="space-y-6">
            <DonorSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

const inputClassName =
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

const MiniStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
  </div>
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
