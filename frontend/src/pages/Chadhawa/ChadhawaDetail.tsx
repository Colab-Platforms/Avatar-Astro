import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, Users, ChevronLeft, ChevronRight, Check,
  Plus, Minus, Heart, ShoppingBag, ChevronDown, Phone,
} from 'lucide-react';
import { useChadhawaTemple, useChadhawaTemples, isNotFoundError } from '@/features/chadhawa/hooks';
import { ChadhawaDetailSkeleton } from './ChadhawaSkeletons';
import DevotionLayout from '@/components/DevotionLayout';

// ── Timeline ───────────────────────────────────────────────────────────────────
const TIMELINE = [
  { icon: '🌐', title: 'Visit Chadhawa',        desc: 'Go to the Tilok website and select the Chadhawa option.' },
  { icon: '🛕', title: 'Choose Temple',          desc: 'Select the temple where you wish to send your Chadhawa offering.' },
  { icon: '🎁', title: 'Select Offerings',       desc: 'Pick from available offerings such as chunri, flower basket, prasad, sindoor, etc.' },
  { icon: '📝', title: 'Fill Up Details',        desc: 'Click on "Make an Offering" and fill in the required details.' },
  { icon: '💳', title: 'Make Payment',           desc: 'Complete the payment using UPI, Card, Net Banking, or other available options.' },
  { icon: '🙏', title: 'Ritual Performed',       desc: 'Verified pandits perform the Chadhawa at the temple on your behalf with full sankalp.' },
  { icon: '📜', title: 'Receive Confirmation',   desc: 'Receive digital receipt, photo proof, and prasad dispatched to your address.' },
];

// ── FAQs ───────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'What is the Online Chadhawa Service on Tilok?', a: 'Tilok\'s Online Chadhawa lets you offer sacred items to temple deities from anywhere in the world. Verified pandits perform the offering on your behalf and send you photo confirmation.' },
  { q: 'How do I select a temple for my offering?', a: 'Browse our curated list of India\'s most sacred temples. Each temple page shows available offering options, timings, and prices. Simply choose and proceed.' },
  { q: 'What types of offerings can I send through the Chadhawa service?', a: 'We offer a wide range: Kumkum, Chunri, Flower Basket, Ghee Lamp, 16 Shringar, 56 Bhog, Red Bangles, Saree, Lotus, and complete Mata offerings.' },
  { q: 'How do I know my offering has been delivered to the temple?', a: 'Once the Chadhawa is performed, you receive a photo proof, a digital receipt, and prasad dispatched to your registered address within 7 business days.' },
  { q: 'Can I send Chadhawa on specific dates or festivals?', a: 'Yes! During checkout you can choose an auspicious date such as Navratri, Ekadashi, Purnima, or any festival day. Slots are subject to temple availability.' },
  { q: 'How secure is the payment process for Chadhawa offerings?', a: 'All payments are processed through Razorpay with bank-grade SSL encryption. We support UPI, cards, net banking, and wallets. Your data is always safe.' },
  { q: 'What is the refund policy?', a: 'Full refund is available if cancelled 48 hours before the scheduled ritual date. Once the pandit has performed the Chadhawa, no refund is applicable as the offering has been made.' },
];

