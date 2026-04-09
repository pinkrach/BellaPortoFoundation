import { motion } from "framer-motion";
import { Sailboat } from "lucide-react";

import { cn } from "@/lib/utils";

export function HarborLoadingState({
  title,
  description,
  className,
  compact = false,
}: {
  title: string;
  description: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-muted/20", compact ? "p-4" : "p-6", className)} role="status" aria-live="polite">
      <div className={cn("relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/5 via-background to-primary/5", compact ? "p-5" : "p-6")}>
        <div className="absolute inset-x-6 bottom-6 h-px bg-border/70" />
        <div className={cn("relative", compact ? "h-20" : "h-24")}>
          <motion.div
            className="absolute bottom-2 left-0 text-primary"
            animate={{ x: [0, 180, 0], y: [0, -5, 0], rotate: [-4, 3, -4] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sailboat className={cn(compact ? "h-10 w-10" : "h-12 w-12")} strokeWidth={1.75} />
          </motion.div>
        </div>
        <div className="mt-3">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
