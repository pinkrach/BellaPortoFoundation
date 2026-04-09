import { lazy, Suspense, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { AdminLayout } from "@/components/AdminLayout";
import { HarborLoadingState } from "@/components/HarborLoadingState";

const AdminWorkspace = lazy(() =>
  import("@/components/admin/AdminWorkspace").then((m) => ({ default: m.AdminWorkspace })),
);

function AdminWorkspaceFallback() {
  return (
    <HarborLoadingState
      className="min-h-[50vh]"
      title="Loading admin workspace"
      description="The harbor is getting your admin tools ready, including reports, tables, and decision-support views."
    />
  );
}

const TAB_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
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
