import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export const PublicLayout = ({
  children,
  hideFooter = false,
  hideNavbar = false,
}: {
  children: ReactNode;
  hideFooter?: boolean;
  hideNavbar?: boolean;
}) => (
  <div className="flex w-full flex-1 flex-col min-h-dvh">
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-[#1f353c] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-white"
      onClick={(e) => {
        const mainEl = document.getElementById("main-content");
        if (!mainEl) return;
        e.preventDefault();
        mainEl.focus({ preventScroll: true });
        mainEl.scrollIntoView({ behavior: "auto", block: "start" });
      }}
    >
      Skip to main content
    </a>
    {!hideNavbar && <Navbar />}
    <main
      id="main-content"
      className="min-h-0 flex-1 pb-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      tabIndex={-1}
    >
      {children}
    </main>
    {!hideFooter && <Footer />}
  </div>
);
