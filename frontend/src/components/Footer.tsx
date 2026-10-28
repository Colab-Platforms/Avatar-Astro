import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Facebook, Linkedin, Instagram, Twitter, ArrowRight } from 'lucide-react';

const exploreLinks = [
  { label: 'Daily Horoscopes', path: '/horoscopes' },
  { label: 'Zodiac Signs', path: '/zodiac' },
  { label: 'Compatibility', path: '/compatibility' },
  { label: 'Birth Chart', path: '/birth-chart' },
];

const resourceLinks = [
  { label: 'Blog', path: '/blog' },
  { label: 'About Us', path: '/about' },
  { label: 'Contact', path: '/contact' },
  { label: 'FAQ', path: '/faq' },
];

const socialIcons = [
  { Icon: Facebook, href: '#', label: 'Facebook' },
  { Icon: Linkedin, href: '#', label: 'LinkedIn' },
  { Icon: Instagram, href: '#', label: 'Instagram' },
  { Icon: Twitter, href: '#', label: 'Twitter' },
];

/**
 * Shared footer. On the homepage it uses the warm terracotta palette; on every
 * other route it keeps its original dark navy look. The layout is fluid for both.
 */
const Footer = () => {
  const [email, setEmail] = useState('');
  const home = useLocation().pathname === '/';

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    setEmail('');
  };

  const t = home
    ? {
        bg: '#FFF3EC',
        text: '#121212',
        head: '#121212',
        dim: '#54514F', // ink 72% on cream (7:1)
        rule: '#F2CAB7', // rust 28% on cream
        hover: 'hover:text-[#D05F2F] hover:underline hover:decoration-[#FE9F30] hover:decoration-2 hover:underline-offset-4',
        chip: 'border border-[#F2CAB7] bg-white text-[#121212] hover:border-[#D05F2F] hover:text-[#D05F2F]',
        submit: 'bg-[#D05F2F] text-[#121212] hover:bg-[#FE9F30]',
        logo: '#D05F2F',
        panel: 'border-[#F2CAB7] bg-white/60',
        ring: 'focus-visible:ring-[#D05F2F]',
        input: 'border border-[#F2CAB7]',
        wrap: 'max-w-[1400px]',
        pad: 'px-6',
      }
    : {
        bg: 'rgba(5, 11, 24, 0.96)',
        text: '#FFFFFF',
        dim: 'rgba(255,255,255,0.6)',
        rule: 'rgba(255,255,255,0.08)',
        hover: 'hover:text-[#BC6A4D]',
        chip: 'bg-white/[0.08] hover:bg-[#BC6A4D]',
        submit: 'bg-[#BC6A4D] text-white hover:opacity-90',
        logo: '#BC6A4D',
        panel: 'border-white/[0.04] bg-white/[0.02]',
        head: 'rgba(255,255,255,0.6)',
        ring: 'focus-visible:ring-[#BC6A4D]',
        input: 'border-none',
        wrap: 'max-w-[1600px]',
        pad: 'px-6 md:px-12 lg:px-[72px]',
      };

  const colHead = 'mb-5 text-base font-semibold uppercase tracking-[0.1em] md:text-lg';

  return (
    <footer style={{ background: t.bg, color: t.text, ...(home ? { borderTop: `1px solid ${t.rule}` } : {}) }} className="w-full">
      <div className={`mx-auto w-full pb-10 pt-14 ${t.pad} ${t.wrap}`}>
        <div className="mb-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.3fr] lg:gap-14">
          {/* Intro */}
          <div>
            <p className="max-w-xs text-xl italic leading-relaxed md:text-[22px]">
              Unlock the secrets of the cosmos and discover what the stars have written for you.
            </p>
          </div>

          {/* Explore */}
          <nav aria-label="Explore">
            <p className={colHead} style={{ color: t.head }}>Explore</p>
            <div className="flex flex-col gap-4">
              {exploreLinks.map((link) => (
                <Link key={link.path} to={link.path} className={`w-fit text-base font-medium transition-colors md:text-lg ${t.hover}`}>
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Resources */}
          <nav aria-label="Resources">
            <p className={colHead} style={{ color: t.head }}>Resources</p>
            <div className="flex flex-col gap-4">
              {resourceLinks.map((link) => (
                <Link key={link.path} to={link.path} className={`w-fit text-base font-medium transition-colors md:text-lg ${t.hover}`}>
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Social + newsletter */}
          <div className="sm:col-span-2 lg:col-span-1">
            <p className={colHead} style={{ color: t.head }}>Social</p>
            <div className={`mb-8 flex w-fit gap-3 rounded-2xl border p-4 ${t.panel}`}>
              {socialIcons.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] transition-colors ${t.chip}`}
                >
                  <Icon size={20} />
                </a>
              ))}
            </div>

            <p className="mb-3 text-base md:text-lg" style={{ color: t.dim }}>
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
                className={`h-11 min-w-0 flex-1 rounded-full bg-white px-[18px] text-[15px] text-[#111] outline-none placeholder:text-[#8a8a8a] focus-visible:ring-2 ${t.ring} ${t.input}`}
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${t.submit}`}
              >
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </div>

        <div className="pt-8" style={{ borderTop: `1px solid ${t.rule}` }}>
          <p
            aria-hidden="true"
            className="mb-3 uppercase leading-none"
            style={{
              fontFamily: "'ASTRA', 'Iceland', 'Orbitron', sans-serif",
              fontSize: 'clamp(40px, 9vw, 90px)',
              letterSpacing: '0.115em',
              color: t.logo,
            }}
          >
            SPIRITUAL
          </p>
          <p className="text-sm" style={{ color: t.dim }}>
            2024 Celestial. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
