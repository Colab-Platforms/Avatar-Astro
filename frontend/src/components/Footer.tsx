import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Facebook, Linkedin, Instagram, Twitter, ArrowRight } from 'lucide-react';
import { FEATURES } from '@/data/featureCatalog';
import { subscribeNewsletter } from '@/lib/inquiry';

const exploreLinks = [
  { label: 'Daily Horoscopes', path: '/horoscopes' },
  { label: FEATURES.zodiac.name, path: FEATURES.zodiac.path },
  { label: FEATURES.compatibility.name, path: FEATURES.compatibility.path },
  { label: FEATURES.birthChart.name, path: FEATURES.birthChart.path },
];

const resourceLinks = [
  { label: 'Blog', path: '/blog' },
  { label: 'About Us', path: '/about' },
  { label: 'Contact', path: '/contact' },
  { label: 'FAQ', path: '/faq' },
];

// Profile URLs come from env (VITE_SOCIAL_*). An icon is only shown when its URL is configured,
// so the footer never renders a link that goes nowhere.
const socialIcons = [
  { Icon: Facebook, href: import.meta.env.VITE_SOCIAL_FACEBOOK as string | undefined, label: 'Facebook' },
  { Icon: Linkedin, href: import.meta.env.VITE_SOCIAL_LINKEDIN as string | undefined, label: 'LinkedIn' },
  { Icon: Instagram, href: import.meta.env.VITE_SOCIAL_INSTAGRAM as string | undefined, label: 'Instagram' },
  { Icon: Twitter, href: import.meta.env.VITE_SOCIAL_TWITTER as string | undefined, label: 'Twitter' },
].filter((s) => Boolean(s.href));

/**
 * Shared footer, gerua on every route. Only the content width differs: the homepage
 * lines up with its 1400px container, other routes keep the wider original layout.
 */
const Footer = () => {
  const [email, setEmail] = useState('');
  const home = useLocation().pathname === '/';

  const [newsletter, setNewsletter] = useState<{ state: 'idle' | 'sending' | 'done' | 'error'; message?: string }>({ state: 'idle' });
  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletter.state === 'sending') return;
    setNewsletter({ state: 'sending' });
    const result = await subscribeNewsletter(email.trim());
    if (result.ok) {
      setEmail('');
      setNewsletter({ state: 'done', message: 'Thanks, we have received your subscription request.' });
    } else {
      // Keep the typed address so the visitor can retry.
      setNewsletter({ state: 'error', message: result.message || 'Something went wrong. Please try again.' });
    }
  };

  const wrap = home ? 'max-w-[1400px]' : 'max-w-[1600px]';
  const pad = home ? 'px-6' : 'px-6 md:px-12 lg:px-[72px]';
  const rule = 'rgba(245, 233, 214, 0.22)'; // translucent cream
  const dim = 'rgba(245, 233, 214, 0.85)'; // cream at 85% (5.8:1 on gerua)
  const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E58A45] focus-visible:ring-offset-2 focus-visible:ring-offset-[#592209]';
  const linkCls = `w-fit rounded-sm text-base font-medium transition-colors duration-200 md:text-lg hover:text-[#E58A45] hover:underline hover:decoration-1 hover:underline-offset-4 ${ring}`;

  const colHead = 'mb-5 text-base font-semibold uppercase tracking-[0.1em] md:text-lg';

  return (
    <footer style={{ background: '#592209', color: '#F5E9D6' }} className="w-full">
      <div className={`mx-auto w-full pb-10 pt-14 ${pad} ${wrap}`}>
        <div className="mb-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.3fr] lg:gap-14">
          {/* Intro */}
          <div>
            <p className="max-w-xs text-xl italic leading-relaxed md:text-[22px]">
              Unlock the secrets of the cosmos and discover what the stars have written for you.
            </p>
          </div>

          {/* Explore */}
          <nav aria-label="Explore">
            <p className={colHead} style={{ color: '#F5E9D6' }}>Explore</p>
            <div className="flex flex-col gap-4">
              {exploreLinks.map((link) => (
                <Link key={link.path} to={link.path} className={linkCls}>
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Resources */}
          <nav aria-label="Resources">
            <p className={colHead} style={{ color: '#F5E9D6' }}>Resources</p>
            <div className="flex flex-col gap-4">
              {resourceLinks.map((link) => (
                <Link key={link.path} to={link.path} className={linkCls}>
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Social + newsletter */}
          <div className="sm:col-span-2 lg:col-span-1">
            {socialIcons.length > 0 && (<>
            <p className={colHead} style={{ color: '#F5E9D6' }}>Social</p>
            <div className={`mb-8 flex w-fit gap-3 rounded-2xl border border-[#F5E9D6]/20 bg-[#F5E9D6]/5 p-4`}>
              {socialIcons.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200 border border-[#F5E9D6]/30 bg-[#F5E9D6]/10 text-[#F5E9D6] hover:border-[#E58A45] hover:text-[#E58A45] ${ring}`}
                >
                  <Icon size={20} />
                </a>
              ))}
            </div>
            </>)}

            <p className="mb-3 text-base md:text-lg" style={{ color: dim }}>
              Subscribe to our newsletter
            </p>
            <form onSubmit={handleNewsletter} className="flex w-full max-w-sm items-center gap-2.5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                aria-label="Email address"
                required
                className={`h-11 min-w-0 flex-1 rounded-full border border-[#F5E9D6] bg-[#F5E9D6] px-[18px] text-[15px] text-[#301607] outline-none placeholder:text-[#6B4A30] ${ring}`}
              />
              <button
                type="submit"
                disabled={newsletter.state === 'sending'}
                aria-label="Subscribe"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-200 bg-[#E58A45] text-[#301607] hover:bg-[#F5E9D6] ${ring}`}
              >
                <ArrowRight size={18} />
              </button>
            </form>
            {newsletter.message && (
              <p role={newsletter.state === 'error' ? 'alert' : 'status'} className="mt-2 max-w-sm text-sm" style={{ color: newsletter.state === 'error' ? '#FFD2B8' : dim }}>
                {newsletter.message}
              </p>
            )}
          </div>
        </div>

        <div className="pt-8" style={{ borderTop: `1px solid ${rule}` }}>
          <p
            aria-hidden="true"
            className="mb-3 uppercase leading-none"
            style={{
              fontFamily: "'ASTRA', 'DM Sans', system-ui, sans-serif",
              fontSize: 'clamp(40px, 9vw, 90px)',
              letterSpacing: '0.115em',
              color: '#F5E9D6',
            }}
          >
            SPIRITUAL
          </p>
          <p className="text-sm" style={{ color: dim }}>
            2024 Celestial. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
