import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import FullScreenLoader from "@/components/Loader/FullScreenLoader";
import { FEATURES } from "@/data/featureCatalog";
import { useFeatureTitle } from "@/hooks/useFeatureTitle";
import { motion, AnimatePresence } from 'framer-motion';
import { authedFetch, SignInRequiredError } from '@/lib/authedFetch';
import gsap from 'gsap';
import { RotateCcw, Sprout, Sparkles, EyeOff, Star, Zap, Flame } from 'lucide-react';
import TarotArt from '../components/tarot/TarotArt';
import { TarotCard, ALL_CARDS, MAJOR_ARCANA, shuffleDeck, getCategoryCardImage } from '../data/tarotData';
import { TarotLandingScene } from '../components/tarot/TarotLandingScene';
import { useBackOverride } from '../context/NavigationContext';
import { API_BASE_URL } from '@/lib/api';
import TarotEducation from '../components/tarot/TarotEducation';

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = 'landing' | 'opening' | 'shuffling' | 'mode' | 'question' | 'spread' | 'revealing' | 'reading';
type Mode = 'timeline' | 'karma';

interface AIReading {
  currentLifeStage?: string;
  mainOpportunity?: string;
  hiddenChallenge?: string;
  nextMajorTurningPoint?: string;
  recommendedAction?: string;
  spiritualGuidance?: string;
  timelineNarrative?: { position: string; card: string; insight: string }[];
  overallMessage?: string;
  currentKarmaTheme?: string;
  rootCause?: string;
  lifeAreasAffected?: string[];
  dailyAction?: string;
  weeklyAction?: string;
  spiritualPractice?: string;
  recommendedHabit?: string;
  reflectionQuestion?: string;
  positiveAffirmation?: string;
  cardInsights?: { position: string; card: string; insight: string }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TIMELINE_POSITIONS = ['Past Energy', 'Current Energy', 'Hidden Influence', 'Next 6 Months', 'Future Potential'];
const KARMA_POSITIONS = ['Current Karma', 'Hidden Blockage', 'Healing Path'];

// ─── Card Theme Helper ────────────────────────────────────────────────────────
interface CardTheme { bg: string; border: string; glow: string; accent: string; dim: string; }

const SUIT_THEMES: Record<string, CardTheme> = {
  Wands:     { bg: 'linear-gradient(165deg, #1c0a00 0%, #0e0500 55%, #1a0800 100%)', border: '#592209', glow: 'rgba(255,112,67,0.55)', accent: '#FF8A65', dim: 'rgba(255,112,67,0.3)' },
  Cups:      { bg: 'linear-gradient(165deg, #001520 0%, #000b14 55%, #001018 100%)', border: '#592209', glow: 'rgba(41,182,246,0.55)',  accent: '#4FC3F7', dim: 'rgba(41,182,246,0.3)'  },
  Swords:    { bg: 'linear-gradient(165deg, #0c0e20 0%, #060810 55%, #0a0c1e 100%)', border: '#90A4AE', glow: 'rgba(144,164,174,0.55)', accent: '#B0BEC5', dim: 'rgba(144,164,174,0.3)' },
  Pentacles: { bg: 'linear-gradient(165deg, #081008 0%, #040a05 55%, #061008 100%)', border: '#E58A45', glow: 'rgba(102,187,106,0.55)', accent: '#81C784', dim: 'rgba(102,187,106,0.3)'  },
};

const MAJOR_THEME: CardTheme = {
  bg: 'linear-gradient(165deg, #140b1a 0%, #0a0510 55%, #120818 100%)',
  border: '#C9873A', glow: 'rgba(229,138,69,0.5)', accent: '#E9B872', dim: 'rgba(245,233,214,0.75)',
};

const getCardTheme = (card: TarotCard): CardTheme => {
  if (card.arcana === 'major') return MAJOR_THEME;
  return SUIT_THEMES[card.suit || ''] ?? SUIT_THEMES.Swords;
};

// ─── Card Back SVG ────────────────────────────────────────────────────────────
const CardBackSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
    <defs>
      <radialGradient id="cb" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#1a1040" />
        <stop offset="100%" stopColor="#07050f" />
      </radialGradient>
    </defs>
    <rect width="100" height="160" rx="7" fill="url(#cb)" />
    <rect x="2.5" y="2.5" width="95" height="155" rx="5.5" fill="none" stroke="#592209" strokeWidth="1.4" opacity="0.9" />
    <rect x="5.5" y="5.5" width="89" height="149" rx="4" fill="none" stroke="#592209" strokeWidth="0.5" opacity="0.4" />
    <circle cx="50" cy="80" r="38" fill="none" stroke="#592209" strokeWidth="0.4" opacity="0.4" strokeDasharray="2 5" />
    <circle cx="50" cy="80" r="28" fill="none" stroke="#592209" strokeWidth="0.6" opacity="0.45" />
    <circle cx="50" cy="80" r="16" fill="none" stroke="#592209" strokeWidth="1" opacity="0.7" />
    <path d="M50,42 L53.5,66 L72,50 L57,70 L76,80 L57,90 L72,110 L53.5,94 L50,118 L46.5,94 L28,110 L43,90 L24,80 L43,70 L28,50 L46.5,66 Z" fill="none" stroke="#592209" strokeWidth="0.6" opacity="0.6" />
    <ellipse cx="50" cy="80" rx="9" ry="6" fill="none" stroke="#592209" strokeWidth="1" opacity="0.8" />
    <circle cx="50" cy="80" r="3" fill="#592209" opacity="0.6" />
    <circle cx="50" cy="80" r="1.3" fill="#592209" opacity="0.9" />
    {Array.from({ length: 12 }, (_, i) => {
      const a = (i * 30 - 90) * (Math.PI / 180);
      return <circle key={i} cx={50 + Math.cos(a) * 38} cy={80 + Math.sin(a) * 38} r="1.2" fill="#592209" opacity="0.7" />;
    })}
    {([[10, 11], [90, 11], [10, 149], [90, 149]] as [number, number][]).map(([x, y], i) => (
      <g key={i}>
        <circle cx={x} cy={y} r="5.5" fill="none" stroke="#592209" strokeWidth="0.7" opacity="0.55" />
        <circle cx={x} cy={y} r="2.5" fill="#592209" opacity="0.35" />
      </g>
    ))}
    <line x1="50" y1="16" x2="50" y2="26" stroke="#592209" strokeWidth="0.6" opacity="0.5" />
    <line x1="50" y1="134" x2="50" y2="144" stroke="#592209" strokeWidth="0.6" opacity="0.5" />
    <line x1="16" y1="80" x2="26" y2="80" stroke="#592209" strokeWidth="0.6" opacity="0.5" />
    <line x1="74" y1="80" x2="84" y2="80" stroke="#592209" strokeWidth="0.6" opacity="0.5" />
  </svg>
);

/** Real card-back artwork, falling back to the drawn SVG if the asset isn't present yet */
const CARD_BACK_SRC = '/images/tarot/cards/tarot-card-back.png';
const CardBackImage: React.FC = () => {
  const [failed, setFailed] = useState(false);
  if (failed) return <CardBackSVG />;
  return (
    <img
      src={CARD_BACK_SRC}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
};

// ─── Card Face component ──────────────────────────────────────────────────────
const CardFace = ({ card, size = 'md', category }: { card: TarotCard; size?: 'sm' | 'md' | 'lg'; category?: string }) => {
  const theme = getCardTheme(card);
  const isMajor = card.arcana === 'major';
  const [imgFailed, setImgFailed] = useState(false);
  const imgSrc = !imgFailed ? getCategoryCardImage(category, card) : null;

  const cfg = {
    sm: { symbol: 28, name: 8,  sub: 7,  kw: 6.5, pad: '5px 4px', numSize: 8  },
    md: { symbol: 40, name: 11, sub: 9,  kw: 8,   pad: '8px 6px', numSize: 10 },
    lg: { symbol: 52, name: 16, sub: 11, kw: 10,  pad: '10px 8px', numSize: 14 },
  }[size];

  const topLabel = isMajor ? card.number : (card.suit || '');

  if (imgSrc) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '7px', overflow: 'hidden', border: `1.5px solid ${theme.border}`, background: theme.bg }}>
        <img
          src={imgSrc}
          alt={card.name}
          onError={() => setImgFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
        />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: size === 'sm' ? '4px 0' : '6px 0', textAlign: 'center', background: 'linear-gradient(to bottom, #FBF5EC, transparent)' }}>
          <span style={{ fontSize: `${cfg.numSize}px`, color: '#301607', letterSpacing: '2px', fontFamily: "'DM Sans', system-ui, sans-serif", textTransform: 'uppercase', fontWeight: 600 }}>{topLabel}</span>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: size === 'sm' ? '4px 3px 5px' : '8px 6px 10px', textAlign: 'center', background: 'linear-gradient(to top, #FBF5EC 0%, transparent 100%)' }}>
          <span style={{ fontSize: `${cfg.name}px`, color: '#301607', fontFamily: "'DM Sans', system-ui, sans-serif", textTransform: 'uppercase', letterSpacing: '1px', lineHeight: 1.2 }}>{card.name}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tarot-face" style={{
      position: 'relative', width: '100%', height: '100%',
      background: theme.bg, borderRadius: '7px', border: `1.5px solid ${theme.border}`,
      boxSizing: 'border-box', overflow: 'hidden',
    }}>
      <TarotArt card={card} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: size === 'sm' ? '4px 0 10px' : '7px 0 14px', textAlign: 'center', background: 'linear-gradient(to bottom, rgba(18,6,2,0.85), transparent)', zIndex: 1 }}>
        <span style={{ fontSize: `${cfg.numSize}px`, color: '#F5E9D6', letterSpacing: '2px', fontFamily: "'DM Sans', system-ui, sans-serif", textTransform: 'uppercase', fontWeight: 600 }}>{topLabel}</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: cfg.pad, paddingTop: size === 'sm' ? 12 : 22, textAlign: 'center', background: 'linear-gradient(to top, rgba(18,6,2,0.94) 40%, transparent)', zIndex: 1 }}>
        <div style={{ fontSize: `${cfg.name}px`, color: '#F5E9D6', fontFamily: "'DM Sans', system-ui, sans-serif", textTransform: 'uppercase', letterSpacing: '1px', lineHeight: 1.2, fontWeight: 600 }}>{card.name}</div>
        {size !== 'sm' && (
          <div style={{ fontSize: `${cfg.kw}px`, color: '#E9B872', marginTop: 3, lineHeight: 1.3 }}>
            {card.keywords.slice(0, 2).join(' · ')}
          </div>
        )}
      </div>
      {isMajor && <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '2px', background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`, opacity: 0.8, zIndex: 2 }} />}
    </div>
  );
};

// ─── Floating Particles ───────────────────────────────────────────────────────
const Particles = ({ count = 40 }: { count?: number }) => {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i, left: Math.random() * 100, top: Math.random() * 100,
      size: Math.random() * 3 + 1, delay: Math.random() * 5,
      duration: 5 + Math.random() * 8, type: i % 3,
    })), [count]);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.left}%`, top: `${p.top}%`,
          width: `${p.size}px`, height: `${p.size}px`, borderRadius: '50%',
          background: p.type === 0 ? '#592209' : p.type === 1 ? 'rgba(255,248,220,0.9)' : 'rgba(89,34,9,0.08)',
          animation: `floatParticle ${p.duration}s ${p.delay}s ease-in-out infinite`,
          boxShadow: `0 0 ${p.size * 2}px rgba(89,34,9,0.7)`,
        }} />
      ))}
    </div>
  );
};

