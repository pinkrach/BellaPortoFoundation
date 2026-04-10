import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type PublicImpactHeroProps = {
  donateLink: string;
  imageSrc: string;
};

export function PublicImpactHero({ donateLink, imageSrc }: PublicImpactHeroProps) {
  return (
    <section className="relative overflow-hidden bg-[hsl(35_45%_95%)]">
      <div className="absolute inset-0">
        <img
          src={imageSrc}
          alt="Watercolor artwork of two girls standing together by the water at sunset."
          className="h-full min-h-[560px] w-full object-cover object-[72%_28%] md:object-[72%_24%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,43,53,0.74)_0%,rgba(28,43,53,0.52)_38%,rgba(28,43,53,0.16)_68%,rgba(245,240,232,0)_100%)]" />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-14 md:py-20">
        <div className="grid min-h-[560px] items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <div className="max-w-2xl">
            <h1 className="font-heading text-5xl font-semibold leading-[0.95] text-white drop-shadow-[0_10px_28px_rgba(0,0,0,0.35)] md:text-7xl">
              Your Impact
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.3)] md:text-xl">
              See how support becomes safety, healing, and hope for girls rebuilding their lives.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={donateLink}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(266_34%_63%)] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(155,127,192,0.95)] transition hover:translate-y-[-1px] hover:bg-[hsl(266_34%_58%)]"
              >
                Donate Now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#impact-calculator"
                className="inline-flex items-center justify-center rounded-full border border-white/35 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/18"
              >
                See Your Impact
              </a>
            </div>
          </div>

          <div className="hidden lg:block" aria-hidden />
        </div>
      </div>
    </section>
  );
}
