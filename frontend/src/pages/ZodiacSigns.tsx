// import { useEffect, useRef, useState, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import gsap from 'gsap';
// import { ScrollTrigger } from 'gsap/ScrollTrigger';
// import { motion, AnimatePresence } from 'framer-motion';
// import { ArrowRight, Flame, Mountain, Wind, Droplets } from 'lucide-react';
// import { zodiacSigns, ZodiacSign } from '@/data/zodiacData';
// import ZodiacCard from '@/components/ZodiacCard';
// import ElementSelector from '@/components/astrology/ElementSelector';

// // Import zodiac line-art images
// import ariesImg from '@/assets/zodiac/aries.png';
// import taurusImg from '@/assets/zodiac/taurus.png';
// import geminiImg from '@/assets/zodiac/gemini.png';
// import cancerImg from '@/assets/zodiac/cancer.png';
// import leoImg from '@/assets/zodiac/leo.png';
// import virgoImg from '@/assets/zodiac/virgo.png';
// import libraImg from '@/assets/zodiac/libra.png';
// import scorpioImg from '@/assets/zodiac/scorpio.png';
// import sagittariusImg from '@/assets/zodiac/sagittarius.png';
// import capricornImg from '@/assets/zodiac/capricorn.png';
// import aquariusImg from '@/assets/zodiac/aquarius.png';
// import piscesImg from '@/assets/zodiac/pisces.png';

// gsap.registerPlugin(ScrollTrigger);

// // Zodiac images mapping
// const zodiacImages: Record<string, string> = {
//   Aries: ariesImg,
//   Taurus: taurusImg,
//   Gemini: geminiImg,
//   Cancer: cancerImg,
//   Leo: leoImg,
//   Virgo: virgoImg,
//   Libra: libraImg,
//   Scorpio: scorpioImg,
//   Sagittarius: sagittariusImg,
//   Capricorn: capricornImg,
//   Aquarius: aquariusImg,
//   Pisces: piscesImg,
// };

// // Element icons mapping
// const elementIcons = {
//   Fire: Flame,
//   Earth: Mountain,
//   Air: Wind,
//   Water: Droplets,
// };

// // Element colors
// const elementColors = {
//   Fire: 'text-amber-800',
//   Earth: 'text-green-800',
//   Air: 'text-blue-800',
//   Water: 'text-indigo-800',
// };

// const AUTO_CYCLE_INTERVAL = 2500;  // ms each sign stays highlighted
// const INACTIVITY_TIMEOUT = 10000; // resume auto after 10s of no interaction

// const ZodiacSigns = () => {
//   const navigate = useNavigate();
//   const pageRef = useRef<HTMLDivElement>(null);
//   const wheelRef = useRef<HTMLDivElement>(null);
//   const rotationRef = useRef<gsap.core.Tween | null>(null);
//   const autoIntervalRef = useRef<NodeJS.Timeout | null>(null);
//   const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   // Tracks index into zodiacSigns[] for clockwise stepping (avoids stale closure)
//   const autoIndexRef = useRef(0);
//   const isAnimatingRef = useRef(false);
//   // Single label element tracked via RAF — follows the rotating icon
//   const activeLabelRef = useRef<HTMLSpanElement | null>(null);
//   const labelRafRef = useRef<number | null>(null);

//   const [selectedSign, setSelectedSign] = useState<ZodiacSign>(zodiacSigns[0]);
//   const [isAutoMode, setIsAutoMode] = useState(true);
//   const [isAnimating, setIsAnimating] = useState(false);
//   const [selectedElement, setSelectedElement] = useState<string | null>(null);

//   // Initialize continuous wheel rotation
//   useEffect(() => {
//     if (wheelRef.current) {
//       rotationRef.current = gsap.to(wheelRef.current, {
//         rotation: 360,
//         duration: 90,
//         ease: 'none',
//         repeat: -1,
//         transformOrigin: 'center center',
//       });
//     }

//     return () => {
//       rotationRef.current?.kill();
//     };
//   }, []);

//   // Sequential clockwise auto-cycle
//   // zodiacSigns order: Aries(0) Taurus(1) ... Pisces(11)
//   // Clockwise step: (index + 1) % 12
//   // Sequence: Aries→Taurus→Gemini→Cancer→...→Pisces→Aries
//   useEffect(() => {
//     if (!isAutoMode) return;

//     autoIntervalRef.current = setInterval(() => {
//       if (isAnimatingRef.current) return;

