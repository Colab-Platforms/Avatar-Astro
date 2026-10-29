import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, Clock, CheckCircle, ChevronLeft, ChevronRight,
  Plus, Minus, Calendar, Star, Sparkles, ShieldCheck,
} from 'lucide-react';
import { useTemple, isNotFoundError } from '@/features/puja/hooks';
import type { PublicPuja } from '@/features/puja/types';
import DevotionLayout from '@/components/DevotionLayout';
import { PujaDetailSkeleton } from './PujaSkeletons';

// ── Static content ─────────────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  { icon: '🛕', title: 'Select Puja',             desc: 'Choose the puja that matches your spiritual need and intention' },
  { icon: '📝', title: 'Enter Devotee Details',   desc: 'Share your name, gotra, and sankalp purpose with us' },
  { icon: '✅', title: 'Confirm Booking',          desc: 'Receive instant booking confirmation with all ritual details' },
  { icon: '🔔', title: 'Temple Performs Puja',    desc: 'Certified pandit performs the ritual in your name at the temple' },
  { icon: '📸', title: 'Receive Proof & Blessings', desc: 'Get photos, video and sankalp certificate delivered to you' },
];

const TEMPLE_HIGHLIGHTS: Record<string, string[]> = {
  'tirupati-balaji':  ['One of the richest temples in the world', 'Over 50,000 pilgrims daily', 'Famous for Tirumala Ladoo prasad', 'UNESCO heritage site'],
  'kashi-vishwanath': ['First of 12 Jyotirlingas', 'On the banks of sacred Ganga', 'Daily Ganga Aarti at ghats', 'City of liberation (Moksha)'],
  'shirdi-sai-baba':  ['Visited by 25,000+ pilgrims daily', 'Sai Baba lived here from 1858', 'Famous for miracles and healing', 'Open to all faiths'],
  'golden-temple':    ['Covered in 750 kg of pure gold', 'Free langar for 100,000+ daily', 'Open 24 hours a day', 'Most visited site in the world'],
  'vaishno-devi':     ['Located at 5,200 ft altitude', 'Cave shrine with 3 sacred pindis', 'Over 8 million annual pilgrims', 'Helicopter darshan available'],
  'somnath-temple':   ['Rebuilt 7 times in history', 'On the shores of Arabian Sea', 'First Jyotirlinga mentioned in Vedas', 'Sound & Light show nightly'],
  'jagannath-puri':   ['One of 4 sacred Char Dhams', 'Famous Rath Yatra chariot festival', 'Lord Jagannath form is unique', 'Only temple with Mahaprasad'],
  'siddhivinayak':    ['Most visited temple in Mumbai', 'Trunk faces right (rare Ganesha)', 'Celebrities visit regularly', 'Gold-plated inner sanctum'],
  'mahakaleshwar':    ['Only south-facing Jyotirlinga', 'Bhasma Aarti at 4 AM daily', 'Shivling is self-manifested (Swayambhu)', 'Rulers of Ujjain worshipped here'],
  'iskcon-vrindavan': ['Birthplace of Lord Krishna nearby', 'Beautiful marble architecture', 'Daily kirtan and aarti', 'International Vaishnava centre'],
};

const TEMPLE_TIMINGS: Record<string, string> = {
  'tirupati-balaji':  '6:00 AM – 9:00 PM (Darshan timings vary)',
  'kashi-vishwanath': '3:00 AM – 11:00 PM (Mangala Aarti at 3 AM)',
  'shirdi-sai-baba':  '4:00 AM – 11:30 PM',
  'golden-temple':    'Open 24 Hours',
  'vaishno-devi':     '5:00 AM – 9:00 PM (cave accessible)',
  'somnath-temple':   '6:00 AM – 9:30 PM',
  'jagannath-puri':   '5:00 AM – 12:00 AM (midnight)',
  'siddhivinayak':    '5:30 AM – 9:50 PM',
  'mahakaleshwar':    '4:00 AM – 11:00 PM (Bhasma Aarti 4 AM)',
  'iskcon-vrindavan': '4:30 AM – 9:00 PM',
};