// ─── Opening Scene (legacy, kept) ────────────────────────────────────────────
const OpeningScene = ({ onBegin }: { onBegin: () => void }) => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
    <Particles count={50} />
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4 }}
      style={{ textAlign: 'center', zIndex: 10, padding: '0 24px', maxWidth: '700px' }}>
      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 1 }}
        style={{ fontSize: 'clamp(42px, 8vw, 80px)', fontFamily: "'DM Sans', system-ui, sans-serif", textTransform: 'uppercase', letterSpacing: '8px', lineHeight: 1.1, marginBottom: '16px', background: 'linear-gradient(135deg, #592209 0%, #FBF5EC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        Welcome<br />Seeker
      </motion.h1>
      <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.4, type: 'spring' }}
        onClick={onBegin}
        style={{ padding: '18px 52px', fontSize: '16px', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '4px', textTransform: 'uppercase', color: '#F5E9D6', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg, #592209 0%, #B5561A 50%, #592209 100%)', borderRadius: '4px', boxShadow: '0 0 30px rgba(89,34,9,0.5)' }}>
        Begin Journey
      </motion.button>
    </motion.div>
  </div>
);

// ─── Shuffle Scene (legacy, kept) ────────────────────────────────────────────
const ShuffleScene = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);
  const cardData = useMemo(() => Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * Math.PI * 2;
    return { explodeX: Math.cos(angle) * 180, explodeY: Math.sin(angle) * 100, orbitX: Math.cos(angle) * 160, orbitY: Math.sin(angle) * 85, shuffleX: (Math.random() - 0.5) * 500, shuffleY: (Math.random() - 0.5) * 200, explodeRot: Math.random() * 720 - 360, orbitRot: (i / 20) * 360, shuffleRot: Math.random() * 360 - 180 };
  }), []);
  useEffect(() => {
    const ts = [setTimeout(() => setStep(1), 400), setTimeout(() => setStep(2), 2200), setTimeout(() => setStep(3), 4200), setTimeout(() => setStep(4), 5800), setTimeout(onComplete, 7200)];
    return () => ts.forEach(clearTimeout);
  }, [onComplete]);
  const getAnimate = (card: typeof cardData[0]) => {
    if (step === 0) return { x: 0, y: 0, rotate: 0, scale: 0 };
    if (step === 1) return { x: card.explodeX, y: card.explodeY, rotate: card.explodeRot, scale: 0.7 };
    if (step === 2) return { x: card.orbitX, y: card.orbitY, rotate: card.orbitRot, scale: 0.75 };
    if (step === 3) return { x: card.shuffleX, y: card.shuffleY, rotate: card.shuffleRot, scale: 0.8 };
    return { x: (Math.random() - 0.5) * 800, y: (Math.random() - 0.5) * 400, rotate: Math.random() * 360, scale: 0 };
  };
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <Particles count={30} />
      <div style={{ position: 'relative', width: 1, height: 1 }}>
        {cardData.map((card, i) => (
          <motion.div key={i} animate={getAnimate(card)} transition={{ duration: step === 3 ? 0.4 : 1.2, delay: i * 0.04 }}
            style={{ position: 'absolute', width: 60, height: 92, left: -30, top: -46, borderRadius: '5px', overflow: 'hidden' }}>
            <CardBackSVG />
          </motion.div>
        ))}
      </div>
      <button onClick={onComplete} style={{ position: 'absolute', bottom: '30px', background: 'transparent', border: '1px solid rgba(89,34,9,0.3)', color: '#592209', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '3px', fontSize: '11px', padding: '8px 20px', cursor: 'pointer', textTransform: 'uppercase', borderRadius: '2px' }}>Skip</button>
    </div>
  );
};