//       isAnimatingRef.current = true;
//       setIsAnimating(true);

//       setTimeout(() => {
//         const nextIndex = (autoIndexRef.current + 1) % 12;
//         autoIndexRef.current = nextIndex;
//         setSelectedSign(zodiacSigns[nextIndex]);
//         isAnimatingRef.current = false;
//         setIsAnimating(false);
//       }, 400);
//     }, AUTO_CYCLE_INTERVAL);

//     return () => {
//       if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
//     };
//   }, [isAutoMode]);

//   // Reset inactivity timeout
//   const resetInactivityTimeout = useCallback(() => {
//     if (inactivityTimeoutRef.current) {
//       clearTimeout(inactivityTimeoutRef.current);
//     }
//     inactivityTimeoutRef.current = setTimeout(() => {
//       setIsAutoMode(true);
//     }, INACTIVITY_TIMEOUT);
//   }, []);

//   // Handle sign click — pause auto, jump to sign, resume after inactivity
//   const handleSignClick = useCallback((sign: ZodiacSign) => {
//     setIsAutoMode(false);
//     if (isAnimatingRef.current) return;

//     isAnimatingRef.current = true;
//     setIsAnimating(true);

//     const clickedIndex = zodiacSigns.findIndex(s => s.name === sign.name);
//     autoIndexRef.current = clickedIndex;

//     setTimeout(() => {
//       setSelectedSign(sign);
//       isAnimatingRef.current = false;
//       setIsAnimating(false);
//     }, 400);

//     resetInactivityTimeout();
//   }, [resetInactivityTimeout]);

//   // Navigate to detail page
//   const handleReadMore = useCallback(() => {
//     navigate(`/zodiac/${selectedSign.name.toLowerCase()}`);
//   }, [navigate, selectedSign]);

//   // RAF loop: recompute label position every frame from GSAP's live rotation.
//   // Icons sit at radius 42% of the INNER container (wheelRef, inset-[10%] = 80% of outer).
//   // Icon radius in outer-container coordinates: 42 × 0.80 = 33.6 %.
//   // We place the label at LABEL_RADIUS % in outer coords — just past the icon edge.
//   useEffect(() => {
//     const selectedIndex = zodiacSigns.findIndex(s => s.name === selectedSign.name);
//     const baseAngleDeg = selectedIndex * 30 - 90; // icon's rest angle
//     const LABEL_RADIUS = 47; // outer-container %, ~15px past icon edge at new size

//     const tick = () => {
//       if (wheelRef.current && activeLabelRef.current) {
//         const rot = (gsap.getProperty(wheelRef.current, 'rotation') as number) || 0;
//         const angleRad = (baseAngleDeg + rot) * (Math.PI / 180);
//         activeLabelRef.current.style.left = `${50 + Math.cos(angleRad) * LABEL_RADIUS}%`;
//         activeLabelRef.current.style.top  = `${50 + Math.sin(angleRad) * LABEL_RADIUS}%`;
//       }
//       labelRafRef.current = requestAnimationFrame(tick);
//     };

//     labelRafRef.current = requestAnimationFrame(tick);
//     return () => { if (labelRafRef.current) cancelAnimationFrame(labelRafRef.current); };
//   }, [selectedSign]);

//   useEffect(() => {
//     const ctx = gsap.context(() => {
//       gsap.fromTo(
//         '.page-title',
//         { opacity: 0, y: 30 },
//         { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
//       );

//       gsap.fromTo(
//         '.zodiac-card',
//         { opacity: 0, y: 40, scale: 0.95 },
//         {
//           opacity: 1,
//           y: 0,
//           scale: 1,
//           stagger: 0.08,
//           duration: 0.6,
//           ease: 'power3.out',
//           scrollTrigger: {
//             trigger: '.zodiac-grid',
//             start: 'top 85%',
//           },
//         }
//       );
//     }, pageRef);

//     return () => ctx.revert();
//   }, []);

//   const ElementIcon = elementIcons[selectedSign.element];

//   return (
//     <div ref={pageRef} className="min-h-screen pt-24 pb-12 relative z-10">
//       <div className="container mx-auto px-4">
//         {/* Interactive Zodiac Wheel Section - Same as Homepage */}
//         <section className="relative py-8 mb-16 overflow-hidden">
//           {/* Background cosmic effects */}
//           <div className="absolute inset-0 pointer-events-none">
//             <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/12 rounded-full blur-[100px]" />
//             <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/8 rounded-full blur-[80px]" />
//           </div>

