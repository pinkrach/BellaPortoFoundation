import { Link, useLocation } from "react-router-dom";
import { Anchor, ChevronDown, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleMenuItems, publicNavItems } from "@/lib/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { displayName, initials, isAuthenticated, isLoading, logout, role } = useAuth();
  const profileMenuItems = getRoleMenuItems(role);
  const profileLabel = displayName ?? "Profile";
  const roleLabel = role === "admin" ? "Administrator" : role === "donor" ? "Donor" : "Access pending";

  const handleLogout = async () => {
    await logout();
    setOpen(false);
  };

  return (
    <nav className="bg-primary sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between py-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <Anchor className="h-7 w-7 text-accent" />
          <span className="font-heading text-xl font-bold text-primary-foreground">Bella Bay Foundation</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {publicNavItems.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-primary-foreground/80 hover:text-primary-foreground transition-colors font-medium ${
                location.pathname === l.to ? "text-primary-foreground border-b-2 border-accent pb-0.5" : ""
              }`}
            >
              {l.label}
            </Link>
          ))}

          {!isLoading && !isAuthenticated && (
            <Link
              to="/login"
              className={`text-primary-foreground/80 hover:text-primary-foreground transition-colors font-medium ${
                location.pathname === "/login" ? "text-primary-foreground border-b-2 border-accent pb-0.5" : ""
              }`}
            >
              Login
            </Link>
          )}

          {!isLoading && isAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-2 py-1.5 text-primary-foreground transition-colors hover:bg-primary-foreground/15"
                >
                  <Avatar className="h-8 w-8 border border-primary-foreground/20">
                    <AvatarFallback className="bg-accent text-sm font-semibold text-accent-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-40 truncate text-sm font-medium">{profileLabel}</span>
                  <ChevronDown className="h-4 w-4 opacity-80" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary font-semibold text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{profileLabel}</div>
                    <div className="truncate text-xs font-normal text-muted-foreground">{roleLabel}</div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {profileMenuItems.map((item) => (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link to={item.to} className="cursor-pointer">
                      {item.icon ? <item.icon className="mr-2 h-4 w-4" /> : null}
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-primary-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-primary overflow-hidden"
          >
            <div className="flex flex-col gap-4 px-6 pb-6">
              {publicNavItems.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors font-medium text-lg"
                >
                  {l.label}
                </Link>
              ))}

              {!isLoading && !isAuthenticated && (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors font-medium text-lg"
                >
                  Login
                </Link>
              )}

              {!isLoading && isAuthenticated && (
                <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4">
                  <div className="mb-4 flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-primary-foreground/20">
                      <AvatarFallback className="bg-accent font-semibold text-accent-foreground">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-primary-foreground">{profileLabel}</p>
                      <p className="text-sm text-primary-foreground/70">{roleLabel}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {profileMenuItems.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className="text-base font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-left text-base font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
