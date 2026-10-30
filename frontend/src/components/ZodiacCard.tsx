import { Link } from 'react-router-dom';
import { ZodiacSign } from '@/data/zodiacData';

import ariesImg        from '@/assets/zodiac/aries.png';
import taurusImg       from '@/assets/zodiac/taurus.png';
import geminiImg       from '@/assets/zodiac/gemini.png';
import cancerImg       from '@/assets/zodiac/cancer.png';
import leoImg          from '@/assets/zodiac/leo.png';
import virgoImg        from '@/assets/zodiac/virgo.png';
import libraImg        from '@/assets/zodiac/libra.png';
import scorpioImg      from '@/assets/zodiac/scorpio.png';
import sagittariusImg  from '@/assets/zodiac/sagittarius.png';
import capricornImg    from '@/assets/zodiac/capricorn.png';
import aquariusImg     from '@/assets/zodiac/aquarius.png';
import piscesImg       from '@/assets/zodiac/pisces.png';

interface ZodiacCardProps {
  sign: ZodiacSign;
  index: number;
  compact?: boolean;
}

const zodiacImages: Record<string, string> = {
  Aries: ariesImg, Taurus: taurusImg, Gemini: geminiImg, Cancer: cancerImg,
  Leo: leoImg, Virgo: virgoImg, Libra: libraImg, Scorpio: scorpioImg,
  Sagittarius: sagittariusImg, Capricorn: capricornImg,
  Aquarius: aquariusImg, Pisces: piscesImg,
};

const ZodiacCard = ({ sign, index, compact = false }: ZodiacCardProps) => {
  const zodiacImage = zodiacImages[sign.name];

  if (compact) {
    return (
      <Link
        to={`/zodiac/${sign.name.toLowerCase()}`}
        className="glass-card-hover rounded-2xl p-4 text-center block group"
      >
        <div className="w-16 h-16 mx-auto mb-3 transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_15px_rgba(245,195,106,0.5)]">
          <img src={zodiacImage} alt={sign.name} className="w-full h-full object-contain" />
        </div>
        <h3 className="font-display text-lg tracking-wider text-foreground mb-1 group-hover:text-primary transition-colors">
          {sign.name}
        </h3>
        <p className="text-xs text-muted-foreground">{sign.dates}</p>
      </Link>
    );
  }

  return (
    <Link
      to={`/zodiac/${sign.name.toLowerCase()}`}
      className="group block relative mx-auto"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="zodiac-card-body relative rounded-2xl border border-primary/40 overflow-hidden transition-all duration-500 hover:border-primary/65 hover:shadow-[0_0_44px_rgba(78,47,36,0.42),0_0_18px_rgba(245,195,106,0.14)]">

        {/* Faint warm radial behind the illustration */}
        <div className="zodiac-card-art-glow" />

        {/* ── Centered content — reference order ── */}
        <div
          className="relative flex flex-col items-center text-center px-6 pt-7 pb-5"
          style={{ zIndex: 1 }}
        >
          {/* 1 — Zodiac Illustration ~32% of card height */}
          <div className="w-[162px] h-[162px] mb-3 flex-shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_26px_rgba(245,195,106,0.62)]">
            <img
              src={zodiacImage}
              alt={sign.name}
              className="w-full h-full object-contain"
            />
          </div>

          {/* 2 — Element Badge */}
          <span
            className="flex-shrink-0 text-[13px] font-medium uppercase tracking-[0.18em] text-primary/90 px-5 py-[6px] rounded-full border border-primary/40 mb-3"
            style={{ background: '#FBF5EC' }}
          >
            {sign.element}
          </span>

          {/* 3 — Zodiac Name */}
          <h3 className="zodiac-card-name flex-shrink-0 text-foreground mb-1 group-hover:text-primary transition-colors duration-300">
            {sign.name}
          </h3>

          {/* 4 — Date Range */}
          <p className="flex-shrink-0 text-xs text-muted-foreground mb-3 tracking-[0.06em]">
            {sign.dates}
          </p>

          {/* 5 — Personality Traits (4 tags, centered) */}
          <div className="flex flex-wrap justify-center gap-1.5 mb-3 flex-shrink-0">
            {sign.traits.slice(0, 4).map(trait => (
              <span
                key={trait}
                className="text-[10px] px-2.5 py-[3px] rounded-full border border-primary/25 text-primary/80 bg-primary/5"
              >
                {trait}
              </span>
            ))}
          </div>

          {/* 6 — Description */}
          <p className="zodiac-card-desc text-muted-foreground">
            {sign.description}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default ZodiacCard;
