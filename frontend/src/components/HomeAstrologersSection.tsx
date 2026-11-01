import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AstrologerCard from "@/components/astrologers/AstrologerCard";
import { ASTROLOGERS } from "@/data/astrologers";

/** Homepage teaser for the astrologer directory: the first four profiles and a link to all of them. */
const HomeAstrologersSection = () => {
  const featured = ASTROLOGERS.slice(0, 4);
  if (featured.length === 0) return null; // only real, published astrologers are shown on the homepage
  return (
    <section className="relative w-full py-10 md:py-14" aria-labelledby="home-astrologers-h" data-testid="home-astrologers">
      <div className="container relative mx-auto px-4 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="hl-eyebrow mb-2">Consult Astrologers</p>
            <h2 id="home-astrologers-h" className="hl-serif text-[1.625rem] font-semibold normal-case leading-[1.15] tracking-[0.03em] text-home-ink sm:text-[1.875rem] md:text-[2.25rem]">
              Talk to an <span className="text-home-gerua">Astrologer</span>
            </h2>
            <p className="mt-2 max-w-2xl font-home-sans text-base text-home-muted">
              Browse astrologers by expertise and language, and read each profile before you decide.
            </p>
          </div>
          <Link to="/astrologers" className="hl-btn-ghost group/btn h-11 w-fit shrink-0">
            View all astrologers
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
        <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {featured.map((a) => (
            <AstrologerCard key={a.id} a={a} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeAstrologersSection;
