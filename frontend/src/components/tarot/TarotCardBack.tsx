import { useId, useState } from "react";

/**
 * The back of a tarot card: Bhagya's original card-back artwork (gold mandala, planets and moon phases) in the brand's
 * chocolate and burgundy. If the picture cannot load, a drawn version of the same design is shown, so a card back is
 * never a plain rectangle.
 *
 * Fill the card's box with it (it positions itself absolutely) and put `group` on the parent to get the hover sheen.
 */
export const CARD_BACK_SRC = "/images/tarot/cards/tarot-card-back-burgundy.png";

export default function TarotCardBack() {
  const [failed, setFailed] = useState(false);
  return (
    <>
      {failed ? (
        <DrawnCardBack />
      ) : (
        <img src={CARD_BACK_SRC} alt="" draggable={false} onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" data-testid="card-back-art" />
      )}
      {/* Depth: darker edges, a fine inner gold frame, and a soft sheen that crosses the card on hover. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_55%,rgba(20,6,2,0.55)_100%)]" />
      <span aria-hidden className="pointer-events-none absolute inset-[3.5%] rounded-[10px] border border-[#E9B872]/35" />
      <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#FFE9BF]/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full motion-reduce:hidden" />
    </>
  );
}

const GOLD = "#C18A3D";
const LIGHT = "#E9B872";

/** The same design, drawn in code: layered gold frames, a mandala with a sun at its heart, stars, moons and corner ornaments. */
function DrawnCardBack() {
  const id = useId().replace(/:/g, "");
  const rays = Array.from({ length: 24 }, (_, i) => i * 15);
  const petals = Array.from({ length: 12 }, (_, i) => i * 30);
  const stars: [number, number, number][] = [[18, 30, 1.1], [82, 26, 1.4], [26, 60, 0.8], [76, 58, 0.9], [20, 100, 0.9], [80, 96, 1.2], [30, 124, 0.8], [72, 122, 1]];
  return (
    <svg viewBox="0 0 100 150" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden data-testid="card-back-drawn">
      <defs>
        <radialGradient id={`${id}bg`} cx="50%" cy="46%" r="75%">
          <stop offset="0%" stopColor="#6A2412" />
          <stop offset="60%" stopColor="#4A160D" />
          <stop offset="100%" stopColor="#2A0F04" />
        </radialGradient>
        <linearGradient id={`${id}gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={LIGHT} />
          <stop offset="50%" stopColor={GOLD} />
          <stop offset="100%" stopColor="#8E5F22" />
        </linearGradient>
        <radialGradient id={`${id}sun`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE9BF" />
          <stop offset="100%" stopColor={GOLD} />
        </radialGradient>
      </defs>
      <rect width="100" height="150" fill={`url(#${id}bg)`} />
      {/* layered frames */}
      <rect x="3" y="3" width="94" height="144" rx="5" fill="none" stroke={`url(#${id}gold)`} strokeWidth="1.1" />
      <rect x="5.6" y="5.6" width="88.8" height="138.8" rx="3.4" fill="none" stroke={GOLD} strokeWidth="0.35" opacity="0.9" />
      <rect x="8" y="8" width="84" height="134" rx="2.4" fill="none" stroke={GOLD} strokeWidth="0.6" opacity="0.75" />
      <rect x="10" y="10" width="80" height="130" rx="1.6" fill="none" stroke={LIGHT} strokeWidth="0.25" opacity="0.6" strokeDasharray="1.2 1.6" />
      {/* corner ornaments */}
      {([[12, 12, 0], [88, 12, 90], [88, 138, 180], [12, 138, 270]] as [number, number, number][]).map(([x, y, r]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${r})`} fill="none" stroke={GOLD} strokeWidth="0.55">
          <path d="M0 0 H9 M0 0 V9" strokeLinecap="round" />
          <path d="M2.4 2.4 Q8 2.4 8 8" opacity="0.8" />
          <circle cx="2.4" cy="2.4" r="1.1" fill={LIGHT} stroke="none" />
          <circle cx="9.6" cy="0" r="0.6" fill={GOLD} stroke="none" />
          <circle cx="0" cy="9.6" r="0.6" fill={GOLD} stroke="none" />
        </g>
      ))}
      {/* mandala */}
      <g transform="translate(50 75)">
        <circle r="36" fill="none" stroke={GOLD} strokeWidth="0.3" opacity="0.7" strokeDasharray="0.8 1.8" />
        <circle r="31" fill="none" stroke={GOLD} strokeWidth="0.55" opacity="0.8" />
        <circle r="26" fill="none" stroke={LIGHT} strokeWidth="0.3" opacity="0.7" />
        {rays.map((a) => <line key={a} x1="0" y1="-26" x2="0" y2={a % 45 === 0 ? -35 : -31.5} stroke={GOLD} strokeWidth={a % 45 === 0 ? 0.6 : 0.35} transform={`rotate(${a})`} opacity="0.85" />)}
        {petals.map((a) => <path key={a} d="M0 -9 Q4.2 -17 0 -25 Q-4.2 -17 0 -9 Z" fill="none" stroke={GOLD} strokeWidth="0.45" transform={`rotate(${a})`} opacity="0.9" />)}
        <circle r="9.5" fill="none" stroke={`url(#${id}gold)`} strokeWidth="0.9" />
        <circle r="7.2" fill="none" stroke={GOLD} strokeWidth="0.35" strokeDasharray="0.7 1.1" />
        {/* the sun */}
        {Array.from({ length: 16 }, (_, i) => <path key={i} d="M0 -4.6 L1 -7.2 L-1 -7.2 Z" fill={GOLD} transform={`rotate(${i * 22.5})`} />)}
        <circle r="3.6" fill={`url(#${id}sun)`} />
        <circle r="1.1" fill="#4A160D" opacity="0.55" />
      </g>
      {/* crescent moons and stars */}
      <path d="M50 20 a5 5 0 1 0 4.6 7 a4 4 0 1 1 -4.6 -7 Z" transform="translate(-2.5 -3)" fill={`url(#${id}gold)`} />
      <path d="M50 20 a5 5 0 1 0 4.6 7 a4 4 0 1 1 -4.6 -7 Z" transform="translate(52.5 147) rotate(180)" fill={`url(#${id}gold)`} />
      {stars.map(([x, y, r]) => <path key={`${x}-${y}`} d={`M${x} ${y - r * 2.2} L${x + r * 0.5} ${y - r * 0.5} L${x + r * 2.2} ${y} L${x + r * 0.5} ${y + r * 0.5} L${x} ${y + r * 2.2} L${x - r * 0.5} ${y + r * 0.5} L${x - r * 2.2} ${y} L${x - r * 0.5} ${y - r * 0.5} Z`} fill={LIGHT} opacity="0.85" />)}
    </svg>
  );
}
