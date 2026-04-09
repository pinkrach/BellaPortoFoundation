import { Link, useLocation } from "react-router-dom";
import houseLogo from "@/assets/icons/houseIcon.svg";
import footerHouses from "@/assets/hero/newHouses.png";
import { WaveDivider } from "@/components/WaveDivider";
import { SocialPlatformLinks } from "@/components/SocialPlatformLinks";

export const Footer = () => {
  const location = useLocation();
  const hideIllustration =
    location.pathname === "/about" ||
    location.pathname === "/impact" ||
    location.pathname === "/privacy";

  return (
    <footer className="mt-auto w-full">
      {/* Sand wave — transitions cream content into the sand footer band */}
      <WaveDivider className="text-muted" />

      {/* Houses illustration — full width, anchored at page end (hidden on About page) */}
      {!hideIllustration && (
        <div className="w-full overflow-hidden bg-muted -mt-1">
          <img
            src={footerHouses}
            alt="Watercolor illustration of coastal houses along a shoreline."
            className="w-full h-auto object-contain max-h-[320px] md:max-h-[420px]"
            loading="eager"
            decoding="async"
          />
        </div>
      )}

      {/* Footer content — minimal, calm, consistent */}
      <div className="w-full bg-muted">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
            <Link
              to="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(200_20%_40%)] focus-visible:ring-offset-2 focus-visible:ring-offset-muted"
            >
              <img src={houseLogo} alt="" aria-hidden="true" className="h-7 w-7 object-contain" />
              <span className="font-heading text-base font-semibold text-foreground">Bella Bay Foundation</span>
            </Link>

            <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
              <SocialPlatformLinks />
              <div className="flex items-center gap-6 text-sm text-foreground/70">
              <Link
                to="/privacy"
                className="inline-flex min-h-11 items-center rounded-sm px-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(200_20%_40%)] focus-visible:ring-offset-2 focus-visible:ring-offset-muted"
              >
                Privacy Policy
              </Link>
              <a
                href="mailto:contact@bellaporto.org"
                className="inline-flex min-h-11 items-center break-all rounded-sm px-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(200_20%_40%)] focus-visible:ring-offset-2 focus-visible:ring-offset-muted"
              >
                contact@bellaporto.org
              </a>
              </div>
            </div>

            <p className="text-xs text-[hsl(200_14%_36%)]">
              © {new Date().getFullYear()} Bella Bay Foundation. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
