import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "bbf_cookie_consent_accepted_v1";

export const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const accepted = window.localStorage.getItem(STORAGE_KEY) === "true";
      setIsVisible(!accepted);
    } catch {
      // If storage is blocked, show banner (user can dismiss for this session).
      setIsVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 backdrop-blur shadow-warm-lg p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground/90">
            Bella Bay Foundation uses cookies to improve your experience. By continuing to use our site, you agree to
            our{" "}
            <Link to="/privacy" className="text-secondary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={accept}
            className="shrink-0 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-warm hover:scale-[1.02] transition-transform"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

