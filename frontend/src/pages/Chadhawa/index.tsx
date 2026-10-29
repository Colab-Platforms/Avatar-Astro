import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, ArrowRight, Flame } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useChadhawaTemples } from '@/features/chadhawa/hooks';
import { PujaListSkeleton } from '@/pages/Puja/PujaSkeletons';
import DevotionLayout from '@/components/DevotionLayout';

gsap.registerPlugin(ScrollTrigger);

const BADGES: Record<string, string> = {
  'tirupati-balaji':   'Venkateswara Special',
  'kashi-vishwanath':  'Jyotirlinga Special',
  'shirdi-sai-baba':   'Sai Baba Blessing',
  'golden-temple':     'Waheguru Special',
  'vaishno-devi':      'Navratri Special',
  'somnath-temple':    'Jyotirlinga Special',
  'jagannath-puri':    'Rath Yatra Special',
  'siddhivinayak':     'Ganesh Special',
  'mahakaleshwar':     'Mahakal Special',
  'iskcon-vrindavan':  'Radha Krishna Special',
};

const SUBTITLES: Record<string, string> = {
  'tirupati-balaji':   'Wealth, Health & Divine Grace Offering',
  'kashi-vishwanath':  'Liberation, Moksha & Inner Peace Chadhawa',
  'shirdi-sai-baba':   'Miracles, Faith & Wish Fulfilment Seva',
  'golden-temple':     'Gratitude, Peace & Ardas Chadhawa',
  'vaishno-devi':      'Protection, Power & Mother\'s Blessings',
  'somnath-temple':    'Supreme Shiva Blessing Chadhawa',
  'jagannath-puri':    'Rath Yatra Special Chadhawa Seva',
  'siddhivinayak':     'Obstacle Removal & Success Offering',
  'mahakaleshwar':     'Cosmic Victory & Mahakal Chadhawa',
  'iskcon-vrindavan':  'Divine Love, Joy & Devotion Seva',
};

