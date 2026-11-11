/**
 * Local vector artwork for the Spiritual Books page (no remote images). Decorative pieces are hidden from screen readers;
 * the hero illustration carries an accessible label that the page passes in (it is translated).
 */
const GOLD = "#C9A24A";
const MAROON = "#592209";

/** Krishna playing the flute, with a soft golden halo. To use real artwork instead, replace this component's use in the page. */
export const KrishnaIllustration = ({ label }: { label: string }) => (
  <svg viewBox="0 0 320 340" className="h-full w-full" role="img" aria-label={label} style={{ WebkitMaskImage: "linear-gradient(to bottom, #000 82%, transparent)", maskImage: "linear-gradient(to bottom, #000 82%, transparent)" }}>
    <defs>
      <radialGradient id="kr-halo" cx="50%" cy="38%" r="55%">
        <stop offset="0" stopColor="#FFE9A8" stopOpacity="0.95" />
        <stop offset="0.6" stopColor="#F6C86A" stopOpacity="0.35" />
        <stop offset="1" stopColor="#F6C86A" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="kr-skin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#A9BEE6" />
        <stop offset="1" stopColor="#8EA6D6" />
      </linearGradient>
      <linearGradient id="kr-cloth" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F4B73F" />
        <stop offset="1" stopColor="#E08A1E" />
      </linearGradient>
    </defs>
    {/* halo */}
    <circle cx="160" cy="130" r="128" fill="url(#kr-halo)" />
    <circle cx="160" cy="118" r="96" fill="none" stroke={GOLD} strokeOpacity="0.45" strokeWidth="1.5" />
    <circle cx="160" cy="118" r="108" fill="none" stroke={GOLD} strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 6" />
    {/* shoulders and scarf */}
    <path d="M30 340C40 262 92 226 160 226s120 36 130 114Z" fill="url(#kr-cloth)" />
    <path d="M70 340C84 280 120 250 160 246c40 4 76 34 90 94" fill="none" stroke="#FFD98A" strokeOpacity="0.7" strokeWidth="3" />
    <path d="M110 236c20 30 60 30 100 0" fill="none" stroke="#B3641A" strokeOpacity="0.35" strokeWidth="2" />
    {/* neck */}
    <path d="M142 196h36v36c-12 10-24 10-36 0Z" fill="#8EA6D6" />
    {/* necklaces */}
    <path d="M118 226c22 30 62 30 84 0" fill="none" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
    <path d="M126 238c18 24 50 24 68 0" fill="none" stroke="#E7C873" strokeWidth="3" strokeDasharray="1 5" strokeLinecap="round" />
    <circle cx="160" cy="259" r="7" fill="#C0392B" stroke={GOLD} strokeWidth="2" />
    {/* hair */}
    <path d="M112 118c-6-44 22-70 48-70s54 26 48 70c-4 28-6 46-12 62l-72 0c-6-16-8-34-12-62Z" fill="#2B1A12" />
    {/* face */}
    <ellipse cx="160" cy="136" rx="36" ry="46" fill="url(#kr-skin)" />
    <path d="M126 112c4-8 14-12 34-12s30 4 34 12c-8-6-20-8-34-8s-26 2-34 8Z" fill="#2B1A12" />
    {/* closed eyes and brows */}
    <path d="M139 128c5 4 11 4 16 0M165 128c5 4 11 4 16 0" fill="none" stroke="#2B1A12" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M137 119c6-4 12-4 18-1M165 118c6-3 12-3 18 1" fill="none" stroke="#2B1A12" strokeWidth="2" strokeLinecap="round" />
    {/* tilak */}
    <path d="M160 100v14" stroke="#F4EFE6" strokeWidth="3" strokeLinecap="round" />
    <circle cx="160" cy="118" r="2.6" fill="#C0392B" />
    {/* nose and mouth */}
    <path d="M160 132c-2 8-2 12 2 14" fill="none" stroke="#6F86B8" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M150 158c6 4 14 4 20 0" fill="none" stroke="#9C4A52" strokeWidth="2.4" strokeLinecap="round" />
    {/* earrings */}
    <circle cx="123" cy="146" r="4" fill={GOLD} />
    <circle cx="197" cy="146" r="4" fill={GOLD} />
    {/* crown */}
    <path d="M118 92c4-22 22-36 42-36s38 14 42 36c-14-8-28-12-42-12s-28 4-42 12Z" fill={GOLD} />
    <path d="M126 88c10-6 22-8 34-8s24 2 34 8" fill="none" stroke="#8A6A1F" strokeWidth="2" />
    <circle cx="160" cy="72" r="6" fill="#C0392B" stroke="#8A6A1F" strokeWidth="1.5" />
    {/* peacock feather */}
    <path d="M176 66c10-26 18-44 30-58" fill="none" stroke="#2E6B4F" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="210" cy="26" rx="13" ry="22" transform="rotate(28 210 26)" fill="#2E8B6E" />
    <ellipse cx="210" cy="26" rx="8" ry="14" transform="rotate(28 210 26)" fill="#1E5FA8" />
    <ellipse cx="210" cy="26" rx="3.6" ry="6.5" transform="rotate(28 210 26)" fill="#E9C46A" />
    {/* flute */}
    <path d="M152 160L306 108" stroke="#7A4B12" strokeWidth="9" strokeLinecap="round" />
    <path d="M152 160L306 108" stroke={GOLD} strokeWidth="6" strokeLinecap="round" />
    {[196, 226, 256, 286].map((x, i) => (
      <path key={i} d={`M${x} ${160 - (x - 152) * 0.338 - 5}l0 10`} stroke="#8A6A1F" strokeWidth="2" transform={`rotate(-18.7 ${x} ${160 - (x - 152) * 0.338})`} />
    ))}
    {/* hands */}
    <ellipse cx="214" cy="140" rx="15" ry="9" transform="rotate(-18 214 140)" fill="#9DB3DE" />
    <ellipse cx="258" cy="125" rx="14" ry="8.5" transform="rotate(-18 258 125)" fill="#9DB3DE" />
    <path d="M205 150c4 4 10 6 16 4M249 135c4 4 10 6 16 4" fill="none" stroke="#6F86B8" strokeWidth="1.5" strokeLinecap="round" />
    {/* bangles */}
    <path d="M196 148l6-10M240 133l6-10" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/** A small row of lotus petals used as the heading divider. */
export const LotusDivider = ({ label }: { label: string }) => (
  <svg viewBox="0 0 260 28" className="h-6 w-56 sm:w-64" role="img" aria-label={label}>
    <path d="M4 14h88M168 14h88" stroke={GOLD} strokeWidth="1.2" />
    <circle cx="96" cy="14" r="2" fill={GOLD} />
    <circle cx="164" cy="14" r="2" fill={GOLD} />
    <path d="M130 24c-9-2-14-8-13-16 7 1 11 5 13 10 2-5 6-9 13-10 1 8-4 14-13 16Z" fill="#D9772F" />
    <path d="M130 24c-4-4-5-9-3-15 3 4 4 9 3 15Zm0 0c4-4 5-9 3-15-3 4-4 9-3 15Z" fill="#F2A64A" />
  </svg>
);

/** A lotus for the Ancient Wisdom panel. */
export const LotusFlower = () => (
  <svg viewBox="0 0 120 80" className="mx-auto h-16 w-24" fill="none" aria-hidden="true">
    <path d="M60 70C44 62 40 42 60 14c20 28 16 48 0 56Z" fill="#E0A04A" opacity="0.8" />
    <path d="M60 70C38 66 22 52 24 30c20 4 32 18 36 40Z" fill="#D9772F" opacity="0.75" />
    <path d="M60 70c22-4 38-18 36-40-20 4-32 18-36 40Z" fill="#D9772F" opacity="0.75" />
    <path d="M60 72C34 72 12 62 6 46c20-2 40 6 54 26Z" fill={MAROON} opacity="0.25" />
    <path d="M60 72c26 0 48-10 54-26-20-2-40 6-54 26Z" fill={MAROON} opacity="0.25" />
  </svg>
);

/** A brass diya that stands at the start of the shelf. */
export const Diya = () => (
  <svg viewBox="0 0 64 96" className="h-24 w-14" fill="none" aria-hidden="true">
    <path d="M32 6c-8 12-8 20 0 28 8-8 8-16 0-28Z" fill="#F5B93A" />
    <path d="M32 18c-3 5-3 9 0 12 3-3 3-7 0-12Z" fill="#FFF3C9" />
    <path d="M30 34h4v22h-4Z" fill="#B8862B" />
    <path d="M10 56h44c0 12-10 20-22 20S10 68 10 56Z" fill="#C79632" />
    <path d="M14 60h36" stroke="#E7C873" strokeWidth="2" />
    <path d="M26 76h12l4 14H22Z" fill="#B8862B" />
    <ellipse cx="32" cy="92" rx="18" ry="3" fill="#592209" opacity="0.18" />
  </svg>
);
