import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import aboutIllustration from "@/assets/hero/layeredHouses.png";

const About = () => (
  <PublicLayout>
    <div className="bg-background pb-20 md:pb-28">
      <div className="container mx-auto px-4">
        <section className="grid gap-10 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-center md:gap-14">
          {/* Image column */}
          <div className="flex justify-center">
            <img
              src={aboutIllustration}
              alt="Watercolor illustration inspired by the Portofino coastline."
              className="w-full max-w-xl object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>

          {/* Text column */}
          <div className="space-y-5 text-[hsl(200_14%_38%)] md:space-y-6">
            <p className="text-lg leading-relaxed">
              Bella Bay Foundation provides safety, dignity, and long‑term support for girls recovering from trafficking and abuse.
            </p>
            <p className="text-lg leading-relaxed">
              Inspired by Portofino, Italy, our name reflects the belief that healing—like the layered homes along the coast—is built gradually, through care, stability, and community.
            </p>
            <p className="text-lg leading-relaxed">
              Each program we support is part of a larger structure: safe housing, essential services, and pathways toward independence. Layer by layer, these elements create environments where girls are not only protected, but able to begin again.
            </p>
            <p className="text-lg leading-relaxed">
              Our work is grounded in respect, transparency, and partnership. We are grateful to the donors who make this care possible.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Link
                to="/impact"
                className="text-sm font-medium text-[hsl(200_24%_26%)] underline-offset-4 hover:underline"
              >
                Support care that heals
              </Link>
              <Link
                to="/impact"
                className="inline-flex items-center justify-center rounded-full bg-[#6E8F6B] px-7 py-2.5 text-sm font-semibold text-[hsl(40_44%_99%)] shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E8F6B]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Become a donor
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  </PublicLayout>
);

export default About;
