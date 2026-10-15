/**
 * Continues the Hero/AstrologyToolsSection/HomeBlogSection's Inter-based
 * visual language rather than the Iceland/uppercase display styling used
 * elsewhere on the page.
 */
const WhyAstrologySection = () => (
  <section className="relative z-10 w-full py-16 md:py-24">
    <div className="container relative mx-auto px-4 md:px-6">
      <div className="text-center lg:text-left mb-8 md:mb-10">
        <p className="font-['Inter'] text-xs font-semibold tracking-[0.25em] uppercase text-[#e8935f] mb-3">
          Understand Astrology
        </p>
        <h2 className="font-['Inter'] font-bold tracking-tight leading-tight text-4xl sm:text-5xl text-white">
          Why do <span className="text-[#e8935f]">You</span> need
          <br className="hidden sm:block" /> astrology?
        </h2>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 md:p-12">
        <div className="max-w-4xl space-y-5 font-['Inter'] text-white/60 text-base leading-relaxed">
          <p>
            Life rarely feels random once you start looking for the patterns in it —
            recurring seasons of change, relationships that echo old lessons, moments
            that arrive right when you need them. Astrology is a language for reading
            those patterns, connecting what's happening in your life to the larger
            rhythms moving above it.
          </p>
          <p>
            For thousands of years, the positions and movements of the planets have
            been observed and interpreted as reflections of human experience — each
            planet, sign, and transit carrying its own symbolism for the moods,
            challenges, and opportunities that shape our days.
          </p>
          <p>
            At its best, astrology isn't about prediction so much as perspective. It
            gives you a structured way to pause, reflect, and ask better questions
            about the choices in front of you — a quiet companion for self-reflection
            rather than a substitute for your own judgment.
          </p>
          <p>
            Your birth chart — a map of the sky at the exact moment you were born —
            is where this becomes personal. It translates broad planetary symbolism
            into insight specific to you: your tendencies, your strengths, and the
            themes likely to matter most across your life.
          </p>
          <p>
            This is old knowledge, carried forward across cultures and generations
            long before it reached us. Understanding astrology today means drawing
            on that long history of observation while applying it to the very
            modern questions we're all still asking about who we are and where
            we're headed.
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default WhyAstrologySection;
