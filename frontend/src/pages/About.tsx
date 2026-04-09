import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import aboutIllustration from "@/assets/hero/layeredHouses.png";

/** Subheadings: clearly above body scale. */
const labelClass =
  "font-heading text-[1.0625rem] font-semibold leading-snug tracking-[0.03em] text-[hsl(200_16%_28%)] md:text-[1.125rem]";

/** Body: confident but subordinate to labels and headline. */
const bodyClass =
  "text-[1rem] leading-[1.45] text-[hsl(200_14%_36%)] md:text-[1.0625rem] md:leading-[1.42]";

/** Consistent gap between narrative sections (after headline block). */
const sectionGap = "gap-2.5 md:gap-3";

const About = () => (
  <PublicLayout>
    <div className="bg-background md:min-h-[calc(100svh-4.5rem)]">
      <div className="container mx-auto flex w-full flex-col px-4 py-10 md:min-h-[calc(100svh-4.5rem)] md:max-h-[calc(100svh-4.5rem)] md:justify-center md:overflow-hidden md:px-6 md:py-3 lg:py-4">
        <section aria-labelledby="about-lead-heading" className="w-full min-h-0">
          <div className="grid min-h-0 gap-10 md:grid-cols-[minmax(0,0.96fr)_minmax(0,1.14fr)] md:items-stretch md:gap-x-5 md:gap-y-0 lg:gap-x-8">
            {/* Left: headline, narrative, CTA */}
            <div className="flex min-h-0 flex-col md:min-w-0 md:justify-between lg:max-w-[40rem]">
              <div className="min-h-0">
                <h1
                  id="about-lead-heading"
                  className="font-heading text-[clamp(2.35rem,4.5vw,3.25rem)] font-normal leading-[1.08] tracking-[-0.02em] text-[hsl(200_18%_22%)] md:mb-3 lg:mb-4"
                >
                  A Place to Begin Again
                </h1>

                <div className={`mt-1 flex flex-col ${sectionGap}`}>
                  <div>
                    <h2 className={labelClass}>What We Do</h2>
                    <p className={`mt-3.5 md:mt-4 ${bodyClass}`}>
                      Bella Bay Foundation provides safety, healing, and long‑term support for girls recovering from trafficking and abuse.
                    </p>
                  </div>

                  <div>
                    <h2 className={labelClass}>Why Bella Bay</h2>
                    <p className={`mt-3.5 md:mt-4 ${bodyClass}`}>
                      Inspired by Portofino, Italy, our name reflects the belief that healing—like the layered homes along the coast—is built gradually, through care, stability, and community.
                    </p>
                  </div>

                  <div>
                    <h2 className={labelClass}>How We Support Healing</h2>
                    <p className={`mt-3.5 md:mt-4 ${bodyClass}`}>
                      Each program we support is part of a larger structure: safe housing, essential services, and pathways toward independence. Layer by layer, these elements create environments where girls are not only protected, but able to begin again. Our work is grounded in respect, transparency, and partnership. We are grateful to the donors who make this care possible.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 shrink-0 pt-1 md:mt-9 md:pt-0">
                <div className="flex flex-col gap-3">
                  <p className="text-[1rem] font-normal leading-[1.45] text-[hsl(200_16%_30%)] md:text-[1.0625rem] md:leading-[1.4]">
                    This work is only possible with community care.
                  </p>
                  <Link
                    to="/login"
                    className="inline-flex w-fit items-center justify-center rounded-full bg-[#6E8F6B] px-8 py-3 text-[0.9375rem] font-semibold text-[hsl(40_44%_99%)] shadow-md transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E8F6B]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Become a donor
                  </Link>
                </div>
                <Link
                  to="/impact"
                  className="mt-3 inline-block text-sm font-medium text-[hsl(200_24%_26%)] underline-offset-4 hover:underline"
                >
                  Support care that heals
                </Link>
              </div>
            </div>

            {/* Right: illustration + tagline — vertically centered, mirrored visual column */}
            <div className="flex h-full min-h-0 flex-col items-center justify-center md:py-0">
              <figure className="m-0 flex w-full max-w-[min(26rem,100%)] flex-col items-center md:max-w-[min(44rem,100%)] lg:max-w-[min(46rem,100%)]">
                <div className="flex w-full justify-center px-0">
                  <div className="flex h-[clamp(16rem,52vh,26rem)] w-full max-w-full items-center justify-center md:h-[clamp(19rem,min(66vh,calc(100svh-16.5rem)),38rem)]">
                    <img
                      src={aboutIllustration}
                      alt="Watercolor illustration inspired by the Portofino coastline."
                      className="max-h-full w-full object-contain object-center"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
                <figcaption className="mt-1.5 max-w-[16.25rem] text-center text-xs italic leading-tight text-[hsl(200_14%_44%)] md:mt-1.5 md:max-w-[19rem] md:text-sm md:leading-snug">
                  Inspired by the coastal homes of Portofino —
                  <br />
                  layered, steady, and built to endure.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>
      </div>
    </div>
  </PublicLayout>
);

export default About;
