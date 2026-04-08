import { cn } from "@/lib/utils";

/**
 * Structural divider only: solid fill via `currentColor` — pass a `text-*` class that matches
 * the receiving section’s background so the wave nearly disappears (no accents, no gradients).
 * Full viewport width; optional default `text-background` when no override is passed.
 */
export const WaveDivider = ({ className = "" }: { className?: string }) => (
  <div
    className={cn(
      "pointer-events-none relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden leading-[0]",
      "text-background",
      className,
    )}
    aria-hidden="true"
  >
    <svg
      className="block h-14 w-full min-w-full md:h-[5.25rem]"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0,48 C240,102 480,8 720,52 C960,96 1200,24 1440,58 L1440,120 L0,120 Z"
        fill="currentColor"
      />
    </svg>
  </div>
);

export const WaveDividerTop = ({ className = "" }: { className?: string }) => <WaveDivider className={className} />;
