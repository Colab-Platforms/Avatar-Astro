import { FEATURES } from "@/data/featureCatalog";
import AskDivyaSection from "@/features/guru/AskDivyaSection";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { zodiacSigns } from "@/data/zodiacData";
import { zodiacImages } from "@/data/zodiacImages";

/** What each element traditionally stands for — general tradition, not a prediction. */
const ELEMENT_NOTES: Record<string, string> = {
  Fire: "In traditional astrology, Fire signs are linked with energy, initiative and enthusiasm.",
  Earth: "In traditional astrology, Earth signs are linked with practicality, patience and steadiness.",
  Air: "In traditional astrology, Air signs are linked with ideas, communication and social connection.",
  Water: "In traditional astrology, Water signs are linked with feeling, intuition and emotional depth.",
};

const chip = "rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm text-primary/90";
const card = "glass-card rounded-2xl p-6 md:p-8";
const h2 = "mb-4 font-display text-lg uppercase tracking-[0.18em] text-primary";

const ZodiacDetail = () => {
  const { sign = "" } = useParams<{ sign: string }>();
  const index = zodiacSigns.findIndex((z) => z.name.toLowerCase() === sign.toLowerCase());
  const zodiac = index >= 0 ? zodiacSigns[index] : undefined;

  if (!zodiac) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 pt-24 text-center">
        <h1 className="mb-3 font-display text-3xl text-primary">Sign not found</h1>
        <p className="mb-6 text-muted-foreground">We couldn&apos;t find a zodiac sign called &ldquo;{sign}&rdquo;.</p>
        <Link to="/zodiac" className="btn-outline-cosmic rounded-lg px-6 py-3">
          View all twelve signs
        </Link>
      </main>
    );
  }

  const prev = zodiacSigns[(index + 11) % 12];
  const next = zodiacSigns[(index + 1) % 12];
  const ruler = zodiac.traditionalRuling ? `${zodiac.ruling} (modern) · ${zodiac.traditionalRuling} (traditional)` : zodiac.ruling;

  return (
    <main className="relative z-10 mx-auto max-w-5xl px-4 pb-20 pt-24">
      <header className="mb-10 grid items-center gap-8 md:grid-cols-[minmax(0,260px)_1fr]">
        <div className="mx-auto w-48 md:w-full">
          <img src={zodiacImages[zodiac.name]} alt={`${zodiac.name} constellation illustration`} className="w-full object-contain drop-shadow-[0_0_24px_rgba(245,195,106,0.35)]" />
        </div>
        <div className="text-center md:text-left">
          <p className="mb-2 text-sm uppercase tracking-[0.25em] text-primary/80">{FEATURES.zodiac.name} · Sun sign profile</p>
          <h1 className="mb-2 font-display text-4xl tracking-wider text-foreground md:text-6xl">
            {zodiac.name} <span aria-hidden="true">{zodiac.symbol}</span>
          </h1>
          <p className="mb-5 text-lg text-muted-foreground">
            {zodiac.dates} <span className="text-sm">(Western tropical dates; the Vedic Rashi starts about 24 days later)</span>
          </p>
          <div className="mb-5 flex flex-wrap justify-center gap-2 md:justify-start">
            <span className={chip}>Element: {zodiac.element}</span>
            <span className={chip}>Ruler: {ruler}</span>
          </div>
          <p className="text-lg leading-relaxed text-foreground/90">{zodiac.description}</p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className={card} aria-labelledby="traits-h">
          <h2 id="traits-h" className={h2}>Core Traits</h2>
          <ul className="flex flex-wrap gap-2">
            {zodiac.traits.map((t) => (
              <li key={t} className={chip}>{t}</li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{ELEMENT_NOTES[zodiac.element]}</p>
        </section>

        <section className={card} aria-labelledby="strengths-h">
          <h2 id="strengths-h" className={h2}>Strengths</h2>
          <ul className="list-disc space-y-2 pl-5 text-foreground/90 marker:text-primary">
            {zodiac.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>

        <section className={card} aria-labelledby="challenges-h">
          <h2 id="challenges-h" className={h2}>Areas to Watch</h2>
          <ul className="list-disc space-y-2 pl-5 text-foreground/90 marker:text-primary">
            {zodiac.weaknesses.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>

        <section className={card} aria-labelledby="compat-h">
          <h2 id="compat-h" className={h2}>Traditionally Compatible Signs</h2>
          <ul className="flex flex-wrap gap-2">
            {zodiac.compatibility.map((c) => (
              <li key={c}>
                <Link to={`/zodiac/${c.toLowerCase()}`} className={`${chip} inline-block hover:border-primary hover:text-primary`}>
                  {c}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            These pairings come from the traditional idea that signs of a harmonious element tend to understand each other. They are a general guide, not a verdict on any relationship.
          </p>
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center md:p-8" aria-labelledby="next-h">
        <h2 id="next-h" className={h2}>Go Beyond Your Sun Sign</h2>
        <p className="mx-auto mb-5 max-w-2xl text-muted-foreground">
          Your Sun sign is one part of a full birth chart. See your Sun sign and Life Path profile, or see what the day holds for {zodiac.name}.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/birth-chart" className="btn-outline-cosmic rounded-lg px-6 py-3">Janma Kundali</Link>
          <Link to="/horoscopes" className="btn-outline-cosmic rounded-lg px-6 py-3">Daily Horoscope</Link>
          <Link to="/compatibility" className="btn-outline-cosmic rounded-lg px-6 py-3">Explore Jodi Jyotish</Link>
        </div>
      </section>

      <nav aria-label="Other signs" className="mt-10 flex items-center justify-between gap-4">
        <Link to={`/zodiac/${prev.name.toLowerCase()}`} className="inline-flex items-center gap-2 text-primary/90 hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {prev.name}
        </Link>
        <Link to={`/zodiac/${next.name.toLowerCase()}`} className="inline-flex items-center gap-2 text-primary/90 hover:text-primary">
          {next.name} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </nav>

      <AskDivyaSection feature="zodiac" context={`Viewing the ${zodiac.name} sign profile: element ${zodiac.element}, ruler ${ruler}. These are general traditional themes for the sign, not a personal chart.`} />

      <p className="mt-10 text-center text-sm italic leading-relaxed text-muted-foreground">
        Sun sign profiles describe general traditional themes for personal interest and reflection. They are not predictions, and one sign cannot describe a whole person.
      </p>
    </main>
  );
};

export default ZodiacDetail;
