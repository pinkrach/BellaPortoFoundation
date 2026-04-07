import { Anchor } from "lucide-react";
import { Link } from "react-router-dom";
import { WaveDividerTop } from "./WaveDivider";

export const Footer = () => (
  <footer className="relative">
    <WaveDividerTop className="text-primary" />
    <div className="bg-primary text-primary-foreground -mt-1">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Anchor className="h-6 w-6 text-accent" />
            <span className="font-heading text-lg font-bold">Bella Porto Foundation</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-primary-foreground/70">
            <Link to="/privacy" className="hover:text-primary-foreground transition-colors">Privacy Policy</Link>
            <span>contact@bellaporto.org</span>
          </div>
          <p className="text-sm text-primary-foreground/50">© 2024 Bella Porto Foundation. All rights reserved.</p>
        </div>
      </div>
    </div>
  </footer>
);
