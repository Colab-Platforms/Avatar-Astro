import type { ReactNode } from "react";
import type { TarotCard } from "@/data/tarotData";

/**
 * Local, resolution-independent tarot illustrations (no external images).
 * Every card shares one celestial frame — deep gerua-black sky, fine gold borders,
 * a warm halo — and gets its own emblem drawn in gold line-work with orange/cream
 * highlights. Text (number / name) is laid over the art by the card components and
 * sits on a scrim, so the art never has to carry copy.
 */

const GOLD = "#E9B872";
const ORANGE = "#E58A45";
const CREAM = "#F5E9D6";
const GERUA = "#592209";

const line = { fill: "none", stroke: GOLD, strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const solid = { fill: GOLD, stroke: "none" } as const;
const warm = { fill: ORANGE, stroke: "none" } as const;

const rays = (cx: number, cy: number, r1: number, r2: number, n: number, off = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((i * 360) / n + off) * (Math.PI / 180);
    return (
      <line
        key={i}
        x1={cx + Math.cos(a) * r1}
        y1={cy + Math.sin(a) * r1}
        x2={cx + Math.cos(a) * r2}
        y2={cy + Math.sin(a) * r2}
        {...line}
      />
    );
  });

const star = (cx: number, cy: number, r: number, key?: string | number) => (
  <path
    key={key}
    d={`M${cx} ${cy - r}L${cx + r * 0.28} ${cy - r * 0.28}L${cx + r} ${cy}L${cx + r * 0.28} ${cy + r * 0.28}L${cx} ${cy + r}L${cx - r * 0.28} ${cy + r * 0.28}L${cx - r} ${cy}L${cx - r * 0.28} ${cy - r * 0.28}Z`}
    {...solid}
  />
);

const crescent = (cx: number, cy: number, r: number) => (
  <path d={`M${cx + r * 0.3} ${cy - r}A${r} ${r} 0 1 0 ${cx + r * 0.3} ${cy + r}A${r * 0.78} ${r * 0.78} 0 1 1 ${cx + r * 0.3} ${cy - r}Z`} {...solid} />
);

const pillar = (x: number, h = 56) => (
  <g>
    <rect x={x - 4} y={100 - h} width="8" height={h} {...line} />
    <rect x={x - 6} y={100 - h - 4} width="12" height="4" {...solid} />
    <rect x={x - 6} y="100" width="12" height="4" {...solid} />
  </g>
);

const person = (cx: number, top: number, s = 1) => (
  <g>
    <circle cx={cx} cy={top + 5 * s} r={4.5 * s} {...line} />
    <path d={`M${cx} ${top + 10 * s}L${cx} ${top + 28 * s}M${cx - 9 * s} ${top + 17 * s}L${cx + 9 * s} ${top + 17 * s}M${cx} ${top + 28 * s}L${cx - 7 * s} ${top + 44 * s}M${cx} ${top + 28 * s}L${cx + 7 * s} ${top + 44 * s}`} {...line} />
  </g>
);

const heart = (cx: number, cy: number, s: number) => (
  <path d={`M${cx} ${cy + 7 * s}C${cx - 12 * s} ${cy - 1 * s} ${cx - 8 * s} ${cy - 9 * s} ${cx} ${cy - 3 * s}C${cx + 8 * s} ${cy - 9 * s} ${cx + 12 * s} ${cy - 1 * s} ${cx} ${cy + 7 * s}Z`} {...warm} />
);

