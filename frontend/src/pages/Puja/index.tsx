import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, ArrowRight, Shield, Camera, Lock, Flame } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTemples } from '@/features/puja/hooks';
import { PujaListSkeleton } from './PujaSkeletons';

gsap.registerPlugin(ScrollTrigger);

// ── Data ───────────────────────────────────────────────────────────────────────
const BADGES: Record<string, string> = {
  'tirupati-balaji':  'Venkateswara Special',
  'kashi-vishwanath': 'Jyotirlinga Special',
  'shirdi-sai-baba':  'Sai Baba Blessing',
  'golden-temple':    'Waheguru Special',
  'vaishno-devi':     'Navratri Special',
  'somnath-temple':   'Jyotirlinga Special',
  'jagannath-puri':   'Rath Yatra Special',
  'siddhivinayak':    'Ganesh Special',
  'mahakaleshwar':    'Mahakal Special',
  'iskcon-vrindavan': 'Radha Krishna Special',
};

const SUBTITLES: Record<string, string> = {
  'tirupati-balaji':  'Wealth, Health & Divine Grace',
  'kashi-vishwanath': 'Liberation, Moksha & Inner Peace',
  'shirdi-sai-baba':  'Miracles, Faith & Wish Fulfilment',
  'golden-temple':    'Gratitude, Peace & Community',
  'vaishno-devi':     'Protection, Power & Blessings',
  'somnath-temple':   'Supreme Shiva Blessings',
  'jagannath-puri':   'Moksha & Spiritual Liberation',
  'siddhivinayak':    'Success, Obstacles Removed',
  'mahakaleshwar':    'Victory, Longevity & Cosmic Grace',
  'iskcon-vrindavan': 'Divine Love, Joy & Devotion',
};

const TRUST = [
  { Icon: Shield,  label: '100% Authentic',       desc: 'Verified temples & trusted priests' },
  { Icon: Flame,   label: 'Rituals Performed',    desc: 'As per Vedic rituals & traditions' },
  { Icon: Camera,  label: 'Live Darshan & Updates', desc: 'Receive darshan photos & ritual updates' },
  { Icon: Lock,    label: 'Secure & Private',     desc: 'Your details are protected with utmost care' },
];

// ── Decorative SVGs ───────────────────────────────────────────────────────────
const TempleSilhouette = ({ flip = false }: { flip?: boolean }) => (
  <svg
    viewBox="0 0 160 420"
    xmlns="http://www.w3.org/2000/svg"
    style={{ transform: flip ? 'scaleX(-1)' : 'none', width: '100%', height: '100%' }}
    fill="#7A4A2A"
  >
    {/* Kalash / finial */}
    <ellipse cx="80" cy="18" rx="9" ry="12" />
    <rect x="77" y="30" width="6" height="10" />
    {/* Spire tiers — each polygon wider than the one above */}
    <polygon points="80,40 94,40 96,58 64,58" />
    <polygon points="74,58 106,58 110,80 70,80" />
    <polygon points="68,80 112,80 116,104 64,104" />
    <polygon points="62,104 118,104 122,130 58,130" />
    <polygon points="55,130 125,130 130,158 50,158" />
    {/* Neck / drum */}
    <rect x="48" y="158" width="64" height="22" />
    {/* Shoulder bands */}
    <rect x="38" y="180" width="84" height="16" />
    <rect x="28" y="196" width="104" height="18" />
    {/* Main body */}
    <rect x="18" y="214" width="124" height="60" />
    {/* Plinth steps */}
    <rect x="8"  y="274" width="144" height="18" />
    <rect x="0"  y="292" width="160" height="20" />
    {/* Decorative small turrets left/right of body */}
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
        <circle key={i} cx={120 + Math.cos(a + Math.PI / 8) * 68} cy={120 + Math.sin(a + Math.PI / 8) * 68} r="2" fill="#592209" fillOpacity="0.5" />
      ))}
      <circle cx="120" cy="120" r="8" fill="#592209" fillOpacity="0.3" />
    </svg>
  );
};