// ─── Question Select Scene ────────────────────────────────────────────────────
const QuestionSelectScene = ({ onSelect }: { onSelect: (q: string) => void }) => {
  const [hov, setHov] = useState<string|null>(null);
  const canRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const stars = Array.from({length:220}, () => ({
      x:Math.random()*window.innerWidth, y:Math.random()*window.innerHeight,
      r:Math.random()*1.2+0.2, a:Math.random()*0.65+0.1, s:Math.random()*0.006+0.002, p:Math.random()*Math.PI*2
    }));
    let f=0, rid:number;
    const draw = () => {
      ctx.clearRect(0,0,c.width,c.height); f++;
      stars.forEach(s => {
        const tw = Math.sin(s.p+f*s.s)*0.3+0.7;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,235,180,${s.a*tw})`; ctx.fill();
      });
      rid = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(rid); window.removeEventListener('resize',resize); };
  }, []);

  const meta: Record<string,{icon:string;bg:string;color:string}> = {
    'Career':      {icon:'📈',bg:'#120a00',color:'#592209'},
    'Love':        {icon:'❤️',bg:'#1a0015',color:'#592209'},
    'Marriage':    {icon:'💍',bg:'#150a00',color:'#301607'},
    'Business':    {icon:'🚀',bg:'#001520',color:'#6B4A37'},
    'Finance':     {icon:'🪙',bg:'#120e00',color:'#6B4A37'},
    'Health':      {icon:'🧘',bg:'#001208',color:'#301607'},
    'Life Purpose':{icon:'✦', bg:'#0d0020',color:'#592209'},
  };

  const cardArt: Record<string,string> = {
    'Career':       '/images/tarot-categories/careers.png',
    'Love':         '/images/tarot-categories/loves.png',
    'Marriage':     '/images/tarot-categories/marriage.png',
    'Business':     '/images/tarot-categories/business.png',
    'Finance':      '/images/tarot-categories/finance.png',
    'Health':       '/images/tarot-categories/health.png',
    'Life Purpose': '/images/tarot-categories/lifepurpose.png',
  };

  const scenes: Record<string, React.ReactNode> = {
    'Career': (
      <svg viewBox="0 0 210 155" preserveAspectRatio="xMidYMid slice" style={{width:'100%',height:'100%',display:'block'}}>
        <defs>
          <linearGradient id="qsCrBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#030818"/><stop offset="70%" stopColor="#0c1840"/><stop offset="100%" stopColor="#1a2860"/></linearGradient>
          <radialGradient id="qsCrGl" cx="50%" cy="68%" r="40%"><stop offset="0%" stopColor="#592209" stopOpacity="0.75"/><stop offset="100%" stopColor="#FF8C00" stopOpacity="0"/></radialGradient>
        </defs>
        <rect width="210" height="155" fill="url(#qsCrBg)"/>
        <ellipse cx="105" cy="105" rx="90" ry="38" fill="url(#qsCrGl)"/>
        {[[8,95,14,25],[24,87,11,33],[37,76,16,44],[55,67,18,53],[75,57,20,63],[97,50,22,70],[121,60,18,60],[141,70,15,50],[158,78,16,42],[176,86,13,34],[191,91,11,29]].map(([x,y,w,h],i)=>(
          <rect key={i} x={x} y={y} width={w} height={h} fill={i>=4&&i<=6?'#060b20':'#08102e'}/>
        ))}
        {[[79,60],[84,68],[98,53],[103,61],[110,54],[101,70]].map(([x,y],i)=>(
          <rect key={i} x={x} y={y} width="2.5" height="3.5" fill="rgba(89,34,9,0.75)"/>
        ))}
        <polygon points="96,155 114,155 112,128 98,128" fill="rgba(255,180,0,0.2)"/>
        <polygon points="99,128 111,128 109,108 101,108" fill="rgba(255,180,0,0.28)"/>
        <polygon points="101,108 109,108 108,93 102,93" fill="rgba(255,180,0,0.35)"/>
        <circle cx="105" cy="84" r="3.5" fill="#111"/>
        <rect x="102.5" y="87.5" width="5" height="9" fill="#111" rx="1"/>
        <line x1="105" y1="92" x2="101" y2="99" stroke="#111" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="105" y1="92" x2="109" y2="99" stroke="#111" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="103" y1="88" x2="99" y2="94" stroke="#111" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="107" y1="88" x2="111" y2="94" stroke="#111" strokeWidth="1.8" strokeLinecap="round"/>
        {[[22,18],[55,10],[145,14],[175,20],[30,38],[160,34]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r="0.8" fill="white" opacity="0.55"/>
        ))}
      </svg>
    ),
    'Love': (
      <svg viewBox="0 0 210 155" preserveAspectRatio="xMidYMid slice" style={{width:'100%',height:'100%',display:'block'}}>
        <defs>
          <radialGradient id="qsLvBg" cx="50%" cy="35%" r="65%"><stop offset="0%" stopColor="#3d0a50"/><stop offset="100%" stopColor="#090318"/></radialGradient>
          <radialGradient id="qsLvMn" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#FF69B4" stopOpacity="0.75"/><stop offset="55%" stopColor="#9B59B6" stopOpacity="0.4"/><stop offset="100%" stopColor="#3d0a50" stopOpacity="0"/></radialGradient>
        </defs>
        <rect width="210" height="155" fill="url(#qsLvBg)"/>
        <circle cx="105" cy="62" r="48" fill="url(#qsLvMn)"/>
        <circle cx="105" cy="62" r="34" fill="#B060D8" opacity="0.45"/>
        <circle cx="105" cy="62" r="22" fill="#D080FF" opacity="0.45"/>
        <circle cx="118" cy="56" r="30" fill="#09031a" opacity="0.72"/>
        <rect x="0" y="126" width="210" height="29" fill="#060212"/>
        <ellipse cx="105" cy="126" rx="88" ry="7" fill="#3d0a50" opacity="0.35"/>
        <rect x="16" y="90" width="5" height="38" fill="#180a2e"/>
        {[[-9,78],[0,70],[9,78],[-5,85],[5,85]].map(([dx,dy],i)=>(<ellipse key={i} cx={18+dx} cy={dy} rx="11" ry="9" fill="#FF69B4" opacity="0.5"/>))}
        <rect x="189" y="90" width="5" height="38" fill="#180a2e"/>
        {[[9,78],[0,70],[-9,78],[5,85],[-5,85]].map(([dx,dy],i)=>(<ellipse key={i} cx={191+dx} cy={dy} rx="11" ry="9" fill="#FF69B4" opacity="0.5"/>))}
        <circle cx="91" cy="116" r="5.5" fill="#0a0420"/><ellipse cx="91" cy="128" rx="5.5" ry="8" fill="#0a0420"/>
        <circle cx="119" cy="116" r="5.5" fill="#0a0420"/><ellipse cx="119" cy="128" rx="5.5" ry="8" fill="#0a0420"/>
        {[[32,18],[60,10],[152,12],[178,20],[42,32]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r="0.9" fill="white" opacity="0.7"/>))}
        {[[62,50],[148,46],[68,92],[140,88]].map(([x,y],i)=>(<ellipse key={i} cx={x} cy={y} rx="2" ry="1.3" fill="#FF69B4" opacity="0.5" transform={`rotate(${i*35},${x},${y})`}/>))}
      </svg>
    ),
    'Marriage': (
      <svg viewBox="0 0 210 155" preserveAspectRatio="xMidYMid slice" style={{width:'100%',height:'100%',display:'block'}}>
        <defs>
          <radialGradient id="qsMrBg" cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor="#1c1035"/><stop offset="100%" stopColor="#06040e"/></radialGradient>
          <radialGradient id="qsMrGl" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#592209" stopOpacity="0.5"/><stop offset="100%" stopColor="#FF8C00" stopOpacity="0"/></radialGradient>
        </defs>
        <rect width="210" height="155" fill="url(#qsMrBg)"/>
        <ellipse cx="105" cy="88" rx="65" ry="58" fill="url(#qsMrGl)"/>
        <rect x="18" y="35" width="14" height="108" fill="#100820" stroke="rgba(201,139,42,0.35)" strokeWidth="0.8"/>
        <rect x="16" y="33" width="18" height="6" fill="#1c1040" stroke="rgba(201,139,42,0.45)" strokeWidth="0.6"/>
        <rect x="16" y="137" width="18" height="6" fill="#1c1040" stroke="rgba(201,139,42,0.35)" strokeWidth="0.6"/>
        <rect x="178" y="35" width="14" height="108" fill="#100820" stroke="rgba(201,139,42,0.35)" strokeWidth="0.8"/>
        <rect x="176" y="33" width="18" height="6" fill="#1c1040" stroke="rgba(201,139,42,0.45)" strokeWidth="0.6"/>
        <rect x="176" y="137" width="18" height="6" fill="#1c1040" stroke="rgba(201,139,42,0.35)" strokeWidth="0.6"/>
        <path d="M32,38 Q105,16 178,38" stroke="rgba(201,139,42,0.45)" strokeWidth="1.8" fill="none"/>
        <circle cx="88" cy="88" r="28" fill="none" stroke="#592209" strokeWidth="7" opacity="0.92"/>
        <circle cx="88" cy="88" r="28" fill="none" stroke="#FFF8DC" strokeWidth="2.5" opacity="0.35"/>
        <circle cx="122" cy="88" r="23" fill="none" stroke="#C98B2A" strokeWidth="7" opacity="0.92"/>
        <circle cx="122" cy="88" r="23" fill="none" stroke="#FFD97A" strokeWidth="2.5" opacity="0.35"/>
        <ellipse cx="80" cy="79" rx="7" ry="3" fill="rgba(255,255,200,0.28)" transform="rotate(-30,80,79)"/>
        <ellipse cx="116" cy="82" rx="6" ry="2.5" fill="rgba(255,255,200,0.22)" transform="rotate(-25,116,82)"/>
        {[[55,52],[158,58],[105,42],[68,132],[142,130],[48,98],[162,104],[105,148]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r={i%2===0?1.3:0.9} fill="rgba(89,34,9,0.55)"/>))}
      </svg>
    ),
    'Business': (
      <svg viewBox="0 0 210 155" preserveAspectRatio="xMidYMid slice" style={{width:'100%',height:'100%',display:'block'}}>
        <defs>
          <linearGradient id="qsBsBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#01060e"/><stop offset="100%" stopColor="#040f1e"/></linearGradient>
          <radialGradient id="qsBsEx" cx="50%" cy="85%" r="40%"><stop offset="0%" stopColor="#FF6600" stopOpacity="0.85"/><stop offset="100%" stopColor="#FF2200" stopOpacity="0"/></radialGradient>
        </defs>
        <rect width="210" height="155" fill="url(#qsBsBg)"/>
        {[[22,18],[62,10],[132,8],[172,14],[42,34],[158,30],[82,22],[108,5]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r="0.9" fill="white" opacity="0.65"/>))}
        <ellipse cx="28"  cy="146" rx="38" ry="14" fill="rgba(200,210,220,0.17)"/>
        <ellipse cx="65"  cy="140" rx="48" ry="18" fill="rgba(200,210,220,0.21)"/>
        <ellipse cx="105" cy="136" rx="55" ry="21" fill="rgba(200,210,220,0.24)"/>
        <ellipse cx="148" cy="140" rx="48" ry="18" fill="rgba(200,210,220,0.21)"/>
        <ellipse cx="182" cy="146" rx="38" ry="14" fill="rgba(200,210,220,0.17)"/>
        <ellipse cx="105" cy="138" rx="20" ry="30" fill="url(#qsBsEx)"/>
        <polygon points="93,126 105,155 117,126" fill="#FF4500" opacity="0.92"/>
        <polygon points="97,126 105,148 113,126" fill="#FF8C00" opacity="0.88"/>
        <polygon points="100,126 105,140 110,126" fill="#592209" opacity="0.85"/>
        <rect x="92" y="62" width="26" height="64" fill="#C0C8D8" rx="4"/>
        <polygon points="92,62 105,26 118,62" fill="#D0D8E8"/>
        <circle cx="105" cy="76" r="7.5" fill="#0a1a38" stroke="rgba(80,150,220,0.65)" strokeWidth="1.5"/>
        <circle cx="105" cy="76" r="5" fill="#06102a"/>
        <circle cx="102" cy="74" r="1.4" fill="rgba(89,34,9,0.1)"/>
        <rect x="92" y="92" width="26" height="3.5" fill="rgba(0,180,255,0.45)" rx="1"/>
        <polygon points="92,108 78,130 92,124" fill="#A0A8B8"/>
        <polygon points="118,108 132,130 118,124" fill="#A0A8B8"/>
      </svg>
    ),
    'Finance': (
      <svg viewBox="0 0 210 155" preserveAspectRatio="xMidYMid slice" style={{width:'100%',height:'100%',display:'block'}}>
        <defs>
          <radialGradient id="qsFnBg" cx="50%" cy="80%" r="70%"><stop offset="0%" stopColor="#1c1200"/><stop offset="100%" stopColor="#060408"/></radialGradient>
          <radialGradient id="qsFnGl" cx="50%" cy="40%" r="55%"><stop offset="0%" stopColor="#592209" stopOpacity="0.65"/><stop offset="100%" stopColor="#CC8800" stopOpacity="0"/></radialGradient>
        </defs>
        <rect width="210" height="155" fill="url(#qsFnBg)"/>
        <rect x="0" y="128" width="210" height="27" fill="#0c0800"/>
        <ellipse cx="105" cy="78" rx="62" ry="72" fill="url(#qsFnGl)"/>
        <rect x="97" y="98" width="16" height="42" fill="#1a0e00" rx="3"/>
        {[[105,108,62,82],[105,102,145,74],[105,98,82,62],[105,97,128,58],[105,92,105,52],[62,82,46,65],[62,82,70,58],[145,74,158,56],[145,74,132,54]].map(([x1,y1,x2,y2],i)=>(
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1a0e00" strokeWidth={5-i*0.4} strokeLinecap="round"/>
        ))}
        {[[46,60,20],[70,54,18],[105,46,20],[132,50,18],[158,52,20],[62,76,16],[90,56,17],[120,54,17],[148,68,16],[78,44,14],[108,38,16],[126,44,14]].map(([x,y,r],i)=>(
          <circle key={i} cx={x} cy={y} r={r} fill={i%2===0?'#CC8800':'#592209'} opacity={i%2===0?0.72:0.5}/>
        ))}
        {[[72,2],[85,2],[100,3],[115,2],[128,2]].map(([x,h],i)=>(
          <g key={i}>
            <ellipse cx={x} cy={138} rx="6.5" ry="2.5" fill="#CC8800"/>
            <rect x={x-6.5} y={138-h*3} width="13" height={h*3} fill="#BB7700"/>
            <ellipse cx={x} cy={138-h*3} rx="6.5" ry="2.5" fill="#592209"/>
          </g>
        ))}
      </svg>
    ),
    'Health': (
      <svg viewBox="0 0 210 155" preserveAspectRatio="xMidYMid slice" style={{width:'100%',height:'100%',display:'block'}}>
        <defs>
          <radialGradient id="qsHlBg" cx="50%" cy="80%" r="70%"><stop offset="0%" stopColor="#021a0a"/><stop offset="100%" stopColor="#020806"/></radialGradient>
          <radialGradient id="qsHlGl" cx="50%" cy="60%" r="42%"><stop offset="0%" stopColor="#00FF88" stopOpacity="0.52"/><stop offset="100%" stopColor="#00CC44" stopOpacity="0"/></radialGradient>
        </defs>
        <rect width="210" height="155" fill="url(#qsHlBg)"/>
        {[[0,1],[24,0],[48,1],[158,0],[174,1],[192,0]].map(([x,o],i)=>(
          <g key={i}>
            <rect x={x+7} y={62+o*12} width="9" height={90} fill="#010e03" rx="2"/>
            <ellipse cx={x+11} cy={58+o*12} rx="20" ry="30" fill="#011503" opacity="0.92"/>
          </g>
        ))}
        <rect x="0" y="138" width="210" height="17" fill="#010802"/>
        <circle cx="105" cy="104" r="58" fill="url(#qsHlGl)"/>
        {[48,38,28,20,14].map((r,i)=>(<circle key={i} cx="105" cy="104" r={r} fill="none" stroke={`rgba(0,255,${100+i*22},${0.14+i*0.05})`} strokeWidth="0.9"/>))}
        <circle cx="105" cy="82" r="7.5" fill="#0a1a08" stroke="rgba(0,255,100,0.3)" strokeWidth="0.5"/>
        <ellipse cx="105" cy="98" rx="9.5" ry="13" fill="#0a1a08" stroke="rgba(0,255,100,0.18)" strokeWidth="0.5"/>
        <path d="M95.5,93 Q83,104 80,112" stroke="#0a1a08" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
        <path d="M114.5,93 Q127,104 130,112" stroke="#0a1a08" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
        <ellipse cx="88"  cy="122" rx="11" ry="6" fill="#0a1a08"/>
        <ellipse cx="122" cy="122" rx="11" ry="6" fill="#0a1a08"/>
        {[82,90,98,106].map((y,i)=>(<circle key={i} cx="105" cy={y} r="2.2" fill={`rgba(0,255,${80+i*45},0.72)`}/>))}
      </svg>
    ),
    'Life Purpose': (
      <svg viewBox="0 0 210 155" preserveAspectRatio="xMidYMid slice" style={{width:'100%',height:'100%',display:'block'}}>
        <defs>
          <radialGradient id="qsLpBg" cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor="#1a0a38"/><stop offset="100%" stopColor="#040312"/></radialGradient>
          <radialGradient id="qsLpGl" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#9B59D0" stopOpacity="0.82"/><stop offset="55%" stopColor="#5B2D90" stopOpacity="0.38"/><stop offset="100%" stopColor="#1a0a38" stopOpacity="0"/></radialGradient>
        </defs>
        <rect width="210" height="155" fill="url(#qsLpBg)"/>
        {[[15,20],[45,10],[82,8],[132,12],[168,18],[182,30],[25,45],[195,50],[10,62]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r="0.9" fill="white" opacity="0.65"/>))}
        <circle cx="105" cy="74" r="58" fill="url(#qsLpGl)"/>
        {[52,43,35,27,20].map((r,i)=>(<circle key={i} cx="105" cy="74" r={r} fill="none" stroke={`rgba(${185-i*8},${108+i*14},255,${0.22+i*0.08})`} strokeWidth={i===0?1.6:0.8}/>))}
        <circle cx="105" cy="74" r="14" fill="rgba(200,150,255,0.38)"/>
        <circle cx="105" cy="74" r="8"  fill="rgba(220,180,255,0.48)"/>
        <circle cx="105" cy="74" r="4"  fill="rgba(255,230,255,0.62)"/>
        <path d="M50,130 L50,74 Q50,26 105,26 Q160,26 160,74 L160,130" stroke="rgba(180,100,255,0.62)" strokeWidth="2.2" fill="none"/>
        <rect x="0" y="133" width="210" height="22" fill="#030210"/>
        <circle cx="105" cy="120" r="4.5" fill="#08051a"/>
        <rect x="102" y="124" width="6" height="10" fill="#08051a" rx="1"/>
      </svg>
    ),
  };

  const allIds = ['Career','Love','Marriage','Business','Finance','Health','Life Purpose'];

  return (
    <div style={{
      minHeight:'100vh', position:'relative', overflow:'hidden',
      background:'#F5E9D6',
      display:'flex', flexDirection:'column', alignItems:'center',
      paddingTop:70, paddingBottom:50,
    }}>
      <canvas ref={canRef} style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0}}/>

      {/* soft nebula glow — kept minimal, no bright purple blobs */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:0,
        background:'radial-gradient(ellipse 50% 32% at 50% 0%, rgba(229,138,69,0.05) 0%, transparent 70%),'
                  +'radial-gradient(ellipse 45% 30% at 15% 90%, rgba(120,60,20,0.05) 0%, transparent 70%),'
                  +'radial-gradient(ellipse 45% 30% at 85% 90%, rgba(80,40,110,0.045) 0%, transparent 70%)'}}/>

      <svg style={{position:'absolute',bottom:0,left:0,width:'100%',height:'32%',pointerEvents:'none',zIndex:1}} preserveAspectRatio="none">
        <defs><linearGradient id="qsMtW" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0a0530" stopOpacity="0.5"/><stop offset="100%" stopColor="#030818" stopOpacity="0.95"/></linearGradient></defs>
        <rect x="0" y="68%" width="100%" height="32%" fill="url(#qsMtW)"/>
      </svg>

      <div style={{position:'relative',zIndex:10,width:'100%',maxWidth:1300,padding:'0 20px'}}>
        <div style={{textAlign:'center',marginBottom:50}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',flexWrap:'wrap',gap:'10px 16px',marginBottom:20,padding:'0 12px'}}>
            <div style={{width:'clamp(24px,6vw,52px)',height:1,background:'linear-gradient(to right,transparent,#FBF5EC)'}}/>
            <p style={{fontFamily:"'DM Sans', system-ui, sans-serif",fontWeight:600,fontSize:12,letterSpacing:'clamp(0.14em,1.4vw,0.5em)',color:'#592209',textTransform:'uppercase',margin:0,whiteSpace:'nowrap'}}>
              ✦&nbsp; {FEATURES.tarot.name} &nbsp;✦
            </p>
            <div style={{width:'clamp(24px,6vw,52px)',height:1,background:'linear-gradient(to left,transparent,#FBF5EC)'}}/>
          </div>

          <h1 style={{fontFamily:"'DM Sans', system-ui, sans-serif",fontWeight:700,margin:'0 auto',lineHeight:1.3,textAlign:'center',maxWidth:840}}>
            <span style={{display:'block',fontSize:36,color:'#301607',letterSpacing:0}}>What Calls To</span>
            <span style={{display:'block',fontSize:36,color:'#592209',letterSpacing:0}}>Your Soul</span>
          </h1>
          <p style={{fontFamily:"'DM Sans', system-ui, sans-serif",fontSize:17,color:'rgba(48,22,7,0.78)',margin:'16px auto 0',maxWidth:640,lineHeight:1.6}}>{FEATURES.tarot.subtitle}</p>

          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:14,marginTop:25}}>
            <div style={{width:48,height:1,background:'linear-gradient(to right,transparent,rgba(89,34,9,0.5))'}}/>
            <p style={{fontFamily:"'DM Sans', system-ui, sans-serif",fontSize:19,color:'rgba(48,22,7,0.72)',letterSpacing:'0.04em',margin:0}}>Choose the area of life you wish to illuminate</p>
            <div style={{width:48,height:1,background:'linear-gradient(to left,transparent,rgba(89,34,9,0.5))'}}/>
          </div>
        </div>

        {(() => {
          const renderCard = (id: string, idx: number) => {
            const m = meta[id];
            const isHov = hov === id;
            return (
              <motion.div key={id}
                onMouseEnter={() => setHov(id)}
                onMouseLeave={() => setHov(null)}
                onClick={() => onSelect(id)}
                animate={{ y: isHov ? -8 : 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{width:232,flexShrink:0,position:'relative',cursor:'pointer'}}>
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: (idx % 4) * 0.25 }}
                  style={{
                    position:'absolute',top:-23,left:'50%',x:'-50%',zIndex:4,
                    width:46,height:46,borderRadius:'50%',
                    background:m.bg,
                    border:`1.5px solid ${isHov ? m.color : '#592209'}`,
                    boxShadow:isHov?`0 0 22px ${m.color}66,0 0 8px ${m.color}33`:`0 0 10px rgba(201,139,42,0.18)`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:19,transition:'border-color 0.3s,box-shadow 0.3s',
                  }}>
                  {m.icon==='✦'
                    ? <span style={{color:'#592209',fontSize:17}}>✦</span>
                    : <span>{m.icon}</span>}
                </motion.div>
                <div style={{
                  borderRadius:16,overflow:'hidden',
                  border:`1px solid ${isHov ? m.color+'bb' : 'rgba(201,139,42,0.3)'}`,
                  boxShadow: isHov
                    ? `0 0 34px ${m.color}40,0 14px 34px rgba(0,0,0,0.6)`
                    : '0 0 12px rgba(201,139,42,0.10),0 6px 20px rgba(0,0,0,0.45)',
                  transition:'box-shadow 0.35s,border-color 0.35s',
                  paddingTop:26,
                  background:'#FBF5EC',
                }}>
                  <div style={{height:200,overflow:'hidden',position:'relative'}}>
                    {cardArt[id]
                      ? <img src={cardArt[id]} alt={id} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center',display:'block'}}/>
                      : scenes[id]}
                    <div style={{position:'absolute',left:0,right:0,bottom:0,height:40,
                      background:'linear-gradient(to bottom, transparent, #FBF5EC)',pointerEvents:'none'}}/>
                  </div>
                  <div style={{padding:'16px 12px 20px',textAlign:'center',background:'#FBF5EC',minHeight:64,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <span style={{
                      fontFamily:"'Cinzel',serif",fontSize:24,fontWeight:700,letterSpacing:'0.02em',
                      textTransform:'uppercase',transition:'color 0.3s',lineHeight:1.15,
                      color: isHov ? m.color : '#301607',
                    }}>{id}</span>
                  </div>
                </div>
              </motion.div>
            );
          };

          const topRow = allIds.slice(0, 4);
          const bottomRow = allIds.slice(4);

          return (
            <>
              <div className="qs-tarot-row" style={{marginBottom:32}}>
                {topRow.map((id, idx) => renderCard(id, idx))}
              </div>
              <div className="qs-tarot-row">
                {bottomRow.map((id, idx) => renderCard(id, idx + 4))}
              </div>
            </>
          );
        })()}

        <style>{`
          .qs-tarot-row {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 32px;
          }
          @media (max-width: 560px) {
            .qs-tarot-row { gap: 24px; }
            .qs-tarot-row > div { width: 100% !important; max-width: 232px; }
          }
        `}</style>

        <div style={{textAlign:'center',marginTop:50}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:14,opacity:0.62}}>
            <div style={{width:55,height:1,background:'linear-gradient(to right,transparent,rgba(89,34,9,0.55))'}}/>
            <span style={{fontFamily:"'DM Sans', system-ui, sans-serif",fontSize:14,color:'rgba(89,34,9,0.78)',letterSpacing:'0.2em',whiteSpace:'nowrap'}}>Your answers are within...</span>
            <div style={{width:55,height:1,background:'linear-gradient(to left,transparent,rgba(89,34,9,0.55))'}}/>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Card Spread Scene ────────────────────────────────────────────────────────
type UIPhase = 'animating' | 'idle';
type ButtonLabel = 'Shuffle Cards' | 'Shuffling…' | 'The Cards Are Ready';
type ShuffleStyle =
  | 'Casino Riffle Shuffle' | 'Hindu Shuffle' | 'Overhand Shuffle' | 'Bridge Shuffle'
  | 'Waterfall Shuffle' | 'Spiral Shuffle' | 'Arc Toss' | 'Circular Orbit'
  | 'Double Split Shuffle' | 'Flying Cards' | 'Magic Levitation' | 'Cosmic Shuffle';

const COMMON_STYLES: Exclude<ShuffleStyle, 'Cosmic Shuffle'>[] = [
  'Casino Riffle Shuffle', 'Hindu Shuffle', 'Overhand Shuffle', 'Bridge Shuffle',
  'Waterfall Shuffle', 'Spiral Shuffle', 'Arc Toss', 'Circular Orbit',
  'Double Split Shuffle', 'Flying Cards', 'Magic Levitation',
];
const COSMIC_PROBABILITY = 0.05;

const FAN_W = 200;
const FAN_H = 302;
const FAN_COUNT = 20;
const FAN_CONTAINER_H = 460;
const X_STEP = 54;      // ~27% of card width stays visible per step (70-75% overlap)
const BASE_GAP = 16;    // half-gap between the two center cards — "almost touching"
const RISE_STEP = 11;   // px, linear staircase rise per step outward
const ANGLE_STEP = 2;   // deg, linear rotation step outward (center-left = -2°, next -4°, ...)

/** Pure function — the resting "staircase" transform for card index i. y is up-negative. */
const getRestTransform = (i: number, total: number) => {
  const half = i < total / 2 ? -1 : 1;
  const step = i < total / 2 ? (total / 2 - 1 - i) : (i - total / 2);
  return {
    x: half * (BASE_GAP + step * X_STEP),
    y: -(20 + step * RISE_STEP),
    rot: half * (step + 1) * ANGLE_STEP,
    step, half,
  };
};

interface ShuffleStep {
  x: (i: number) => number;
  y: (i: number) => number;
  rot: (i: number) => number;
  scale?: (i: number) => number;
  dur: number;
  ease: string;
}

/** Three-ish keyframe choreography per named shuffle style — momentum out, momentum back, spring settle. */
const buildShuffleSteps = (style: ShuffleStyle, rotMult: number): ShuffleStep[] => {
  const T = FAN_COUNT;
  switch (style) {
    case 'Casino Riffle Shuffle': return [
      { x: i => (i < T / 2 ? -1 : 1) * 46, y: () => -16, rot: i => (i < T / 2 ? -1 : 1) * 11 * rotMult, dur: 0.5, ease: 'power2.out' },
      { x: i => (i < T / 2 ? -1 : 1) * 16, y: () => -8, rot: i => (i < T / 2 ? -1 : 1) * 5 * rotMult, dur: 0.42, ease: 'power1.inOut' },
      { x: () => 0, y: () => -2, rot: () => 0, dur: 0.5, ease: 'back.out(1.6)' },
    ];
    case 'Hindu Shuffle': return [
      { x: i => Math.sin(i * 0.7) * 11, y: i => -18 - (i % 5) * 3, rot: i => Math.sin(i * 0.7) * 6 * rotMult, dur: 0.46, ease: 'power2.out' },
      { x: i => Math.sin(i * 0.7 + 2) * 10, y: () => -10, rot: () => 0, dur: 0.44, ease: 'power2.inOut' },
      { x: () => 0, y: () => -3, rot: () => 0, dur: 0.44, ease: 'sine.out' },
    ];
    case 'Overhand Shuffle': return [
      { x: i => Math.sin((i / T) * Math.PI * 2) * 17, y: i => -Math.abs(Math.sin((i / T) * Math.PI * 2)) * 20, rot: i => Math.sin((i / T) * Math.PI * 2) * 7 * rotMult, dur: 0.46, ease: 'power2.out' },
      { x: i => Math.sin((i / T) * Math.PI * 2 + 2.4) * 15, y: () => -12, rot: () => 0, dur: 0.44, ease: 'power2.inOut' },
      { x: () => 0, y: () => -2, rot: () => 0, dur: 0.42, ease: 'sine.out' },
    ];
    case 'Bridge Shuffle': return [
      { x: () => 0, y: i => -32 - Math.abs(i - T / 2 + 0.5) * 0.7, rot: i => (i < T / 2 ? -1 : 1) * 7 * rotMult, dur: 0.5, ease: 'power2.out' },
      { x: () => 0, y: () => -6, rot: () => 0, dur: 0.58, ease: 'elastic.out(1, 0.5)' },
    ];
    case 'Waterfall Shuffle': return [
      { x: i => (i < T / 2 ? -1 : 1) * 7, y: i => -40 * (1 - i / T), rot: i => (i < T / 2 ? -1 : 1) * 9 * rotMult * (1 - i / T), dur: 0.56, ease: 'power2.in' },
      { x: () => 0, y: () => -4, rot: () => 0, dur: 0.5, ease: 'bounce.out' },
    ];
    case 'Spiral Shuffle': return [
      { x: i => Math.cos((i / T) * Math.PI * 4) * 22, y: i => -Math.abs(Math.sin((i / T) * Math.PI * 4)) * 22 - 4, rot: i => (((i / T) * 360 * rotMult) % 40) - 20, dur: 0.5, ease: 'power2.inOut' },
      { x: i => Math.cos((i / T) * Math.PI * 2) * 11, y: () => -8, rot: () => 0, dur: 0.46, ease: 'power2.out' },
      { x: () => 0, y: () => -2, rot: () => 0, dur: 0.42, ease: 'back.out(1.4)' },
    ];
    case 'Arc Toss': return [
      { x: i => (i - T / 2 + 0.5) * 4.4, y: i => -76 - Math.abs(i - T / 2 + 0.5) * 2, rot: i => (i - T / 2 + 0.5) * 3 * rotMult, dur: 0.54, ease: 'power2.out' },
      { x: () => 0, y: () => -4, rot: () => 0, dur: 0.56, ease: 'bounce.out' },
    ];
    case 'Circular Orbit': return [
      { x: i => Math.cos((i / T) * Math.PI * 2) * 28, y: i => -Math.abs(Math.sin((i / T) * Math.PI * 2)) * 24 - 6, rot: i => ((i / T) * 360 * 0.3 * rotMult) % 360, dur: 0.56, ease: 'power1.inOut' },
      { x: i => Math.cos((i / T) * Math.PI * 2 + Math.PI) * 20, y: i => -Math.abs(Math.sin((i / T) * Math.PI * 2 + Math.PI)) * 18 - 4, rot: () => 0, dur: 0.52, ease: 'power1.inOut' },
      { x: () => 0, y: () => -2, rot: () => 0, dur: 0.42, ease: 'back.out(1.3)' },
    ];
    case 'Double Split Shuffle': return [
      { x: i => (i < T * 0.25 ? -1 : i < T * 0.5 ? -0.4 : i < T * 0.75 ? 0.4 : 1) * 54, y: () => -16, rot: () => 0, dur: 0.46, ease: 'power2.out' },
      { x: i => (i < T * 0.25 ? 0.4 : i < T * 0.5 ? -1 : i < T * 0.75 ? 1 : -0.4) * 42, y: () => -10, rot: () => 0, dur: 0.44, ease: 'power2.inOut' },
      { x: () => 0, y: () => -2, rot: () => 0, dur: 0.48, ease: 'back.out(1.5)' },
    ];
    case 'Flying Cards': return [
      { x: i => (i < T / 2 ? -1 : 1) * (72 + (i % (T / 2)) * 4), y: i => -44 - (i % (T / 2)) * 3, rot: i => (i < T / 2 ? -1 : 1) * 15 * rotMult, dur: 0.5, ease: 'power2.out' },
      { x: () => 0, y: () => -6, rot: () => 0, dur: 0.56, ease: 'elastic.out(1, 0.55)' },
    ];
    case 'Magic Levitation': return [
      { x: () => 0, y: i => -54 - (i % 4) * 9, rot: i => (((i * 53) % 13) - 6) * rotMult, scale: () => 0.92, dur: 0.5, ease: 'sine.inOut' },
      { x: () => 0, y: i => -32 - (i % 4) * 4, rot: () => 0, scale: () => 0.9, dur: 0.46, ease: 'sine.inOut' },
      { x: () => 0, y: () => -4, rot: () => 0, scale: () => 1, dur: 0.42, ease: 'power2.out' },
    ];
    default: return [];
  }
};

const CardSpreadScene = ({ numCards, positions, question, onComplete }: { numCards: number; positions: string[]; question?: string; onComplete: (cards: TarotCard[]) => void }) => {
  const [fanCards, setFanCards] = useState(() => shuffleDeck(MAJOR_ARCANA).slice(0, FAN_COUNT));
  const [selected, setSelected] = useState<{ card: TarotCard; fanIdx: number }[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [uiPhase, setUiPhase] = useState<UIPhase>('animating');
  const [buttonLabel, setButtonLabel] = useState<ButtonLabel>('Shuffle Cards');
  const [cosmicBurst, setCosmicBurst] = useState(false);
  const [sparkleRun, setSparkleRun] = useState(0);

  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const cameraRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const brightenRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const isSel = (i: number) => selected.some(s => s.fanIdx === i);
  const selIdx = (i: number) => selected.findIndex(s => s.fanIdx === i);
  const slotW = 200;
  const slotH = 300;

  // Load animation: cards slide + rotate in from a collapsed center stack.
  useLayoutEffect(() => {
    const els = cardRefs.current.filter((el): el is HTMLDivElement => !!el);
    gsap.set(els, { x: 0, y: -20, rotation: 0, scale: 0.9, transformOrigin: '50% 100%' });
    const tl = gsap.timeline({ onComplete: () => setUiPhase('idle') });
    els.forEach((el, i) => {
      const rest = getRestTransform(i, FAN_COUNT);
      tl.to(el, { x: rest.x, y: rest.y, rotation: rest.rot, scale: 1, duration: 0.75, ease: 'back.out(1.15)' }, i * 0.018);
    });
    tlRef.current = tl;
    return () => { tl.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { tlRef.current?.kill(); }, []);

  const handleCardEnter = (i: number) => {
    if (uiPhase !== 'idle' || isSel(i)) return;
    setHovered(i);
    const el = cardRefs.current[i];
    if (!el) return;
    const rest = getRestTransform(i, FAN_COUNT);
    gsap.to(el, { y: rest.y - 12, scale: 1.03, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
  };

  const handleCardLeave = (i: number) => {
    setHovered(h => (h === i ? null : h));
    if (uiPhase !== 'idle' || isSel(i)) return;
    const el = cardRefs.current[i];
    if (!el) return;
    const rest = getRestTransform(i, FAN_COUNT);
    gsap.to(el, { y: rest.y, scale: 1, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
  };

  const handleSelect = (card: TarotCard, fanIdx: number) => {
    if (uiPhase !== 'idle') return;
    if (selected.length >= numCards) return;
    if (isSel(fanIdx)) return;
    const next = [...selected, { card, fanIdx }];
    setSelected(next);
    const el = cardRefs.current[fanIdx];
    if (el) gsap.to(el, { x: 0, y: -170, rotation: 0, scale: 1.15, duration: 0.5, ease: 'back.out(1.3)', overwrite: 'auto' });
    if (next.length === numCards) setTimeout(() => onComplete(next.map(s => s.card)), 700);
  };

  const handleShuffle = () => {
    if (uiPhase !== 'idle') return;
    setSelected([]);
    setHovered(null);
    setUiPhase('animating');
    setButtonLabel('Shuffling…');
    setSparkleRun(n => n + 1);

    const els = cardRefs.current.filter((el): el is HTMLDivElement => !!el);
    const isCosmic = Math.random() < COSMIC_PROBABILITY;
    const style: ShuffleStyle = isCosmic ? 'Cosmic Shuffle' : COMMON_STYLES[Math.floor(Math.random() * COMMON_STYLES.length)];
    const rotMult = 0.8 + Math.random() * 0.55;
    const cardStagger = 0.018 + Math.random() * 0.024; // 18-42ms cascade for the big gather/rebuild beats
    const stepStagger = cardStagger * 0.25;             // lighter ripple within each shuffle-style step, so multi-step styles don't balloon in total duration
    const speed = 0.85 + Math.random() * 0.35;
    const scaleDur = (d: number) => d / speed;

    tlRef.current?.kill();
    const tl = gsap.timeline({
      onComplete: () => {
        setButtonLabel('The Cards Are Ready');
        setTimeout(() => { setButtonLabel('Shuffle Cards'); setUiPhase('idle'); }, 1000);
      },
    });

    // Stage 1 — Deck Awakens (~0.5s)
    if (cameraRef.current) tl.to(cameraRef.current, { scale: 1.04, duration: 0.5, ease: 'sine.out' }, 0);
    if (glowRef.current) {
      tl.to(glowRef.current, { opacity: 0.85, scale: 1.08, duration: 0.5, ease: 'sine.out' }, 0);
      tl.to(glowRef.current, { opacity: 0.3, duration: 0.4, ease: 'sine.in' }, 0.5);
    }
    if (brightenRef.current) {
      tl.to(brightenRef.current, { opacity: 0.16, duration: 0.5, ease: 'sine.out' }, 0);
      tl.to(brightenRef.current, { opacity: 0, duration: 0.5, ease: 'sine.in' }, 0.5);
    }

    // Stage 2 — Cards Collapse (~0.8s), gathered from the edges inward
    tl.to(els, {
      x: i => (i - FAN_COUNT / 2 + 0.5) * 0.45,
      y: -34,
      rotation: i => ((i * 37) % 7) - 3,
      scale: 0.88,
      duration: scaleDur(0.8),
      ease: 'power2.inOut',
      stagger: { each: 0.015, from: 'edges' },
    }, 0.35);

    tl.addLabel('deckGathered');
    tl.call(() => setFanCards(shuffleDeck(MAJOR_ARCANA).slice(0, FAN_COUNT)), undefined, 'deckGathered+=0.1');

    // Stage 3 — Realistic Shuffle (style-specific, ~2-3s)
    if (style === 'Cosmic Shuffle') {
      tl.to(els, { opacity: 0, scale: 0.2, duration: scaleDur(0.42), ease: 'power2.in', stagger: { each: stepStagger, from: 'random' } });
      tl.call(() => setCosmicBurst(true));
      tl.to({}, { duration: scaleDur(1.0) });
      tl.call(() => setCosmicBurst(false));
      tl.to(els, { opacity: 1, scale: 0.88, duration: scaleDur(0.5), ease: 'power2.out', stagger: { each: stepStagger, from: 'random' } });
    } else {
      buildShuffleSteps(style, rotMult).forEach(step => {
        tl.to(els, {
          x: i => step.x(i),
          y: i => step.y(i),
          rotation: i => step.rot(i),
          scale: step.scale ? (i: number) => step.scale!(i) : 0.88,
          duration: scaleDur(step.dur),
          ease: step.ease,
          stagger: { each: stepStagger, from: 'random' },
        });
      });
    }

    // Stage 4 — Deck Rebuild, cascading out from center, no snapping
    tl.to(els, {
      x: i => getRestTransform(i, FAN_COUNT).x,
      y: i => getRestTransform(i, FAN_COUNT).y,
      rotation: i => getRestTransform(i, FAN_COUNT).rot,
      scale: 1,
      duration: 0.9,
      ease: 'elastic.out(1, 0.68)',
      stagger: { each: 0.022, from: 'center' },
    });
    if (cameraRef.current) tl.to(cameraRef.current, { scale: 1, duration: 0.4, ease: 'power2.out' }, '<');

    // Stage 5 — Final Reveal: a golden pulse sweeps across the deck
    tl.to(els, { opacity: 0.65, duration: 0.12, yoyo: true, repeat: 1, stagger: { each: 0.022, from: 'start' } }, '+=0.05');
    if (glowRef.current) {
      tl.to(glowRef.current, { opacity: 0.55, duration: 0.25 }, '<');
      tl.to(glowRef.current, { opacity: 0, duration: 0.5 }, '+=0.15');
    }

    tlRef.current = tl;
  };

  const getCardChrome = (i: number): React.CSSProperties => {
    const s = isSel(i);
    const h = hovered === i && !s && uiPhase === 'idle';
    return {
      position: 'absolute', left: '50%', bottom: 0,
      width: `${FAN_W}px`, height: `${FAN_H}px`, marginLeft: `${-FAN_W / 2}px`,
      borderRadius: '14px',
      zIndex: s ? FAN_COUNT + 50 + selIdx(i) : hovered === i ? FAN_COUNT + 1 : FAN_COUNT - getRestTransform(i, FAN_COUNT).step,
      cursor: uiPhase !== 'idle' ? 'default' : (s ? 'default' : 'pointer'),
      opacity: selected.length > 0 && !s ? 0.55 : 1,
      transition: 'opacity 0.3s ease, box-shadow 0.3s ease',
      boxShadow: s
        ? '0 0 40px rgba(89,34,9,0.75), 0 16px 48px rgba(0,0,0,0.7)'
        : h ? '0 0 26px rgba(89,34,9,0.55), 0 12px 30px rgba(0,0,0,0.55)'
        : '0 6px 20px rgba(0,0,0,0.55), 0 0 14px rgba(89,34,9,0.15)',
      willChange: 'transform',
    };
  };

  const guidanceLabel = question || (numCards === 5 ? 'Life Timeline' : 'Karma Mirror');

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
      paddingTop: '56px', paddingBottom: '48px', position: 'relative', overflow: 'hidden',
      background: '#F5E9D6',
    }}>
      <Particles count={32} />

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', zIndex: 10, marginBottom: '20px', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 44, height: 1, background: 'linear-gradient(to right,transparent,#FBF5EC)' }} />
          <p style={{ letterSpacing: '0.4em', fontSize: '12px', color: '#592209', textTransform: 'uppercase', fontFamily: "'DM Sans', system-ui, sans-serif", margin: 0, whiteSpace: 'nowrap' }}>
            ✦&nbsp; {selected.length} / {numCards} Cards Selected &nbsp;✦
          </p>
          <div style={{ width: 44, height: 1, background: 'linear-gradient(to left,transparent,#FBF5EC)' }} />
        </div>
        <h2 style={{ margin: 0, fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, lineHeight: 1.3 }}>
          <span style={{ display: 'block', fontSize: 'clamp(22px, 3.6vw, 34px)', textTransform: 'uppercase', color: '#301607' }}>
            Select {numCards} Cards For
          </span>
          <span style={{ display: 'block', fontSize: 'clamp(22px, 3.6vw, 34px)', textTransform: 'uppercase', color: '#592209' }}>
            Your {guidanceLabel} Guidance
          </span>
        </h2>
        <p style={{ color: 'rgba(48,22,7,0.72)', fontSize: '14px', marginTop: '14px', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '0.02em', fontStyle: 'italic' }}>
          Tap each card for its meaning · Take what resonates · Leave the rest
        </p>
      </motion.div>

      {/* Selected card slots */}
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '90px', padding: '0 24px', zIndex: 10 }}>
        {positions.map((pos, i) => {
          const s = selected[i];
          const theme = s ? getCardTheme(s.card) : null;
          return (
            <motion.div key={pos} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: `${slotW}px`, height: `${slotH}px`, borderRadius: '14px', border: s ? `1.5px solid ${theme!.border}` : '1.5px dashed rgba(89,34,9,0.4)', background: s ? 'transparent' : 'rgba(89,34,9,0.05)', position: 'relative', overflow: 'hidden', boxShadow: s ? `0 0 22px ${theme!.glow}` : 'none', transition: 'all 0.4s' }}>
                {s && <CardFace card={s.card} size="lg" category={question} />}
              </div>
              <span style={{ fontSize: '13px', letterSpacing: '1.5px', color: s ? '#592209' : 'rgba(89,34,9,0.55)', fontFamily: "'DM Sans', system-ui, sans-serif", textTransform: 'uppercase', textAlign: 'center', maxWidth: `${slotW}px` }}>{pos}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Fan spread */}
      <div className="qs-fan-scale" style={{ position: 'relative', width: '100%', height: `${FAN_CONTAINER_H}px`, flex: `0 0 ${FAN_CONTAINER_H}px`, zIndex: 5 }}>
        {/* soft golden glow behind the deck — pulses during Awaken / Reveal */}
        <div ref={glowRef} style={{
          position: 'absolute', left: '50%', bottom: '10px', width: 460, height: 340,
          transform: 'translateX(-50%)', borderRadius: '50%', opacity: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse at center, #FBF5EC 0%, rgba(89,34,9,0.08) 45%, transparent 72%)',
        }} />
        {/* ambient star-brighten wash */}
        <div ref={brightenRef} style={{
          position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(255,248,230,0.5) 0%, transparent 70%)',
        }} />
        {uiPhase === 'animating' && <ShuffleSparkles runKey={sparkleRun} cosmic={cosmicBurst} />}

        <div ref={cameraRef} style={{ position: 'relative', width: '100%', height: '100%', transformOrigin: '50% 100%' }}>
          {fanCards.map((card, i) => {
            const s = isSel(i);
            return (
              <div
                key={i}
                ref={el => { cardRefs.current[i] = el; }}
                style={getCardChrome(i)}
                onClick={() => handleSelect(card, i)}
                role="button"
                tabIndex={0}
                aria-label={s ? `Selected card ${i + 1}` : `Choose card ${i + 1}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(card, i); } }}
                onMouseEnter={() => handleCardEnter(i)}
                onMouseLeave={() => handleCardLeave(i)}
              >
                <div style={{ position: 'relative', width: '100%', height: '100%', perspective: 1200 }}>
                  <motion.div
                    animate={{ rotateY: s ? 180 : 0 }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d' }}
                  >
                    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', borderRadius: 14, overflow: 'hidden' }}>
                      <CardBackImage />
                    </div>
                    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: 14, overflow: 'hidden' }}>
                      <CardFace card={card} size="lg" category={question} />
                    </div>
                  </motion.div>
                </div>
                {hovered === i && !s && uiPhase === 'idle' && (
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(89,34,9,0.22) 0%, transparent 70%)', borderRadius: '14px', pointerEvents: 'none' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <motion.button
        onClick={handleShuffle}
        disabled={uiPhase !== 'idle'}
        whileHover={uiPhase === 'idle' ? { scale: 1.04 } : {}}
        whileTap={uiPhase === 'idle' ? { scale: 0.96 } : {}}
        style={{
          marginTop: '4px', zIndex: 20,
          padding: '14px 42px',
          borderRadius: 999,
          border: '1.5px solid #592209',
          background: '#FBF5EC',
          color: '#F5E9D6',
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: '15px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
          cursor: uiPhase === 'idle' ? 'pointer' : 'default',
          boxShadow: '0 0 18px rgba(89,34,9,0.35), inset 0 0 12px rgba(89,34,9,0.08)',
          opacity: uiPhase === 'idle' ? 1 : 0.6,
          transition: 'box-shadow 0.3s ease, opacity 0.3s ease',
        }}
      >
        {buttonLabel}
      </motion.button>

      <style>{`
        .qs-fan-scale { transform-origin: 50% 100%; }
        @media (max-width: 1100px) { .qs-fan-scale { transform: scale(0.82); } }
        @media (max-width: 820px)  { .qs-fan-scale { transform: scale(0.62); } }
        @media (max-width: 560px)  { .qs-fan-scale { transform: scale(0.42); } }
        @keyframes qsSparkleDrift {
          0%   { transform: translate(0,0) scale(0.6); opacity: 0; }
          15%  { opacity: 1; }
          50%  { transform: translate(var(--sx), var(--sy)) scale(1); opacity: 0.9; }
          100% { transform: translate(calc(var(--sx) * 1.6), calc(var(--sy) * 1.6)) scale(0.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

/** Floating gold-dust / star sparkles shown only while the deck is shuffling */
const ShuffleSparkles: React.FC<{ runKey: number; cosmic: boolean }> = ({ runKey, cosmic }) => {
  const dots = useMemo(() => Array.from({ length: cosmic ? 46 : 22 }, (_, i) => ({
    id: i,
    left: 50 + (Math.random() * 2 - 1) * 42,
    top: 50 + (Math.random() * 2 - 1) * 40,
    sx: `${(Math.random() * 2 - 1) * 80}px`,
    sy: `${-Math.random() * 90 - 10}px`,
    size: Math.random() * 3 + (cosmic ? 2 : 1),
    delay: Math.random() * 1.4,
    dur: 1.1 + Math.random() * 1.3,
    color: cosmic ? (i % 2 === 0 ? '#592209' : '#592209') : '#E8B79A',
  })), [runKey, cosmic]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6, overflow: 'visible' }}>
      {dots.map(d => (
        <span key={d.id} style={{
          position: 'absolute', left: `${d.left}%`, top: `${d.top}%`,
          width: d.size, height: d.size, borderRadius: '50%',
          background: d.color,
          boxShadow: `0 0 ${d.size * 3}px ${d.color}`,
          // @ts-expect-error custom CSS properties consumed by the keyframe above
          '--sx': d.sx, '--sy': d.sy,
          animation: `qsSparkleDrift ${d.dur}s ease-out ${d.delay}s infinite`,
        }} />
      ))}
    </div>
  );
};

// ─── Card Reveal Scene ────────────────────────────────────────────────────────
const CardRevealScene = ({ cards, positions, question, onComplete }: { cards: TarotCard[]; positions: string[]; question?: string; onComplete: () => void }) => {
  const [revealed, setRevealed] = useState<boolean[]>(new Array(cards.length).fill(false));
  const [current, setCurrent] = useState(0);
  const [autoReveal] = useState(true);

  useEffect(() => {
    if (!autoReveal) return;
    const t = setTimeout(() => {
      if (current < cards.length) {
        setRevealed(prev => { const n = [...prev]; n[current] = true; return n; });
        setCurrent(c => c + 1);
      } else {
        setTimeout(onComplete, 1400);
      }
    }, current === 0 ? 900 : 2400);
    return () => clearTimeout(t);
  }, [current, autoReveal, cards.length, onComplete]);

  const cardW = 140, cardH = 216;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative', overflow: 'hidden' }}>
      <Particles count={40} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', marginBottom: '48px', zIndex: 10 }}>
        <p style={{ letterSpacing: '6px', fontSize: '14px', color: 'rgba(48,22,7,1)', textTransform: 'uppercase', fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: '12px' }}>
          The Cards Reveal Themselves
        </p>
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '5px', textTransform: 'uppercase', color: '#592209', textShadow: '0 0 30px rgba(89,34,9,0.4)' }}>
          Your Sacred Reading
        </h2>
        <div style={{ width: '80px', height: '1px', background: '#F5E9D6', margin: '16px auto 0' }} />
      </motion.div>

      <div style={{ display: 'flex', gap: 'clamp(14px, 3vw, 32px)', justifyContent: 'center', flexWrap: 'wrap', zIndex: 10 }}>
        {cards.map((card, i) => {
          const theme = getCardTheme(card);
          return (
            <motion.div key={card.id} initial={{ y: 70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.18, duration: 0.7 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>

              <div
                style={{ width: `${cardW}px`, height: `${cardH}px`, position: 'relative', cursor: 'pointer' }}
                onClick={() => {
                  if (!revealed[i] && i === current) {
                    setRevealed(prev => { const n = [...prev]; n[i] = true; return n; });
                    setCurrent(c => c + 1);
                  }
                }}>
                <div style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', transition: 'transform 1.4s cubic-bezier(0.4, 0, 0.2, 1)', transform: revealed[i] ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                  <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', borderRadius: '9px', overflow: 'hidden', boxShadow: revealed[i] ? `0 0 50px ${theme.glow}, 0 24px 60px rgba(0,0,0,0.8)` : '0 10px 35px rgba(0,0,0,0.7)' }}>
                    <CardBackSVG />
                  </div>
                  <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: '9px', overflow: 'hidden', boxShadow: `0 0 50px ${theme.glow}, 0 24px 60px rgba(0,0,0,0.8)` }}>
                    <CardFace card={card} size="lg" category={question} />
                  </div>
                </div>

                {revealed[i] && (
                  <div style={{ position: 'absolute', inset: -24, borderRadius: '50%', background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`, animation: 'revealBurst 0.9s ease-out forwards', pointerEvents: 'none' }} />
                )}
              </div>

              {/* Position label */}
              <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '2.5px', color: revealed[i] ? 'rgba(48,22,7,1)' : 'rgba(89,34,9,0.45)', fontFamily: "'DM Sans', system-ui, sans-serif", textTransform: 'uppercase', textAlign: 'center', maxWidth: '150px', transition: 'color 0.6s' }}>
                {positions[i]}
              </span>

              <AnimatePresence>
                {revealed[i] && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                    style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '18px', color: '#592209', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>{card.name}</p>
                    <p style={{ fontSize: '14px', color: 'rgba(48,22,7,0.85)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>{card.keywords[0]}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {current >= cards.length && (
          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            onClick={onComplete}
            style={{ marginTop: '56px', padding: '18px 52px', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '5px', fontSize: '15px', textTransform: 'uppercase', color: '#F5E9D6', background: 'linear-gradient(135deg, #592209, #B5561A)', border: 'none', borderRadius: '4px', cursor: 'pointer', boxShadow: '0 0 35px rgba(89,34,9,0.55)', zIndex: 10 }}>
            Reveal My Reading
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Shared sub-components for result screens ────────────────────────────────

/** A card thumbnail that wraps CardFace with the required position:relative */
const CardThumb = ({ card, width, height, size }: { card: TarotCard; width: number; height: number; size: 'sm' | 'md' | 'lg' }) => {
  const theme = getCardTheme(card);
  return (
    <div style={{
      position: 'relative', width, height, flexShrink: 0,
      borderRadius: '9px', overflow: 'hidden',
      border: `1.5px solid ${theme.border}55`,
      boxShadow: `0 0 24px ${theme.glow}, 0 10px 28px rgba(0,0,0,0.6)`,
    }}>
      <CardFace card={card} size={size} />
    </div>
  );
};

/** One labelled section card in the insight grid */
const InsightCard = ({
  icon, label, value, accent = '#592209', delay = 0,
}: { icon: string; label: string; value?: string; accent?: string; delay?: number }) => {
  if (!value) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55 }}
      style={{
        display: 'flex', flexDirection: 'column', gap: '12px',
        padding: '24px 22px',
        background: `linear-gradient(160deg, ${accent}12 0%, ${accent}05 100%)`,
        border: `1px solid ${accent}35`,
        borderRadius: '16px',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '22px', lineHeight: 1 }}>{icon}</span>
        <span style={{
          fontSize: '13px', letterSpacing: '2.5px', textTransform: 'uppercase',
          color: 'rgba(48,22,7,1)', fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 600,
        }}>{label}</span>
      </div>
      <p style={{
        margin: 0, color: 'rgba(48,22,7,0.92)', fontSize: '18px',
        lineHeight: 1.78, fontFamily: "'DM Sans', system-ui, sans-serif",
        wordBreak: 'break-word', overflowWrap: 'break-word',
      }}>{value}</p>
    </motion.div>
  );
};

