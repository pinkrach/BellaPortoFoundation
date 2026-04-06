export const WaveDivider = ({ className = "", flip = false }: { className?: string; flip?: boolean }) => (
  <div className={`w-full overflow-hidden leading-[0] ${flip ? "rotate-180" : ""} ${className}`}>
    <svg
      className="animate-wave w-[calc(100%+50px)] h-16 md:h-24"
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0,40 C240,100 480,0 720,50 C960,100 1200,20 1440,60 L1440,120 L0,120 Z"
        fill="currentColor"
      />
    </svg>
  </div>
);

export const WaveDividerTop = ({ className = "" }: { className?: string }) => (
  <div className={`w-full overflow-hidden leading-[0] ${className}`}>
    <svg
      className="animate-wave-slow w-[calc(100%+50px)] h-16 md:h-24"
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0,80 C240,20 480,100 720,60 C960,20 1200,90 1440,50 L1440,0 L0,0 Z"
        fill="currentColor"
      />
    </svg>
  </div>
);
