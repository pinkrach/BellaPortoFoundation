import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import houseLogo from "@/assets/icons/houseIcon.svg";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleMenuItems } from "@/lib/navigation";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Impact", to: "/impact" },
];

/** Shared base — colour tokens swapped per hero-mode vs scrolled vs other pages */
const baseNavLink = "font-medium tracking-[0.02em] transition-colors";

/** Pixels past top before home nav switches from hero float to solid site cream (`bg-background`). */
const HOME_SCROLL_SOLID_THRESHOLD = 56;

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [homeScrolled, setHomeScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { displayName, initials, isAuthenticated, isLoading, logout, role } = useAuth();
  const profileMenuItems = getRoleMenuItems(role);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const isHome = location.pathname === "/";
  const isCreamNavRoute =
    location.pathname === "/about" ||
    location.pathname === "/impact" ||
    location.pathname === "/privacy" ||
    location.pathname === "/login";
  const isCreamNav = !isHome && isCreamNavRoute;

  const brandName = isHome ? "Bella Bay Foundation" : isCreamNav ? "Bella Bay Foundation" : "Bella Porto Foundation";

  useEffect(() => {
    if (!isHome) {
      setHomeScrolled(false);
      return;
    }
    const onScroll = () => setHomeScrolled(window.scrollY > HOME_SCROLL_SOLID_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  /** true while the home hero is visible (nav floats over dark image → white text) */
  const isHeroMode = isHome && !homeScrolled;

  /** Derived text + link colours */
  const heroText   = "text-white";
  const scrolledText = "text-[#1E2933]";
  const navTextClass = isHeroMode ? heroText : isHome ? scrolledText : isCreamNav ? "text-[#1E2933]" : "text-primary-foreground";
  const navLinkClass = isHeroMode
    ? cn(baseNavLink, "text-white hover:text-white/80")
    : isHome
    ? cn(baseNavLink, "text-[#1E2933] hover:text-[#0f1419]")
    : isCreamNav
    ? cn(baseNavLink, "text-[#1E2933] hover:text-[#0f1419]")
    : "font-medium text-primary-foreground/90 hover:text-primary-foreground transition-colors";

  const navFocusRing =
    "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-transparent";

  const activeUnderlineClass = isHeroMode ? "after:bg-white/80" : "after:bg-[#1E2933]";
  const roleLabel = role === "admin" ? "Administrator" : role === "donor" ? "Donor" : "Access pending";
  const profileButtonClass = useMemo(
    () =>
      cn(
        navFocusRing,
        "inline-flex items-center gap-3 rounded-full border px-3 py-2 text-sm shadow-sm transition-colors",
        isHeroMode
          ? "border-white/30 bg-white/10 text-white hover:bg-white/15"
          : "border-[#1E2933]/10 bg-white/80 text-[#1E2933] hover:bg-white",
      ),
    [isHeroMode],
  );

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!profileOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [profileOpen]);

  const handleLogout = async () => {
    await logout();
    setProfileOpen(false);
    setOpen(false);
    navigate("/");
  };

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "z-50 transition-[background-color] duration-300",
        isHome
          ? cn(
              "fixed top-0 left-0 right-0",
              homeScrolled ? "bg-background" : "bg-transparent",
            )
          : isCreamNav
          ? "sticky top-0 bg-background"
          : "sticky top-0 bg-primary",
      )}
    >
      {/* Hero mode: subtle dark vignette so white nav text stays legible over the bright watercolor image */}
      {isHeroMode && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[100px] bg-gradient-to-b from-[hsl(205,38%,12%,0.35)] to-transparent"
          aria-hidden="true"
        />
      )}

      <div className="container relative z-10 mx-auto flex items-center justify-between px-4 py-3.5 md:py-4">
        <Link
          to="/"
          className={cn(
            "flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            isHome
              ? cn(
                  "focus-visible:ring-[#1E2933]",
                  homeScrolled ? "focus-visible:ring-offset-background" : "focus-visible:ring-offset-transparent",
                )
              : "focus-visible:ring-[#5ba4a4] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          )}
        >
          <img
            src={houseLogo}
            alt=""
            aria-hidden="true"
            className={cn(
              "object-contain transition-[filter] duration-300",
              isHome ? "h-10 w-10 md:h-11 md:w-11" : isCreamNav ? "h-9 w-9" : "h-9 w-9 brightness-0 invert",
              /* Invert icon to white in hero mode */
              isHeroMode && "brightness-0 invert",
            )}
          />
          <span
            className={cn(
              "font-heading font-semibold tracking-tight transition-colors",
              isHome && cn(navTextClass, "text-lg md:text-xl"),
              !isHome && (isCreamNav ? "text-xl font-bold text-[#1E2933]" : "text-xl font-bold text-primary-foreground"),
            )}
          >
            {brandName}
          </span>
        </Link>

        {/* Desktop */}
        <ul className="hidden list-none gap-8 md:flex md:items-center">
          {navLinks.map((l) => {
            const active = location.pathname === l.to;
            return (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className={cn(
                    navFocusRing,
                    "relative inline-block py-1 text-sm after:absolute after:-bottom-[2px] after:left-0 after:h-[2px] after:w-full after:bg-transparent",
                    navLinkClass,
                    active && "font-semibold",
                    active && activeUnderlineClass,
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
          <li>
            {isLoading ? (
              <span className={cn(navLinkClass, "text-sm opacity-70")}>Loading...</span>
            ) : isAuthenticated ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((current) => !current)}
                  className={profileButtonClass}
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {initials}
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block max-w-[10rem] truncate font-semibold">{displayName ?? "Signed in"}</span>
                    <span className={cn("block text-xs", isHeroMode ? "text-white/75" : "text-[#1E2933]/70")}>
                      {roleLabel}
                    </span>
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", profileOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {profileOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-80 overflow-hidden rounded-[28px] border border-[#1E2933]/10 bg-[#F5EFE6] shadow-[0_18px_40px_rgba(0,0,0,0.16)]"
                    >
                      <div className="flex items-center gap-4 border-b border-[#1E2933]/10 px-5 py-5">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1f7a9a] text-2xl font-bold text-white">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xl font-semibold text-[#1E2933]">{displayName ?? "Signed in"}</p>
                          <p className="truncate text-sm text-[#1E2933]/70">{roleLabel}</p>
                        </div>
                      </div>

                      <div className="max-h-[22rem] overflow-y-auto px-3 py-3">
                        {profileMenuItems.map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[#1E2933] transition-colors hover:bg-white/70"
                          >
                            {item.icon ? <item.icon className="h-4 w-4 text-[#1f7a9a]" /> : null}
                            <span>{item.label}</span>
                          </Link>
                        ))}
                      </div>

                      <div className="border-t border-[#1E2933]/10 px-3 py-3">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-2xl bg-[#87c9cd] px-4 py-3 text-left text-sm font-semibold text-[#ff4a4a] transition-colors hover:bg-[#7cc0c5]"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/login"
                className={cn(
                  navFocusRing,
                  "relative inline-block py-1 text-sm after:absolute after:-bottom-[2px] after:left-0 after:h-[2px] after:w-full after:bg-transparent",
                  navLinkClass,
                  location.pathname === "/login" && "font-semibold",
                  location.pathname === "/login" && activeUnderlineClass,
                )}
              >
                Login
              </Link>
            )}
          </li>
        </ul>

        <button
          type="button"
          className={cn(navFocusRing, "md:hidden", navTextClass)}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="primary-navigation-mobile"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="primary-navigation-mobile"
            role="region"
            aria-label="Mobile navigation"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={cn(
              "relative overflow-hidden md:hidden",
              !isHome && (isCreamNav ? "bg-background" : "bg-primary"),
              isHome && homeScrolled && "bg-background",
            )}
          >
            {/* Hero mode mobile: dark semi-transparent bg so white links stay legible */}
            {isHeroMode && (
              <div
                className="pointer-events-none absolute inset-0 z-0 bg-[hsl(205,38%,14%,0.88)]"
                aria-hidden="true"
              />
            )}
            <ul className="relative z-10 flex list-none flex-col gap-4 px-6 pb-6 pt-8">
              {navLinks.map((l) => {
                const active = location.pathname === l.to;
                return (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        navFocusRing,
                        "relative inline-block text-lg tracking-wide after:absolute after:-bottom-[2px] after:left-0 after:h-[2px] after:w-full after:bg-transparent",
                        navLinkClass,
                        active && "font-semibold",
                        active && activeUnderlineClass,
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
              <li>
                {isLoading ? (
                  <span className={cn(navLinkClass, "text-base opacity-70")}>Loading...</span>
                ) : isAuthenticated ? (
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className={cn("truncate font-semibold", navTextClass)}>{displayName ?? "Signed in"}</p>
                        <p className={cn("text-sm", isHeroMode ? "text-white/75" : "text-[#1E2933]/70")}>{roleLabel}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {profileMenuItems.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
                            isHeroMode
                              ? "text-white hover:bg-white/10"
                              : "text-[#1E2933] hover:bg-[#1E2933]/5",
                          )}
                        >
                          {item.icon ? <item.icon className="h-4 w-4" /> : null}
                          <span>{item.label}</span>
                        </Link>
                      ))}
                      <button
                        type="button"
                        onClick={handleLogout}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold",
                          isHeroMode
                            ? "text-white hover:bg-white/10"
                            : "text-[#b03a3a] hover:bg-[#b03a3a]/10",
                        )}
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className={cn(
                      navFocusRing,
                      "relative inline-block text-lg tracking-wide after:absolute after:-bottom-[2px] after:left-0 after:h-[2px] after:w-full after:bg-transparent",
                      navLinkClass,
                      location.pathname === "/login" && "font-semibold",
                      location.pathname === "/login" && activeUnderlineClass,
                    )}
                  >
                    Login
                  </Link>
                )}
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
