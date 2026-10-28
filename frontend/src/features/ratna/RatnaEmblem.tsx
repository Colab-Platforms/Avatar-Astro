const GEMS = [
  "#c8102e", // ruby
  "#e8e4dc", // pearl
  "#d2442c", // red coral
  "#1f9d6a", // emerald
  "#f2b705", // yellow sapphire
  "#dfe9f5", // diamond
  "#1e3fa8", // blue sapphire
  "#b5651d", // hessonite
  "#8a9a3b", // cat's eye
];
const GOLD = "#d4a64a";

/** Gold gemstone mandala: thin outer ring, nine gem accents, central star. */
const RatnaEmblem = ({ size = 84, className = "" }: { size?: number; className?: string }) => {
  const c = 100;
  const star = Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    const r = i % 2 === 0 ? 17 : 7;
    return `${c + Math.cos(a) * r},${c + Math.sin(a) * r}`;
  }).join(" ");
  return (
    <svg
      role="img"
      aria-label="Ratna Jyotish gemstone emblem"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="ratna-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff2c4" stopOpacity="0.95" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={c} cy={c} r="96" fill="none" stroke={GOLD} strokeWidth="1.5" />
      <circle cx={c} cy={c} r="90" fill="none" stroke={GOLD} strokeWidth="0.6" opacity="0.7" />
      <circle cx={c} cy={c} r="62" fill="none" stroke={GOLD} strokeWidth="0.6" opacity="0.6" />
      <ellipse cx={c} cy={c} rx="80" ry="34" fill="none" stroke={GOLD} strokeWidth="0.5" opacity="0.5" transform="rotate(-24 100 100)" />
      <ellipse cx={c} cy={c} rx="80" ry="34" fill="none" stroke={GOLD} strokeWidth="0.5" opacity="0.5" transform="rotate(24 100 100)" />
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 9 - Math.PI / 2;
        const x = c + Math.cos(a) * 76;
        const y = c + Math.sin(a) * 76;
        return (
          <g key={i}>
            <line x1={c + Math.cos(a) * 24} y1={c + Math.sin(a) * 24} x2={x} y2={y} stroke={GOLD} strokeWidth="0.5" opacity="0.5" />
            <path
              d={`M${x},${y - 9} L${x + 7},${y} L${x},${y + 9} L${x - 7},${y} Z`}
              fill={GEMS[i]}
              stroke={GOLD}
              strokeWidth="1"
            />
          </g>
        );
      })}
      <circle cx={c} cy={c} r="30" fill="url(#ratna-glow)" />
      <polygon points={star} fill={GOLD} stroke="#fff2c4" strokeWidth="0.5" />
      <circle cx={c} cy={c} r="3" fill="#fff8e0" />
    </svg>
  );
};

export default RatnaEmblem;
