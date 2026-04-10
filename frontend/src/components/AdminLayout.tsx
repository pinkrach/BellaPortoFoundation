import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { adminSidebarItems } from "@/lib/navigation";
import {
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";
import houseLogo from "@/assets/icons/houseIcon.svg";
import { Button } from "@/components/ui/button";
import { SocialPlatformLinks } from "@/components/SocialPlatformLinks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type AdminNotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
};

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
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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

  const hasUnreadNotifications = useMemo(() => notifications.some((n) => !n.read), [notifications]);

  const openNotificationsModal = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setNotificationsOpen(true);
  };

  const clearNotifications = () => {
    setNotifications([]);
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
            <img src={houseLogo} alt="" aria-hidden="true" className="h-7 w-7 shrink-0 object-contain brightness-0 invert" />
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
              onClick={openNotificationsModal}
              className="relative rounded-md p-1 text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={hasUnreadNotifications ? "Notifications (unread)" : "Notifications"}
            >
              <Bell className="h-5 w-5" aria-hidden />
              {hasUnreadNotifications ? (
                <span
                  className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-destructive"
                  aria-hidden
                />
              ) : null}
            </button>
            <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <DialogContent className="max-h-[min(85vh,32rem)] max-w-md gap-0 overflow-hidden rounded-2xl border-border/80 p-0 sm:max-w-md">
                <DialogHeader className="border-b border-border/80 px-6 py-4 text-left">
                  <DialogTitle className="font-heading text-xl">Notifications</DialogTitle>
                  <DialogDescription className="sr-only">Inbox for admin alerts and updates.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[min(60vh,22rem)] overflow-y-auto px-6 py-4">
                  {notifications.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No notifications</p>
                  ) : (
                    <ul className="space-y-4">
                      {notifications.map((n) => (
                        <li key={n.id} className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                          <p className="font-medium text-foreground">{n.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <DialogFooter className="border-t border-border/80 px-6 py-4 sm:flex-col sm:space-x-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    disabled={notifications.length === 0}
                    onClick={() => {
                      clearNotifications();
                    }}
                  >
                    Clear notifications
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(266_34%_42%)] text-sm font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  title={displayName ?? "Signed-in user"}
                  aria-label={displayName ? `Signed in as ${displayName}` : "Signed-in user"}
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    View donor dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-destructive hover:text-black focus:text-black"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
        <div className="border-t border-border/70 bg-muted/30 px-4 py-4 lg:px-6">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-foreground/80">
              Stay connected with Lighthouse Sanctuary. © {new Date().getFullYear()} Bella Bay Foundation.
            </p>
            <SocialPlatformLinks className="gap-2" iconClassName="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