// ─── Timeline Reading Display ─────────────────────────────────────────────────
const RESULT_LABELS = ['Past Soul Lesson', 'Current Path', 'Hidden Calling', 'Next Awakening', 'Purpose Guidance'];

/** Uniform copper-on-navy tarot tile — lift + glow + sparkle + shine on hover, opens the detail panel on click */
const ResultCard: React.FC<{
  card: TarotCard; label: string; active: boolean; delay: number; onToggle: () => void; category?: string;
}> = ({ card, label, active, delay, onToggle, category }) => {
  const [hovered, setHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const imgSrc = !imgFailed ? getCategoryCardImage(category, card) : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}
    >
      <motion.button
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        animate={{ y: hovered ? -10 : 0, scale: hovered ? 1.05 : 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{
          position: 'relative', width: 200, height: 300, padding: 0, cursor: 'pointer',
          border: `1px solid ${active ? 'rgba(89,34,9,0.9)' : 'rgba(89,34,9,0.35)'}`,
          borderRadius: '14px', background: '#F5E9D6',
          overflow: 'hidden',
          boxShadow: active
            ? '0 0 32px rgba(89,34,9,0.55), 0 12px 26px rgba(0,0,0,0.55)'
            : hovered
            ? '0 0 26px rgba(89,34,9,0.45), 0 12px 24px rgba(0,0,0,0.5)'
            : '0 4px 16px rgba(0,0,0,0.45)',
        }}
      >
        {imgSrc && (
          <>
            <img
              src={imgSrc}
              alt={card.name}
              onError={() => setImgFailed(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #FBF5EC 0%, transparent 26%, transparent 64%, #FBF5EC 100%)' }} />
          </>
        )}
        <span style={{ position: 'absolute', top: 14, left: 0, right: 0, textAlign: 'center', fontSize: 14, letterSpacing: 1.5, color: imgSrc ? '#301607' : '#F5E9D6', fontFamily: "'DM Sans', system-ui, sans-serif" }}>{card.number}</span>
        {!imgSrc && <><TarotArt card={card} /><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(18,6,2,0.75) 0%, transparent 22%, transparent 62%, rgba(18,6,2,0.92) 100%)' }} /></>}
        <span style={{ position: 'absolute', bottom: 16, left: 10, right: 10, textAlign: 'center', fontSize: 18, letterSpacing: 0.5, color: imgSrc ? '#301607' : '#F5E9D6', fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: 1.25, fontWeight: 600 }}>{card.name}</span>

        {hovered && <span className="result-card-shine" />}
        {hovered && Array.from({ length: 3 }).map((_, i) => (
          <span key={i} className="result-card-sparkle" style={{ left: `${20 + i * 28}%`, animationDelay: `${i * 0.15}s` }} />
        ))}
      </motion.button>
      <span style={{ fontSize: 17, letterSpacing: '1px', color: '#592209', fontFamily: "'DM Sans', system-ui, sans-serif", textTransform: 'uppercase', textAlign: 'center', maxWidth: 200 }}>{label}</span>
    </motion.div>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ marginBottom: 16 }}>
    <p style={{ margin: '0 0 4px', fontSize: 14, letterSpacing: '1.5px', color: 'rgba(48,22,7,1)', textTransform: 'uppercase', fontFamily: "'DM Sans', system-ui, sans-serif" }}>{label}</p>
    <p style={{ margin: 0, fontSize: 18, lineHeight: 1.75, color: 'rgba(48,22,7,0.92)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>{value}</p>
  </div>
);

/** Small artwork tile used in the "Card-by-Card Story" strip — real category art with an emoji-symbol fallback */
const StoryCardThumb: React.FC<{ card: TarotCard; category?: string }> = ({ card, category }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const imgSrc = !imgFailed ? getCategoryCardImage(category, card) : null;
  return (
    <div style={{ width: 88, height: 132, margin: '0 auto 16px', borderRadius: 10, border: '1px solid rgba(89,34,9,0.4)', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(89,34,9,0.05)' }}>
      {imgSrc
        ? <img src={imgSrc} alt={card.name} onError={() => setImgFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
        : <TarotArt card={card} />}
    </div>
  );
};

/** Floating panel with the six requested reading fields for a single selected card */
const CardDetailPanel: React.FC<{
  card: TarotCard; label: string; insight?: string; guidance?: string;
}> = ({ card, label, insight, guidance }) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 18 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    style={{
      width: '100%', maxWidth: 620, margin: '0 auto',
      padding: '30px 34px', borderRadius: '16px',
      background: 'linear-gradient(160deg,rgba(89,34,9,0.08) 0%,rgba(89,34,9,0.02) 100%)',
      border: '1px solid rgba(89,34,9,0.3)',
    }}
  >
    <p style={{ margin: '0 0 6px', fontSize: 13, letterSpacing: '2.5px', color: '#592209', textTransform: 'uppercase', fontFamily: "'DM Sans', system-ui, sans-serif" }}>{label}</p>
    <h4 style={{ margin: '0 0 18px', fontSize: 28, color: '#592209', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '2px' }}>{card.name}</h4>

    <DetailRow label="Meaning" value={card.meaning} />
    {insight && <DetailRow label="Interpretation" value={insight} />}
    <DetailRow label="Positive Aspects" value={card.keywords.join(' · ')} />
    <DetailRow label="Challenges" value={card.shadow} />
    {guidance && <DetailRow label="Guidance" value={guidance} />}
  </motion.div>
);

/** Centered white sub-heading, matching the main heading's font/weight but without the glow */
const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.h3
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.5 }}
    style={{ margin: 0, fontSize: 30, fontWeight: 600, color: '#301607', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '2px', textAlign: 'center', textTransform: 'uppercase' }}
  >
    {children}
  </motion.h3>
);

/** Tiny copper celestial glyph used to separate the two insight-grid rows */
const SacredDivider: React.FC = () => (
  <div className="trd-divider" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, gridColumn: '1 / -1' }}>
    <div style={{ width: 60, height: 1, background: 'linear-gradient(to right, transparent, rgba(89,34,9,0.08))' }} />
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ opacity: 0.7, flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6" fill="none" stroke="#592209" strokeWidth="0.6" strokeDasharray="2 3" />
      <path d="M8,2 L8,14 M2,8 L14,8" stroke="#592209" strokeWidth="0.6" opacity="0.6" />
      <circle cx="8" cy="8" r="1.8" fill="#592209" opacity="0.8" />
    </svg>
    <div style={{ width: 60, height: 1, background: 'linear-gradient(to left, transparent, rgba(89,34,9,0.08))' }} />
  </div>
);