const MOTIFS: Record<number, ReactNode> = {
  // 0 — The Fool: a traveller stepping off a cliff beneath a high sun
  0: (
    <>
      <circle cx="68" cy="50" r="8" {...warm} />
      {rays(68, 50, 11, 16, 12)}
      <path d="M18 112L18 96L48 96L58 104L66 112Z" {...line} />
      <path d="M10 112L90 112" {...line} />
      {person(40, 56, 0.9)}
      <path d="M32 72L22 62M48 72L58 62" {...line} />
      <circle cx="26" cy="86" r="2" {...solid} />
    </>
  ),
  // 1 — The Magician: infinity above a raised wand, four tools on the altar
  1: (
    <>
      <path d="M36 44C36 36 46 36 50 44C54 52 64 52 64 44C64 36 54 36 50 44C46 52 36 52 36 44Z" {...line} />
      {person(50, 54, 0.85)}
      <path d="M59 66L72 44" {...line} />
      <circle cx="72" cy="44" r="2" {...warm} />
      <rect x="24" y="98" width="52" height="5" {...line} />
      <circle cx="32" cy="93" r="3" {...solid} />
      <path d="M44 90L44 97M48 92L48 97" {...line} />
      <path d="M58 91L58 97M55 91L61 91" {...line} />
      <rect x="66" y="91" width="6" height="6" {...line} />
    </>
  ),
  // 2 — The High Priestess: moon-crowned between two pillars
  2: (
    <>
      {pillar(24)}
      {pillar(76)}
      <path d="M36 100L40 66Q50 56 60 66L64 100Z" {...line} />
      <circle cx="50" cy="58" r="4.5" {...line} />
      {crescent(50, 44, 7)}
      <path d="M40 80Q50 86 60 80" {...line} />
      <circle cx="50" cy="88" r="3" {...warm} />
    </>
  ),
  // 3 — The Empress: a crown of stars over the sign of Venus, wheat at her feet
  3: (
    <>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
        const a = (i * 30 - 90) * (Math.PI / 180);
        return star(50 + Math.cos(a) * 20, 62 + Math.sin(a) * 20, 2.4, i);
      })}
      <circle cx="50" cy="58" r="10" {...line} />
      <path d="M50 68L50 92M42 80L58 80" {...line} />
      <path d="M26 104Q28 90 32 82M26 104Q22 92 22 84M74 104Q72 90 68 82M74 104Q78 92 78 84" {...line} />
      {heart(50, 108, 0.6)}
    </>
  ),
  // 4 — The Emperor: ram-horned throne with orb and sceptre
  4: (
    <>
      <path d="M30 100L30 56L70 56L70 100Z" {...line} />
      <path d="M30 56Q22 40 34 36Q28 46 38 54M70 56Q78 40 66 36Q72 46 62 54" {...line} />
      <circle cx="50" cy="66" r="6" {...line} />
      <path d="M42 100L42 78L58 78L58 100M50 72L50 78" {...line} />
      <path d="M72 70L72 98" {...line} />
      <circle cx="72" cy="66" r="4" {...warm} />
      <path d="M44 56L46 50L50 54L54 50L56 56Z" {...solid} />
    </>
  ),
  // 5 — The Hierophant: triple cross between pillars with crossed keys
  5: (
    <>
      {pillar(22, 48)}
      {pillar(78, 48)}
      <path d="M50 38L50 100M44 48L56 48M42 60L58 60M38 74L62 74" {...line} />
      <path d="M36 92L44 100M44 92L36 100M56 92L64 100M64 92L56 100" {...line} />
      <path d="M44 34L50 28L56 34" {...line} />
      <circle cx="50" cy="28" r="2" {...warm} />
    </>
  ),
  // 6 — The Lovers: two figures beneath a radiant sun-angel
  6: (
    <>
      <circle cx="50" cy="40" r="7" {...warm} />
      {rays(50, 40, 10, 15, 14)}
      <path d="M50 54L50 62M34 66Q50 56 66 66" {...line} />
      {person(33, 62, 0.8)}
      {person(67, 62, 0.8)}
      {heart(50, 84, 0.8)}
      <path d="M22 106Q50 96 78 106" {...line} />
    </>
  ),
  // 7 — The Chariot: starred canopy, two wheels, twin sphinxes
  7: (
    <>
      <path d="M26 50Q50 36 74 50" {...line} />
      {[34, 42, 50, 58, 66].map((x, i) => star(x, 48 - (i % 2 === 0 ? 2 : 0) + (i === 2 ? -3 : 0), 1.8, i))}
      <path d="M28 52L28 80M72 52L72 80" {...line} />
      <rect x="28" y="78" width="44" height="12" {...line} />
      <circle cx="36" cy="96" r="8" {...line} />
      <circle cx="64" cy="96" r="8" {...line} />
      {rays(36, 96, 2, 8, 8)}
      {rays(64, 96, 2, 8, 8)}
      <circle cx="50" cy="68" r="5" {...line} />
      <path d="M16 112Q22 104 30 108M84 112Q78 104 70 108" {...line} />
    </>
  ),
  // 8 — Strength: gentle hands on a lion's mane beneath the infinity sign
  8: (
    <>
      <path d="M38 38C38 31 46 31 50 38C54 45 62 45 62 38C62 31 54 31 50 38C46 45 38 45 38 38Z" {...line} />
      <circle cx="50" cy="76" r="18" {...line} />
      {rays(50, 76, 20, 27, 16)}
      <circle cx="44" cy="74" r="1.8" {...solid} />
      <circle cx="56" cy="74" r="1.8" {...solid} />
      <path d="M46 84Q50 88 54 84M50 78L50 83" {...line} />
      <path d="M30 108Q50 98 70 108" {...line} />
    </>
  ),
  // 9 — The Hermit: cloaked wanderer holding a lantern with a six-pointed star
  9: (
    <>
      <path d="M10 112L34 74L48 94L62 70L90 112Z" {...line} />
      <path d="M40 56Q40 48 46 48Q52 48 52 56L56 100L34 100Z" {...line} />
      <path d="M62 52L62 100" {...line} />
      <rect x="64" y="56" width="14" height="16" rx="2" {...line} />
      <path d="M71 59L74.5 66L67.5 66ZM71 70L67.5 63L74.5 63Z" {...warm} />
      {rays(71, 64, 11, 17, 10)}
    </>
  ),
  // 10 — Wheel of Fortune: spoked wheel with a ring of symbols
  10: (
    <>
      <circle cx="50" cy="70" r="26" {...line} />
      <circle cx="50" cy="70" r="16" {...line} />
      <circle cx="50" cy="70" r="4" {...warm} />
      {rays(50, 70, 4, 26, 8)}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * 45 - 90) * (Math.PI / 180);
        return <circle key={i} cx={50 + Math.cos(a) * 21} cy={70 + Math.sin(a) * 21} r="1.7" {...solid} />;
      })}
      {star(50, 36, 3)}
      <path d="M24 108Q50 98 76 108" {...line} />
    </>
  ),
  // 11 — Justice: balanced scales with an upright sword
  11: (
    <>
      <path d="M50 30L50 108M44 108L56 108" {...line} />
      <path d="M44 34L50 28L56 34" {...solid} />
      <path d="M24 56L76 56" {...line} />
      <path d="M24 56L16 78L32 78Z M76 56L68 78L84 78Z" {...line} />
      <path d="M14 78Q24 88 34 78M66 78Q76 88 86 78" {...line} />
      <circle cx="50" cy="56" r="3" {...warm} />
    </>
  ),
  // 12 — The Hanged Man: serene figure suspended upside-down from a T-frame, haloed
  12: (
    <>
      <path d="M22 38L78 38M30 38L30 108M70 38L70 108" {...line} />
      <path d="M50 38L50 58" {...line} />
      <circle cx="50" cy="84" r="9" {...line} />
      <circle cx="50" cy="84" r="12.5" stroke={ORANGE} strokeWidth="0.9" fill="none" />
      <path d="M50 58L50 74M42 62L58 62M42 62L40 74M58 62L60 74" {...line} />
    </>
  ),
  // 13 — Death: a scythe and a rose before the rising sun between two towers
  13: (
    <>
      <path d="M20 108L20 76L28 76L28 108M72 108L72 76L80 76L80 108" {...line} />
      <path d="M36 108Q50 54 64 108" {...line} />
      <circle cx="50" cy="86" r="9" {...warm} />
      {rays(50, 86, 11, 16, 11, -85)}
      <path d="M40 40Q58 32 64 52M64 52L38 104" {...line} />
      <path d="M12 108L88 108" {...line} />
      <circle cx="50" cy="64" r="4" {...line} />
    </>
  ),
  // 14 — Temperance: winged angel pouring water between two cups
  14: (
    <>
      <path d="M50 44L50 90M50 44Q28 34 16 54Q30 52 40 62M50 44Q72 34 84 54Q70 52 60 62" {...line} />
      <circle cx="50" cy="38" r="5" {...line} />
      <path d="M26 80L34 80L32 92L28 92ZM66 70L74 70L72 82L68 82Z" {...line} />
      <path d="M34 82Q50 70 66 76" stroke={ORANGE} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M30 108Q50 98 70 108" {...line} />
    </>
  ),
  // 15 — The Devil: inverted pentagram under horns, linked chains below
  15: (
    <>
      <path d="M30 46Q26 32 38 28M70 46Q74 32 62 28" {...line} />
      <circle cx="50" cy="66" r="22" {...line} />
      <path d="M50 88L36 52L66 74L34 74L64 52Z" {...line} />
      <circle cx="50" cy="66" r="3" {...warm} />
      {[34, 46, 58].map((x, i) => <ellipse key={i} cx={x + 4} cy="108" rx="6" ry="3.5" {...line} />)}
    </>
  ),
  // 16 — The Tower: lightning strikes a crowned tower, flames at its windows
  16: (
    <>
      <path d="M38 108L40 60L60 60L62 108Z" {...line} />
      <path d="M36 60L64 60L58 50L42 50Z" {...line} />
      <rect x="46" y="74" width="8" height="10" {...line} />
      <path d="M66 28L56 52L64 52L54 76" stroke={ORANGE} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 44L30 52M74 44L70 52M22 70L28 74" {...line} />
      <circle cx="30" cy="38" r="2.4" {...solid} />
      <path d="M24 108L76 108" {...line} />
    </>
  ),
  // 17 — The Star: great eight-point star with seven lesser stars over still water
  17: (
    <>
      {star(50, 54, 17)}
      {rays(50, 54, 20, 25, 8, 22.5)}
      {[[24, 40], [76, 40], [18, 62], [82, 62], [30, 78], [70, 78], [50, 28]].map(([x, y], i) => star(x, y, 3.2, i))}
      <path d="M20 100Q35 94 50 100T80 100M26 108Q38 103 50 108T74 108" {...line} />
    </>
  ),
  // 18 — The Moon: full moon between two towers above a winding path
  18: (
    <>
      <circle cx="50" cy="52" r="17" {...line} />
      {crescent(50, 52, 13)}
      {rays(50, 52, 21, 27, 16)}
      <path d="M16 108L16 78L24 78L24 108M76 108L76 78L84 78L84 108" {...line} />
      <path d="M40 108Q56 98 44 90Q32 84 50 76" {...line} />
      <path d="M30 108L70 108" {...line} />
    </>
  ),
  // 19 — The Sun: radiant sun with a calm face over tall sunflowers
  19: (
    <>
      <circle cx="50" cy="56" r="17" {...warm} />
      {rays(50, 56, 21, 31, 16)}
      <circle cx="44" cy="54" r="1.8" fill={GERUA} />
      <circle cx="56" cy="54" r="1.8" fill={GERUA} />
      <path d="M44 62Q50 67 56 62" stroke={GERUA} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M22 108L22 90M50 108L50 92M78 108L78 90" {...line} />
      {[22, 50, 78].map((x, i) => <circle key={i} cx={x} cy={i === 1 ? 88 : 86} r="4.5" {...line} />)}
    </>
  ),
  // 20 — Judgement: trumpet blast above rising figures
  20: (
    <>
      <path d="M26 46L66 34L68 46L26 52Z" {...line} />
      <path d="M66 34Q76 40 68 46" {...line} />
      {rays(78, 40, 6, 12, 5, -30)}
      <path d="M12 70Q24 62 36 70Q48 62 60 70Q72 62 84 70" {...line} />
      {[26, 50, 74].map((x, i) => <g key={i}><circle cx={x} cy="86" r="3.5" {...line} /><path d={`M${x} 90L${x} 104M${x - 6} 94L${x + 6} 94`} {...line} /></g>)}
    </>
  ),
  // 21 — The World: dancer within a laurel wreath, four guardians at the corners
  21: (
    <>
      <ellipse cx="50" cy="70" rx="24" ry="34" {...line} />
      <ellipse cx="50" cy="70" rx="29" ry="39" stroke={ORANGE} strokeWidth="0.9" fill="none" strokeDasharray="1.5 3" />
      {person(50, 52, 0.7)}
      <path d="M40 66Q50 60 60 66" {...line} />
      {star(18, 36, 3)}
      {star(82, 36, 3)}
      {star(18, 106, 3)}
      {star(82, 106, 3)}
    </>
  ),
};

