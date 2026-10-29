import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';

// Defines the logical parent for each route. Used as fallback when there
// is no browser history (e.g. user navigated directly to a deep URL).
const PARENT_ROUTES: Record<string, string> = {
  '/horoscopes':            '/',
  '/zodiac':                '/',
  '/compatibility':         '/',
  '/birth-chart':           '/',
  '/palm-reading':          '/',
  '/tarot':                 '/',
  '/blog':                  '/',
  '/about':                 '/',
  '/contact':               '/',
  '/inner-voice':           '/',
  '/inner-voice/chat':      '/inner-voice',
  '/inner-voice/dashboard': '/inner-voice',
  '/inner-voice/future-path': '/inner-voice',
  '/inner-voice/wisdom':    '/inner-voice',
  '/name-destiny-report':   '/',
  '/puja':                  '/',
  '/chadhawa':              '/',
  '/shop':                  '/',
  '/ratna-jyotish':         '/',
  '/avatar-live':           '/',
  '/avatar-live/darshan':   '/avatar-live',
  '/avatar-live/family':    '/avatar-live',
};

// Nested/dynamic routes: the first matching prefix decides the logical parent.
const NESTED_PARENTS: [string, string][] = [
  ['/zodiac/', '/zodiac'],
  ['/avatar-live/darshan/', '/avatar-live/darshan'],
  ['/ratna-jyotish/', '/ratna-jyotish'],
  ['/puja/', '/puja'],
  ['/chadhawa/', '/chadhawa'],
  ['/shop/', '/shop'],
];

export const getFallback = (pathname: string): string => {
  if (PARENT_ROUTES[pathname]) return PARENT_ROUTES[pathname];
  const nested = NESTED_PARENTS.find(([prefix]) => pathname.startsWith(prefix));
  return nested ? nested[1] : '/';
};

const BackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { onBackOverride } = useNavigation();

  // Never render on the home page, or on pages that already have their own
  // equivalent back navigation built into the layout (e.g. AI Guru's sidebar
  // "← Inner Voice" link) — otherwise the two overlap.
  if (location.pathname === '/' || location.pathname === '/inner-voice/chat') return null;

  const handleBack = () => {
    if (onBackOverride) {
      onBackOverride();
      return;
    }
    // Go back through history only when the previous entry belongs to this app.
    // `location.key === 'default'` marks the first in-app entry (deep link, refresh or
    // arriving from another site), where navigate(-1) would leave the site.
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(getFallback(location.pathname));
    }
  };

  return (
    // Fixed below the navbar (navbar is ~64-72px tall).
    // pointer-events-none on the wrapper so it never blocks scroll events outside the button.
    <div className="fixed top-[76px] left-4 md:left-6 z-40 pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.button
          key={location.pathname}
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14 }}
          transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={handleBack}
          aria-label="Go back to previous page"
          className={[
            'pointer-events-auto',
            'group flex items-center gap-1.5',
            'px-3.5 py-2.5 rounded-xl',
            // glass surface
            'bg-[rgba(8,10,18,0.62)] backdrop-blur-md',
            // border — dim terracotta that brightens on hover
            'border border-[rgba(188,106,77,0.16)]',
            'hover:border-[rgba(188,106,77,0.44)]',
            // text — dim terracotta → full terracotta
            'text-[rgba(188,106,77,0.50)]',
            'hover:text-[#BC6A4D]',
            // glow on hover
            'hover:bg-[rgba(8,10,18,0.82)]',
            'hover:shadow-[0_0_18px_rgba(188,106,77,0.10)]',
            // transitions
            'transition-all duration-300 ease-out',
            // accessibility
            'cursor-pointer select-none',
            'focus:outline-none',
            'focus-visible:ring-2 focus-visible:ring-[rgba(188,106,77,0.48)]',
            'focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
            // minimum touch target
            'min-h-[44px] min-w-[44px]',
          ].join(' ')}
        >
          {/* Arrow slides left on hover */}
          <ChevronLeft
            size={15}
            aria-hidden="true"
            className="flex-shrink-0 transition-transform duration-300 ease-out group-hover:-translate-x-0.5"
          />
          {/* Label */}
          <span
            className="text-[10px] tracking-[3px] uppercase leading-none"
            style={{ fontFamily: "'Astra','Iceland',sans-serif" }}
          >
            Back
          </span>
        </motion.button>
      </AnimatePresence>
    </div>
  );
};

export default BackButton;
