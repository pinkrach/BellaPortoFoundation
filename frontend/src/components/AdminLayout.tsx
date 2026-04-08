import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { adminSidebarItems } from "@/lib/navigation";
import {
  Bell,
  LogOut,
  Menu,
  Anchor,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export const AdminLayout = ({
  children,
  title = "Admin Dashboard",
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { displayName, initials, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedState = window.localStorage.getItem("admin-sidebar-collapsed");
    setSidebarCollapsed(savedState === "true");
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleSidebarCollapse = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("admin-sidebar-collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar overlay mobile */}
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 cursor-pointer border-0 bg-foreground/40 p-0 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground transition-[width,transform] duration-300 lg:sticky lg:top-0 ${
          sidebarCollapsed ? "lg:w-20" : "lg:w-64"
        } ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div
          className={`border-b border-sidebar-border px-4 py-5 ${
            sidebarCollapsed
              ? "flex flex-col items-center gap-3 lg:px-3"
              : "flex items-center justify-between gap-3"
          }`}
        >
          <Link
            to="/"
            onClick={() => setSidebarOpen(false)}
            className={`flex min-w-0 items-center gap-3 rounded-lg transition-opacity hover:opacity-90 ${sidebarCollapsed ? "justify-center" : ""}`}
            aria-label="Go to home page"
          >
            <Anchor className="h-6 w-6 shrink-0 text-accent" />
            <span className={`font-heading text-lg font-bold ${sidebarCollapsed ? "hidden" : "truncate"}`}>Bella Bay</span>
          </Link>

          <button
            type="button"
            onClick={handleSidebarCollapse}
            className="hidden rounded-lg p-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground lg:inline-flex"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>

        <nav className={`flex-1 overflow-y-auto py-4 ${sidebarCollapsed ? "space-y-2 px-2" : "space-y-1 px-3"}`}>
          {adminSidebarItems.map((item) => {
            const active =
              item.matchTab === "settings"
                ? location.pathname === "/admin/settings"
                : location.pathname === "/admin" && new URLSearchParams(location.search).get("tab") === item.matchTab;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center rounded-lg transition-colors text-sm font-medium ${
                  sidebarCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2.5"
                } ${
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
                aria-label={item.label}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {Icon ? <Icon className="h-5 w-5" /> : null}
                <span className={sidebarCollapsed ? "hidden" : "truncate"}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={`border-t border-sidebar-border p-4 ${sidebarCollapsed ? "px-2" : ""}`}>
          <button
            onClick={handleLogout}
            className={`flex w-full items-center rounded-lg text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground ${
              sidebarCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2.5"
            }`}
            aria-label="Sign out"
            title={sidebarCollapsed ? "Sign out" : undefined}
          >
            <LogOut className="h-5 w-5" />
            <span className={sidebarCollapsed ? "hidden" : ""}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden rounded-md p-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" aria-hidden />
            </button>
            <div>
              <h1 className="font-heading text-2xl font-semibold text-foreground lg:text-3xl">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="relative rounded-md p-1 text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" aria-hidden />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-secondary" aria-hidden />
            </button>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
              title={displayName ?? "Signed-in user"}
              role="img"
              aria-label={displayName ? `Signed in as ${displayName}` : "Signed-in user"}
            >
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
};
