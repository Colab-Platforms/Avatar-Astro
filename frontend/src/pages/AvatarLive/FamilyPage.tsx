import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, MapPin, Play, Lock, ArrowRight, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import DevotionLayout from '@/components/DevotionLayout';
import { familyEvents } from '@/data/liveStreams';

const EVENT_TYPES = ['All', 'Wedding', 'Puja', 'Naming Ceremony', 'Birthday', 'Anniversary', 'Satyanarayan'] as const;

const eventEmoji: Record<string, string> = {
  Wedding: '💍', Puja: '🪔', 'Naming Ceremony': '👶', Birthday: '🎂', Anniversary: '✨', Satyanarayan: '🙏',
};

// ── Family event card ──────────────────────────────────────────────────────────
const FamilyCard = ({ event, index }: { event: (typeof familyEvents)[0]; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.07, duration: 0.45 }}
  >
    <div
      style={{
        background: '#FFF', borderRadius: 20,
        border: '1.5px solid rgba(188,106,77,0.13)',
        boxShadow: '0 4px 20px rgba(120,60,20,0.07)',
        overflow: 'hidden',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
        cursor: 'pointer',
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
      {/* Thumbnail */}
      <div style={{ position: 'relative', width: '100%', paddingBottom: '56%', background: event.gradient, overflow: 'hidden', borderRadius: '18px 18px 0 0' }}>
        {/* Decorative overlay */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 72, opacity: 0.25 }}>{eventEmoji[event.type] ?? '🎊'}</span>
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />

        {/* Live / Upcoming badge */}
        <div style={{
          position: 'absolute', top: 12, left: 12,
          background: event.isLive ? '#E53935' : 'rgba(30,30,30,0.7)',
          color: '#FFF', fontSize: 10, fontWeight: 700,
          padding: '4px 10px', borderRadius: 99, letterSpacing: '0.12em',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {event.isLive && <span style={{ width: 6, height: 6, background: '#FFF', borderRadius: '50%' }} />}
          {event.isLive ? 'LIVE' : 'UPCOMING'}
        </div>

        {/* Private badge */}
        {event.isPrivate && (
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.9)', fontSize: 10, padding: '4px 10px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Lock style={{ width: 10, height: 10 }} /> Private
          </div>
        )}

        {/* Viewer / scheduled */}
        <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.9)', fontSize: 11, padding: '4px 10px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 5 }}>
          {event.isLive ? (
            <>Live</>
          ) : (
            <><Calendar style={{ width: 11, height: 11 }} /> {event.scheduledAt ?? 'Scheduled'}</>
          )}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '18px 20px 20px' }}>
        {/* Event type chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 14 }}>{eventEmoji[event.type] ?? '🎊'}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: '#BC6A4D', background: 'rgba(188,106,77,0.1)', padding: '3px 10px', borderRadius: 99,
          }}>{event.type}</span>
        </div>

        <h3 className="font-display uppercase tracking-wide leading-tight" style={{ fontSize: 24, fontWeight: 700, color: '#2C1810', marginBottom: 5 }}>
          {event.title}
        </h3>
        <p style={{ fontSize: 14, color: '#BC6A4D', fontWeight: 600, marginBottom: 7 }}>{event.family}</p>
        <p style={{ fontSize: 15, color: '#6B4E3D', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 14 }}>
          <MapPin style={{ width: 13, height: 13, color: '#BC6A4D', flexShrink: 0 }} />
          {event.city}
        </p>

        <p style={{ fontSize: 15, color: 'rgba(44,24,16,0.55)', lineHeight: 1.6, marginBottom: 14 }}>
          {event.description}
        </p>

        <div style={{ height: 1, background: 'rgba(188,106,77,0.12)', marginBottom: 14 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#9C7B62' }}>
            {event.isPrivate ? '🔒 Invite only' : '🌐 Open stream'}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: event.isLive
              ? 'linear-gradient(135deg, #BC6A4D 0%, #BC6A4D 100%)'
              : 'rgba(188,106,77,0.10)',
            color: event.isLive ? '#FFF' : '#BC6A4D',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '9px 16px', borderRadius: 10,
            fontFamily: 'Iceland, sans-serif',
            border: event.isLive ? 'none' : '1px solid rgba(188,106,77,0.25)',
          }}>
            <Play style={{ width: 12, height: 12 }} />
            {event.isLive ? 'Join Live' : 'Set Reminder'}
          </span>
        </div>
      </div>
    </div>
  </motion.div>
);

// ── Page ───────────────────────────────────────────────────────────────────────
const FamilyPage = () => {
  const [query, setQuery]  = useState('');
  const [active, setActive] = useState<string>('All');

  const filtered = familyEvents.filter(ev => {
    const matchQ   = !query || ev.title.toLowerCase().includes(query.toLowerCase()) || ev.family.toLowerCase().includes(query.toLowerCase()) || ev.city.toLowerCase().includes(query.toLowerCase());
    const matchCat = active === 'All' || ev.type === active;
    return matchQ && matchCat;
  });

  const liveNow = familyEvents.filter(ev => ev.isLive);

  return (
    <DevotionLayout>
      <div className="relative z-10" style={{ paddingTop: 80 }}>

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section className="text-center" style={{ paddingTop: 56, paddingBottom: 56, paddingLeft: 48, paddingRight: 48 }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <div className="flex items-center justify-center gap-3 mb-5">
              <div style={{ height: 1, width: 56, background: 'linear-gradient(to right, transparent, rgba(188,106,77,0.5))' }} />
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.32em', color: '#BC6A4D', textTransform: 'uppercase' }}>✦ Live Celebrations ✦</p>
              <div style={{ height: 1, width: 56, background: 'linear-gradient(to left, transparent, rgba(188,106,77,0.5))' }} />
            </div>

            <h1 className="font-display font-bold tracking-widest uppercase leading-none mb-5"
              style={{ fontSize: 'clamp(64px, 10vw, 116px)' }}>
              <span style={{ color: '#2C1810' }}>Family </span>
              <span style={{ background: 'linear-gradient(135deg, #BC6A4D 0%, #BC6A4D 60%, #BC6A4D 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Functions
              </span>
            </h1>

            <p style={{ fontSize: 20, color: 'rgba(44,24,16,0.55)', lineHeight: 1.7, marginBottom: 36 }}>
              Watch family weddings, pujas, naming ceremonies, and celebrations streamed live for loved ones everywhere.
            </p>

            {/* Search */}
            <div style={{ maxWidth: 520, margin: '0 auto', position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, color: '#BC6A4D', pointerEvents: 'none' }} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by family name, event type, city..."
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
            {EVENT_TYPES.map(cat => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                style={{
                  flexShrink: 0,
                  padding: '8px 18px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  letterSpacing: '0.04em', cursor: 'pointer',
                  border: active === cat ? '1.5px solid #BC6A4D' : '1.5px solid rgba(188,106,77,0.25)',
                  background: active === cat ? 'rgba(188,106,77,0.1)' : 'transparent',
                  color: active === cat ? '#BC6A4D' : '#7A5C42',
                  transition: 'all 0.2s',
                }}
              >
                {eventEmoji[cat] ? `${eventEmoji[cat]} ` : ''}{cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── LIVE NOW STRIP ────────────────────────────────────────────── */}
        {liveNow.length > 0 && (
          <section style={{ paddingLeft: 48, paddingRight: 48, paddingTop: 36, paddingBottom: 8 }}>
            <div style={{ maxWidth: 1280, margin: '0 auto' }}>
              <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.28em', color: '#E53935', textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, background: '#E53935', borderRadius: '50%' }} />
                Live Now
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {liveNow.map((ev, i) => (
                  <FamilyCard key={ev.id} event={ev} index={i} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── ALL EVENTS GRID ───────────────────────────────────────────── */}
        <section style={{ paddingLeft: 48, paddingRight: 48, paddingTop: 32, paddingBottom: 48 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 className="font-display font-bold tracking-wide uppercase" style={{ fontSize: 32, color: '#2C1810' }}>
                All Events
                <span style={{ fontSize: 16, color: '#9C7B62', fontWeight: 400, marginLeft: 12, fontFamily: "'Astra','Iceland',sans-serif", textTransform: 'none', letterSpacing: 0 }}>
                  {filtered.length} events
                </span>
              </h2>
            </div>

            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 24 }}>
                {filtered.map((ev, i) => (
                  <FamilyCard key={ev.id} event={ev} index={i} />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', paddingTop: 64, paddingBottom: 64 }}>
                <p style={{ fontSize: 22, color: '#9C7B62', fontFamily: 'Iceland, sans-serif', letterSpacing: '0.1em' }}>No events found</p>
                <p style={{ fontSize: 14, color: '#B09070', marginTop: 8 }}>Try a different search or filter</p>
              </div>
            )}
          </div>
        </section>

        {/* ── HOST YOUR CELEBRATION ─────────────────────────────────────── */}
        <section style={{ paddingLeft: 48, paddingRight: 48, paddingBottom: 80 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{
              borderRadius: 24, overflow: 'hidden',
              background: 'linear-gradient(135deg, #BC6A4D 0%, #BC6A4D 50%, #BC6A4D 100%)',
              padding: '56px 64px',
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 32,
              boxShadow: '0 20px 60px rgba(120,60,20,0.2)',
            }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 12 }}>Host Your Event</p>
                <h2 className="font-display uppercase tracking-wide" style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#FFF', fontWeight: 800, lineHeight: 1.1, marginBottom: 12 }}>
                  Stream Your Sacred<br />Moments Live
                </h2>
                <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.78)', maxWidth: 440, lineHeight: 1.7 }}>
                  Let your family and friends join from anywhere in the world. We handle the streaming so you can focus on what matters.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0 }}>
                <Link to="/contact" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: '#FFF', color: '#BC6A4D',
                  fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '16px 32px', borderRadius: 12, cursor: 'pointer', border: 'none',
                  fontFamily: 'Iceland, sans-serif', textDecoration: 'none',
                }}>
                  <ArrowRight style={{ width: 15, height: 15 }} /> Book Your Stream
                </Link>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', textAlign: 'center' }}>
                  Starting ₹1,999 · Setup in 24 hrs
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DevotionLayout>
  );
};

export default FamilyPage;
