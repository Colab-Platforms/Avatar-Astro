import { ReactNode } from 'react';

// ── Shared decorative SVGs ─────────────────────────────────────────────────────
const TempleSilhouette = ({ flip = false }: { flip?: boolean }) => (
  <svg
    viewBox="0 0 160 420"
    xmlns="http://www.w3.org/2000/svg"
    style={{ transform: flip ? 'scaleX(-1)' : 'none', width: '100%', height: '100%' }}
    fill="#7A4A2A"
  >
    <ellipse cx="80" cy="18" rx="9" ry="12" />
    <rect x="77" y="30" width="6" height="10" />
    <polygon points="80,40 94,40 96,58 64,58" />
    <polygon points="74,58 106,58 110,80 70,80" />
    <polygon points="68,80 112,80 116,104 64,104" />
    <polygon points="62,104 118,104 122,130 58,130" />
    <polygon points="55,130 125,130 130,158 50,158" />
    <rect x="48" y="158" width="64" height="22" />
    <rect x="38" y="180" width="84" height="16" />
    <rect x="28" y="196" width="104" height="18" />
    <rect x="18" y="214" width="124" height="60" />
    <rect x="8"  y="274" width="144" height="18" />
    <rect x="0"  y="292" width="160" height="20" />
    <rect x="6"  y="230" width="12" height="44" />
    <rect x="142" y="230" width="12" height="44" />
  </svg>
);

const MandalaSVG = () => {
  const rings = [110, 88, 68, 50, 34, 20];
  const petals = Array.from({ length: 8 }, (_, i) => (i * 45 * Math.PI) / 180);
  return (
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      {rings.map((r, i) => (
        <circle key={i} cx="120" cy="120" r={r} stroke="#592209" strokeWidth={i % 2 === 0 ? 1 : 0.6} />
      ))}
      {petals.map((a, i) => (
        <line key={i}
          x1={120 + Math.cos(a) * 20} y1={120 + Math.sin(a) * 20}
          x2={120 + Math.cos(a) * 110} y2={120 + Math.sin(a) * 110}
          stroke="#592209" strokeWidth="0.5"
        />
      ))}
      {petals.map((a, i) => (
        <circle key={i} cx={120 + Math.cos(a) * 50} cy={120 + Math.sin(a) * 50} r="3.5" fill="#592209" />
      ))}
      {petals.map((a, i) => (
        <circle key={i}
          cx={120 + Math.cos(a + Math.PI / 8) * 68}
          cy={120 + Math.sin(a + Math.PI / 8) * 68}
          r="2" fill="#592209" fillOpacity="0.5"
        />
      ))}
      <circle cx="120" cy="120" r="8" fill="#592209" fillOpacity="0.3" />
    </svg>
  );
};

// ── Layout ─────────────────────────────────────────────────────────────────────
interface DevotionLayoutProps {
  children: ReactNode;
}

const DevotionLayout = ({ children }: DevotionLayoutProps) => (
  <div
    className="page-light min-h-screen relative overflow-x-hidden"
    style={{ background: 'linear-gradient(180deg, #F5E9D6 0%, #F5E9D6 50%, #F0DFC7 100%)' }}
  >
    {/* Temple silhouettes — very faint, left/right of hero area */}
    <div className="absolute left-0 top-16 pointer-events-none select-none z-0 hidden lg:block"
      style={{ width: 160, height: 420, opacity: 0.05 }}>
      <TempleSilhouette />
    </div>
    <div className="absolute right-0 top-16 pointer-events-none select-none z-0 hidden lg:block"
      style={{ width: 160, height: 420, opacity: 0.05 }}>
      <TempleSilhouette flip />
    </div>

    {/* Mandala decorations */}
    <div className="absolute left-4 top-20 pointer-events-none select-none z-0 hidden xl:block"
      style={{ width: 220, height: 220, opacity: 0.10 }}>
      <MandalaSVG />
    </div>
    <div className="absolute right-4 top-20 pointer-events-none select-none z-0 hidden xl:block"
      style={{ width: 220, height: 220, opacity: 0.10 }}>
      <MandalaSVG />
    </div>

    {children}
  </div>
);

export default DevotionLayout;
