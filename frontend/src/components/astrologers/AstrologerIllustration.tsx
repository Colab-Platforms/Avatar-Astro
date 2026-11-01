import type { AvatarStyle } from "@/data/astrologers";

/**
 * Original illustrated portraits (not photographs of real people), used until an astrologer
 * supplies an approved photo. Drawn in the site palette.
 */
const SKIN = ["#C98E62", "#B67B52", "#D6A27A", "#A86B45"];

const Face = ({ skin }: { skin: string }) => (
  <>
    <rect x="43" y="56" width="14" height="14" rx="5" fill={skin} />
    <ellipse cx="50" cy="44" rx="16" ry="19" fill={skin} />
    <ellipse cx="34.5" cy="46" rx="2.6" ry="4" fill={skin} />
    <ellipse cx="65.5" cy="46" rx="2.6" ry="4" fill={skin} />
  </>
);

const Eyes = () => (
  <>
    <ellipse cx="43.5" cy="44" rx="1.7" ry="1.2" fill="#2A1408" />
    <ellipse cx="56.5" cy="44" rx="1.7" ry="1.2" fill="#2A1408" />
    <path d="M40.5 40.6q3-1.8 6 0M53.5 40.6q3-1.8 6 0" stroke="#2A1408" strokeWidth="1.1" fill="none" strokeLinecap="round" />
  </>
);

const BEAD_X = [36, 41, 46, 50, 54, 59, 64];
const BEAD_DROP = [0.5, 2.5, 4.5, 6, 4.5, 2.5, 0.5];

const Variant = ({ style, skin }: { style: AvatarStyle; skin: string }) => {
  if (style === "baba")
    return (
      <>
        <path d="M14 100c2-20 16-30 36-30s34 10 36 30z" fill="#E58A45" />
        <path d="M36 72c4 8 9 12 14 12s10-4 14-12" stroke="#B8561A" strokeWidth="2" fill="none" />
        <Face skin={skin} />
        <path d="M30 40c-2-18 8-27 20-27s22 9 20 27c-4-9-10-13-20-13s-16 4-20 13z" fill="#EDE6DA" />
        <circle cx="50" cy="11" r="7" fill="#EDE6DA" />
        <path d="M33 50c0 18 7 26 17 28 10-2 17-10 17-28-3 8-9 12-17 12s-14-4-17-12z" fill="#F4EFE6" />
        <path d="M44 56q6 4 12 0" stroke="#C9BFAE" strokeWidth="1.2" fill="none" />
        <Eyes />
        <path d="M44 30.5h12M44 28h12" stroke="#A33A1A" strokeWidth="1.4" strokeLinecap="round" />
        <g fill="#6B3A17">
          {BEAD_X.map((x, i) => (
            <circle key={x} cx={x} cy={74 + BEAD_DROP[i]} r="2.2" />
          ))}
        </g>
      </>
    );
  if (style === "female")
    return (
      <>
        <path d="M26 46c-6 22-2 40 8 50h32c10-10 14-28 8-50-2-20-14-30-24-30S28 26 26 46z" fill="#2A1408" />
        <path d="M14 100c2-20 16-30 36-30s34 10 36 30z" fill="#8E2A1B" />
        <path d="M36 70l14 30 14-30c-6 3-9 4-14 4s-8-1-14-4z" fill="#E58A45" />
        <Face skin={skin} />
        <path d="M33 42c2-14 10-19 17-19s15 5 17 19c-5-6-10-9-17-9s-12 3-17 9z" fill="#2A1408" />
        <Eyes />
        <circle cx="50" cy="35.5" r="1.6" fill="#B01E1E" />
        <path d="M46 52q4 3 8 0" stroke="#9A3B2A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <circle cx="34" cy="51" r="1.8" fill="#E58A45" />
        <circle cx="66" cy="51" r="1.8" fill="#E58A45" />
      </>
    );
  return (
    <>
      <path d="M14 100c2-20 16-30 36-30s34 10 36 30z" fill="#F1E3C8" />
      <path d="M38 71l12 14 12-14" stroke="#592209" strokeWidth="4" fill="none" strokeLinejoin="round" />
      <path d="M50 85v15" stroke="#592209" strokeWidth="2" />
      <Face skin={skin} />
      <path d="M33 41c0-13 8-19 17-19s17 6 17 19c-3-6-8-9-17-9s-14 3-17 9z" fill="#1E1008" />
      <Eyes />
      <path d="M44.5 33.5v-5M50 33.5v-6M55.5 33.5v-5" stroke="#A33A1A" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M45 53q5 3.5 10 0" stroke="#7A3320" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M38 52c2 8 6 11 12 11s10-3 12-11c-2 4-6 6-12 6s-10-2-12-6z" fill="#1E1008" opacity="0.85" />
    </>
  );
};

export const AstrologerIllustration = ({
  style,
  seed = 0,
  size = 96,
  label,
  className = "",
}: {
  style: AvatarStyle;
  seed?: number;
  size?: number;
  label: string;
  className?: string;
}) => (
  <svg
    viewBox="0 0 100 100"
    width={size}
    height={size}
    role="img"
    aria-label={label}
    className={`shrink-0 rounded-full ring-2 ring-[#E58A45]/70 ${className}`}
    style={{ width: size, height: size }}
  >
    <defs>
      <linearGradient id={`ill-bg-${seed}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F5E9D6" />
        <stop offset="1" stopColor="#E8CFA9" />
      </linearGradient>
      <clipPath id={`ill-clip-${seed}`}>
        <circle cx="50" cy="50" r="50" />
      </clipPath>
    </defs>
    <circle cx="50" cy="50" r="50" fill={`url(#ill-bg-${seed})`} />
    <g clipPath={`url(#ill-clip-${seed})`}>
      <Variant style={style} skin={SKIN[seed % SKIN.length]} />
    </g>
  </svg>
);

export default AstrologerIllustration;