// ── Image Carousel ─────────────────────────────────────────────────────────────
const Carousel = ({ images, gradient, name }: { images: string[]; gradient: string | null; name: string }) => {
  const [idx, setIdx] = useState(0);
  const total = images.length;
  const prev  = () => setIdx(i => (i - 1 + total) % total);
  const next  = () => setIdx(i => (i + 1) % total);

  return (
    <div className="flex flex-col gap-4">
      {/* Main frame */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ aspectRatio: '4/3', background: gradient ?? undefined }}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={idx}
            src={images[idx] ?? ''}
            alt={`${name} ${idx + 1}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 w-full h-full object-cover object-center"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </AnimatePresence>

        {/* Dark vignette bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

        {/* Counter */}
        {total > 1 && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white/90 text-xs font-display px-3 py-1 rounded-full tracking-wider">
            {idx + 1} / {total}
          </div>
        )}

        {/* Arrows */}
        {total > 1 && (
          <>
            <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm border border-primary/25 flex items-center justify-center text-white hover:bg-primary/50 hover:border-primary/60 transition-all">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm border border-primary/25 flex items-center justify-center text-white hover:bg-primary/50 hover:border-primary/60 transition-all">
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      {total > 1 && (
        <div className="flex justify-center gap-2">
          {images.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'w-8 bg-primary' : 'w-2 bg-primary/10'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────────
const PujaDetail = () => {
  const { slug }  = useParams<{ slug: string }>();
  const { data: temple, isLoading, isError, error } = useTemple(slug);
  const pujaRef   = useRef<HTMLDivElement>(null);

  const [selectedPuja, setSelectedPuja] = useState<PublicPuja | null>(null);
  const [quantity, setQuantity]         = useState(1);

  if (isLoading) {
    return <PujaDetailSkeleton />;
  }

  // A 404 keeps the original "Temple not found" screen; any other failure is a
  // transient problem and says so rather than claiming the temple doesn't exist.
  if (isError && !isNotFoundError(error)) {
    return (
      <DevotionLayout>
        <div className="min-h-screen pt-24 flex items-center justify-center">
          <div className="text-center">
            <p className="font-display text-3xl tracking-wider text-muted-foreground mb-4">Could not load temple</p>
            <Link to="/puja" className="btn-outline-cosmic px-6 py-3 rounded-lg inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Puja
            </Link>
          </div>
        </div>
      </DevotionLayout>
    );
  }

  if (!temple) {
    return (
      <DevotionLayout>
        <div className="min-h-screen pt-24 flex items-center justify-center">
          <div className="text-center">
            <p className="font-display text-3xl tracking-wider text-muted-foreground mb-4">Temple not found</p>
            <Link to="/puja" className="btn-outline-cosmic px-6 py-3 rounded-lg inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Puja
            </Link>
          </div>
        </div>
      </DevotionLayout>
    );
  }

  const images      = temple.images;
  const activePuja  = selectedPuja ?? temple.pujas[0];
  const total       = activePuja ? activePuja.price * quantity : 0;
  const highlights  = TEMPLE_HIGHLIGHTS[temple.slug] ?? [];
  const timings     = TEMPLE_TIMINGS[temple.slug]    ?? 'Timings vary';

  const scrollToPujas = () => pujaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <DevotionLayout>
    <div className="pt-24 pb-24 lg:pb-16 relative z-10">
      <div className="container mx-auto px-6 lg:px-16">

        {/* Back */}
        <Link to="/puja" className="inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary mb-10 transition-colors font-display tracking-wider">
          <ArrowLeft className="w-4 h-4" /> Back to all temples
        </Link>

        {/* ══════════════════════════════════════════════════════
            HERO — two column
        ══════════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 mb-24">

          {/* LEFT — Image Carousel */}
          <div className="lg:w-[58%]">
            <Carousel images={images} gradient={temple.gradient} name={temple.name} />
          </div>

          {/* RIGHT — Temple Info (sticky) */}
          <div className="lg:w-[42%]">
            <div className="lg:sticky lg:top-28 flex flex-col gap-6">

              {/* Deity badge */}
              <span className="inline-flex items-center gap-2 text-sm font-semibold tracking-widest uppercase text-primary border border-primary/30 bg-primary/10 px-4 py-2 rounded-full w-fit">
                <Sparkles className="w-4 h-4" /> {temple.deity}
              </span>

              {/* Temple name */}
              <div>
                <h1 className="font-display tracking-widest uppercase text-foreground leading-none mb-3"
                    style={{ fontSize: 44 }}>
                  {temple.name}
                </h1>
                <p className="text-primary font-semibold" style={{ fontSize: 20 }}>
                  Sacred Puja & Ritual Booking
                </p>
              </div>

              {/* Location + Timing cards */}
              <div className="flex flex-col gap-3">
                <div className="glass-card rounded-2xl px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Temple Location</p>
                    <p className="text-foreground font-semibold" style={{ fontSize: 17 }}>{temple.location}, {temple.state}</p>
                  </div>
                </div>

                <div className="glass-card rounded-2xl px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Temple Timings</p>
                    <p className="text-foreground font-semibold" style={{ fontSize: 17 }}>{timings}</p>
                  </div>
                </div>

                <div className="glass-card rounded-2xl px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Puja Available</p>
                    <p className="text-foreground font-semibold" style={{ fontSize: 17 }}>Every Monday, Ekadashi &amp; Auspicious Days</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-foreground/65 leading-relaxed" style={{ fontSize: 17, lineHeight: 1.75 }}>
                {temple.description} Our certified pandits perform every ritual with complete devotion, sankalp and Vedic procedures on your behalf, ensuring divine blessings reach you wherever you are in the world.
              </p>

              {/* Temple Highlights */}
              {highlights.length > 0 && (
                <div className="glass-card rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-primary" /> Temple Highlights
                  </p>
                  <ul className="grid grid-cols-1 gap-2.5">
                    {highlights.map(h => (
                      <li key={h} className="flex items-start gap-3" style={{ fontSize: 15 }}>
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground/70">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={scrollToPujas}
                className="btn-cosmic w-full rounded-2xl font-semibold tracking-wider"
                style={{ fontSize: 18, paddingTop: 18, paddingBottom: 18 }}
              >
                🙏 View Available Pujas
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════════════════════ */}
        <section className="mb-24">
          <h2 className="font-display tracking-widest uppercase text-center mb-14"
              style={{ fontSize: 36 }}>
            <span className="text-foreground">How It </span>
            <span className="text-primary">Works</span>
          </h2>

          <div className="relative flex flex-col md:flex-row items-start md:items-start justify-between gap-6 md:gap-0">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent pointer-events-none" />

            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="flex flex-col items-center text-center flex-1 relative z-10 px-3"
              >
                <div className="w-20 h-20 rounded-2xl glass-card border border-primary/20 flex items-center justify-center text-3xl mb-4 hover:border-primary/60 hover:scale-105 transition-all duration-300 cursor-default shadow-[0_0_20px_rgba(89,34,9,0.08)]">
                  {step.icon}
                </div>
                <p className="font-semibold text-primary uppercase tracking-wider mb-2" style={{ fontSize: 13 }}>{step.title}</p>
                <p className="text-muted-foreground leading-relaxed max-w-[130px]" style={{ fontSize: 13 }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            AVAILABLE PUJAS
        ══════════════════════════════════════════════════════ */}
        <section className="mb-24" ref={pujaRef}>
          <h2 className="font-display tracking-widest uppercase mb-4" style={{ fontSize: 36 }}>
            <span className="text-foreground">Available </span>
            <span className="text-primary">Pujas</span>
          </h2>
          <p className="text-muted-foreground mb-12" style={{ fontSize: 17 }}>
            Select a puja to book. All rituals are performed by certified temple pandits.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {temple.pujas.map(puja => {
              const isSelected = activePuja?.id === puja.id;
              return (
                <motion.div
                  key={puja.id}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45 }}
                  onClick={() => setSelectedPuja(puja)}
                  className={`glass-card-hover rounded-2xl p-8 flex flex-col cursor-pointer border transition-all duration-300 ${
                    isSelected
                      ? 'border-primary shadow-[0_0_40px_rgba(89,34,9,0.18)]'
                      : 'border-border/20 hover:border-primary/40'
                  }`}
                >
                  {/* Puja name */}
                  <h3 className="font-display tracking-wider uppercase text-foreground mb-2 leading-tight" style={{ fontSize: 22 }}>
                    {puja.name}
                  </h3>

                  {/* Price + duration */}
                  <div className="flex items-baseline gap-3 mb-6">
                    <span className="font-bold text-primary" style={{ fontSize: 30 }}>₹{puja.price}</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: 15 }}>
                      <Clock className="w-4 h-4 text-primary/50" /> {puja.duration}
                    </span>
                  </div>

                  {/* Benefits */}
                  <div className="flex-1 mb-7">
                    <p className="text-xs uppercase tracking-widest text-primary/60 mb-4">Benefits</p>
                    <ul className="space-y-3">
                      {puja.benefits.map(b => (
                        <li key={b} className="flex items-start gap-3 text-foreground/65" style={{ fontSize: 15 }}>
                          <CheckCircle className="w-4 h-4 text-primary/60 flex-shrink-0 mt-0.5" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    className={`w-full rounded-xl font-semibold tracking-wider transition-all ${
                      isSelected ? 'btn-cosmic' : 'btn-outline-cosmic'
                    }`}
                    style={{ fontSize: 17, paddingTop: 16, paddingBottom: 16 }}
                  >
                    {isSelected ? '✓ Selected' : 'Select Puja'}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            BOOKING SUMMARY CARD
        ══════════════════════════════════════════════════════ */}
        <section className="mb-16">
          <div className="glass-card rounded-2xl p-8 md:p-10 max-w-2xl mx-auto border border-primary/20 shadow-[0_0_60px_rgba(89,34,9,0.08)]">

            <div className="flex items-center gap-3 mb-8">
              <ShieldCheck className="w-6 h-6 text-primary" />
              <h3 className="font-display tracking-wider uppercase text-foreground" style={{ fontSize: 24 }}>
                Booking Summary
              </h3>
            </div>

            {/* Selected puja */}
            <div className="flex justify-between items-start mb-5 pb-5 border-b border-border/25">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Selected Puja</p>
                <p className="font-semibold text-foreground" style={{ fontSize: 18 }}>{activePuja?.name ?? '—'}</p>
              </div>
              <p className="font-bold text-primary" style={{ fontSize: 22 }}>₹{activePuja?.price ?? 0}</p>
            </div>

            {/* Temple */}
            <div className="flex justify-between items-center mb-5 pb-5 border-b border-border/25">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Temple</p>
                <p className="font-semibold text-foreground" style={{ fontSize: 17 }}>{temple.name}</p>
              </div>
              <p className="text-sm text-muted-foreground">{temple.location}</p>
            </div>

            {/* Date */}
            <div className="flex justify-between items-center mb-5 pb-5 border-b border-border/25">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Date</p>
                <p className="font-semibold text-foreground" style={{ fontSize: 17 }}>Next Auspicious Date</p>
              </div>
              <p className="text-sm text-muted-foreground">Available Mon, Ekadashi</p>
            </div>

            {/* Quantity */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Devotees</p>
                <p className="text-sm text-muted-foreground">Number of devotees</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-full border border-primary/40 text-primary flex items-center justify-center hover:bg-primary/10 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold text-foreground w-6 text-center" style={{ fontSize: 20 }}>{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 text-primary flex items-center justify-center hover:bg-primary/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-baseline mb-8 p-5 rounded-xl bg-primary/8 border border-primary/15">
              <p className="font-semibold text-foreground" style={{ fontSize: 18 }}>Total Amount</p>
              <p className="font-bold text-primary" style={{ fontSize: 32 }}>₹{total}</p>
            </div>

            <button
              className="btn-cosmic w-full rounded-2xl font-semibold tracking-wider"
              style={{ fontSize: 18, paddingTop: 20, paddingBottom: 20 }}
            >
              🙏 Proceed to Book
            </button>

            <p className="text-center text-muted-foreground mt-4" style={{ fontSize: 14 }}>
              100% secure · Sankalp certificate included · Prasad dispatch available
            </p>
          </div>
        </section>

      </div>

      {/* ── MOBILE: Fixed bottom CTA ─────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 border-t border-[#E8DED0]"
        style={{ background: 'rgba(248,244,236,0.96)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: '#9C7B62' }}>Selected</p>
            <p className="font-semibold" style={{ fontSize: 15, color: '#301607' }}>{activePuja?.name ?? '—'}</p>
          </div>
          <button
            className="btn-cosmic rounded-xl font-semibold flex-shrink-0"
            style={{ fontSize: 15, paddingTop: 14, paddingBottom: 14, paddingLeft: 24, paddingRight: 24 }}
          >
            Book — ₹{total}
          </button>
        </div>
      </div>
    </div>
    </DevotionLayout>
  );
};

export default PujaDetail;
