import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { zodiacSigns, ZodiacSign } from '@/data/zodiacData';

import ariesImg from '@/assets/zodiac/aries.png';
import taurusImg from '@/assets/zodiac/taurus.png';
import geminiImg from '@/assets/zodiac/gemini.png';
import cancerImg from '@/assets/zodiac/cancer.png';
import leoImg from '@/assets/zodiac/leo.png';
import virgoImg from '@/assets/zodiac/virgo.png';
import libraImg from '@/assets/zodiac/libra.png';
import scorpioImg from '@/assets/zodiac/scorpio.png';
import sagittariusImg from '@/assets/zodiac/sagittarius.png';
import capricornImg from '@/assets/zodiac/capricorn.png';
import aquariusImg from '@/assets/zodiac/aquarius.png';
import piscesImg from '@/assets/zodiac/pisces.png';

const zodiacImages: Record<string, string> = {
  Aries: ariesImg, Taurus: taurusImg, Gemini: geminiImg, Cancer: cancerImg,
  Leo: leoImg, Virgo: virgoImg, Libra: libraImg, Scorpio: scorpioImg,
  Sagittarius: sagittariusImg, Capricorn: capricornImg, Aquarius: aquariusImg, Pisces: piscesImg,
};

const wrap = (index: number, length: number) => ((index % length) + length) % length;

const AUTO_SLIDE_DELAY = 4500;
const CARD = 256;

