import {
  BarChart3,
  Building2,
  HandCoins,
  LayoutDashboard,
  Megaphone,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type AppRole = "admin" | "donor" | null;

export interface AppNavItem {
  label: string;
  to: string;
  icon?: LucideIcon;
  matchTab?: string;
}

export const publicNavItems: AppNavItem[] = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },
  { label: "Our Impact", to: "/impact" },
];

export const adminSidebarItems: AppNavItem[] = [
  { label: "Command center", to: "/admin?tab=dashboard", icon: LayoutDashboard, matchTab: "dashboard" },
  { label: "Residents", to: "/admin?tab=residents", icon: Users, matchTab: "residents" },
  { label: "Donations", to: "/admin?tab=donations", icon: HandCoins, matchTab: "donations" },
  { label: "Safe Houses", to: "/admin?tab=safe-houses", icon: Building2, matchTab: "safe-houses" },
  { label: "Reports", to: "/admin?tab=reports", icon: BarChart3, matchTab: "reports" },
  { label: "Outreach", to: "/admin?tab=outreach", icon: Megaphone, matchTab: "outreach" },
  { label: "Settings", to: "/admin/settings", icon: Settings, matchTab: "settings" },
];

export const donorMenuItems: AppNavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
];

export const getRoleMenuItems = (role: AppRole) => {
  if (role === "admin") return adminSidebarItems;
  if (role === "donor") return donorMenuItems;
  return [];
};

export const getDefaultDashboardRoute = (role: AppRole) => {
  if (role === "admin") return "/admin";
  if (role === "donor") return "/dashboard";
  return "/login";
};