// ── About per temple ───────────────────────────────────────────────────────────
const ABOUT_TEXT: Record<string, string> = {
  'tirupati-balaji':   'Shri Tirupati Balaji Temple, dedicated to Lord Venkateswara, is one of the most visited religious sites in the world, receiving over 60,000 devotees daily. Located atop the Tirumala hills in Andhra Pradesh, this sacred shrine is believed to fulfil the wishes of all who visit with a pure heart. The Chadhawa offering here is considered supremely auspicious, and the presiding deity is known to grant wealth, health, and liberation.',
  'kashi-vishwanath':  'The Kashi Vishwanath Temple is one of the twelve Jyotirlingas of Lord Shiva, situated on the western bank of the holy river Ganga in Varanasi. It is believed that a darshan here grants Moksha — liberation from the cycle of birth and death. Performing Chadhawa at this sacred shrine connects you to the timeless energy of Mahadev and invokes his blessings for peace, wisdom, and spiritual liberation.',
  'shirdi-sai-baba':   'Shirdi Sai Baba Temple is one of the most visited pilgrimage sites in India, attracting devotees of all faiths. Sai Baba, the saint of Shirdi, taught love, forgiveness, and helping others. Devotees believe that sincere faith and a heartfelt offering here can manifest miracles in one\'s life. The Chadhawa service allows you to send your love and prayers to Baba from anywhere in the world.',
  'golden-temple':     'The Harmandir Sahib, commonly known as the Golden Temple, is the holiest shrine of Sikhism. Its golden exterior reflects perfectly in the Amrit Sarovar (sacred pool). The temple serves langar (free community meals) to over 100,000 people daily regardless of religion or status. Making a Chadhawa offering here invokes the blessings of Waheguru for peace, gratitude, and selfless service.',
  'vaishno-devi':      'The Vaishno Devi Temple, nestled in the Trikuta Mountains of Jammu, is one of the most revered shrines of the Hindu goddess. It is believed that Mata Vaishno Devi herself calls her devotees when they are spiritually ready. The pious trekking journey to this shrine is a transformative spiritual experience. Chadhawa offerings here invoke the Mother\'s protection, power, and boundless blessings.',
  'mahakaleshwar':     'The Mahakaleshwar Jyotirlinga in Ujjain is one of the twelve sacred Jyotirlingas of Lord Shiva. Known as the lord of time and death, Mahakal is worshipped in his Bhasm Aarti form, considered unique in the entire world. Offering Chadhawa at Mahakaleshwar invokes cosmic energy, removes fear of death, and grants victory in all aspects of life.',
};

const DEFAULT_ABOUT = 'This sacred temple is a powerful centre of divine energy that has attracted millions of devotees across centuries. The temple\'s spiritual significance lies in the deep connection between the deity and the devotees. By offering a Chadhawa through our verified pandits, you extend your devotion directly to the sacred shrine, ensuring your prayers, wishes, and gratitude reach the divine with full sankalp performed in your name.';