//           {/* Section header */}
//           <div className="text-center mb-12">
//             <h1 className="page-title font-display text-4xl md:text-5xl lg:text-6xl text-glow text-primary mb-4">
//               The Twelve Zodiac Signs
//             </h1>
//             <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
//               Explore the unique characteristics, traits, and cosmic energies of each zodiac sign in the celestial wheel
//             </p>
//           </div>

//           {/* Main content - Left info + Right wheel */}
//           <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[550px]">
//             {/* Left: Info Panel */}
//             <div className="order-2 lg:order-1">
//               <div className="glass-card rounded-3xl p-8 md:p-10 min-h-[420px] flex flex-col justify-center relative overflow-hidden">
//                 {/* Decorative corners */}
//                 <div className="absolute top-4 left-4 w-6 h-6 border-l border-t border-primary/40" />
//                 <div className="absolute top-4 right-4 w-6 h-6 border-r border-t border-primary/40" />
//                 <div className="absolute bottom-4 left-4 w-6 h-6 border-l border-b border-primary/40" />
//                 <div className="absolute bottom-4 right-4 w-6 h-6 border-r border-b border-primary/40" />

//                 {/* Auto mode indicator */}
//                 <div className="absolute top-4 left-1/2 -translate-x-1/2">
//                   <div className={`flex items-center gap-2 text-xs uppercase tracking-widest transition-opacity duration-300 ${isAutoMode ? 'opacity-60' : 'opacity-0'}`}>
//                     <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
//                     <span className="text-muted-foreground">Auto-exploring</span>
//                   </div>
//                 </div>

//                 <AnimatePresence mode="wait">
//                   <motion.div
//                     key={selectedSign.name}
//                     initial={{ opacity: 0, y: 20 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     exit={{ opacity: 0, y: -10 }}
//                     transition={{ duration: 0.4, ease: 'easeOut' }}
//                     className="flex flex-col"
//                   >
//                     {/* Element badge */}
//                     <div className="flex items-center gap-2 mb-4">
//                       <ElementIcon className={`w-4 h-4 ${elementColors[selectedSign.element]}`} />
//                       <span className={`text-sm uppercase tracking-[0.2em] ${elementColors[selectedSign.element]}`}>
//                         {selectedSign.element} Element
//                       </span>
//                     </div>

//                     {/* Zodiac image + name */}
//                     <div className="flex items-center gap-5 mb-4">
//                       <div className="w-20 h-20 relative flex-shrink-0">
//                         <img 
//                           src={zodiacImages[selectedSign.name]} 
//                           alt={selectedSign.name}
//                           className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(89,34,9,0.4)]"
//                         />
//                       </div>
//                       <div>
//                         <h3 className="font-display text-3xl md:text-4xl tracking-wider text-foreground">
//                           {selectedSign.name}
//                         </h3>
//                         <p className="text-muted-foreground text-lg tracking-wide">
//                           {selectedSign.dates}
//                         </p>
//                       </div>
//                     </div>

//                     {/* Ruling planet */}
//                     <div className="text-base text-muted-foreground mb-4">
//                       Ruled by <span className="text-primary">{selectedSign.ruling}</span>
//                     </div>

//                     {/* Description */}
//                     <p className="text-foreground/90 text-base md:text-lg leading-relaxed mb-6">
//                       {selectedSign.description}
//                     </p>

//                     {/* Traits preview */}
//                     <div className="flex flex-wrap gap-2 mb-8">
//                       {selectedSign.traits.slice(0, 4).map((trait, index) => (
//                         <span 
//                           key={index}
//                           className="px-3 py-1 text-sm rounded-full border border-primary/30 text-primary/80 bg-primary/5"
//                         >
//                           {trait}
//                         </span>
//                       ))}
//                     </div>

//                     {/* Read more button */}
//                     <motion.button
//                       onClick={handleReadMore}
//                       className="btn-outline-cosmic btn-pulse px-6 py-3 rounded-lg inline-flex items-center gap-2 w-fit group"
//                       whileHover={{ scale: 1.02 }}
//                       whileTap={{ scale: 0.98 }}
//                     >
//                       <span>Read Full Profile</span>
//                       <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
//                     </motion.button>
//                   </motion.div>
//                 </AnimatePresence>
//               </div>
//             </div>

