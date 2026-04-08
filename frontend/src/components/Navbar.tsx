import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import houseLogo from "@/assets/icons/houseIcon.svg";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Impact", to: "/impact" },
  { label: "Login", to: "/login" },
];

/** Shared base — colour tokens swapped per hero-mode vs scrolled vs other pages */
const baseNavLink = "font-medium tracking-[0.02em] transition-colors";

/** Pixels past top before home nav switches from hero float to solid site cream (`bg-background`). */
const HOME_SCROLL_SOLID_THRESHOLD = 56;

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [homeScrolled, setHomeScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isCreamNavRoute = location.pathname === "/about" || location.pathname === "/impact" || location.pathname === "/login";
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
            <ul className="relative z-10 flex list-none flex-col gap-4 px-6 pb-6">
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
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
