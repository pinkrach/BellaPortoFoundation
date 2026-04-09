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
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
      <div className="mx-auto max-w-5xl rounded-xl bg-black/80 backdrop-blur border border-white/10 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-white">Cookie preferences</p>
            <p className="mt-1 text-sm text-white/90">
              We use essential cookies to keep the site secure and remember basic preferences. Optional analytics
              cookies help us understand site performance. You can accept or reject optional cookies now, and read more
              in our{" "}
              <Link to="/privacy" className="text-accent hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleConsent("rejected")}
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Reject optional
            </button>
            <Link to="/privacy" className="text-accent hover:underline">
              Learn more
            </Link>
            <button
              type="button"
              onClick={() => handleConsent("accepted")}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white shadow-warm transition-colors hover:brightness-95 hover:shadow-md active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/80"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