//             {/* Right: Zodiac Wheel */}
//             <div className="order-1 lg:order-2 flex items-center justify-center">
//               <div className="zodiac-wheel--active relative w-full max-w-[680px] aspect-square">

//                 {/* Ambient glow behind the entire wheel */}
//                 <div
//                   className="absolute inset-[-8%] rounded-full pointer-events-none"
//                   style={{
//                     background: 'radial-gradient(ellipse 75% 75% at 50% 50%, rgba(89,34,9,0.08) 0%, rgba(89,34,9,0.05) 55%, transparent 75%)',
//                   }}
//                 />

//                 {/* Outer static decorative rings */}
//                 <div className="absolute inset-0 rounded-full border border-primary/25" style={{ boxShadow: '0 0 18px rgba(89,34,9,0.10) inset' }} />
//                 <div className="absolute inset-[5%] rounded-full border border-primary/32" />

//                 {/* Rotating wheel container */}
//                 <div
//                   ref={wheelRef}
//                   className="absolute inset-[10%] rounded-full"
//                 >
//                   {/* Inner circles */}
//                   <div className="absolute inset-0 rounded-full border border-primary/38" style={{ boxShadow: '0 0 12px rgba(89,34,9,0.12) inset' }} />
//                   <div className="absolute inset-[15%] rounded-full border border-primary/28 border-dashed" />
//                   <div className="absolute inset-[35%] rounded-full border border-primary/22" />

//                   {/* Division lines */}
//                   {Array.from({ length: 12 }).map((_, i) => (
//                     <div
//                       key={`line-${i}`}
//                       className="absolute top-1/2 left-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/30 to-primary/12 origin-left"
//                       style={{ transform: `rotate(${i * 30}deg)` }}
//                     />
//                   ))}

//                   {/* Center glow */}
//                   <div
//                     className="absolute inset-[36%] rounded-full pointer-events-none"
//                     style={{
//                       background: 'radial-gradient(circle, rgba(89,34,9,0.08) 0%, rgba(89,34,9,0.08) 45%, transparent 70%)',
//                     }}
//                   />

//                   {/* Zodiac icons positioned in a proper circle */}
//                   {zodiacSigns.map((sign, index) => {
//                     const angle = (index * 30 - 90) * (Math.PI / 180);
//                     const radius = 43; // slightly wider orbit for larger icons
//                     const x = 50 + Math.cos(angle) * radius;
//                     const y = 50 + Math.sin(angle) * radius;
//                     const isSelected = selectedSign.name === sign.name;

//                     return (
//                       <button
//                         key={sign.name}
//                         onClick={() => handleSignClick(sign)}
//                         className="zodiac-wheel-btn absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
//                         style={{ left: `${x}%`, top: `${y}%` }}
//                       >
//                         <span className="relative block">
//                           {/* Radial glow behind active constellation */}
//                           <span className={`zodiac-wheel-glow${isSelected ? ' zodiac-wheel-glow--active' : ''}`} />
//                           <img
//                             src={zodiacImages[sign.name]}
//                             alt={sign.name}
//                             className={`w-12 h-12 md:w-14 md:h-14 object-contain zodiac-wheel-icon${isSelected ? ' zodiac-wheel-icon--selected' : ''}`}
//                           />
//                         </span>
//                       </button>
//                     );
//                   })}
//                 </div>

//                 {/* Center sun icon with pulse ring */}
//                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
//                   {/* Slow pulse ring */}
//                   <div
//                     className="absolute inset-[-50%] rounded-full pointer-events-none"
//                     style={{
//                       background: 'radial-gradient(circle, rgba(89,34,9,0.08) 0%, transparent 65%)',
//                       animation: 'wheel-center-pulse 4s ease-in-out infinite',
//                     }}
//                   />
//                   <div className="relative w-16 h-16 rounded-full flex items-center justify-center"
//                     style={{ background: 'radial-gradient(circle, rgba(89,34,9,0.08) 0%, transparent 70%)' }}
//                   >
//                     <span
//                       className="text-3xl text-primary"
//                       style={{ filter: 'drop-shadow(0 0 10px rgba(89,34,9,0.75)) drop-shadow(0 0 22px rgba(89,34,9,0.38))' }}
//                     >
//                       ☉
//                     </span>
//                   </div>
//                 </div>