// Card position & style for each offset from center (-2 … +2)
function getSlotAnimate(offset: number) {
  if (offset === 0)             return { x: 0,    scale: 1.00, opacity: 1.00 };
  if (Math.abs(offset) === 1)   return { x: offset * 244, scale: 0.72, opacity: 0.9 };
  return                               { x: offset < 0 ? -537 : 537, scale: 0.5, opacity: 0.00 };
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const arrowCls =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-home-rust bg-home-rust text-home-ink transition-all duration-300 hover:scale-110 hover:border-home-orange hover:bg-home-orange motion-reduce:transition-none motion-reduce:hover:scale-100';

export const ZodiacWheelSection = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track direction in a ref so AnimatePresence initial/exit closures always read the latest value
  const dirRef = useRef(1);

  const current: ZodiacSign = zodiacSigns[currentIndex];

  // ── Auto-slide (skipped for reduced-motion users) ───────────────────────────
  const startAutoSlide = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (prefersReducedMotion()) return;
    timerRef.current = setInterval(() => {
      dirRef.current = 1;
      setCurrentIndex(i => wrap(i + 1, zodiacSigns.length));
    }, AUTO_SLIDE_DELAY);
  }, []);

  useEffect(() => {
    startAutoSlide();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startAutoSlide]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const paginate = useCallback((dir: number) => {
    dirRef.current = dir;
    setCurrentIndex(i => wrap(i + dir, zodiacSigns.length));
    startAutoSlide();
  }, [startAutoSlide]);

  const goToIndex = useCallback((target: number, from: number) => {
    dirRef.current = target > from ? 1 : -1;
    setCurrentIndex(target);
    startAutoSlide();
  }, [startAutoSlide]);

  return (
    <section className="relative z-10 scroll-mt-16 py-8 md:py-10" aria-labelledby="home-zodiac-h">
      {/* Soft orange glow behind the carousel */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 h-[560px] w-[560px] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]"
          style={{ background: 'rgba(254,159,48,0.16)' }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <div className="mb-4 text-center md:mb-5">
          <h2
            id="home-zodiac-h"
            className="hl-serif mb-2 font-semibold leading-[1.15] tracking-[0.04em]"
            style={{ fontSize: 'clamp(28px, 4.6vw, 50px)' }}
          >
            <span className="block text-home-ink md:inline">THE TWELVE </span>
            <span className="block text-home-rust md:inline">ZODIAC SIGNS</span>
          </h2>
          <p className="font-home-sans text-base tracking-wide text-home-muted md:text-[18.5px]">
            Explore the cosmic wisdom of each celestial sign
          </p>
        </div>

        {/* ── Carousel: arrows beside the track on md+, below it on phones ── */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:flex-nowrap md:gap-x-6">
          <button onClick={() => paginate(-1)} aria-label="Previous sign" className={`${arrowCls} order-2 md:order-none`}>
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            className="relative order-first w-full max-w-[720px] md:order-none md:flex-1"
            style={{ overflowX: 'clip', height: CARD + 8 }}
          >
            <AnimatePresence initial={false}>
              {([-2, -1, 0, 1, 2] as const).map(offset => {
                const idx    = wrap(currentIndex + offset, zodiacSigns.length);
                const sign   = zodiacSigns[idx];
                const isCenter = offset === 0;

                return (
                  <motion.div
                    key={sign.name}
                    animate={getSlotAnimate(offset)}
                    initial={{ x: dirRef.current > 0 ? 537 : -537, scale: 0.5, opacity: 0 }}
                    exit={{ x: dirRef.current > 0 ? -537 : 537, scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.60, ease: [0.25, 0.10, 0.25, 1.00] }}
                    onClick={!isCenter ? () => paginate(offset > 0 ? 1 : -1) : undefined}
                    className={`flex items-center justify-center rounded-2xl border ${
                      isCenter
                        ? 'border-home-rust/70 bg-home-card shadow-[0_12px_28px_rgba(208,95,47,0.22)]'
                        : 'border-home-line bg-home-card'
                    }`}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: CARD,
                      height: CARD,
                      marginLeft: -CARD / 2,
                      marginTop: -CARD / 2,
                      zIndex: isCenter ? 10 : Math.abs(offset) === 1 ? 5 : 1,
                      cursor: !isCenter ? 'pointer' : 'default',
                      // Off-screen cards: disable pointer events to avoid invisible click targets
                      pointerEvents: Math.abs(offset) >= 2 ? 'none' : 'auto',
                    }}
                  >
                    <img
                      src={zodiacImages[sign.name]}
                      alt={sign.name}
                      draggable={false}
                      style={{
                        width: '92%',
                        height: '92%',
                        objectFit: 'contain',
                        userSelect: 'none',
                        // Slate engraving → warm sepia ink so it reads on cream
                        filter: 'sepia(0.45) saturate(1.5) contrast(1.6) brightness(0.78)',
                      }}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <button onClick={() => paginate(1)} aria-label="Next sign" className={`${arrowCls} order-3 md:order-none`}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Text content — fades independently so it doesn't interfere with card physics */}
        <div className="relative mt-3 text-center" style={{ zIndex: 20 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={current.name + '-text'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.38, ease: 'easeInOut' }}
              aria-live="polite"
            >
              <h3
                className="hl-serif mb-1 font-semibold uppercase leading-tight tracking-[0.12em] text-home-ink"
                style={{ fontSize: 'clamp(28px, 3.2vw, 38px)' }}
              >
                {current.name}
              </h3>

              <p className="mb-3 font-home-sans text-base uppercase tracking-widest text-home-muted md:text-[16.5px]">
                {current.dates}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {current.traits.slice(0, 4).map((trait, i) => (
                  <span
                    key={i}
                    className="inline-flex h-11 items-center rounded-full border border-home-rust/40 bg-home-orange/20 px-4 font-home-sans text-sm text-home-ink"
                    style={{ letterSpacing: '0.08em' }}
                  >
                    {trait}
                  </span>
                ))}
                <button
                  onClick={() => navigate(`/zodiac/${current.name.toLowerCase()}`)}
                  className="inline-flex h-11 items-center gap-2 px-3 font-home-sans text-base font-semibold text-home-ink transition-opacity hover:opacity-70 motion-reduce:transition-none"
                  style={{ letterSpacing: '0.1em' }}
                >
                  Read Full Profile
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Dot indicators ── */}
        <div className="mt-3 flex justify-center gap-1" role="group" aria-label="Choose a zodiac sign">
          {zodiacSigns.map((_, i) => (
            <button
              key={i}
              onClick={() => goToIndex(i, currentIndex)}
              aria-label={zodiacSigns[i].name}
              aria-current={i === currentIndex ? 'true' : undefined}
              className="flex h-6 items-center px-[3px]"
            >
              <span
                className="block rounded-full transition-all duration-300 motion-reduce:transition-none"
                style={{
                  width: i === currentIndex ? 24 : 6,
                  height: 6,
                  background: i === currentIndex ? '#D05F2F' : 'rgba(18,18,18,0.2)',
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ZodiacWheelSection;
