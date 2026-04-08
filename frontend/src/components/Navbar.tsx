import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import houseLogo from "@/assets/icons/houseIcon.svg";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },
  { label: "Our Impact", to: "/impact" },
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

  const brandName = isHome ? "Bella Bay Foundation" : "Bella Porto Foundation";

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
  const navTextClass = isHeroMode ? heroText : isHome ? scrolledText : "text-primary-foreground";
  const navLinkClass = isHeroMode
    ? cn(baseNavLink, "text-white hover:text-white/80")
    : isHome
    ? cn(baseNavLink, "text-[#1E2933] hover:text-[#0f1419]")
    : "font-medium text-primary-foreground/90 hover:text-primary-foreground transition-colors";

  const navFocusRing =
    "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-transparent";

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
              isHome ? "h-9 w-9 md:h-10 md:w-10" : "h-8 w-8 brightness-0 invert",
              /* Invert icon to white in hero mode */
              isHeroMode && "brightness-0 invert",
            )}
          />
          <span
            className={cn(
              "font-heading font-semibold tracking-tight transition-colors",
              isHome && cn(navTextClass, "text-lg md:text-xl"),
              !isHome && "text-xl font-bold text-primary-foreground",
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
                    "inline-block py-1 text-sm",
                    navLinkClass,
                    active && isHeroMode && "font-semibold text-white",
                    active && isHome && !isHeroMode && "font-semibold text-[#0f1419]",
                    active && !isHome && "font-semibold text-primary-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
          {isHome && (
            <li className="md:flex md:items-center">
              <Link
                to="/impact"
                className={cn(
                  navFocusRing,
                  "inline-block py-1 text-sm font-semibold tracking-[0.02em] transition-colors",
                  isHeroMode ? "text-white hover:text-white/80" : "text-[#1E2933] hover:text-[#0f1419]",
                )}
              >
                Give
              </Link>
            </li>
          )}
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
              !isHome && "bg-primary",
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
                        "inline-block text-lg tracking-wide",
                        navLinkClass,
                        active && isHeroMode && "font-semibold text-white",
                        active && isHome && !isHeroMode && "font-semibold text-[#0f1419]",
                        active && !isHome && "font-semibold text-primary-foreground",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
              {isHome && (
                <li>
                  <Link
                    to="/impact"
                    onClick={() => setOpen(false)}
                    className={cn(
                      navFocusRing,
                      "inline-block text-lg font-semibold tracking-[0.02em] transition-colors",
                      isHeroMode ? "text-white hover:text-white/80" : "text-[#1E2933] hover:text-[#0f1419]",
                    )}
                  >
                    Give
                  </Link>
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