/** Insight-grid tile — same border/background/glow tokens as ResultCard, just larger */
const InsightGridCard: React.FC<{ icon: React.ReactNode; title: string; value?: string; delay: number }> = ({ icon, title, value, delay }) => {
  const [hovered, setHovered] = useState(false);
  if (!value) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.5, delay }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', padding: '30px 28px', borderRadius: '19px',
        background: '#F5E9D6',
        border: `1px solid ${hovered ? 'rgba(89,34,9,0.6)' : 'rgba(89,34,9,0.35)'}`,
        boxShadow: hovered ? '0 8px 26px rgba(0,0,0,0.5), 0 0 24px rgba(89,34,9,0.25)' : '0 4px 16px rgba(0,0,0,0.4)',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ color: '#592209', display: 'flex' }}>{icon}</span>
        <span style={{ fontSize: 16, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#592209', fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 600 }}>{title}</span>
      </div>
      <p style={{ margin: 0, color: 'rgba(48,22,7,0.82)', fontSize: 18, lineHeight: 1.8, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{value}</p>

      {hovered && <span className="result-card-shine" />}
      {hovered && Array.from({ length: 3 }).map((_, i) => (
        <span key={i} className="result-card-sparkle" style={{ left: `${15 + i * 30}%`, animationDelay: `${i * 0.15}s` }} />
      ))}
    </motion.div>
  );
};

const TimelineReadingDisplay = ({
  cards, positions, question, reading, onReset,
}: { cards: TarotCard[]; positions: string[]; question: string; reading: AIReading; onReset: () => void }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const activeCard = activeIdx !== null ? cards[activeIdx] : null;
  const activeInsight = activeIdx !== null ? reading.timelineNarrative?.[activeIdx]?.insight : undefined;
  const guidance = reading.recommendedAction || reading.spiritualGuidance;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px 100px', position: 'relative', background: '#FBF5EC', overflow: 'hidden' }}>
      <Particles count={16} />

      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        style={{ textAlign: 'center', zIndex: 10, marginBottom: 32 }}>
        <p style={{ letterSpacing: '4px', fontSize: 16, color: '#592209', textTransform: 'none', fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: 14 }}>
          {FEATURES.tarot.name} · Life Timeline Tarot™ • {question}
        </p>
        <h1 style={{ margin: '0 0 16px', fontSize: 'clamp(32px,5vw,48px)', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 700 }}>
          <span style={{ color: '#301607' }}>Your Soul&apos;s </span>
          <span style={{ color: '#592209' }}>Timeline</span>
        </h1>
        <p style={{ margin: 0, fontSize: 18, fontStyle: 'italic', color: 'rgba(48,22,7,0.9)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          Tap each card for its meaning · Take what resonates · Leave the rest
        </p>
      </motion.div>

      <div className="trd-cards-row" style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(16px,3vw,32px)', flexWrap: 'wrap', zIndex: 10, marginBottom: 36 }}>
        {cards.map((card, i) => (
          <ResultCard key={card.id} card={card} label={RESULT_LABELS[i] ?? positions[i]} active={activeIdx === i}
            delay={0.15 + i * 0.12} onToggle={() => setActiveIdx(cur => (cur === i ? null : i))} category={question} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeCard && (
          <div key={activeIdx} style={{ zIndex: 10, marginBottom: 36, width: '100%', display: 'flex', justifyContent: 'center', padding: '0 20px' }}>
            <CardDetailPanel card={activeCard} label={RESULT_LABELS[activeIdx!] ?? positions[activeIdx!]} insight={activeInsight} guidance={guidance} />
          </div>
        )}
      </AnimatePresence>

      {/* ── Overall Reading ────────────────────────────────────────────── */}
      {reading.overallMessage && (
        <div style={{ zIndex: 10, width: '100%', marginBottom: 90 }}>
          <SectionHeading>Overall Reading</SectionHeading>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{ maxWidth: 700, margin: '24px auto 0', textAlign: 'center', fontSize: 18, lineHeight: 1.9, color: 'rgba(48,22,7,0.97)', fontFamily: "'DM Sans', system-ui, sans-serif", padding: '0 20px' }}
          >
            {reading.overallMessage}
          </motion.p>
        </div>
      )}

      {/* ── Six insight cards, 3×2 with a sacred divider between the rows ── */}
      <div className="trd-insight-grid" style={{ zIndex: 10, width: '100%', maxWidth: 1000, marginBottom: 90 }}>
        <InsightGridCard icon={<Sprout size={18} />}  title="Where You Are Now" value={reading.currentLifeStage}     delay={0} />
        <InsightGridCard icon={<Sparkles size={18} />} title="What's Helping You"      value={reading.mainOpportunity}     delay={0.08} />
        <InsightGridCard icon={<EyeOff size={18} />}  title="What's Blocking You"     value={reading.hiddenChallenge}     delay={0.16} />
        <SacredDivider />
        <InsightGridCard icon={<Star size={18} />}    title="A Theme To Prepare For"      value={reading.nextMajorTurningPoint} delay={0.24} />
        <InsightGridCard icon={<Zap size={18} />}     title="A Step You Could Take"    value={reading.recommendedAction}   delay={0.32} />
        <InsightGridCard icon={<Flame size={18} />}   title="Reflective Guidance"  value={reading.spiritualGuidance}   delay={0.4} />
      </div>

      {/* ── Card-by-card story ─────────────────────────────────────────── */}
      {reading.timelineNarrative && reading.timelineNarrative.length > 0 && (
        <div style={{ zIndex: 10, width: '100%', maxWidth: 1100, marginBottom: 90 }}>
          <SectionHeading>Your Card-by-Card Story</SectionHeading>
          <div className="trd-story-row" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap', gap: '28px 0', maxWidth: 960, margin: '36px auto 0' }}>
            {reading.timelineNarrative.map((n, i) => {
              const card = cards[i];
              if (!card) return null;
              return (
                <React.Fragment key={i}>
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    style={{
                      width: 260, boxSizing: 'border-box', padding: '32px 26px', borderRadius: '18px', textAlign: 'center',
                      background: '#F5E9D6',
                      border: '1px solid rgba(89,34,9,0.35)',
                    }}
                  >
                    <StoryCardThumb card={card} category={question} />
                    <p style={{ margin: '0 0 14px', fontSize: 22, color: '#592209', fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 600, letterSpacing: '1px' }}>{card.name}</p>
                    <p style={{ margin: '0 0 6px', fontSize: 15, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(48,22,7,1)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>Meaning</p>
                    <p style={{ margin: '0 0 14px', fontSize: 17, lineHeight: 1.7, color: 'rgba(48,22,7,0.9)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>{card.meaning}</p>
                    <p style={{ margin: '0 0 6px', fontSize: 15, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(48,22,7,1)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>Interpretation</p>
                    <p style={{ margin: 0, fontSize: 17, lineHeight: 1.7, color: 'rgba(48,22,7,0.9)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>{n.insight}</p>
                  </motion.div>
                  {i < reading.timelineNarrative!.length - 1 && (
                    <span className="trd-story-arrow" style={{ color: '#592209', fontSize: 26, alignSelf: 'center', padding: '0 12px' }}>→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      <ReadingNote />
      <ResetButton onReset={onReset} />

      <style>{`
        @keyframes resultCardShine {
          0%   { transform: translateX(-120%) rotate(20deg); opacity: 0; }
          15%  { opacity: 0.55; }
          100% { transform: translateX(160%) rotate(20deg); opacity: 0; }
        }
        .result-card-shine {
          position: absolute; top: -40%; left: 0; width: 30%; height: 180%;
          background: linear-gradient(90deg, transparent, rgba(89,34,9,0.08), transparent);
          animation: resultCardShine 1.1s ease forwards;
          pointer-events: none;
        }
        @keyframes resultCardSparkle {
          0%   { opacity: 0; transform: translateY(0) scale(0.4); }
          40%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-26px) scale(1); }
        }
        .result-card-sparkle {
          position: absolute; bottom: 10px; width: 3px; height: 3px; border-radius: 50%;
          background: #FBF5EC; box-shadow: 0 0 6px #592209;
          animation: resultCardSparkle 1s ease-out forwards;
          pointer-events: none;
        }
        @media (max-width: 600px) {
          .trd-cards-row {
            flex-wrap: nowrap;
            justify-content: flex-start;
            overflow-x: auto;
            padding: 0 20px 8px;
            -webkit-overflow-scrolling: touch;
          }
        }

        .trd-insight-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
          padding: 0 20px;
        }
        .trd-divider { display: flex; margin: 4px 0; }
        @media (max-width: 900px) {
          .trd-insight-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .trd-divider { display: none; }
        }
        @media (max-width: 560px) {
          .trd-insight-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 700px) {
          .trd-story-row { justify-content: flex-start; overflow-x: auto; padding: 0 20px 8px; -webkit-overflow-scrolling: touch; }
          .trd-story-arrow { display: none; }
        }
      `}</style>
    </div>
  );
};

// ─── Karma Mirror™ Reading Display ─────────────────────────────────────────────
const KarmaMirrorDisplay = ({
  cards, positions, reading, onReset,
}: { cards: TarotCard[]; positions: string[]; reading: AIReading; onReset: () => void }) => {
  const karmaThemes = [
    { color: '#592209', glow: 'rgba(255,112,67,0.5)', arrow: '↓' },
    { color: '#592209', glow: 'rgba(206,147,216,0.5)', arrow: '↓' },
    { color: '#592209', glow: 'rgba(77,182,172,0.5)', arrow: null },
  ];
  const journeyLabels = ['Current Karma', 'Hidden Blockage', 'Healing Path'];
  const journeyIcons  = ['🔥', '🌑', '🌿'];

  return (
    <div style={{ minHeight: '100vh', padding: 'clamp(80px,10vh,120px) clamp(16px,5vw,40px) 80px', maxWidth: '1100px', margin: '0 auto', position: 'relative' }}>
      <Particles count={18} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: '52px', position: 'relative', zIndex: 10 }}>
        <p style={{ letterSpacing: '6px', fontSize: '14px', color: 'rgba(48,22,7,1)', textTransform: 'uppercase', fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: '10px' }}>
          {FEATURES.tarot.name} · Karma Mirror™ Reading
        </p>
        <h2 style={{ fontSize: 'clamp(26px,5vw,52px)', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '5px', textTransform: 'uppercase', color: '#592209', textShadow: '0 0 30px rgba(89,34,9,0.4)', marginBottom: '12px' }}>
          The Mirror Reveals
        </h2>
        <p style={{ color: 'rgba(48,22,7,0.8)', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '18px', fontStyle: 'italic' }}>
          "The cards do not judge. They reflect."
        </p>
        <div style={{ width: '100px', height: '1px', background: '#F5E9D6', margin: '16px auto 0' }} />
      </motion.div>

      {/* ── Journey: 3 cards with flow arrows ─────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', flexWrap: 'wrap', gap: '0', marginBottom: '56px', position: 'relative', zIndex: 10 }}>
        {cards.map((card, i) => {
          const kt = karmaThemes[i];
          return (
            <div key={card.id} style={{ display: 'flex', alignItems: 'center' }}>
              {/* Card column */}
              <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.22 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                {/* Journey label above card */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{journeyIcons[i]}</span>
                  <span style={{ fontSize: '13px', letterSpacing: '2px', color: kt.color, fontFamily: "'DM Sans', system-ui, sans-serif", textTransform: 'uppercase', fontWeight: 600 }}>{journeyLabels[i]}</span>
                </div>
                {/* Card — fixed container with position:relative */}
                <div style={{
                  position: 'relative', width: '130px', height: '200px',
                  borderRadius: '10px', overflow: 'hidden', flexShrink: 0,
                  border: `2px solid ${kt.color}80`,
                  boxShadow: `0 0 36px ${kt.glow}, 0 18px 45px rgba(0,0,0,0.7)`,
                }}>
                  <CardFace card={card} size="lg" />
                </div>
                <p style={{ margin: 0, fontSize: '17px', color: '#592209', fontFamily: "'DM Sans', system-ui, sans-serif", textTransform: 'uppercase', textAlign: 'center', letterSpacing: '1px', maxWidth: '130px' }}>{card.name}</p>
              </motion.div>

              {/* Arrow connector between cards */}
              {i < cards.length - 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px', marginBottom: '56px' }}>
                  <div style={{ width: '32px', height: '1px', background: `linear-gradient(90deg,${karmaThemes[i].color}80,${karmaThemes[i+1].color}80)` }} />
                  <span style={{ fontSize: '14px', color: '#592209', marginTop: '4px' }}>→</span>
                </div>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* ── Karma Theme + Root Cause ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '18px', marginBottom: '36px', position: 'relative', zIndex: 10 }}>
        <InsightCard icon="🔮" label="What Your Karma Is Showing You" value={reading.currentKarmaTheme} delay={0.4} accent="#CE93D8" />
        <InsightCard icon="🌱" label="Where This Pattern Comes From"  value={reading.rootCause}         delay={0.48} />
      </div>

      {/* ── Life areas affected ────────────────────────────────────────── */}
      {reading.lifeAreasAffected && reading.lifeAreasAffected.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          style={{ padding: '22px 26px', border: '1px solid rgba(89,34,9,0.2)', borderRadius: '16px', marginBottom: '32px', position: 'relative', zIndex: 10 }}>
          <p style={{ fontSize: '13px', letterSpacing: '2.5px', color: 'rgba(48,22,7,1)', fontFamily: "'DM Sans', system-ui, sans-serif", textTransform: 'uppercase', marginBottom: '14px' }}>
            Life Areas Being Affected
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {reading.lifeAreasAffected.map(area => (
              <span key={area} style={{ padding: '6px 16px', background: 'rgba(89,34,9,0.08)', border: '1px solid rgba(89,34,9,0.4)', borderRadius: '24px', fontSize: '15px', color: '#592209', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '1px' }}>
                {area}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Action Plan ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '40px', position: 'relative', zIndex: 10 }}>
        <h3 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '24px', letterSpacing: '4px', color: '#592209', textTransform: 'uppercase', marginBottom: '22px', textAlign: 'center' }}>
          Your Healing Action Plan
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '16px' }}>
          <InsightCard icon="☀" label="Do This Every Day"    value={reading.dailyAction}       delay={0.7}  accent="#592209" />
          <InsightCard icon="🌙" label="Do This Every Week"   value={reading.weeklyAction}      delay={0.76} accent="#CE93D8" />
          <InsightCard icon="🧘" label="Spiritual Practice"   value={reading.spiritualPractice} delay={0.82} accent="#4DB6AC" />
          <InsightCard icon="⭐" label="New Habit To Build"   value={reading.recommendedHabit}  delay={0.88} accent="#4FC3F7" />
        </div>
      </div>

      {/* ── Reflection + Affirmation ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '18px', marginBottom: '44px', position: 'relative', zIndex: 10 }}>
        {reading.reflectionQuestion && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95 }}
            style={{ padding: '26px', background: 'linear-gradient(135deg,rgba(89,34,9,0.1) 0%,rgba(89,34,9,0.03) 100%)', border: '1px solid rgba(89,34,9,0.22)', borderRadius: '16px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '13px', letterSpacing: '2.5px', color: '#301607', fontFamily: "'DM Sans', system-ui, sans-serif", textTransform: 'uppercase' }}>🔍 Think About This</p>
            <p style={{ margin: 0, color: 'rgba(48,22,7,0.92)', fontSize: '19px', lineHeight: 1.8, fontFamily: "'DM Sans', system-ui, sans-serif", fontStyle: 'italic', wordBreak: 'break-word' }}>"{reading.reflectionQuestion}"</p>
          </motion.div>
        )}
        {reading.positiveAffirmation && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.04 }}
            style={{ padding: '26px', background: 'linear-gradient(135deg,rgba(89,34,9,0.1) 0%,rgba(229,138,69,0.03) 100%)', border: '1px solid rgba(89,34,9,0.28)', borderRadius: '16px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '13px', letterSpacing: '2.5px', color: '#301607', fontFamily: "'DM Sans', system-ui, sans-serif", textTransform: 'uppercase' }}>✨ Say This To Yourself</p>
            <p style={{ margin: 0, color: '#592209', fontSize: '19px', lineHeight: 1.8, fontFamily: "'DM Sans', system-ui, sans-serif", fontStyle: 'italic', textShadow: '0 0 20px rgba(89,34,9,0.3)', wordBreak: 'break-word' }}>"{reading.positiveAffirmation}"</p>
          </motion.div>
        )}
      </div>

      {/* ── Card-by-card insights ──────────────────────────────────────── */}
      {reading.cardInsights && reading.cardInsights.length > 0 && (
        <div style={{ marginBottom: '48px', position: 'relative', zIndex: 10 }}>
          <h3 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '24px', letterSpacing: '4px', color: '#592209', textTransform: 'uppercase', marginBottom: '22px', textAlign: 'center' }}>
            What Each Card Is Telling You
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reading.cardInsights.map((n, i) => {
              const kt = karmaThemes[i] ?? karmaThemes[0];
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.1 + i * 0.1 }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '18px',
                    padding: '20px 22px',
                    background: `linear-gradient(160deg,${kt.color}0d 0%,rgba(89,34,9,0.01) 100%)`,
                    border: `1px solid ${kt.color}28`, borderRadius: '14px',
                  }}>
                  {cards[i] && (
                    <div style={{ position: 'relative', width: '56px', height: '86px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                      <CardFace card={cards[i]} size="sm" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 4px', fontSize: '13px', letterSpacing: '2px', color: 'rgba(48,22,7,1)', fontFamily: "'DM Sans', system-ui, sans-serif", textTransform: 'uppercase' }}>{n.position}</p>
                    <p style={{ margin: '0 0 10px', fontSize: '16px', color: kt.color, fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 600 }}>{n.card}</p>
                    <p style={{ margin: 0, fontSize: '17px', color: 'rgba(48,22,7,0.9)', lineHeight: 1.76, wordBreak: 'break-word' }}>{n.insight}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <ReadingNote />
      <ResetButton onReset={onReset} />
    </div>
  );
};

const ReadingNote = () => (
  <p style={{ position: 'relative', zIndex: 10, maxWidth: 560, margin: '0 auto 32px', padding: '0 20px', textAlign: 'center', fontSize: 15, lineHeight: 1.7, fontStyle: 'italic', color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
    This reading is AI-written reflection based on the cards you drew. It is not a prediction or professional advice.
  </p>
);

// ─── Reset button ─────────────────────────────────────────────────────────────
const ResetButton = ({ onReset }: { onReset: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
    style={{ textAlign: 'center', paddingBottom: '48px', position: 'relative', zIndex: 10 }}>
    <button onClick={onReset}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '16px 36px', background: 'transparent', border: '1px solid #592209', color: '#592209', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '4px', fontSize: '15px', textTransform: 'uppercase', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.3s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#592209'; (e.currentTarget as HTMLElement).style.color = '#F5E9D6'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 18px rgba(89,34,9,0.25)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#592209'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
      <RotateCcw size={15} /> Begin New Reading
    </button>
  </motion.div>
);

// ─── Loading Overlay ──────────────────────────────────────────────────────────
const LOADING_STEPS = [
  "Laying out your cards",
  "Reading each position",
  "Interpreting the cards together",
  "Preparing your reading",
];

const LoadingOverlay = () => (
  <FullScreenLoader title="Reading Your Cards" description="Interpreting your spread…" steps={LOADING_STEPS} testId="tarot-loader" />
);

// ─── Main Experience ──────────────────────────────────────────────────────────
const TarotExperience = () => {
  useFeatureTitle(FEATURES.tarot);
  const [phase, setPhase] = useState<Phase>('landing');
  const [mode, setMode] = useState<Mode | null>(null);
  const [question, setQuestion] = useState('');
  const [selectedCards, setSelectedCards] = useState<TarotCard[]>([]);
  const [reading, setReading] = useState<AIReading | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [readingError, setReadingError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  const positions = mode === 'timeline' ? TIMELINE_POSITIONS : KARMA_POSITIONS;
  const numCards = mode === 'timeline' ? 5 : 3;

  // Map each phase to the one the Back button should return to.
  // 'landing' has no override → route-level back navigates away from the page.
  const phaseBackMap: Partial<Record<Phase, Phase>> = {
    opening:  'landing',
    shuffling: 'opening',
    mode:     'landing',
    question: 'landing',
    spread:   mode === 'timeline' ? 'question' : 'landing',
    revealing: 'spread',
    reading:  'spread',
  };

  const targetPhase = phaseBackMap[phase] ?? null;
  useBackOverride(
    targetPhase !== null ? () => {
      if (phase === 'reading') { cancelReading(); setReading(null); }
      setPhase(targetPhase);
    } : null,
    [phase, mode],
  );

  // One in-flight request at a time; leaving the reading screen cancels it so a stale reply
  // can never be shown for a different set of cards.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const fetchReading = useCallback(async (cards: TarotCard[], modeArg: Mode, q: string) => {
    if (isLoadingRef.current) return; // ignore duplicate submissions
    const controller = new AbortController();
    abortRef.current = controller;
    isLoadingRef.current = true;
    setIsLoading(true);
    setReadingError(null);
    setReading(null);
    try {
      const res = await authedFetch(`${API_BASE_URL}/tarot/reading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Only card names are sent — the server supplies positions and does not trust client card text.
        body: JSON.stringify({ mode: modeArg, question: q, cards: cards.map(c => c.name) }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (res.ok && data?.success && data.data) setReading(data.data);
      else setReadingError(res.status === 429 ? 'Too many readings requested. Please wait a minute and try again.' : "We couldn't create your reading just now. Your cards are still here — please try again.");
    } catch (e) {
      if (controller.signal.aborted) return;
      if (e instanceof SignInRequiredError) { setReadingError('Please sign in to get your reading. Your cards are still here.'); return; }
      console.error('[Tarot] reading request failed:', e);
      setReadingError("We couldn't reach the reading service. Check your connection and try again.");
    } finally {
      if (abortRef.current === controller) {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    }
  }, []);

  const cancelReading = useCallback(() => {
    abortRef.current?.abort();
    isLoadingRef.current = false;
    setIsLoading(false);
    setReadingError(null);
  }, []);

  const handleCardSpreadComplete = useCallback((cards: TarotCard[]) => {
    setSelectedCards(cards);
    setReading(null);
    setPhase('revealing');
  }, []);

  const handleRevealComplete = useCallback(() => {
    setPhase('reading');
    if (mode) fetchReading(selectedCards, mode, question);
  }, [mode, selectedCards, question, fetchReading]);

  const handleReset = useCallback(() => {
    cancelReading();
    setPhase('landing');
    setMode(null);
    setQuestion('');
    setSelectedCards([]);
    setReading(null);
  }, [cancelReading]);

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', position: 'relative' }}>
      {isLoading && <LoadingOverlay />}

      <AnimatePresence mode="wait">
        {phase === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <TarotLandingScene
              onModeSelect={(id) => {
                if (id === 'life-timeline') { setMode('timeline'); setPhase('question'); }
                else { setMode('karma'); setPhase('spread'); }
              }}
            />
          </motion.div>
        )}

        {phase === 'opening' && (
          <motion.div key="opening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <OpeningScene onBegin={() => setPhase('shuffling')} />
          </motion.div>
        )}

        {phase === 'shuffling' && (
          <motion.div key="shuffling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <ShuffleScene onComplete={() => setPhase('question')} />
          </motion.div>
        )}

        {phase === 'question' && (
          <motion.div key="question" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}>
            <QuestionSelectScene onSelect={q => { setQuestion(q); setPhase('spread'); }} />
          </motion.div>
        )}

        {phase === 'spread' && (
          <motion.div key="spread" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <CardSpreadScene numCards={numCards} positions={positions} question={question} onComplete={handleCardSpreadComplete} />
          </motion.div>
        )}

        {phase === 'revealing' && (
          <motion.div key="revealing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <CardRevealScene cards={selectedCards} positions={positions} question={question} onComplete={handleRevealComplete} />
          </motion.div>
        )}

        {phase === 'reading' && reading && !isLoading && (
          <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
            {mode === 'timeline' ? (
              <TimelineReadingDisplay cards={selectedCards} positions={positions} question={question} reading={reading} onReset={handleReset} />
            ) : (
              <KarmaMirrorDisplay cards={selectedCards} positions={positions} reading={reading} onReset={handleReset} />
            )}
          </motion.div>
        )}

        {phase === 'reading' && !reading && !isLoading && readingError && (
          <motion.div key="reading-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <ReadingError
              message={readingError}
              cards={selectedCards}
              onRetry={() => mode && fetchReading(selectedCards, mode, question)}
              onReset={handleReset}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {(phase === 'landing' || (phase === 'reading' && reading && !isLoading)) && (
        <div>
          <TarotEducation />
        </div>
      )}
    </div>
  );
};

// ─── Error state (no made-up reading is ever shown when the service fails) ──────
const ReadingError = ({ message, cards, onRetry, onReset }: { message: string; cards: TarotCard[]; onRetry: () => void; onReset: () => void }) => (
  <div role="alert" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', background: 'transparent', textAlign: 'center' }}>
    <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
      {cards.map(c => (
        <span key={c.id} style={{ padding: '6px 14px', border: '1px solid rgba(89,34,9,0.4)', borderRadius: 20, color: '#592209', fontFamily: "'Cinzel', Georgia, serif", fontSize: 15 }}>{c.name}</span>
      ))}
    </div>
    <h2 style={{ margin: '0 0 12px', color: '#301607', fontFamily: "'Cinzel', Georgia, serif", fontSize: 'clamp(24px,4vw,34px)', letterSpacing: 2 }}>Your reading couldn&apos;t be created</h2>
    <p style={{ margin: '0 0 32px', maxWidth: 460, color: '#4A2E1F', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 17, lineHeight: 1.7 }}>{message}</p>
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
      <button onClick={onRetry} style={{ padding: '14px 32px', background: '#592209', border: 'none', borderRadius: 4, color: '#F5E9D6', fontFamily: "'Cinzel', Georgia, serif", letterSpacing: 3, fontSize: 15, textTransform: 'uppercase', cursor: 'pointer', fontWeight: 700 }}>Try Again</button>
      <button onClick={onReset} style={{ padding: '14px 32px', background: 'transparent', border: '1px solid rgba(89,34,9,0.5)', borderRadius: 4, color: '#592209', fontFamily: "'Cinzel', Georgia, serif", letterSpacing: 3, fontSize: 15, textTransform: 'uppercase', cursor: 'pointer' }}>Start Over</button>
    </div>
  </div>
);

export default TarotExperience;