//                 {/* Single active-sign label — position driven by RAF, zero React re-renders */}
//                 <span
//                   ref={activeLabelRef}
//                   className="absolute font-display text-[11px] font-semibold uppercase tracking-[0.15em] pointer-events-none whitespace-nowrap"
//                   style={{
//                     transform: 'translate(-50%, -50%)',
//                     color: '#592209',
//                     opacity: isAnimating ? 0 : 1,
//                     transition: 'opacity 350ms ease',
//                     textShadow:
//                       '0 0 12px rgba(244,178,106,0.90), 0 0 24px rgba(244,178,106,0.40), 0 1px 4px rgba(4,12,37,0.96)',
//                     willChange: 'opacity, left, top',
//                   }}
//                 >
//                   {selectedSign.name}
//                 </span>

//                 {/* Decorative corner stars */}
//                 {[
//                   { top: '5%', left: '10%' },
//                   { top: '8%', right: '15%' },
//                   { bottom: '10%', left: '8%' },
//                   { bottom: '15%', right: '12%' },
//                 ].map((pos, i) => (
//                   <div
//                     key={`star-${i}`}
//                     className="absolute w-1.5 h-1.5 rounded-full bg-primary/65 animate-pulse"
//                     style={{ ...pos, animationDelay: `${i * 0.5}s`, boxShadow: '0 0 6px rgba(89,34,9,0.5)' }}
//                   />
//                 ))}
//               </div>
//             </div>
//           </div>
//         </section>

//         {/* Element Selector */}
//         <div className="mb-14">
//           <ElementSelector
//             selectedElement={selectedElement}
//             onSelect={setSelectedElement}
//           />
//         </div>

//         {/* Zodiac Grid — filtered by element when one is selected */}
//         <div className="zodiac-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 justify-items-center">
//           {zodiacSigns
//             .filter(sign => !selectedElement || sign.element === selectedElement)
//             .map((sign, index) => (
//               <div key={sign.name} className="zodiac-card">
//                 <ZodiacCard sign={sign} index={index} />
//               </div>
//             ))
//           }
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ZodiacSigns;


//komal

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Flame, Mountain, Wind, Droplets } from 'lucide-react';
import { zodiacSigns, ZodiacSign } from '@/data/zodiacData';
import ZodiacCard from '@/components/ZodiacCard';
import ElementSelector from '@/components/astrology/ElementSelector';
import ZodiacEducation from '@/components/ZodiacEducation';

// Import zodiac line-art images
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

gsap.registerPlugin(ScrollTrigger);

// Zodiac images mapping
const zodiacImages: Record<string, string> = {
  Aries: ariesImg,
  Taurus: taurusImg,
  Gemini: geminiImg,
  Cancer: cancerImg,
  Leo: leoImg,
  Virgo: virgoImg,
  Libra: libraImg,
  Scorpio: scorpioImg,
  Sagittarius: sagittariusImg,
  Capricorn: capricornImg,
  Aquarius: aquariusImg,
  Pisces: piscesImg,
};

// Element icons mapping
const elementIcons = {
  Fire: Flame,
  Earth: Mountain,
  Air: Wind,
  Water: Droplets,
};

// Element colors
const elementColors = {
  Fire: 'text-amber-800',
  Earth: 'text-green-800',
  Air: 'text-blue-800',
  Water: 'text-indigo-800',
};

const AUTO_CYCLE_INTERVAL = 2500;  // ms each sign stays highlighted
const INACTIVITY_TIMEOUT = 10000; // resume auto after 10s of no interaction

