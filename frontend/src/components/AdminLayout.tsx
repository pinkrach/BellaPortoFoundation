import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Users, FileText, Home, Heart, BarChart3,
  Share2, Settings, Bell, LogOut, Menu, Anchor, PanelLeftClose, PanelLeftOpen
} from "lucide-react";

const sidebarItems = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Caseload Inventory", to: "/admin/caseload", icon: Users },
  { label: "Process Recordings", to: "/admin/recordings", icon: FileText },
  { label: "Visitations & Conferences", to: "/admin/visitations", icon: Home },
  { label: "Donors & Contributions", to: "/admin/donors", icon: Heart },
  { label: "Reports & Analytics", to: "/admin/reports", icon: BarChart3 },
  { label: "Social Media", to: "/admin/social", icon: Share2 },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

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
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedState = window.localStorage.getItem("admin-sidebar-collapsed");
    setSidebarCollapsed(savedState === "true");
  }, []);

  const handleLogout = () => {
    logout();
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
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

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
          {sidebarItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center rounded-lg transition-colors text-sm font-medium ${
                  sidebarCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2.5"
                } ${
                  active
                    ? "bg-sidebar-accent text-accent"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
                aria-label={item.label}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5" />
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
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6 text-foreground" />
            </button>
            <div>
              <h1 className="font-heading text-lg font-semibold text-foreground">{title}</h1>
              {subtitle ? <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-secondary rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
              A
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
};
