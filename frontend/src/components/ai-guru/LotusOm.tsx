/** Original lotus illustration with a subtle Om, drawn in the Bhagya palette. */
/** `animated` adds a gentle floating, breathing and soft glow (`.lotus-live` in index.css); it stops for visitors who prefer reduced motion. */
export const LotusOm = ({ size = 96, className = "", animated = false }: { size?: number; className?: string; animated?: boolean }) => (
  <svg viewBox="0 0 120 100" width={size} height={size * (100 / 120)} role="img" aria-label="Lotus with Om" className={`${className}${animated ? " lotus-live" : ""}`}>
    <defs>
      <linearGradient id="lotus-petal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F5C9A0" />
        <stop offset="1" stopColor="#E58A45" />
      </linearGradient>
      <linearGradient id="lotus-back" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F7E2C8" />
        <stop offset="1" stopColor="#E9B887" />
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="90" rx="38" ry="5" fill="#592209" opacity="0.12" />
    {/* outer petals */}
    <path d="M60 84C34 80 14 64 10 40c16 2 30 12 38 26z" fill="url(#lotus-back)" stroke="#E58A45" strokeWidth="0.8" />
    <path d="M60 84c26-4 46-20 50-44-16 2-30 12-38 26z" fill="url(#lotus-back)" stroke="#E58A45" strokeWidth="0.8" />
    {/* middle petals */}
    <path d="M60 84C40 76 28 56 30 30c14 8 24 22 30 54z" fill="url(#lotus-petal)" stroke="#C96A27" strokeWidth="0.8" />
    <path d="M60 84c20-8 32-28 30-54-14 8-24 22-30 54z" fill="url(#lotus-petal)" stroke="#C96A27" strokeWidth="0.8" />
    {/* centre petal */}
    <path d="M60 86C48 70 46 44 60 14c14 30 12 56 0 72z" fill="#F5E9D6" stroke="#E58A45" strokeWidth="1" />
    <text x="60" y="58" textAnchor="middle" fontSize="26" fontFamily="'Noto Sans Devanagari','Nirmala UI',serif" fill="#592209">
      ॐ
    </text>
  </svg>
);

export default LotusOm;
