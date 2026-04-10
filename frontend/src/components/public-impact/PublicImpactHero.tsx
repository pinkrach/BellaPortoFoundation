import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { WaveDivider } from "@/components/WaveDivider";

type PublicImpactHeroProps = {
  donateLink: string;
  imageSrc: string;
};

export function PublicImpactHero({ donateLink, imageSrc }: PublicImpactHeroProps) {
  return (
    <section aria-labelledby="impact-hero-heading" className="relative flex min-h-[76vh] items-center overflow-hidden md:min-h-[84vh]">
      <div className="absolute inset-0">
        <img
          src={imageSrc}
          alt="Watercolor artwork of two girls standing together by the water at sunset."
          className="h-full w-full object-cover object-[62%_38%] md:object-[58%_34%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,43,53,0.74)_0%,rgba(28,43,53,0.52)_38%,rgba(28,43,53,0.16)_68%,rgba(245,240,232,0)_100%)]" />
      </div>

      <div className="container relative z-10 mx-auto px-3 py-24 sm:px-4 md:py-32">
        <div className="max-w-2xl">
          <h1 id="impact-hero-heading" className="font-heading text-4xl font-bold leading-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl lg:text-7xl">
            Your Impact
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/90 drop-shadow-md md:text-xl">
            See how support becomes safety, healing, and hope for girls rebuilding their lives.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
            <Link
              to={donateLink}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#6a5288] px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:scale-105 hover:bg-[#5d4778] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
            >
              Donate Now
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#impact-calculator"
              className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-white/70 px-8 py-3 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
            >
              See Your Impact
            </a>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 w-full overflow-hidden">
        <WaveDivider className="text-muted" />
      </div>
    </section>
  );
}
