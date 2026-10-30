import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, MapPin, Play, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import DevotionLayout from '@/components/DevotionLayout';
import PartnershipModal from '@/components/PartnershipModal';
import { liveTemples as staticTemples, streamCategories, type StreamCategory, type LiveTemple } from '@/data/liveStreams';
import { useDarshanTemples } from '@/hooks/useDarshanTemples';
import { useDarshanLiveEvents } from '@/hooks/useDarshanLiveEvents';

// ── Temple card ────────────────────────────────────────────────────────────────
const TempleCard = ({ temple, index }: { temple: LiveTemple; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.07, duration: 0.45 }}
  >
    <Link
      to={`/avatar-live/darshan/${temple.slug}`}
      className="group block"
      style={{
        background: '#FFF', borderRadius: 20,
        border: '1.5px solid rgba(188,106,77,0.13)',
        boxShadow: '0 4px 20px rgba(120,60,20,0.07)',
        overflow: 'hidden', textDecoration: 'none',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'translateY(-5px)';
        el.style.boxShadow = '0 16px 48px rgba(120,60,20,0.13)';
        el.style.borderColor = 'rgba(188,106,77,0.38)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 4px 20px rgba(120,60,20,0.07)';
        el.style.borderColor = 'rgba(188,106,77,0.13)';
      }}
    >
      {/* Thumbnail — 4:3 */}
      <div style={{ position: 'relative', width: '100%', paddingBottom: '75%', background: temple.gradient, overflow: 'hidden', borderRadius: '18px 18px 0 0' }}>
        {temple.image && (
          <img
            src={`/images/temples/${temple.image}`}
            alt={temple.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', transition: 'transform 0.6s ease' }}
            className="group-hover:scale-[1.04]"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }} />

        {/* Live / Offline badge */}
        <div style={{
          position: 'absolute', top: 12, left: 12,
          background: temple.isLive ? '#E53935' : 'rgba(60,60,60,0.75)',
          color: '#FFF', fontSize: 11, fontWeight: 700,
          padding: '4px 10px', borderRadius: 99, letterSpacing: '0.12em',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {temple.isLive && <span style={{ width: 6, height: 6, background: '#FFF', borderRadius: '50%' }} />}
          {temple.isLive ? 'LIVE' : 'OFFLINE'}
        </div>

        {/* Category chip */}
        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.88)', fontSize: 10, padding: '3px 9px', borderRadius: 99, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {temple.category}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '18px 20px 20px' }}>
        <h3 className="font-display uppercase tracking-wide leading-tight" style={{ fontSize: 28, fontWeight: 700, color: '#2C1810', marginBottom: 6 }}>
          {temple.name}
        </h3>
        <p style={{ fontSize: 15, color: '#BC6A4D', fontWeight: 600, marginBottom: 7 }}>{temple.deity}</p>
        <p style={{ fontSize: 16, color: '#6B4E3D', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 14 }}>
          <MapPin style={{ width: 13, height: 13, color: '#BC6A4D', flexShrink: 0 }} />
          {temple.city}, {temple.state}
        </p>

        <div style={{ height: 1, background: 'rgba(188,106,77,0.12)', marginBottom: 14 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <p style={{ fontSize: 14, color: '#9C7B62' }}>Darshan: <span style={{ color: '#2C1810', fontWeight: 600 }}>{temple.darshanTimings.split('–')[0].trim()}</span></p>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: temple.isLive ? 'linear-gradient(135deg, #BC6A4D 0%, #BC6A4D 100%)' : 'rgba(188,106,77,0.10)',
            color: temple.isLive ? '#FFF' : '#BC6A4D',
            fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '9px 16px', borderRadius: 10, flexShrink: 0,
            fontFamily: 'Iceland, sans-serif',
            border: temple.isLive ? 'none' : '1px solid rgba(188,106,77,0.25)',
          }}>
            <Play style={{ width: 12, height: 12 }} />
            {temple.isLive ? 'Watch Live' : 'Set Reminder'}
          </span>
        </div>
      </div>
    </Link>
  </motion.div>
);

// ── Page ───────────────────────────────────────────────────────────────────────
const DarshanPage = () => {
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [query, setQuery]    = useState('');
  const [active, setActive]  = useState<StreamCategory | 'All'>('All');

  // Live status is pushed from the backend over SSE (see useDarshanLiveEvents)
  // straight into the TanStack Query cache that useDarshanTemples reads —
  // no polling involved.
  useDarshanLiveEvents();
  const { data: statuses } = useDarshanTemples();

  // Static content (name, description, timings, images...) stays local;
  // only `isLive` is overlaid from the backend, which is the sole source
  // of truth for YouTube live status.
  const liveTemples: LiveTemple[] = useMemo(() => {
    if (!statuses) return staticTemples;
    const statusBySlug = new Map(statuses.map(t => [t.slug, t.isLive]));
    return staticTemples.map(t =>
      statusBySlug.has(t.slug) ? { ...t, isLive: statusBySlug.get(t.slug)! } : t
    );
  }, [statuses]);

  const featured = liveTemples.find(t => t.isLive) ?? liveTemples[0];

  const filtered = liveTemples.filter(t => {
    const matchQ   = !query || t.name.toLowerCase().includes(query.toLowerCase()) || t.city.toLowerCase().includes(query.toLowerCase());
    const matchCat = active === 'All' || t.category === active;
    return matchQ && matchCat;
  });

  return (
    <DevotionLayout>
      <div className="relative z-10" style={{ paddingTop: 80 }}>

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section className="text-center" style={{ paddingTop: 56, paddingBottom: 56, paddingLeft: 48, paddingRight: 48 }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <div className="flex items-center justify-center gap-3 mb-5">
              <div style={{ height: 1, width: 56, background: 'linear-gradient(to right, transparent, rgba(188,106,77,0.5))' }} />
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.32em', color: '#BC6A4D', textTransform: 'uppercase' }}>✦ Live Streams ✦</p>
              <div style={{ height: 1, width: 56, background: 'linear-gradient(to left, transparent, rgba(188,106,77,0.5))' }} />
            </div>

            <h1 className="font-display font-bold tracking-widest uppercase leading-none mb-5"
              style={{ fontSize: 'clamp(72px, 11vw, 128px)' }}>
              <span style={{ color: '#2C1810' }}>Live </span>
              <span style={{ background: 'linear-gradient(135deg, #BC6A4D 0%, #BC6A4D 60%, #BC6A4D 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Darshan
              </span>
            </h1>

            <p style={{ fontSize: 20, color: 'rgba(44,24,16,0.55)', lineHeight: 1.7, marginBottom: 36 }}>
              Experience divine blessings through live temple broadcasts, aartis, and sacred rituals.
            </p>

            {/* Search */}
            <div style={{ maxWidth: 520, margin: '0 auto', position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, color: '#BC6A4D', pointerEvents: 'none' }} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search temples, cities, deities..."
                style={{
                  width: '100%', height: 54, paddingLeft: 52, paddingRight: 20,
                  fontSize: 15, color: '#2C1810', background: '#FFFFFF',
                  border: '1.5px solid rgba(188,106,77,0.22)', borderRadius: 14,
                  boxShadow: '0 4px 20px rgba(188,106,77,0.08)', outline: 'none',
                }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(188,106,77,0.55)'; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(188,106,77,0.22)'; }}
              />
            </div>
          </div>
        </section>

        {/* ── FILTER PILLS ──────────────────────────────────────────────── */}
        <div className="sticky top-[68px] z-40 py-4 border-b border-[#E8DED0]"
          style={{ background: 'rgba(248,242,232,0.92)', backdropFilter: 'blur(12px)', paddingLeft: 48, paddingRight: 48 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2 }}>
            {(['All', ...streamCategories] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setActive(cat as StreamCategory | 'All')}
                style={{
                  flexShrink: 0,
                  padding: '8px 18px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  fontFamily: "'Astra','Iceland',sans-serif", letterSpacing: '0.04em', cursor: 'pointer',
                  border: active === cat ? '1.5px solid #BC6A4D' : '1.5px solid rgba(188,106,77,0.25)',
                  background: active === cat ? 'rgba(188,106,77,0.1)' : 'transparent',
                  color: active === cat ? '#BC6A4D' : '#7A5C42',
                  transition: 'all 0.2s',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── FEATURED LIVE ─────────────────────────────────────────────── */}
        <section style={{ paddingLeft: 48, paddingRight: 48, paddingTop: 40, paddingBottom: 48 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.28em', color: '#BC6A4D', textTransform: 'uppercase', marginBottom: 16 }}>
              🔴 Featured Live
            </p>

            <Link to={`/avatar-live/darshan/${featured.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div
                style={{
                  borderRadius: 24, overflow: 'hidden',
                  position: 'relative', height: 360,
                  background: featured.gradient,
                  boxShadow: '0 16px 56px rgba(120,60,20,0.14)',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.005)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                {featured.image && (
                  <img src={`/images/temples/${featured.image}`} alt={featured.name}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.20) 60%, transparent 100%)' }} />

                {/* Content overlay */}
                <div style={{ position: 'absolute', inset: 0, padding: '40px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <div style={{ background: '#E53935', color: '#FFF', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 99, letterSpacing: '0.15em', display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content', marginBottom: 16 }}>
                    <span style={{ width: 7, height: 7, background: '#FFF', borderRadius: '50%' }} />
                    LIVE NOW
                  </div>
                  <h2 className="font-display uppercase tracking-wide" style={{ fontSize: 46, fontWeight: 800, color: '#FFF', marginBottom: 8 }}>
                    {featured.name}
                  </h2>
                  <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.75)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin style={{ width: 16, height: 16 }} /> {featured.city}, {featured.state}
                  </p>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'linear-gradient(135deg, #BC6A4D 0%, #BC6A4D 100%)',
                    color: '#FFF', fontSize: 15, fontWeight: 700,
                    letterSpacing: '0.08em', padding: '14px 28px', borderRadius: 12,
                    fontFamily: 'Iceland, sans-serif', width: 'fit-content',
                  }}>
                    <Play style={{ width: 16, height: 16 }} /> Watch Now
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* ── TEMPLE GRID ───────────────────────────────────────────────── */}
        <section style={{ paddingLeft: 48, paddingRight: 48, paddingBottom: 64 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 className="font-display font-bold tracking-wide uppercase" style={{ fontSize: 33, color: '#2C1810' }}>
                All Temples
                <span style={{ fontSize: 17, color: '#9C7B62', fontWeight: 400, marginLeft: 12, fontFamily: "'Astra','Iceland',sans-serif", textTransform: 'none', letterSpacing: 0 }}>
                  {filtered.length} streams
                </span>
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, background: '#E53935', borderRadius: '50%' }} />
                <span style={{ fontSize: 13, color: '#7A5C42', fontWeight: 600 }}>{liveTemples.filter(t => t.isLive).length} live now</span>
              </div>
            </div>

            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 24 }}>
                {filtered.map((temple, i) => (
                  <TempleCard key={temple.id} temple={temple} index={i} />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', paddingTop: 64, paddingBottom: 64 }}>
                <p style={{ fontSize: 22, color: '#9C7B62', fontFamily: 'Iceland, sans-serif', letterSpacing: '0.1em' }}>No temples found</p>
                <p style={{ fontSize: 14, color: '#B09070', marginTop: 8 }}>Try a different search</p>
              </div>
            )}
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section style={{ paddingLeft: 48, paddingRight: 48, paddingBottom: 64 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{
              background: '#FFF', borderRadius: 20,
              border: '1.5px solid rgba(188,106,77,0.15)',
              boxShadow: '0 4px 24px rgba(120,60,20,0.06)',
              padding: '36px 40px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16,
            }}>
              <div style={{ fontSize: 32 }}>🛕</div>
              <h3 className="font-display uppercase tracking-wide" style={{ fontSize: 30, color: '#2C1810', fontWeight: 700 }}>Is Your Temple Not Listed?</h3>
              <p style={{ fontSize: 17, color: 'rgba(44,24,16,0.55)', maxWidth: 460 }}>
                We partner with temples across India to bring darshan to devotees worldwide. Contact us to add your temple.
              </p>
              <button type="button" onClick={() => setPartnerOpen(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, #BC6A4D 0%, #BC6A4D 100%)',
                color: '#FFF', fontSize: 13, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '14px 28px', borderRadius: 12,
                fontFamily: 'Iceland, sans-serif', cursor: 'pointer', border: 'none',
              }}>
                <ArrowRight style={{ width: 15, height: 15 }} /> Partner With Us
              </button>
            </div>
          </div>
        </section>
      </div>
      <PartnershipModal open={partnerOpen} onOpenChange={setPartnerOpen} />
    </DevotionLayout>
  );
};

export default DarshanPage;
