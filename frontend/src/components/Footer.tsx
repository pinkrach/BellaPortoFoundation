import { Link } from "react-router-dom";
import houseLogo from "@/assets/icons/houseIcon.svg";
import footerHouses from "@/assets/hero/newHouses.png";
import { WaveDivider } from "@/components/WaveDivider";

/**
 * Footer: sand-coloured wave transitions from cream page into the muted footer band,
 * then the houses illustration, then text content — all on bg-muted (sand).
 */
export const Footer = () => (
  <footer className="mt-auto w-full">
    {/* Sand wave — transitions cream testimonials section into the sand footer */}
    <WaveDivider className="text-muted" />

    {/* Houses illustration — full width, prominently sized */}
    <div className="w-full overflow-hidden bg-muted -mt-1">
      <img
        src={footerHouses}
        alt="Watercolor illustration of coastal houses along a shoreline."
        className="w-full h-auto object-contain max-h-[320px] md:max-h-[420px]"
        loading="eager"
        decoding="async"
      />
    </div>

    {/* Footer content — full-width sand band, dark text for legibility */}
    <div className="w-full bg-muted">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(200_20%_40%)] focus-visible:ring-offset-2 focus-visible:ring-offset-muted"
          >
            <img src={houseLogo} alt="" aria-hidden="true" className="h-7 w-7 object-contain" />
            <span className="font-heading text-base font-semibold text-foreground">
              Bella Bay Foundation
            </span>
          </Link>

          <div className="flex items-center gap-6 text-sm text-foreground/70">
            <Link
              to="/privacy"
              className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(200_20%_40%)] focus-visible:ring-offset-2"
            >
              Privacy Policy
            </Link>
            <a
              href="mailto:contact@bellaporto.org"
              className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(200_20%_40%)] focus-visible:ring-offset-2"
            >
              contact@bellaporto.org
            </a>
          </div>

          <p className="text-xs text-foreground/50">
            © {new Date().getFullYear()} Bella Bay Foundation. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  </footer>
);
