import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { AdminLayout } from "@/components/AdminLayout";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";

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
    <AdminLayout title={title} subtitle="Unified tab-based workspace for resident care, donations, reporting, and outreach">
      <AdminWorkspace />
    </AdminLayout>
  );
};

export default AdminDashboard;
