import { lazy, Suspense, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { AdminLayout } from "@/components/AdminLayout";

const AdminWorkspace = lazy(() =>
  import("@/components/admin/AdminWorkspace").then((m) => ({ default: m.AdminWorkspace })),
);

function AdminWorkspaceFallback() {
  return (
    <div
      className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 p-12"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm text-muted-foreground">Loading workspace…</p>
    </div>
  );
}

const TAB_TITLES: Record<string, string> = {
  dashboard: "Command center",
  residents: "Residents",
  donations: "Donations",
  "safe-houses": "Safe Houses",
  reports: "Reports",
  outreach: "Outreach",
  settings: "Settings",
};

const AdminDashboard = () => {
  const [searchParams] = useSearchParams();
  const title = useMemo(() => TAB_TITLES[searchParams.get("tab") ?? "dashboard"] ?? "Dashboard", [searchParams]);

  return (
    <AdminLayout title={title} subtitle="Bella Bay operational workspace — calm overview, detail in each tab.">
      <Suspense fallback={<AdminWorkspaceFallback />}>
        <AdminWorkspace />
      </Suspense>
    </AdminLayout>
  );
};

export default AdminDashboard;