/** Minor Arcana: one emblem per suit, with the card number set large beneath. */
const SUIT_MOTIFS: Record<string, ReactNode> = {
  Wands: (
    <>
      <path d="M50 28L50 106" stroke={GOLD} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M50 30Q36 36 38 50M50 30Q64 36 62 50M50 44Q38 48 40 60M50 44Q62 48 60 60" {...line} stroke={ORANGE} />
      <circle cx="50" cy="26" r="2.6" {...warm} />
    </>
  ),
  Cups: (
    <>
      <path d="M30 44L70 44Q70 74 50 78Q30 74 30 44Z" {...line} />
      <path d="M50 78L50 98M36 100L64 100" {...line} />
      <path d="M32 54Q50 62 68 54" stroke={ORANGE} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {star(50, 34, 4)}
    </>
  ),
  Swords: (
    <>
      <path d="M50 22L54 76L50 82L46 76Z" {...line} />
      <path d="M36 82L64 82M50 82L50 104" {...line} />
      <circle cx="50" cy="108" r="3" {...warm} />
      <path d="M38 36L30 30M62 36L70 30" {...line} />
    </>
  ),
  Pentacles: (
    <>
      <circle cx="50" cy="66" r="26" {...line} />
      <path d="M50 42L58 82L36 56L64 56L42 82Z" {...line} />
      <circle cx="50" cy="66" r="3" {...warm} />
    </>
  ),
};

