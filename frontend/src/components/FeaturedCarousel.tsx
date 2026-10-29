import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { featuredSlides } from "@/data/features";
import FeatureButton from "./FeatureButton";

const arrowCls =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-home-gerua bg-home-gerua text-home-ivory transition-colors duration-300 hover:border-home-gold hover:bg-home-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-home-ink motion-reduce:transition-none";

/** Four-slide featured-tool carousel: arrows wrap around, dots jump to a slide, no auto-advance. */
const FeaturedCarousel = () => {
  const [index, setIndex] = useState(0);
  const count = featuredSlides.length;
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <div className="hl-card group relative overflow-hidden">
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured tools"
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-4 py-4 sm:px-5 lg:gap-x-4 lg:py-6"
      >
        <button type="button" aria-label="Previous featured tool" onClick={() => go(-1)} className={`${arrowCls} order-2 lg:order-1`}>
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="order-1 col-span-3 min-w-0 lg:order-2 lg:col-span-1 lg:mx-auto lg:w-full lg:max-w-[1040px]" aria-live="polite">
          <div className="grid">
            {featuredSlides.map((slide, i) => {
              const active = i === index;
              return (
                <div
                  key={slide.title}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${count}`}
                  aria-hidden={!active}
                  className={`col-start-1 row-start-1 grid grid-cols-1 items-center gap-4 transition-[opacity,visibility] duration-300 motion-reduce:transition-none md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,240px)_minmax(0,1fr)] lg:gap-8 ${
                    active ? "visible opacity-100" : "pointer-events-none invisible opacity-0"
                  }`}
                >
                  <div className="text-center md:text-left">
                    <span className="mb-1 inline-block font-home-sans text-[0.75rem] font-bold uppercase tracking-[0.2em] text-home-gerua">
                      {slide.badge}
                    </span>
                    <h3 className="hl-serif mb-1.5 text-[1.625rem] font-semibold normal-case leading-tight tracking-[0.03em] text-home-ink">
                      {slide.title}
                    </h3>
                    <p className="mx-auto mb-3 max-w-sm font-home-sans text-[0.9rem] leading-[1.45] text-home-muted md:mx-0">
                      {slide.description}
                    </p>
                    <FeatureButton to={slide.buttonPath} label={slide.buttonLabel} />
                  </div>

                  <div className="mx-auto w-full max-w-[240px] overflow-hidden rounded-xl border border-home-line shadow-[0_8px_22px_rgba(89,34,9,0.16)]">
                    <div className="aspect-[4/3] w-full">
                      <img
                        src={slide.image}
                        alt={slide.imageAlt}
                        width={800}
                        height={600}
                        className="h-full w-full object-cover"
                        loading={i === 0 ? "eager" : "lazy"}
                        decoding="async"
                      />
                    </div>
                  </div>

                  <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 md:col-span-2 lg:col-span-1 lg:grid-cols-1">
                    {slide.checklist.map((item) => (
                      <li key={item} className="flex items-start gap-2 font-home-sans text-[0.9rem] leading-snug text-home-ink/85">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-home-gerua" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <button type="button" aria-label="Next featured tool" onClick={() => go(1)} className={`${arrowCls} order-4 lg:order-3`}>
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="order-3 flex items-center justify-center lg:order-4 lg:col-span-3" role="group" aria-label="Choose featured tool">
          {featuredSlides.map((slide, i) => (
            <button
              key={slide.title}
              type="button"
              aria-label={`Show ${slide.title}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setIndex(i)}
              className="flex h-5 items-center justify-center px-1"
            >
              <span
                className={`block h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                  i === index ? "w-5 bg-home-gerua" : "w-1.5 bg-home-gerua/25 hover:bg-home-gerua/50"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturedCarousel;
