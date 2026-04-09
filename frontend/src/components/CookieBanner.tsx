import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "bbf_cookie_consent_v1";
const COOKIE_NAME = "bbf_cookie_consent";

type ConsentChoice = "accepted" | "rejected";

const persistConsent = (choice: ConsentChoice) => {
  const payload = {
    choice,
    essential: true,
    analytics: choice === "accepted",
    timestamp: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  document.cookie = `${COOKIE_NAME}=${choice}; path=/; max-age=${60 * 60 * 24 * 180}; SameSite=Lax`;
};

export const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      setIsVisible(!saved);
    } catch {
      setIsVisible(true);
    }
  }, []);

  const handleConsent = (choice: ConsentChoice) => {
    try {
      persistConsent(choice);
    } catch {
      // ignore storage failures
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        className="mx-auto max-w-5xl rounded-xl bg-black/80 backdrop-blur border border-white/10 px-4 py-3"
        role="region"
        aria-labelledby="cookie-banner-title"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-3xl">
            <p id="cookie-banner-title" className="text-sm font-semibold text-white">
              Cookie preferences
            </p>
            <p className="mt-1 text-sm text-white/90">
              We use essential cookies to keep the site secure and remember basic preferences. Optional analytics
              cookies help us understand site performance. You can accept or reject optional cookies now, and read more
              in our{" "}
              <Link
                to="/privacy"
                className="font-semibold text-white underline underline-offset-2 hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/80"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleConsent("rejected")}
              className="min-h-11 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/80"
            >
              Reject optional
            </button>
            <Link
              to="/privacy"
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-white underline underline-offset-4 hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/80"
            >
              Learn more
            </Link>
            <button
              type="button"
              onClick={() => handleConsent("accepted")}
              className="min-h-11 rounded-full bg-[#ad4f6e] px-5 py-2.5 text-sm font-semibold text-white shadow-warm transition-transform hover:scale-[1.02] hover:bg-[#9c4562] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/80"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
