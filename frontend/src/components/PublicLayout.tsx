import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export const PublicLayout = ({ children }: { children: ReactNode }) => (
  <div className="flex w-full flex-1 flex-col min-h-dvh">
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-[#1f353c] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-white"
    >
      Skip to main content
    </a>
    <Navbar />
    <main id="main-content" className="min-h-0 flex-1 pb-0" tabIndex={-1}>
      {children}
    </main>
    <Footer />
  </div>
);