const ChadhawaPage = () => {
  const [query, setQuery] = useState('');
  const pageRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useChadhawaTemples();
  const temples = data ?? [];

  const filtered = temples.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.location.toLowerCase().includes(query.toLowerCase()) ||
    t.state.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.chadhawa-hero-title',
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }
      );
      gsap.fromTo('.chadhawa-search-wrap',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7, delay: 0.3, ease: 'power3.out' }
      );
    }, pageRef);
    return () => ctx.revert();
  }, []);

  // Keyed on `data` rather than running once on mount: the cards no longer
  // exist on the first render, so the tween has to wait for the fetch. Using
  // `data` (not `filtered`) keeps typing in the search box from re-animating.
  useEffect(() => {
    if (!gridRef.current || !data) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.chadhawa-temple-card',
        { opacity: 0, y: 50 },
        {
          opacity: 1, y: 0, stagger: 0.08, duration: 0.55, ease: 'power3.out',
          scrollTrigger: { trigger: gridRef.current, start: 'top 82%' },
        }
      );
    }, gridRef);
    return () => ctx.revert();
  }, [data]);

  return (
    <DevotionLayout>
    <div className="relative z-10" ref={pageRef}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 text-center" style={{ paddingTop: 100, paddingBottom: 56 }}>
        <div className="mx-auto px-10" style={{ maxWidth: 900 }}>

          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <div style={{ height: 1, width: 56, background: 'linear-gradient(to right, transparent, #FBF5EC)' }} />
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.32em', color: '#592209', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✦</span> Sacred Offerings <span>✦</span>
            </p>
            <div style={{ height: 1, width: 56, background: 'linear-gradient(to left, transparent, #FBF5EC)' }} />
          </div>

          <h1 className="chadhawa-hero-title font-display font-bold tracking-widest uppercase leading-none mb-5"
            style={{ fontSize: 'clamp(54px, 8vw, 96px)' }}>
            <span style={{ color: '#301607' }}>Offer A </span>
            <span style={{
              background: '#592209',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Chadhawa</span>
          </h1>

          <p style={{ fontSize: 16, color: 'rgba(48,22,7,0.55)', lineHeight: 1.7, marginBottom: 32 }}>
            Make sacred offerings to the divine at India's holiest temples,<br />
            from anywhere in the world
          </p>

          <div className="chadhawa-search-wrap" style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, color: '#592209', pointerEvents: 'none' }} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search temples, locations, states…"
                style={{
                  width: '100%', height: 56, paddingLeft: 52, paddingRight: 20,
                  fontSize: 15, color: '#301607', background: '#FFFFFF',
                  border: '1.5px solid rgba(89,34,9,0.22)', borderRadius: 16,
                  boxShadow: '0 4px 20px rgba(89,34,9,0.08)', outline: 'none',
                }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(89,34,9,0.55)'; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(89,34,9,0.22)'; }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Temple Grid ────────────────────────────────────────────────── */}
      <section className="relative z-10 pb-16">
        <div className="mx-auto px-10" style={{ maxWidth: 1380 }}>
          {isLoading ? (
            <PujaListSkeleton />
          ) : (
          <div
            ref={gridRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            style={{ gap: 26 }}
          >
            {filtered.map(temple => {
              const badge    = BADGES[temple.slug]    ?? 'Sacred Offering';
              const subtitle = SUBTITLES[temple.slug] ?? `${temple.deity} Chadhawa`;

              return (
                <Link
                  key={temple.id}
                  to={`/chadhawa/${temple.slug}`}
                  className="chadhawa-temple-card group block"
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
                    position: 'relative', width: '100%', paddingBottom: '75%',
                    background: temple.gradient ?? undefined, borderRadius: '18px 18px 0 0', overflow: 'hidden',
                  }}>
                    {temple.image && (
                      <img
                        src={temple.image}
                        alt={temple.name}
                        style={{
                          position: 'absolute', inset: 0, width: '100%', height: '100%',
                          objectFit: 'cover', objectPosition: 'center', display: 'block',
                          transition: 'transform 0.6s ease',
                        }}
                        className="group-hover:scale-[1.04]"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: '#592209',
                      background: 'rgba(89,34,9,0.07)', border: '1px solid rgba(89,34,9,0.22)',
                      borderRadius: 99, padding: '4px 11px', width: 'fit-content',
                    }}>
                      <Flame style={{ width: 12, height: 12 }} /> {badge}
                    </span>

                    <h3 className="font-display uppercase tracking-wide leading-tight"
                      style={{ fontSize: 30, fontWeight: 700, color: '#301607' }}>
                      {temple.name}
                    </h3>

                    <p style={{ fontSize: 15, fontWeight: 600, color: '#592209' }}>{subtitle}</p>

                    <p style={{ fontSize: 14, color: '#6B4E3D', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <MapPin style={{ width: 14, height: 14, color: '#592209', flexShrink: 0 }} />
                      {temple.location}, {temple.state}
                    </p>

                    <div style={{ height: 1, background: 'rgba(89,34,9,0.08)', marginTop: 2, marginBottom: 2 }} />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#9C7B62', textTransform: 'uppercase', marginBottom: 2 }}>
                          Starting from
                        </p>
                        <p style={{ fontSize: 26, fontWeight: 800, color: '#301607', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                          ₹{temple.priceFrom}
                        </p>
                      </div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                        background: '#F5E9D6',
                        color: '#301607', fontSize: 13, fontWeight: 700,
                        letterSpacing: '0.10em', textTransform: 'uppercase',
                        padding: '12px 20px', borderRadius: 12, flexShrink: 0,
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                      }}>
                        Offer Chadhawa <ArrowRight style={{ width: 14, height: 14 }} />
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
              <p style={{ fontSize: 14, color: '#B09070', marginTop: 8 }}>Try a different search term</p>
            </div>
          )}
        </div>
      </section>
    </div>
    </DevotionLayout>
  );
};

export default ChadhawaPage;