export interface TarotArtProps {
  card: TarotCard;
  className?: string;
}

/** Full-bleed card artwork. Scales to its parent via `preserveAspectRatio="xMidYMid slice"`. */
const TarotArt = ({ card, className }: TarotArtProps) => {
  const isMajor = card.arcana === "major";
  const motif = isMajor ? MOTIFS[card.id] : SUIT_MOTIFS[card.suit || ""];
  const uid = `ta-${card.id}`;
  return (
    <svg
      className={`tarot-art ${className ?? ""}`}
      viewBox="0 0 100 150"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${card.name} tarot card illustration`}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    >
      <defs>
        <radialGradient id={`${uid}-sky`} cx="50%" cy="46%" r="70%">
          <stop offset="0%" stopColor="#5A2208" />
          <stop offset="55%" stopColor="#2A0F04" />
          <stop offset="100%" stopColor="#120602" />
        </radialGradient>
        <radialGradient id={`${uid}-halo`} cx="50%" cy="46%" r="42%">
          <stop offset="0%" stopColor={ORANGE} stopOpacity="0.45" />
          <stop offset="100%" stopColor={ORANGE} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="150" fill={`url(#${uid}-sky)`} />
      <rect width="100" height="150" fill={`url(#${uid}-halo)`} />
      {/* fixed constellation so the sky is the same on every render */}
      {[[12, 20], [86, 16], [8, 70], [93, 84], [14, 128], [88, 124], [30, 14], [70, 138]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.1 : 0.7} fill={CREAM} opacity="0.7" />
      ))}
      <rect x="3" y="3" width="94" height="144" rx="6" fill="none" stroke={GOLD} strokeWidth="1" opacity="0.85" />
      <rect x="6" y="6" width="88" height="138" rx="4" fill="none" stroke={GOLD} strokeWidth="0.4" opacity="0.5" />
      <g transform="translate(0 2)">{motif}</g>
    </svg>
  );
};

export default TarotArt;
