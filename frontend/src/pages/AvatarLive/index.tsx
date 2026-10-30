import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Radio, Users, Calendar, ArrowRight, Video, Sparkles } from 'lucide-react';
import DevotionLayout from '@/components/DevotionLayout';
import { liveTemples, familyEvents, upcomingEvents } from '@/data/liveStreams';

// ── Decorative temple gopuram SVG ─────────────────────────────────────────────
const TempleSVG = ({ opacity = 0.15 }: { opacity?: number }) => (
  <svg viewBox="0 0 200 280" width="200" height="280" style={{ opacity }} aria-hidden="true">
    {/* Kalash / finial */}
    <ellipse cx="100" cy="18" rx="10" ry="12" fill="currentColor" />
    <rect x="97" y="30" width="6" height="8" fill="currentColor" />
    {/* Shikhara tiers — narrow at top, wide at bottom */}
    <polygon points="100,38 113,38 115,56 85,56" fill="currentColor" />
    <polygon points="88,56 112,56 116,78 84,78" fill="currentColor" />
    <polygon points="82,78 118,78 123,104 77,104" fill="currentColor" />
    <polygon points="74,104 126,104 132,134 68,134" fill="currentColor" />
    <polygon points="64,134 136,134 142,166 58,166" fill="currentColor" />
    {/* Base platform layers */}
    <rect x="54" y="166" width="92" height="18" fill="currentColor" />
    <rect x="44" y="184" width="112" height="16" fill="currentColor" />
    <rect x="34" y="200" width="132" height="16" fill="currentColor" />
    {/* Entrance arch */}
    <rect x="82" y="216" width="36" height="48" rx="18" fill="currentColor" />
    <rect x="86" y="230" width="28" height="34" rx="14" fill="rgba(0,0,0,0.15)" />
    {/* Ground base */}
    <rect x="20" y="264" width="160" height="12" rx="4" fill="currentColor" />
  </svg>
);

// ── Decorative mandala SVG (for family card) ──────────────────────────────────
const MandalaSVG = ({ opacity = 0.15 }: { opacity?: number }) => (
  <svg viewBox="0 0 240 240" width="240" height="240" style={{ opacity }} aria-hidden="true">
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
      <g key={deg} transform={`rotate(${deg} 120 120)`}>
        <ellipse cx="120" cy="72" rx="6" ry="18" fill="currentColor" />
        <ellipse cx="120" cy="52" rx="3" ry="8" fill="currentColor" opacity="0.6" />
      </g>
    ))}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
      <g key={deg} transform={`rotate(${deg} 120 120)`}>
        <ellipse cx="120" cy="94" rx="4" ry="12" fill="currentColor" opacity="0.7" />
      </g>
    ))}
    <circle cx="120" cy="120" r="30" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
    <circle cx="120" cy="120" r="18" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <circle cx="120" cy="120" r="7"  fill="currentColor" opacity="0.7" />
  </svg>
);

