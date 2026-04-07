import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "hasAcceptedCookies";

export const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const accepted = window.localStorage.getItem(STORAGE_KEY) === "true";
      setIsVisible(!accepted);
    } catch {
      setIsVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
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
          <p className="text-sm text-white/90">
            Bella Bay Foundation uses cookies to ensure you get the best experience on our website. By continuing, you
            agree to our{" "}
            <Link to="/privacy" className="text-accent hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={accept}
            className="shrink-0 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-primary shadow-warm hover:scale-[1.02] transition-transform"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

