import { Facebook, Instagram, Youtube } from "lucide-react";

import { cn } from "@/lib/utils";

const PLATFORM_LINKS = [
  {
    label: "YouTube",
    href: "https://www.youtube.com/@LighthouseSanctuary",
    Icon: Youtube,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/LighthouseSanctuary",
    Icon: Facebook,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/lighthousesanctuary?igsh=MTVkOWF0bWl6dGhieA==",
    Icon: Instagram,
  },
];

export function SocialPlatformLinks({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {PLATFORM_LINKS.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          title={label}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/65 text-foreground/75 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Icon className={cn("h-4.5 w-4.5", iconClassName)} strokeWidth={1.9} />
        </a>
      ))}
    </div>
  );
}