// ── Featured live card (horizontal scroll) ────────────────────────────────────
const LiveCard = ({ temple }: { temple: (typeof liveTemples)[0] }) => (
  <Link to={`/avatar-live/darshan/${temple.slug}`} className="group flex-shrink-0" style={{ width: 260, textDecoration: 'none' }}>
    <div
      style={{
        background: '#FFF', borderRadius: 18,
        border: '1.5px solid rgba(188,106,77,0.12)',
        boxShadow: '0 4px 20px rgba(120,60,20,0.07)',
        overflow: 'hidden',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 12px 36px rgba(120,60,20,0.12)'; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = '0 4px 20px rgba(120,60,20,0.07)'; }}
    >
      <div style={{ height: 140, background: temple.gradient, position: 'relative', overflow: 'hidden' }}>
        {temple.image && (
          <img src={`/images/temples/${temple.image}`} alt={temple.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
        {temple.isLive && (
          <div style={{ position: 'absolute', top: 10, left: 10, background: '#E53935', color: '#FFF', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, background: '#FFF', borderRadius: '50%' }} /> LIVE
          </div>
        )}
      </div>
      <div style={{ padding: '14px 16px' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#BC6A4D', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(188,106,77,0.08)', border: '1px solid rgba(188,106,77,0.2)', borderRadius: 99, padding: '2px 8px', display: 'inline-block', marginBottom: 6 }}>
          {temple.category}
        </span>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#2C1810', lineHeight: 1.3, marginBottom: 3, fontFamily: 'Iceland, sans-serif', letterSpacing: '0.03em' }}>{temple.name}</p>
        <p style={{ fontSize: 13, color: '#7A5C42' }}>{temple.city}</p>
      </div>
    </div>
  </Link>
);

// ── Page ──────────────────────────────────────────────────────────────────────
const AvatarLivePage = () => {
  const liveDarshans    = liveTemples.filter(t => t.isLive).slice(0, 4);
  const liveFamilyShort = familyEvents.filter(e => e.isLive).slice(0, 2);

  return (
    <DevotionLayout>
      <div className="relative z-10" style={{ paddingTop: 80 }}>

        {/* ── COMPACT HERO ──────────────────────────────────────────────── */}
        <section className="text-center" style={{ paddingTop: 52, paddingBottom: 48, paddingLeft: 24, paddingRight: 24 }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <div className="flex items-center justify-center gap-3 mb-5">
              <div style={{ height: 1, width: 40, background: 'linear-gradient(to right, transparent, rgba(188,106,77,0.5))' }} />
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.32em', color: '#BC6A4D', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Radio style={{ width: 11, height: 11 }} /> Now Streaming
              </p>
              <div style={{ height: 1, width: 40, background: 'linear-gradient(to left, transparent, rgba(188,106,77,0.5))' }} />
            </div>

            <h1 className="font-display font-bold tracking-widest uppercase leading-none mb-5"
              style={{ fontSize: 'clamp(52px, 8vw, 96px)' }}>
              <span style={{ background: 'linear-gradient(135deg, #BC6A4D 0%, #BC6A4D 60%, #BC6A4D 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Live
              </span>
            </h1>

            <p style={{ fontSize: 17, color: 'rgba(44,24,16,0.58)', lineHeight: 1.75, marginBottom: 28, maxWidth: 520, margin: '0 auto 28px' }}>
              Watch live temple darshans, family ceremonies, and sacred events from anywhere in the world.
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-10">
              {[{ num: '9+', label: 'Live Temples' }, { num: '50K+', label: 'Viewers' }, { num: '24/7', label: 'Always Live' }].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#BC6A4D', fontFamily: 'Iceland, sans-serif' }}>{s.num}</p>
                  <p style={{ fontSize: 11, color: '#9C7B62' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TWO DOMINANT CATEGORY CARDS ───────────────────────────────── */}
        <section style={{ paddingLeft: 32, paddingRight: 32, paddingBottom: 80 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* ── Card 1: Live Darshan ─────────────────────────────────── */}
              <motion.div
                whileHover={{ y: -6, scale: 1.005 }}
                transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <Link to="/avatar-live/darshan" style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{
                    borderRadius: 28, overflow: 'hidden',
                    position: 'relative',
                    minHeight: 480,
                    background: 'linear-gradient(155deg, #BC6A4D 0%, #BC6A4D 30%, #BC6A4D 65%, #BC6A4D 100%)',
                    cursor: 'pointer',
                    boxShadow: '0 16px 56px rgba(120,60,20,0.22)',
                  }}>
                    {/* Decorative texture ring */}
                    <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.08)' }} />
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 200, height: 200, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.06)' }} />

                    {/* Temple SVG watermark */}
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -58%)', color: '#FFF5E0', pointerEvents: 'none' }}>
                      <TempleSVG opacity={0.14} />
                    </div>

                    {/* LIVE badge */}
                    <div style={{
                      position: 'absolute', top: 24, left: 24,
                      background: '#E53935', color: '#FFF', fontSize: 11, fontWeight: 700,
                      padding: '6px 14px', borderRadius: 99, letterSpacing: '0.14em',
                      display: 'flex', alignItems: 'center', gap: 6,
                      boxShadow: '0 4px 14px rgba(229,57,53,0.4)',
                    }}>
                      <span style={{ width: 7, height: 7, background: '#FFF', borderRadius: '50%' }} />
                      LIVE NOW
                    </div>

                    {/* Bottom content overlay */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)',
                      padding: '80px 36px 36px',
                    }}>
                      {/* Temple tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                        {['Siddhivinayak', 'Kashi Vishwanath', 'Tirupati', 'Shirdi'].map(t => (
                          <span key={t} style={{ fontSize: 11, color: 'rgba(255,255,255,0.80)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 99, padding: '4px 11px', fontFamily: "'Astra','Iceland',sans-serif", fontWeight: 600 }}>
                            {t}
                          </span>
                        ))}
                      </div>

                      <h2 className="font-display font-bold uppercase tracking-wide leading-none mb-4"
                        style={{ fontSize: 'clamp(36px, 5vw, 52px)', color: '#FFF', textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
                        Live Darshan
                      </h2>

                      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.78)', lineHeight: 1.65, marginBottom: 24, maxWidth: 380 }}>
                        Watch live darshan, aartis, and spiritual events from renowned temples across India.
                      </p>

                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 10,
                        background: '#FFF', color: '#BC6A4D',
                        fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                        padding: '14px 26px', borderRadius: 14,
                        fontFamily: 'Iceland, sans-serif',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                        transition: 'transform 0.2s',
                      }}>
                        <Play style={{ width: 15, height: 15 }} />
                        Watch Live Darshan
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* ── Card 2: Family Functions ─────────────────────────────── */}
              <motion.div
                whileHover={{ y: -6, scale: 1.005 }}
                transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <Link to="/avatar-live/family" style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{
                    borderRadius: 28, overflow: 'hidden',
                    position: 'relative',
                    minHeight: 480,
                    background: 'linear-gradient(155deg, #7B4A28 0%, #BC6A4D 30%, #8B5230 65%, #5C3218 100%)',
                    cursor: 'pointer',
                    boxShadow: '0 16px 56px rgba(80,40,10,0.24)',
                  }}>
                    {/* Decorative rings */}
                    <div style={{ position: 'absolute', bottom: -50, left: -50, width: 280, height: 280, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.07)' }} />
                    <div style={{ position: 'absolute', bottom: -20, left: -20, width: 190, height: 190, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.05)' }} />

                    {/* Mandala watermark */}
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -52%)', color: '#FFE8C8', pointerEvents: 'none' }}>
                      <MandalaSVG opacity={0.14} />
                    </div>

                    {/* Event type badges top-left */}
                    <div style={{ position: 'absolute', top: 24, left: 24, display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 240 }}>
                      {['Wedding', 'Naming Ceremony', 'Puja'].map(t => (
                        <span key={t} style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 99, padding: '4px 11px', fontFamily: "'Astra','Iceland',sans-serif", fontWeight: 600 }}>
                          {t}
                        </span>
                      ))}
                    </div>

                    {/* Live event count */}
                    <div style={{
                      position: 'absolute', top: 24, right: 24,
                      background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
                      color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 600,
                      padding: '6px 14px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span style={{ width: 7, height: 7, background: '#E53935', borderRadius: '50%' }} />
                      {familyEvents.filter(e => e.isLive).length} Live Events
                    </div>

                    {/* Bottom content overlay */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)',
                      padding: '80px 36px 36px',
                    }}>
                      {/* Celebration emoji row */}
                      <div style={{ display: 'flex', gap: 10, marginBottom: 18, fontSize: 22 }}>
                        {['💍', '🪔', '👶', '🎂', '✨'].map(e => (
                          <span key={e} style={{ opacity: 0.85 }}>{e}</span>
                        ))}
                      </div>

                      <h2 className="font-display font-bold uppercase tracking-wide leading-none mb-4"
                        style={{ fontSize: 'clamp(36px, 5vw, 52px)', color: '#FFF', textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
                        Family Functions
                      </h2>

                      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.78)', lineHeight: 1.65, marginBottom: 24, maxWidth: 380 }}>
                        Join weddings, pujas, naming ceremonies, and family celebrations from anywhere in the world.
                      </p>

                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 10,
                        background: 'rgba(255,255,255,0.96)', color: '#7B4A28',
                        fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                        padding: '14px 26px', borderRadius: 14,
                        fontFamily: 'Iceland, sans-serif',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                      }}>
                        <Video style={{ width: 15, height: 15 }} />
                        Explore Family Functions
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── FEATURED LIVE STREAMS ─────────────────────────────────────── */}
        <section style={{ paddingBottom: 72 }}>
          <div style={{ paddingLeft: 32, paddingRight: 32, marginBottom: 24 }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.3em', color: '#BC6A4D', textTransform: 'uppercase', marginBottom: 5 }}>LIVE NOW</p>
                <h2 className="font-display font-bold tracking-wide uppercase" style={{ fontSize: 27, color: '#2C1810' }}>
                  Featured <span style={{ color: '#BC6A4D' }}>Streams</span>
                </h2>
              </div>
              <Link to="/avatar-live/darshan" style={{ fontSize: 13, color: '#BC6A4D', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                See all <ArrowRight style={{ width: 14, height: 14 }} />
              </Link>
            </div>
          </div>

          <div style={{ paddingLeft: 32, paddingRight: 32 }}>
            <div style={{ maxWidth: 1280, margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 12 }}>
                {liveDarshans.map(t => <LiveCard key={t.id} temple={t} />)}
                {liveFamilyShort.map(e => (
                  <Link key={e.id} to="/avatar-live/family" className="group flex-shrink-0" style={{ width: 260, textDecoration: 'none' }}>
                    <div style={{
                      background: '#FFF', borderRadius: 18, border: '1.5px solid rgba(188,106,77,0.12)',
                      boxShadow: '0 4px 20px rgba(120,60,20,0.07)', overflow: 'hidden',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    }}
                      onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; }}
                      onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                    >
                      <div style={{ height: 140, background: e.gradient, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 40 }}>💒</span>
                        {e.isLive && (
                          <div style={{ position: 'absolute', top: 10, left: 10, background: '#E53935', color: '#FFF', fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 99, letterSpacing: '0.12em' }}>● LIVE</div>
                        )}
                      </div>
                      <div style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#BC6A4D', background: 'rgba(188,106,77,0.08)', border: '1px solid rgba(188,106,77,0.2)', borderRadius: 99, padding: '2px 8px', display: 'inline-block', marginBottom: 6 }}>
                          {e.type}
                        </span>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#2C1810', marginBottom: 3, fontFamily: 'Iceland, sans-serif' }}>{e.title}</p>
                        <p style={{ fontSize: 12, color: '#7A5C42' }}>{e.family} · {e.city}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── UPCOMING + STATS ──────────────────────────────────────────── */}
        <section style={{ paddingLeft: 32, paddingRight: 32, paddingBottom: 72 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

              {/* Timeline */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Calendar style={{ width: 20, height: 20, color: '#BC6A4D' }} />
                  <h2 className="font-display font-bold tracking-wide uppercase" style={{ fontSize: 22, color: '#2C1810' }}>Upcoming Events</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {upcomingEvents.slice(0, 5).map((ev, i) => (
                    <motion.div key={ev.id}
                      initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.4 }}
                      style={{
                        background: '#FFF', borderRadius: 14, padding: '14px 18px',
                        border: '1.5px solid rgba(188,106,77,0.12)',
                        boxShadow: '0 2px 12px rgba(120,60,20,0.05)',
                        display: 'flex', alignItems: 'center', gap: 14,
                      }}
                    >
                      <div style={{
                        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                        background: ev.category === 'darshan' ? 'rgba(188,106,77,0.10)' : 'rgba(140,80,30,0.08)',
                        border: `1.5px solid ${ev.category === 'darshan' ? 'rgba(188,106,77,0.22)' : 'rgba(140,80,30,0.18)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                      }}>
                        {ev.category === 'darshan' ? '🛕' : '💒'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#2C1810', marginBottom: 2 }}>{ev.title}</p>
                        <p style={{ fontSize: 12, color: '#9C7B62' }}>{ev.subtitle}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: ev.isToday ? '#BC6A4D' : '#9C7B62', fontFamily: 'Iceland, sans-serif' }}>{ev.time}</p>
                        {ev.isToday && <p style={{ fontSize: 10, color: '#BC6A4D', fontWeight: 600, marginTop: 2 }}>TODAY</p>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Stats grid */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles style={{ width: 20, height: 20, color: '#BC6A4D' }} />
                  <h2 className="font-display font-bold tracking-wide uppercase" style={{ fontSize: 22, color: '#2C1810' }}>Live Stats</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {[
                    { icon: '🛕', label: 'Temples Live',    value: '7',    sub: 'right now' },
                    { icon: '👥', label: 'Viewers Now',     value: '50K+', sub: 'all streams' },
                    { icon: '💒', label: 'Family Events',   value: '4',    sub: 'live & upcoming' },
                    { icon: '🙏', label: 'Prayers Offered', value: '1.2K', sub: 'last hour' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#FFF', borderRadius: 16, padding: '20px 18px', border: '1.5px solid rgba(188,106,77,0.12)', boxShadow: '0 2px 12px rgba(120,60,20,0.05)' }}>
                      <div style={{ fontSize: 24, marginBottom: 10 }}>{s.icon}</div>
                      <p style={{ fontSize: 10, color: '#9C7B62', marginBottom: 4, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</p>
                      <p style={{ fontSize: 26, fontWeight: 800, color: '#2C1810', fontFamily: 'Iceland, sans-serif' }}>{s.value}</p>
                      <p style={{ fontSize: 11, color: '#B09070', marginTop: 2 }}>{s.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER CTA ────────────────────────────────────────────────── */}
        <section style={{ paddingLeft: 32, paddingRight: 32, paddingBottom: 80 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{
              background: 'linear-gradient(135deg, #BC6A4D 0%, #BC6A4D 50%, #BC6A4D 100%)',
              borderRadius: 28, padding: '56px 48px', textAlign: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -40, left: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ position: 'absolute', bottom: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 14 }}>✦ FOR FAMILIES & TEMPLES ✦</p>
              <h2 className="font-display font-bold tracking-wide uppercase" style={{ fontSize: 'clamp(26px, 4vw, 42px)', color: '#FFF', marginBottom: 14 }}>
                Bring Your Sacred Moments Online
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 32px' }}>
                Share spiritual events and family celebrations with loved ones anywhere in the world.
              </p>
              <Link to="/contact" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#FFF', color: '#BC6A4D', fontSize: 14, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '16px 32px', borderRadius: 14,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                fontFamily: 'Iceland, sans-serif', cursor: 'pointer', border: 'none', textDecoration: 'none',
              }}>
                <Video style={{ width: 16, height: 16 }} /> Create Live Event
              </Link>
            </div>
          </div>
        </section>

      </div>
    </DevotionLayout>
  );
};

export default AvatarLivePage;