// ── Image Carousel ─────────────────────────────────────────────────────────────
const ImageCarousel = ({ images, name, gradient }: { images: string[]; name: string; gradient?: string }) => {
  const [current, setCurrent] = useState(0);
  const total = images.length;
  const prev = () => setCurrent(i => (i - 1 + total) % total);
  const next = () => setCurrent(i => (i + 1) % total);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative rounded-[20px] overflow-hidden group"
        style={{ height: 420, background: gradient }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0"
          >
            {total > 0 ? (
              <img
                src={images[current]}
                alt={`${name} ${current + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/30">
                <span className="text-8xl">🛕</span>
                <span className="font-display text-lg tracking-widest uppercase">{name}</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Counter */}
        {total > 1 && (
          <div className="absolute top-4 right-4 z-20 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-display tracking-wider">
            {current + 1} / {total}
          </div>
        )}

        {total > 1 && (
          <>
            <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-primary/50 transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-primary/50 transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Gradient bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
      </div>

      {/* Dot indicators */}
      {total > 1 && (
        <div className="flex justify-center gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-primary' : 'w-1.5 bg-foreground/20'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────────
const ChadhawaDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: temple, isLoading, isError, error } = useChadhawaTemple(slug);
  // Cached by the listing page, so this is usually a no-op fetch.
  const { data: allTemples } = useChadhawaTemples();

  // Offering quantities
  const [qty, setQty] = useState<Record<string, number>>({});
  // FAQ
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  // Wishlist toggle
  // Browser-only wishlist (localStorage). There is no account wishlist on the server.
  const WISHLIST_KEY = 'mb_chadhawa_wishlist';
  const readWishlist = (): string[] => {
    try { const v = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
  };
  const [wishlisted, setWishlistedState] = useState<boolean>(() => !!slug && readWishlist().includes(slug));
  const setWishlisted = (update: (w: boolean) => boolean) => {
    setWishlistedState((prev) => {
      const next = update(prev);
      try {
        const set = new Set(readWishlist());
        if (slug) { if (next) set.add(slug); else set.delete(slug); }
        localStorage.setItem(WISHLIST_KEY, JSON.stringify([...set]));
      } catch { /* storage unavailable: still works for this visit */ }
      return next;
    });
  };
  // Newsletter
  const [phone, setPhone] = useState('');
  const scrollToOfferings = () => document.getElementById('offerings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (isLoading) {
    return <ChadhawaDetailSkeleton />;
  }

  // A 404 keeps the original "Temple not found" screen; any other failure is a
  // transient problem and says so rather than claiming the temple doesn't exist.
  if (isError && !isNotFoundError(error)) {
    return (
      <DevotionLayout>
        <div className="min-h-screen pt-24 flex items-center justify-center">
          <div className="text-center">
            <p className="font-display text-3xl tracking-wider text-muted-foreground mb-4">Could not load temple</p>
            <Link to="/chadhawa" className="btn-outline-cosmic px-6 py-3 rounded-lg inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Chadhawa
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
            <Link to="/chadhawa" className="btn-outline-cosmic px-6 py-3 rounded-lg inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Chadhawa
            </Link>
          </div>
        </div>
      </DevotionLayout>
    );
  }

  const images    = temple.images;
  const offerings = temple.offerings;
  const related   = (allTemples ?? []).filter(t => t.slug !== slug).slice(0, 3);
  const aboutText = ABOUT_TEXT[slug!] ?? DEFAULT_ABOUT;

  const setItemQty = (id: string, delta: number) => {
    setQty(prev => {
      const next = (prev[id] ?? 0) + delta;
      if (next <= 0) { return Object.fromEntries(Object.entries(prev).filter(([k]) => k !== id)); }
      return { ...prev, [id]: next };
    });
  };

  const cartItems  = offerings.filter(o => qty[o.id]);
  const totalAmt   = cartItems.reduce((s, o) => s + o.price * (qty[o.id] ?? 0), 0);
  const totalItems = cartItems.reduce((s, o) => s + (qty[o.id] ?? 0), 0);

  return (
    <DevotionLayout>
    <div className="pt-24 pb-32 lg:pb-16 relative z-10">

      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="border-b border-border/20">
        <div className="mx-auto px-6 lg:px-16 py-3" style={{ maxWidth: 1400 }}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-display">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <Link to="/chadhawa" className="hover:text-primary transition-colors">Mandir Chadhawa</Link>
            <span>/</span>
            <span className="text-foreground">{temple.name}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto px-6 lg:px-16 py-8" style={{ maxWidth: 1400 }}>

        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 mb-16">

          {/* LEFT — Image carousel */}
          <div className="lg:w-[56%]">
            <ImageCarousel images={images} name={temple.name} gradient={temple.gradient ?? undefined} />
          </div>

          {/* RIGHT — Info + CTAs */}
          <div className="lg:w-[44%]">
            <div className="lg:sticky lg:top-28 flex flex-col gap-5">

              {/* Trust badge */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/25 px-3.5 py-1.5 rounded-full">
                  <Users className="w-3.5 h-3.5" />
                  100K+ satisfied devotees
                </div>
              </div>

              {/* Temple name */}
              <div>
                <h1 className="font-display text-4xl md:text-5xl tracking-widest uppercase text-foreground leading-tight mb-2">
                  {temple.name}
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground text-sm mt-2">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{temple.location}, {temple.state}</span>
                </div>
              </div>

              {/* Short description */}
              <p className="text-sm text-foreground/65 leading-relaxed" style={{ lineHeight: 1.75 }}>
                {temple.description}
              </p>

              {/* Price callout */}
              <div className="glass-card rounded-2xl px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Chadhawa starting from</p>
                  <p className="font-bold text-primary text-3xl">₹{temple.priceFrom}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Delivery</p>
                  <p className="text-sm font-semibold text-foreground">Prasad to doorstep</p>
                </div>
              </div>

              {/* Offerings highlights */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: '✅', label: 'Temple Verified Pandits' },
                  { icon: '📸', label: 'Photo Proof Sent' },
                  { icon: '🎁', label: 'Prasad Dispatch' },
                  { icon: '🔒', label: 'Secure Payment' },
                ].map(f => (
                  <div key={f.label} className="glass-card rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <span className="text-base">{f.icon}</span>
                    <span className="text-xs text-foreground/70 font-medium">{f.label}</span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-3 mt-1">
                <button
                  className="btn-cosmic w-full py-4 rounded-xl text-sm tracking-widest font-semibold flex items-center justify-center gap-2"
                  onClick={scrollToOfferings}
                >
                  🙏 Participate Now
                </button>
                <button
                  onClick={() => setWishlisted(w => !w)}
                  className={`w-full py-3.5 rounded-xl text-sm tracking-wider font-semibold border flex items-center justify-center gap-2 transition-all ${
                    wishlisted
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/40 text-muted-foreground hover:border-primary/40 hover:text-primary'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${wishlisted ? 'fill-primary' : ''}`} />
                  {wishlisted ? 'Saved on this device' : 'Save for later'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── CHOOSE YOUR OFFERING ──────────────────────────────────────────── */}
        <section className="mb-16" id="offerings">
          <div className="text-center mb-10">
            <p className="text-xs font-display tracking-[0.3em] text-primary/70 uppercase mb-3">Sacred Items</p>
            <h2 className="font-display text-3xl md:text-4xl tracking-widest uppercase">
              <span className="text-foreground">Choose Your </span>
              <span className="text-primary">Offering</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
              Select from sacred items offered at {temple.name}. Add quantities and proceed to offer.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* Offering grid */}
            <div className="flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {offerings.map(offering => {
                  const q = qty[offering.id] ?? 0;
                  return (
                    <motion.div
                      key={offering.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4 }}
                      className={`glass-card rounded-2xl p-4 flex gap-4 items-start border transition-all ${
                        q > 0 ? 'border-primary/40 shadow-[0_0_24px_rgba(188,106,77,0.10)]' : 'border-border/20'
                      }`}
                    >
                      {/* Emoji icon */}
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 border border-primary/20"
                        style={{ background: 'rgba(188,106,77,0.07)' }}
                      >
                        {offering.emoji ?? '🪔'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-display text-sm uppercase tracking-wide text-foreground leading-tight">
                            {offering.name}
                          </h3>
                          <span className="font-bold text-primary text-sm flex-shrink-0">₹{offering.price}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                          {offering.description}
                        </p>

                        {/* Qty selector / Add */}
                        <div className="flex items-center gap-2">
                          {q === 0 ? (
                            <button
                              onClick={() => setItemQty(offering.id, 1)}
                              className="flex items-center gap-1.5 btn-cosmic px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wider"
                            >
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          ) : (
                            <div className="flex items-center gap-0 border border-primary/30 rounded-lg overflow-hidden">
                              <button
                                onClick={() => setItemQty(offering.id, -1)}
                                className="px-3 py-1.5 text-primary hover:bg-primary/10 transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-3 text-sm font-bold text-foreground min-w-[28px] text-center">
                                {q}
                              </span>
                              <button
                                onClick={() => setItemQty(offering.id, 1)}
                                className="px-3 py-1.5 text-primary hover:bg-primary/10 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Sticky Summary */}
            <div className="lg:w-72 xl:w-80 flex-shrink-0">
              <div className="lg:sticky lg:top-28">
                <div className="glass-card rounded-2xl border border-border/30 overflow-hidden">
                  <div className="bg-primary/8 border-b border-border/20 px-5 py-4 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    <span className="font-display text-sm tracking-widest uppercase text-foreground">
                      Offering Summary
                    </span>
                  </div>

                  <div className="px-5 py-4">
                    {cartItems.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-3xl mb-2">🪔</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Select offerings from the grid to begin your Chadhawa
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 mb-4">
                        {cartItems.map(item => (
                          <div key={item.id} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base flex-shrink-0">{item.emoji ?? '🪔'}</span>
                              <span className="text-xs text-foreground/80 truncate">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-muted-foreground">×{qty[item.id]}</span>
                              <span className="text-xs font-semibold text-primary">
                                ₹{item.price * (qty[item.id] ?? 0)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-border/20 pt-3 mb-4 space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Items</span>
                        <span>{totalItems}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-foreground">
                        <span>Total Amount</span>
                        <span className="text-primary">₹{totalAmt}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-disabled="true"
                      title="Online offerings are not available yet"
                      disabled
                      className={`btn-cosmic w-full py-3.5 rounded-xl text-sm tracking-wider font-semibold transition-opacity ${totalItems === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      🙏 Proceed to Offer
                    </button>

                    <p className="text-[11px] text-muted-foreground text-center mt-3 leading-relaxed">
                      Online offerings are not available yet. Please check back soon.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CHADHAWA PROCESS TIMELINE ────────────────────────────────────── */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <p className="text-xs font-display tracking-[0.3em] text-primary/70 uppercase mb-3">Step by Step</p>
            <h2 className="font-display text-3xl md:text-4xl tracking-widest uppercase">
              <span className="text-foreground">Chadhawa </span>
              <span className="text-primary">Process</span>
            </h2>
          </div>

          {/* Odd steps top row, even bottom row */}
          <div className="relative">
            {/* Desktop: zigzag timeline */}
            <div className="hidden lg:block">
              {/* Top row: steps 1, 3, 5, 7 */}
              <div className="flex items-end justify-between gap-0 mb-0 relative">
                <div className="absolute top-8 left-[7%] right-[7%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                {TIMELINE.filter((_, i) => i % 2 === 0).map((step, idx) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1, duration: 0.45 }}
                    className="flex flex-col items-center text-center relative z-10 px-2"
                    style={{ width: '14.2%' }}
                  >
                    <div className="w-16 h-16 rounded-2xl glass-card border border-primary/25 flex items-center justify-center text-2xl mb-3 hover:border-primary/60 hover:scale-105 transition-all duration-300 cursor-default">
                      {step.icon}
                    </div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                      Step {TIMELINE.indexOf(step) + 1}
                    </span>
                    <p className="text-xs font-semibold text-foreground mb-1">{step.title}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{step.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* Bottom row: steps 2, 4, 6 */}
              <div className="flex justify-around mt-8 relative">
                <div className="absolute top-8 left-[7%] right-[7%] h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                {TIMELINE.filter((_, i) => i % 2 !== 0).map((step, idx) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 + 0.15, duration: 0.45 }}
                    className="flex flex-col items-center text-center relative z-10 px-2"
                    style={{ width: '14.2%' }}
                  >
                    <div className="w-16 h-16 rounded-2xl glass-card border border-primary/25 flex items-center justify-center text-2xl mb-3 hover:border-primary/60 hover:scale-105 transition-all duration-300 cursor-default">
                      {step.icon}
                    </div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                      Step {TIMELINE.indexOf(step) + 1}
                    </span>
                    <p className="text-xs font-semibold text-foreground mb-1">{step.title}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{step.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Mobile: vertical list */}
            <div className="lg:hidden flex flex-col gap-4">
              {TIMELINE.map((step, i) => (
                <div key={step.title} className="flex gap-4 items-start">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl glass-card border border-primary/25 flex items-center justify-center text-xl">
                      {step.icon}
                    </div>
                    {i < TIMELINE.length - 1 && <div className="w-px flex-1 bg-primary/20 my-1 min-h-[24px]" />}
                  </div>
                  <div className="pt-2 pb-4">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Step {i + 1}</span>
                    <p className="text-sm font-semibold text-foreground mt-0.5 mb-1">{step.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ABOUT THIS TEMPLE ─────────────────────────────────────────────── */}
        <section className="mb-16">
          <div className="text-center mb-10">
            <p className="text-xs font-display tracking-[0.3em] text-primary/70 uppercase mb-3">Spiritual Significance</p>
            <h2 className="font-display text-3xl md:text-4xl tracking-widest uppercase">
              <span className="text-foreground">More About </span>
              <span className="text-primary">Chadhawa</span>
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <p className="text-base text-foreground/70 leading-[1.85] mb-6">{aboutText}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { icon: '🏛️', label: 'Temple History',        val: 'Ancient Heritage' },
                  { icon: '✨', label: 'Spiritual Benefits',     val: 'Divine Blessings' },
                  { icon: '🙏', label: 'Ritual Authenticity',   val: 'Verified Pandits' },
                  { icon: '🎁', label: 'Prasad',                val: 'Home Delivery' },
                  { icon: '📜', label: 'Sankalp Certificate',   val: 'Sent via Email' },
                  { icon: '⏱️', label: 'Completion',            val: '1–5 Business Days' },
                ].map(item => (
                  <div key={item.label} className="glass-card rounded-xl p-4 text-center">
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                    <p className="text-xs font-semibold text-foreground">{item.val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Side highlight card */}
            <div className="lg:w-72 xl:w-80 flex-shrink-0">
              <div className="glass-card rounded-2xl p-6 border border-primary/20 h-full">
                <p className="text-xs uppercase tracking-wider text-primary/70 mb-4">Why Choose Tilok</p>
                <ul className="space-y-4">
                  {[
                    { icon: '🛡️', text: 'Attracts prosperity and abundance' },
                    { icon: '💰', text: 'Removes financial difficulties and obstacles' },
                    { icon: '📈', text: 'Enhances business and career growth' },
                    { icon: '☮️', text: 'Brings peace and harmony to life' },
                    { icon: '✅', text: 'Authentic rituals by verified temple priests' },
                    { icon: '🔄', text: 'Transparent and trusted booking process' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                      <span className="text-sm text-foreground/70 leading-relaxed">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ + ILLUSTRATION ────────────────────────────────────────────── */}
        <section className="mb-16">
          <div className="text-center mb-10">
            <p className="text-xs font-display tracking-[0.3em] text-primary/70 uppercase mb-3">Help Centre</p>
            <h2 className="font-display text-3xl md:text-4xl tracking-widest uppercase">
              <span className="text-foreground">Frequently Asked </span>
              <span className="text-primary">Questions</span>
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row gap-10 items-start">

            {/* FAQ accordion */}
            <div className="flex-1 space-y-3">
              {FAQS.map((faq, i) => (
                <div key={i} className="glass-card rounded-2xl overflow-hidden border border-border/20">
                  <button
                    className="w-full flex justify-between items-center px-5 py-4 text-left gap-4"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="text-sm font-semibold text-foreground leading-snug">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-primary flex-shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 pt-2 text-sm text-muted-foreground leading-relaxed border-t border-border/15">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Spiritual illustration — decorative mandala */}
            <div className="lg:w-72 xl:w-80 flex-shrink-0 hidden lg:flex items-center justify-center">
              <div className="relative w-72 h-72">
                {/* Outer glow ring */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, rgba(188,106,77,0.12) 0%, rgba(188,106,77,0.04) 55%, transparent 75%)',
                    boxShadow: '0 0 80px rgba(188,106,77,0.15)',
                  }}
                />
                {/* Concentric rings */}
                {[1, 0.75, 0.55, 0.38].map((scale, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full border border-primary/15"
                    style={{
                      inset: `${(1 - scale) * 50}%`,
                      animationName: i % 2 === 0 ? 'spin' : 'spin-reverse',
                      animationDuration: `${20 + i * 8}s`,
                      animationTimingFunction: 'linear',
                      animationIterationCount: 'infinite',
                    }}
                  />
                ))}
                {/* Center deity emoji */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-7xl mb-2" style={{ filter: 'drop-shadow(0 0 24px rgba(188,106,77,0.5))' }}>🪷</span>
                  <p className="font-display text-xs tracking-[0.3em] uppercase text-primary/60">Sacred Offering</p>
                </div>
                {/* Petal dots */}
                {Array.from({ length: 8 }).map((_, i) => {
                  const angle = (i * 45 * Math.PI) / 180;
                  const r = 110;
                  return (
                    <div
                      key={i}
                      className="absolute w-2 h-2 rounded-full bg-primary/30"
                      style={{
                        left: `calc(50% + ${Math.cos(angle) * r}px - 4px)`,
                        top:  `calc(50% + ${Math.sin(angle) * r}px - 4px)`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── NEWSLETTER ────────────────────────────────────────────────────── */}
        <section className="mb-16">
          <div className="glass-card rounded-3xl p-8 md:p-12 text-center border border-primary/15"
            style={{ background: 'linear-gradient(135deg, rgba(188,106,77,0.06) 0%, rgba(255,252,248,0.7) 100%)' }}
          >
            <p className="text-xs font-display tracking-[0.3em] text-primary/70 uppercase mb-3">Our Newsletter</p>
            <h2 className="font-display text-2xl md:text-3xl tracking-widest uppercase text-foreground mb-3">
              Sign Up Our Mailbox
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-8 leading-relaxed">
              Get your Daily Horoscope, Daily Lovescope and Daily Tarot directly in your inbox
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                  <Phone className="w-4 h-4 text-primary/50" />
                  <span className="text-sm text-muted-foreground border-r border-border/30 pr-2">+91</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Enter Contact Number"
                  className="input-cosmic w-full pl-20 pr-4 py-3.5 rounded-xl text-sm"
                />
              </div>
              <button className="btn-cosmic px-8 py-3.5 rounded-xl text-sm tracking-wider font-semibold flex-shrink-0">
                Subscribe Now
              </button>
            </div>
          </div>
        </section>

        {/* ── RELATED TEMPLES ───────────────────────────────────────────────── */}
        <section>
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl md:text-3xl tracking-widest uppercase">
              <span className="text-foreground">More </span>
              <span className="text-primary">Chadhawas</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {related.map(t => (
              <Link
                key={t.id}
                to={`/chadhawa/${t.slug}`}
                className="glass-card-hover rounded-2xl overflow-hidden group block"
              >
                <div className="h-44 relative overflow-hidden" style={{ background: t.gradient ?? undefined }}>
                  {t.image && (
                    <img
                      src={t.image}
                      alt={t.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <p className="font-display text-sm tracking-wider uppercase text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.location}</p>
                  </div>
                  <span className="text-sm font-bold text-primary flex-shrink-0">₹{t.priceFrom}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ── MOBILE: Fixed bottom bar ──────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#E8DED0] px-4 py-3"
        style={{ background: 'rgba(248,244,236,0.96)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: '#9C7B62' }}>Total</p>
            <p className="text-base font-bold text-primary">₹{totalAmt > 0 ? totalAmt : temple.priceFrom}</p>
          </div>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Online offerings are not available yet"
            className={`btn-cosmic flex-1 py-3 rounded-xl text-sm tracking-wider font-semibold flex items-center justify-center gap-2 cursor-not-allowed opacity-60 ${totalItems === 0 ? 'opacity-70' : ''}`}
          >
            <ShoppingBag className="w-4 h-4" />
            {totalItems > 0 ? `Proceed (${totalItems} items)` : 'Participate Now'}
          </button>
        </div>
      </div>

      {/* Spin animation keyframes */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
      `}</style>
    </div>
    </DevotionLayout>
  );
};

export default ChadhawaDetail;
