import {
  BarChart3,
  FileText,
  Heart,
  Home,
  LayoutDashboard,
  Settings,
  Share2,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AppRole = "admin" | "donor" | null;

export interface AppNavItem {
  label: string;
  to: string;
  icon?: LucideIcon;
}

export const publicNavItems: AppNavItem[] = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },
  { label: "Our Impact", to: "/impact" },
];

export const adminSidebarItems: AppNavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Caseload Inventory", to: "/admin/caseload", icon: Users },
  { label: "Process Recordings", to: "/recordings", icon: FileText },
  { label: "Visitations & Conferences", to: "/visitations", icon: Home },
  { label: "Donors & Contributions", to: "/admin/donors", icon: Heart },
  { label: "Reports & Analytics", to: "/admin/reports", icon: BarChart3 },
  { label: "Social Media", to: "/media", icon: Share2 },
  { label: "Settings", to: "/admin/settings", icon: Settings },
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
