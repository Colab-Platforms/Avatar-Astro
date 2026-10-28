const paragraphs = [
  "Life rarely feels random once you start looking for the patterns in it — recurring seasons of change, relationships that echo old lessons, moments that arrive right when you need them. Astrology is a language for reading those patterns, connecting what's happening in your life to the larger rhythms moving above it.",
  "For thousands of years, the positions and movements of the planets have been observed and interpreted as reflections of human experience — each planet, sign, and transit carrying its own symbolism for the moods, challenges, and opportunities that shape our days.",
  "At its best, astrology isn't about prediction so much as perspective. It gives you a structured way to pause, reflect, and ask better questions about the choices in front of you — a quiet companion for self-reflection rather than a substitute for your own judgment.",
  "Your birth chart — a map of the sky at the exact moment you were born — is where this becomes personal. It translates broad planetary symbolism into insight specific to you: your tendencies, your strengths, and the themes likely to matter most across your life.",
  "This is old knowledge, carried forward across cultures and generations long before it reached us. Understanding astrology today means drawing on that long history of observation while applying it to the very modern questions we're all still asking about who we are and where we're headed.",
];

const WhyAstrologySection = () => (
  <section className="hl-section relative z-10 w-full border-t border-home-line" aria-labelledby="home-why-h">
    <div className="container relative mx-auto px-4 md:px-6">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16">
        <div className="text-center lg:text-left">
          <p className="hl-eyebrow mb-3">Understand Astrology</p>
          <h2 id="home-why-h" className="hl-serif text-3xl font-bold leading-tight text-home-ink sm:text-4xl md:text-[2.5rem]">
            Why do <span className="text-home-rust">You</span> need astrology?
          </h2>
          <div
            aria-hidden="true"
            className="mx-auto mt-6 h-1.5 w-24 rounded-full bg-gradient-to-r from-home-orange to-home-rust lg:mx-0"
          />
        </div>

        <div className="space-y-5 border-home-orange font-home-sans text-base leading-relaxed text-home-muted lg:border-l-2 lg:pl-10">
          {paragraphs.map((p, i) => (
            <p key={i} className={i === 0 ? "text-lg text-home-ink" : undefined}>
              {p}
            </p>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default WhyAstrologySection;