const ZodiacSigns = () => {
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef<gsap.core.Tween | null>(null);
  const autoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Pending 'advance to next sign' timer, so a user click can cancel it instead of racing it.
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks index into zodiacSigns[] for clockwise stepping (avoids stale closure)
  const autoIndexRef = useRef(0);
  const isAnimatingRef = useRef(false);
  // Single label element tracked via RAF — follows the rotating icon
  const activeLabelRef = useRef<HTMLSpanElement | null>(null);
  const labelRafRef = useRef<number | null>(null);

  const [selectedSign, setSelectedSign] = useState<ZodiacSign>(zodiacSigns[0]);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  // Initialize continuous wheel rotation
  useEffect(() => {
    if (wheelRef.current) {
      rotationRef.current = gsap.to(wheelRef.current, {
        rotation: 360,
        duration: 90,
        ease: 'none',
        repeat: -1,
        transformOrigin: 'center center',
      });
    }

    return () => {
      rotationRef.current?.kill();
    };
  }, []);

  // Sequential clockwise auto-cycle
  // zodiacSigns order: Aries(0) Taurus(1) ... Pisces(11)
  // Clockwise step: (index + 1) % 12
  // Sequence: Aries→Taurus→Gemini→Cancer→...→Pisces→Aries
  useEffect(() => {
    if (!isAutoMode) return;

    autoIntervalRef.current = setInterval(() => {
      if (isAnimatingRef.current) return;

      isAnimatingRef.current = true;
      setIsAnimating(true);

      autoAdvanceTimeoutRef.current = setTimeout(() => {
        const nextIndex = (autoIndexRef.current + 1) % 12;
        autoIndexRef.current = nextIndex;
        setSelectedSign(zodiacSigns[nextIndex]);
        isAnimatingRef.current = false;
        setIsAnimating(false);
      }, 400);
    }, AUTO_CYCLE_INTERVAL);

    return () => {
      if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
    };
  }, [isAutoMode]);

  useEffect(() => () => {
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
  }, []);

  // Reset inactivity timeout
  const resetInactivityTimeout = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    inactivityTimeoutRef.current = setTimeout(() => {
      setIsAutoMode(true);
    }, INACTIVITY_TIMEOUT);
  }, []);

  // Handle sign click — pause auto, jump to sign, resume after inactivity
  const handleSignClick = useCallback((sign: ZodiacSign) => {
    setIsAutoMode(false);
    // A click always wins: cancel any auto-advance that is mid-transition so it can't overwrite this selection.
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);

    isAnimatingRef.current = true;
    setIsAnimating(true);

    const clickedIndex = zodiacSigns.findIndex(s => s.name === sign.name);
    autoIndexRef.current = clickedIndex;

    setTimeout(() => {
      setSelectedSign(sign);
      isAnimatingRef.current = false;
      setIsAnimating(false);
    }, 400);

    resetInactivityTimeout();
  }, [resetInactivityTimeout]);

  // Navigate to detail page
  const handleReadMore = useCallback(() => {
    navigate(`/zodiac/${selectedSign.name.toLowerCase()}`);
  }, [navigate, selectedSign]);

  // RAF loop: recompute label position every frame from GSAP's live rotation.
  // Icons sit at radius 42% of the INNER container (wheelRef, inset-[10%] = 80% of outer).
  // Icon radius in outer-container coordinates: 42 × 0.80 = 33.6 %.
  // We place the label at LABEL_RADIUS % in outer coords — just past the icon edge.
  useEffect(() => {
    const selectedIndex = zodiacSigns.findIndex(s => s.name === selectedSign.name);
    const baseAngleDeg = selectedIndex * 30 - 90; // icon's rest angle
    const LABEL_RADIUS = 47; // outer-container %, ~15px past icon edge at new size

    const tick = () => {
      if (wheelRef.current && activeLabelRef.current) {
        const rot = (gsap.getProperty(wheelRef.current, 'rotation') as number) || 0;
        const angleRad = (baseAngleDeg + rot) * (Math.PI / 180);
        activeLabelRef.current.style.left = `${50 + Math.cos(angleRad) * LABEL_RADIUS}%`;
        activeLabelRef.current.style.top  = `${50 + Math.sin(angleRad) * LABEL_RADIUS}%`;
      }
      labelRafRef.current = requestAnimationFrame(tick);
    };

    labelRafRef.current = requestAnimationFrame(tick);
    return () => { if (labelRafRef.current) cancelAnimationFrame(labelRafRef.current); };
  }, [selectedSign]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.page-title',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
      );

      gsap.fromTo(
        '.zodiac-card',
        { opacity: 0, y: 40, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          stagger: 0.08,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.zodiac-grid',
            start: 'top 85%',
          },
        }
      );
    }, pageRef);

    return () => ctx.revert();
  }, []);

  const ElementIcon = elementIcons[selectedSign.element];

  return (
    <div ref={pageRef} className="min-h-screen pt-24 pb-12 relative z-10">
      <div className="container mx-auto px-4">
        {/* Interactive Zodiac Wheel Section - Same as Homepage */}
        <section className="relative py-8 mb-16 overflow-hidden">
          {/* Background cosmic effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/12 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/8 rounded-full blur-[80px]" />
          </div>

          {/* Section header */}
          <div className="text-center mb-12">
            <h1 className="page-title font-display text-4xl md:text-5xl lg:text-6xl text-glow text-primary mb-4">
              The Twelve Zodiac Signs
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
              Explore the traditional traits, elements and symbolism of each zodiac sign. Tap a sign on the wheel to read about it.
            </p>
            <p className="text-muted-foreground/80 text-sm max-w-2xl mx-auto mt-3">
              Dates shown are the commonly used Western (tropical) Sun-sign ranges.
            </p>
          </div>

          {/* Main content - Left info + Right wheel */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[550px]">
            {/* Left: Info Panel */}
            <div className="order-2 lg:order-1">
              <div className="glass-card rounded-3xl p-8 md:p-10 min-h-[420px] flex flex-col justify-center relative overflow-hidden">
                {/* Decorative corners */}
                <div className="absolute top-4 left-4 w-6 h-6 border-l border-t border-primary/40" />
                <div className="absolute top-4 right-4 w-6 h-6 border-r border-t border-primary/40" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-l border-b border-primary/40" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-r border-b border-primary/40" />

                {/* Auto mode indicator */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2">
                  <div className={`flex items-center gap-2 text-xs uppercase tracking-widest transition-opacity duration-300 ${isAutoMode ? 'opacity-90' : 'opacity-0'}`}>
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-muted-foreground">Auto-exploring</span>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedSign.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="flex flex-col"
                  >
                    {/* Element badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <ElementIcon className={`w-4 h-4 ${elementColors[selectedSign.element]}`} />
                      <span className={`text-sm uppercase tracking-[0.2em] ${elementColors[selectedSign.element]}`}>
                        {selectedSign.element} Element
                      </span>
                    </div>

                    {/* Zodiac image + name */}
                    <div className="flex items-center gap-5 mb-4">
                      <div className="w-20 h-20 relative flex-shrink-0">
                        <img 
                          src={zodiacImages[selectedSign.name]} 
                          alt={selectedSign.name}
                          className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(245,195,106,0.4)]"
                        />
                      </div>
                      <div>
                        <h3 className="font-display text-3xl md:text-4xl tracking-wider text-foreground">
                          {selectedSign.name}
                        </h3>
                        <p className="text-muted-foreground text-lg tracking-wide">
                          {selectedSign.dates}
                        </p>
                      </div>
                    </div>

                    {/* Ruling planet */}
                    <div className="text-base text-muted-foreground mb-4">
                      Ruled by <span className="text-primary">{selectedSign.ruling}</span>
                    </div>

                    {/* Description */}
                    <p className="text-foreground/90 text-base md:text-lg leading-relaxed mb-6">
                      {selectedSign.description}
                    </p>

                    {/* Traits preview */}
                    <div className="flex flex-wrap gap-2 mb-8">
                      {selectedSign.traits.slice(0, 4).map((trait, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1 text-sm rounded-full border border-primary/30 text-primary/80 bg-primary/5"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>

                    {/* Read more button */}
                    <motion.button
                      onClick={handleReadMore}
                      className="btn-outline-cosmic btn-pulse px-6 py-3 rounded-lg inline-flex items-center gap-2 w-fit group"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span>Read Full Profile</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Right: Zodiac Wheel */}
            <div className="order-1 lg:order-2 flex items-center justify-center">
              <div className="zodiac-wheel--active relative w-full max-w-[680px] aspect-square">

                {/* Ambient glow behind the entire wheel */}
                <div
                  className="absolute inset-[-8%] rounded-full pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse 75% 75% at 50% 50%, rgba(89,34,9,0.08) 0%, rgba(89,34,9,0.05) 55%, transparent 75%)',
                  }}
                />

                {/* Outer static decorative rings */}
                <div className="absolute inset-0 rounded-full border border-primary/25" style={{ boxShadow: '0 0 18px rgba(89,34,9,0.10) inset' }} />
                <div className="absolute inset-[5%] rounded-full border border-primary/32" />

                {/* Rotating wheel container */}
                <div
                  ref={wheelRef}
                  className="absolute inset-[10%] rounded-full"
                >
                  {/* Inner circles */}
                  <div className="absolute inset-0 rounded-full border border-primary/38" style={{ boxShadow: '0 0 12px rgba(89,34,9,0.12) inset' }} />
                  <div className="absolute inset-[15%] rounded-full border border-primary/28 border-dashed" />
                  <div className="absolute inset-[35%] rounded-full border border-primary/22" />

                  {/* Division lines */}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={`line-${i}`}
                      className="absolute top-1/2 left-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/30 to-primary/12 origin-left"
                      style={{ transform: `rotate(${i * 30}deg)` }}
                    />
                  ))}

                  {/* Center glow */}
                  <div
                    className="absolute inset-[36%] rounded-full pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle, rgba(229,138,69,0.28) 0%, rgba(89,34,9,0.08) 45%, transparent 70%)',
                    }}
                  />

                  {/* Zodiac icons positioned in a proper circle */}
                  {zodiacSigns.map((sign, index) => {
                    const angle = (index * 30 - 90) * (Math.PI / 180);
                    const radius = 43; // slightly wider orbit for larger icons
                    const x = 50 + Math.cos(angle) * radius;
                    const y = 50 + Math.sin(angle) * radius;
                    const isSelected = selectedSign.name === sign.name;

                    return (
                      <button
                        key={sign.name}
                        onClick={() => handleSignClick(sign)}
                        aria-label={`Show ${sign.name}, ${sign.dates}`}
                        aria-pressed={isSelected}
                        className="zodiac-wheel-btn absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                        style={{ left: `${x}%`, top: `${y}%` }}
                      >
                        <span className="relative block">
                          {/* Radial glow behind active constellation */}
                          <span className={`zodiac-wheel-glow${isSelected ? ' zodiac-wheel-glow--active' : ''}`} />
                          <img
                            src={zodiacImages[sign.name]}
                            alt={sign.name}
                            className={`w-12 h-12 md:w-14 md:h-14 object-contain zodiac-wheel-icon${isSelected ? ' zodiac-wheel-icon--selected' : ''}`}
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Center sun icon with pulse ring */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  {/* Slow pulse ring */}
                  <div
                    className="absolute inset-[-50%] rounded-full pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle, rgba(229,138,69,0.22) 0%, transparent 65%)',
                      animation: 'wheel-center-pulse 4s ease-in-out infinite',
                    }}
                  />
                  <div className="relative w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'radial-gradient(circle, rgba(89,34,9,0.08) 0%, transparent 70%)' }}
                  >
                    <span
                      className="text-3xl text-primary"
                      style={{ filter: 'drop-shadow(0 0 10px rgba(229,138,69,0.75)) drop-shadow(0 0 22px rgba(229,138,69,0.38))' }}
                    >
                      ☉
                    </span>
                  </div>
                </div>

                {/* Single active-sign label — position driven by RAF, zero React re-renders */}
                <span
                  ref={activeLabelRef}
                  className="absolute font-display text-[11px] font-semibold uppercase tracking-[0.15em] pointer-events-none whitespace-nowrap"
                  style={{
                    transform: 'translate(-50%, -50%)',
                    color: '#6B4A37',
                    opacity: isAnimating ? 0 : 1,
                    transition: 'opacity 350ms ease',
                    textShadow:
                      '0 0 12px rgba(229,138,69,0.90), 0 0 24px rgba(229,138,69,0.40), 0 1px 4px rgba(89,34,9,0.2)',
                    willChange: 'opacity, left, top',
                  }}
                >
                  {selectedSign.name}
                </span>

                {/* Decorative corner stars */}
                {[
                  { top: '5%', left: '10%' },
                  { top: '8%', right: '15%' },
                  { bottom: '10%', left: '8%' },
                  { bottom: '15%', right: '12%' },
                ].map((pos, i) => (
                  <div
                    key={`star-${i}`}
                    className="absolute w-1.5 h-1.5 rounded-full bg-primary/65 animate-pulse"
                    style={{ ...pos, animationDelay: `${i * 0.5}s`, boxShadow: '0 0 6px rgba(229,138,69,0.5)' }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Element Selector */}
        <div className="mb-14">
          <ElementSelector
            selectedElement={selectedElement}
            onSelect={setSelectedElement}
          />
        </div>

        {/* Zodiac Grid — filtered by element when one is selected */}
        <div className="zodiac-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 justify-items-center">
          {zodiacSigns
            .filter(sign => !selectedElement || sign.element === selectedElement)
            .map((sign, index) => (
              <div key={sign.name} className="zodiac-card">
                <ZodiacCard sign={sign} index={index} />
              </div>
            ))
          }
        </div>

        <ZodiacEducation />
      </div>
    </div>
  );
};

export default ZodiacSigns;