// ── Page ───────────────────────────────────────────────────────────────────────
const PujaPage = () => {
  const [query, setQuery] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useTemples();
  const temples = data ?? [];

  const filtered = temples.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.location.toLowerCase().includes(query.toLowerCase()) ||
    t.state.toLowerCase().includes(query.toLowerCase())
  );

  // Keyed on `data` rather than running once on mount: the cards no longer
  // exist on the first render, so the tween has to wait for the fetch. Using
  // `data` (not `filtered`) keeps typing in the search box from re-animating.
  useEffect(() => {
    if (!gridRef.current || !data) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.puja-card',
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, stagger: 0.08, duration: 0.55, ease: 'power3.out',
          scrollTrigger: { trigger: gridRef.current, start: 'top 85%' } }
      );
    }, gridRef);
    return () => ctx.revert();
  }, [data]);

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: 'linear-gradient(180deg, #F5E9D6 0%, #F5E9D6 50%, #F0DFC7 100%)' }}
    >
      {/* ── Decorative background ─────────────────────────────────────── */}
      <div className="absolute left-0 top-16 pointer-events-none select-none z-0 hidden lg:block"
        style={{ width: 160, height: 420, opacity: 0.05 }}>
        <TempleSilhouette />
      </div>
      <div className="absolute right-0 top-16 pointer-events-none select-none z-0 hidden lg:block"
        style={{ width: 160, height: 420, opacity: 0.05 }}>
        <TempleSilhouette flip />
      </div>
      <div className="absolute left-4 top-20 pointer-events-none select-none z-0 hidden xl:block"
        style={{ width: 220, height: 220, opacity: 0.10 }}>
        <MandalaSVG />
      </div>
      <div className="absolute right-4 top-20 pointer-events-none select-none z-0 hidden xl:block"
        style={{ width: 220, height: 220, opacity: 0.10 }}>
        <MandalaSVG />
      </div>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 text-center" style={{ paddingTop: 100, paddingBottom: 56 }}>
        <div style={{ maxWidth: 860, margin: '0 auto', paddingLeft: 24, paddingRight: 24 }}>

          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <div style={{ height: 1, width: 56, background: 'linear-gradient(to right, transparent, #FBF5EC)' }} />
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.32em',
              color: '#592209', textTransform: 'uppercase', fontFamily: "'DM Sans', system-ui, sans-serif",
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ color: '#592209' }}>✦</span>
              Sacred Rituals
              <span style={{ color: '#592209' }}>✦</span>
            </p>
            <div style={{ height: 1, width: 56, background: 'linear-gradient(to left, transparent, #FBF5EC)' }} />
          </div>

          {/* Heading */}
          <h1
            className="font-display font-bold tracking-widest uppercase leading-none mb-5"
            style={{ fontSize: 'clamp(54px, 8vw, 96px)' }}
          >
            <span style={{ color: '#301607' }}>Book A </span>
            <span style={{
              background: '#592209',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Puja
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: 16, color: 'rgba(48,22,7,0.55)', lineHeight: 1.7, marginBottom: 32 }}>
            Connect with the divine through sacred rituals<br />
            at India's most revered temples
          </p>

          {/* Search bar */}
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ position: 'relative' }}>
              <Search
                style={{
                  position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)',
                  width: 20, height: 20, color: '#592209', pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search temples, locations, states..."
                className="puja-search"
                style={{
                  width: '100%', height: 56, paddingLeft: 52, paddingRight: 20,
                  fontSize: 15, color: '#301607', fontFamily: "'DM Sans', system-ui, sans-serif",
                  background: '#FFFFFF',
                  border: '1.5px solid rgba(89,34,9,0.22)',
                  borderRadius: 16,
                  boxShadow: '0 4px 20px rgba(89,34,9,0.08), 0 1px 4px rgba(89,34,9,0.2)',
                  outline: 'none', transition: 'all 0.25s',
                }}
                onFocus={e => {
                  (e.target as HTMLInputElement).style.borderColor = 'rgba(89,34,9,0.55)';
                  (e.target as HTMLInputElement).style.boxShadow = '0 4px 24px rgba(89,34,9,0.18)';
                }}
                onBlur={e => {
                  (e.target as HTMLInputElement).style.borderColor = 'rgba(89,34,9,0.22)';
                  (e.target as HTMLInputElement).style.boxShadow = '0 4px 20px rgba(89,34,9,0.08), 0 1px 4px rgba(0,0,0,0.04)';
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── TEMPLE CARDS ──────────────────────────────────────────────── */}
      <section className="relative z-10" style={{ paddingLeft: 32, paddingRight: 32, paddingBottom: 40 }}>
        <div style={{ maxWidth: 1380, margin: '0 auto' }}>
          {isLoading ? (
            <PujaListSkeleton />
          ) : (
            <div
              ref={gridRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              style={{ gap: 24 }}
            >
              {filtered.map(temple => {
                const badge    = BADGES[temple.slug]    ?? 'Sacred Puja';
                const subtitle = SUBTITLES[temple.slug] ?? temple.deity;

                return (
                  <Link
                    key={temple.id}
                    to={`/puja/${temple.slug}`}
                    className="puja-card group block"
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 20,
                      border: '1.5px solid rgba(89,34,9,0.13)',
                      boxShadow: '0 4px 20px rgba(89,34,9,0.2), 0 1px 3px rgba(89,34,9,0.2)',
                      overflow: 'hidden',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = 'translateY(-5px)';
                      el.style.boxShadow = '0 16px 48px rgba(120,60,20,0.13), 0 4px 12px rgba(0,0,0,0.06)';
                      el.style.borderColor = 'rgba(89,34,9,0.38)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = 'translateY(0)';
                      el.style.boxShadow = '0 4px 20px rgba(120,60,20,0.07), 0 1px 3px rgba(0,0,0,0.04)';
                      el.style.borderColor = 'rgba(89,34,9,0.13)';
                    }}
                  >
                    {/* Image — 4:3 ratio, edge-to-edge cover (matches Live Darshan cards) */}
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      paddingBottom: '75%',
                      background: temple.gradient ?? undefined,
                      borderRadius: '18px 18px 0 0',
                      overflow: 'hidden',
                    }}>
                      {temple.image && (
                        <img
                          src={temple.image}
                          alt={temple.name}
                          style={{
                            position: 'absolute', inset: 0,
                            width: '100%', height: '100%',
                            objectFit: 'cover', objectPosition: 'center',
                            display: 'block',
                            transition: 'transform 0.6s ease',
                          }}
                          className="group-hover:scale-[1.04]"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                    </div>

                    {/* Card body */}
                    <div style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

                      {/* Badge */}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
                        color: '#592209',
                        background: 'rgba(89,34,9,0.07)',
                        border: '1px solid rgba(89,34,9,0.22)',
                        borderRadius: 99,
                        padding: '4px 11px',
                        width: 'fit-content',
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                      }}>
                        🔥 {badge}
                      </span>

                      {/* Temple name */}
                      <h3 className="font-display uppercase tracking-wide leading-tight" style={{
                        fontSize: 30, fontWeight: 700, color: '#301607',
                        transition: 'color 0.25s',
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#592209'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#301607'; }}
                      >
                        {temple.name}
                      </h3>

                      {/* Subtitle */}
                      <p style={{ fontSize: 15, fontWeight: 600, color: '#592209' }}>
                        {subtitle}
                      </p>

                      {/* Location */}
                      <p style={{ fontSize: 14, color: '#6B4E3D', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <MapPin style={{ width: 14, height: 14, color: '#592209', flexShrink: 0 }} />
                        {temple.location}, {temple.state}
                      </p>

                      {/* Divider */}
                      <div style={{ height: 1, background: 'rgba(89,34,9,0.08)', marginTop: 2, marginBottom: 2 }} />

                      {/* Price + CTA */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <p style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                            color: '#9C7B62', textTransform: 'uppercase',
                            marginBottom: 2, fontFamily: "'DM Sans', system-ui, sans-serif",
                          }}>
                            Starting from
                          </p>
                          <p style={{ fontSize: 26, fontWeight: 800, color: '#301607', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                            ₹{temple.priceFrom}
                          </p>
                        </div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 7,
                          background: '#F5E9D6',
                          color: '#301607',
                          fontSize: 13, fontWeight: 700,
                          letterSpacing: '0.10em', textTransform: 'uppercase',
                          padding: '12px 20px',
                          borderRadius: 12,
                          flexShrink: 0,
                          fontFamily: "'DM Sans', system-ui, sans-serif",
                        }}>
                          Book Puja <ArrowRight style={{ width: 14, height: 14 }} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {!isLoading && isError && (
            <div style={{ textAlign: 'center', paddingTop: 80, paddingBottom: 80 }}>
              <p style={{ fontSize: 22, color: '#9C7B62', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '0.1em' }}>
                Could not load temples
              </p>
              <p style={{ fontSize: 14, color: '#B09070', marginTop: 8 }}>
                Please check your connection and try again
              </p>
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 80, paddingBottom: 80 }}>
              <p style={{ fontSize: 22, color: '#9C7B62', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '0.1em' }}>
                No temples found
              </p>
              <p style={{ fontSize: 14, color: '#B09070', marginTop: 8 }}>
                Try a different search term
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── TRUST SECTION ─────────────────────────────────────────────── */}
      <section className="relative z-10" style={{ paddingLeft: 32, paddingRight: 32, paddingBottom: 64 }}>
        <div style={{ maxWidth: 1380, margin: '0 auto' }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            border: '1.5px solid rgba(89,34,9,0.11)',
            boxShadow: '0 4px 24px rgba(89,34,9,0.2)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          }}>
            {TRUST.map(({ Icon, label, desc }, i) => (
              <div key={label} style={{
                padding: '28px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                textAlign: 'center',
                borderRight: i < TRUST.length - 1 ? '1px solid rgba(89,34,9,0.10)' : 'none',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'rgba(89,34,9,0.07)',
                  border: '1.5px solid rgba(89,34,9,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12,
                }}>
                  <Icon style={{ width: 22, height: 22, color: '#592209', strokeWidth: 1.5 }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#301607', marginBottom: 4, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  {label}
                </p>
                <p style={{ fontSize: 12, color: '#7A6352', lineHeight: 1.55, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default PujaPage;
