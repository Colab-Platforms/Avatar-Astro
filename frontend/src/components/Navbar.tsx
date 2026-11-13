import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, LogIn, LogOut, User } from "lucide-react";
import gsap from "gsap";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";
import {
  ASTROLOGY_SEVA_LABEL,
  ASTROLOGY_SEVA_NAV,
  INNER_VOICE_LABEL,
  INNER_VOICE_NAV,
} from "@/data/featureCatalog";
import { useAuthStore } from "@/store/authStore";
import { useFeatureFlags } from "@/lib/featureFlags";
import { useLogoutMutation } from "@/features/auth/hooks/useAuthMutations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Nav config ────────────────────────────────────────────────────────────────
// Names and order come from the shared feature catalog (routes are unchanged).
const astrologySeva = ASTROLOGY_SEVA_NAV; // Daily Horoscopes stays out of the menu, as before.
const innerVoiceLinks = INNER_VOICE_NAV;

// Puja and Chadhawa are temporarily hidden from navigation. Their routes, pages and APIs are intact;
// restore by re-adding these entries to a navbar group.
// const hiddenDevotionLinks = [
//   { name: "Puja",     path: "/puja" },
//   { name: "Chadhawa", path: "/chadhawa" },
// ];

// Avatar Live sub-pages — used by mobile accordion + isActive check
const liveLink = { name: "Live", path: "/avatar-live/darshan", key: "nav.live" };

const shopLink = { name: "Shop", path: "/shop", key: "nav.shop" };

const booksAndMantrasLinks = [
  {
    name: "Spiritual Books",
    path: "/devotion/books",
    key: "nav.spiritualBooks",
  },
  {
    name: "Mantras & Chants",
    path: "/devotion/mantras-chants",
    key: "nav.mantrasChants",
  },
];

const topLinks = [
  { name: "Blog", path: "/blog", key: "nav.blog" },
  { name: "About", path: "/about", key: "nav.about" },
  { name: "Contact", path: "/contact", key: "nav.contact" },
];

// ── Generic desktop dropdown ──────────────────────────────────────────────────
interface DropdownProps {
  label: string;
  menuId: string;
  items: { name: string; path: string }[];
  currentPath: string;
  lightNav?: boolean;
  /** Lay the menu out as two columns, read left to right and then down, instead of one tall list. */
  twoColumns?: boolean;
}

const NavDropdown = ({
  label,
  menuId,
  items,
  currentPath,
  lightNav,
  twoColumns = false,
}: DropdownProps) => {
  const [open, setOpen] = useState(false);
  const cols = twoColumns ? 2 : 1;
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActive = items.some((i) => i.path === currentPath);

  const openMenu = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (closeTimer.current) {
          clearTimeout(closeTimer.current);
          closeTimer.current = null;
        }
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((v) => !v);
    }
    if (e.key === "Escape") setOpen(false);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      (ref.current?.querySelectorAll("a")[0] as HTMLElement)?.focus();
    }
  };

  const onItemKey = (e: React.KeyboardEvent, idx: number) => {
    const nodes = Array.from(
      ref.current?.querySelectorAll("a") ?? [],
    ) as HTMLElement[];
    if (cols > 1) {
      // Grid menu: left and right move along a row, up and down move between the two rows.
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nodes[Math.min(idx + 1, nodes.length - 1)]?.focus();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (idx === 0) {
          triggerRef.current?.focus();
          setOpen(false);
        } else nodes[idx - 1]?.focus();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        nodes[Math.min(idx + cols, nodes.length - 1)]?.focus();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (idx < cols) {
          triggerRef.current?.focus();
          setOpen(false);
        } else nodes[idx - cols]?.focus();
      }
    } else {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        nodes[Math.min(idx + 1, nodes.length - 1)]?.focus();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (idx === 0) {
          triggerRef.current?.focus();
          setOpen(false);
        } else nodes[idx - 1]?.focus();
      }
    }
    if (e.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
    }
    if (e.key === "Tab" && idx === nodes.length - 1) setOpen(false);
  };

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        ref={triggerRef}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onKeyDown={onTriggerKey}
        onClick={() => setOpen((v) => !v)}
        className={`relative flex items-center gap-1.5 whitespace-nowrap font-astra text-sm font-semibold tracking-wide transition-colors duration-300
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D] focus-visible:ring-offset-2
          focus-visible:ring-offset-background rounded-sm
          ${isActive ? "text-[#BC6A4D]" : lightNav ? "text-[#2C1810]/60 hover:text-[#BC6A4D]" : "text-foreground/70 hover:text-[#BC6A4D]"}`}
      >
        {label}
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
        {isActive && (
          <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#BC6A4D] rounded-full" />
        )}
      </button>

      <div
        className={`absolute top-full left-1/2 -translate-x-1/2 pt-3 ${twoColumns ? "w-[36rem] max-w-[calc(100vw-2rem)]" : "w-52"} ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={`glass-card rounded-xl border border-border/30 shadow-xl overflow-hidden transition-all duration-200 origin-top-left
            ${open ? "opacity-100 scale-y-100" : "opacity-0 scale-y-95"}`}
        >
          <div className={twoColumns ? "grid gap-x-3 gap-y-0.5 p-3" : "py-2"} style={twoColumns ? { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" } : undefined}>
            {items.map((item, i) => (
              <Link
                key={item.path} to={item.path} role="menuitem"
                tabIndex={open ? 0 : -1} onKeyDown={(e) => onItemKey(e, i)}
                className={`block font-body text-sm tracking-wide transition-colors duration-200
                  focus:outline-none focus-visible:bg-[#BC6A4D]/10
                  ${twoColumns ? "flex min-w-0 items-center whitespace-normal break-words rounded-lg px-4 py-2.5 leading-snug" : "px-4 py-2.5"}
                  ${currentPath === item.path ? "text-[#BC6A4D] bg-[#BC6A4D]/10" : "text-foreground/70 hover:text-[#BC6A4D] hover:bg-[#BC6A4D]/10"}`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Mobile accordion ──────────────────────────────────────────────────────────
interface MobileAccordionProps {
  label: string;
  items: { name: string; path: string }[];
  currentPath: string;
  onNavigate: () => void;
}

const MobileAccordion = ({
  label,
  items,
  currentPath,
  onNavigate,
}: MobileAccordionProps) => {
  const [open, setOpen] = useState(false);
  const isActive = items.some((i) => i.path === currentPath);

  return (
    <div className="mobile-nav-link">
      <button
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between font-display text-base font-medium px-2 py-2 rounded-lg
          transition-colors duration-300 focus:outline-none
          ${isActive ? "text-[#BC6A4D]" : "text-foreground/70 hover:text-[#BC6A4D]"}`}
      >
        {label}
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-1 ml-4 flex flex-col gap-1 border-l border-border/30 pl-4">
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`block font-display text-sm py-1.5 transition-colors duration-300 whitespace-normal break-words ${
                currentPath === item.path
                  ? "text-[#BC6A4D]"
                  : "text-foreground/70 hover:text-[#BC6A4D]"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Navbar ───────────────────────────────────────────────────────────────
const Navbar = () => {
  const { t, i18n } = useTranslation();
  // Labels in the Indian languages are much longer than English, so the full bar needs more room before it replaces the menu button.
  const roomy = i18n.language !== "en";
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // Seva the admin switched off disappear from the menus (the API refuses them too).
  const { isPathDisabled } = useFeatureFlags();
  const featureName = (f: { id: string; name: string }) =>
    t(`features.${f.id}.name`, { defaultValue: f.name });
  const visibleAstrologySeva = astrologySeva
    .filter((l) => !isPathDisabled(l.path, true))
    .map((l) => ({ ...l, name: featureName(l) }));
  const visibleInnerVoiceLinks = innerVoiceLinks
    .filter((l) => !isPathDisabled(l.path, true))
    .map((l) => ({ ...l, name: featureName(l) }));
  const linkName = (l: { key: string; name: string }) =>
    t(l.key, { defaultValue: l.name });
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogoutMutation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] ||
    t("nav.account");

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate("/login");
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isOpen) {
      gsap.fromTo(
        ".mobile-nav-link",
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, stagger: 0.08, duration: 0.3, ease: "power2.out" },
      );
    }
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const isDevotionPage = [
    "/puja",
    "/chadhawa",
    "/shop",
    "/avatar-live",
    "/devotion",
  ].some((p) => location.pathname.startsWith(p));
  const isHome = location.pathname === "/";
  const lightNav = isDevotionPage || isHome;

  const desktopLinkCls = (active: boolean) =>
    `relative whitespace-nowrap font-astra text-sm font-semibold tracking-wide transition-colors duration-300 ${
      active
        ? "text-[#BC6A4D]"
        : lightNav
          ? "text-[#2C1810]/60 hover:text-[#BC6A4D]"
          : "text-foreground/70 hover:text-[#BC6A4D]"
    }`;

  return (
    <nav
      className={`navbar-gerua fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isDevotionPage
          ? "py-4 border-b"
          : isHome
            ? "py-3 border-b"
            : scrolled
              ? "glass-card py-3"
              : "py-5 bg-transparent"
      }`}
    >
      <div className="mx-auto w-full max-w-[1536px] px-4 md:px-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            aria-label={`Bhagya, ${t("nav.home")}`}
            title={t("nav.home")}
            onClick={() => {
              setIsOpen(false);
              if (location.pathname === "/")
                window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex shrink-0 items-center gap-2 group select-none"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5 text-[#BC6A4D] transition-transform duration-500 group-hover:rotate-90"
            >
              <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z" />
            </svg>
            <span className="font-home-serif text-xl font-semibold tracking-[0.02em] text-[#BC6A4D]">
              Bhagya
            </span>
          </Link>

          {/* ── Desktop nav ─────────────────────────────────────────────── */}
          <div
            className={`hidden ${roomy ? "min-[1760px]:flex" : "xl:flex"} items-center gap-4 min-[1360px]:gap-6 2xl:gap-8 whitespace-nowrap`}
          >
            <NavDropdown
              label={t("nav.astrologySeva", {
                defaultValue: ASTROLOGY_SEVA_LABEL,
              })}
              menuId="astrology-tools-menu"
              items={visibleAstrologySeva}
              currentPath={location.pathname}
              lightNav={lightNav}
              twoColumns
            />
            <NavDropdown
              label={t("nav.innerVoice", { defaultValue: INNER_VOICE_LABEL })}
              menuId="inner-voice-menu"
              items={visibleInnerVoiceLinks}
              currentPath={location.pathname}
              lightNav={lightNav}
            />

            <Link
              to={shopLink.path}
              className={desktopLinkCls(
                location.pathname.startsWith(shopLink.path),
              )}
            >
              {linkName(shopLink)}
              {location.pathname.startsWith(shopLink.path) && (
                <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#BC6A4D] rounded-full" />
              )}
            </Link>

            {/* Live — goes straight to Live Darshan */}
            <Link to={liveLink.path} className={desktopLinkCls(location.pathname.startsWith("/avatar-live"))}>
              {linkName(liveLink)}
              {location.pathname.startsWith("/avatar-live") && <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#BC6A4D] rounded-full" />}
            </Link>

{/* Books & Mantras dropdown */}
            <NavDropdown
              label={t("nav.booksAndMantras", {
                defaultValue: "Books & Mantras",
              })}
              menuId="books-and-mantras-menu"
              items={booksAndMantrasLinks.map((l) => ({
                ...l,
                name: t(l.key, { defaultValue: l.name }),
              }))}
              currentPath={location.pathname}
              lightNav={lightNav}
            />

            {topLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={desktopLinkCls(location.pathname === link.path)}
              >
                {linkName(link)}
                {location.pathname === link.path && (
                  <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#BC6A4D] rounded-full" />
                )}
              </Link>
            ))}

            {isAuthenticated ? (
              <div className="flex shrink-0 items-center gap-3 whitespace-nowrap pl-4 2xl:pl-6 border-l border-border/30">
                <Link
                  to="/dashboard"
                  title={`${t("nav.openDashboard")}: ${displayName}`}
                  className={`flex items-center gap-1.5 whitespace-nowrap font-display text-xs tracking-wider hover:underline ${lightNav ? "text-[#2C1810]/70" : "text-foreground/70"}`}
                >
                  <User size={14} className="text-[#BC6A4D]" />
                  <span className="hidden max-w-[9rem] truncate 2xl:inline">
                    {displayName}
                  </span>
                  <span className="sr-only 2xl:hidden">{displayName}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  disabled={logoutMutation.isPending}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap font-display text-xs font-semibold tracking-wider text-[#BC6A4D] transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  <LogOut size={14} />
                  {t("nav.signOut")}
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#BC6A4D]/40 bg-[#BC6A4D]/10 px-4 py-2 font-display text-xs font-semibold tracking-wider text-[#BC6A4D] transition-colors hover:bg-[#BC6A4D]/20"
              >
                <LogIn size={14} />
                {t("nav.signIn")}
              </Link>
            )}
            <LanguageSelector lightNav={lightNav} />
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsOpen((v) => !v)}
            className={`${roomy ? "min-[1760px]:hidden" : "xl:hidden"} p-2 ${lightNav ? "text-[#2C1810]/70" : "text-foreground/70"} hover:text-primary transition-colors`}
            aria-label={isOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
          >
            {isOpen ? (
              <X size={24} aria-hidden="true" />
            ) : (
              <Menu size={24} aria-hidden="true" />
            )}
          </button>
        </div>

        {/* ── Mobile menu ─────────────────────────────────────────────────── */}
        {isOpen && (
          <div
            id="mobile-menu"
            className={`${roomy ? "min-[1760px]:hidden" : "xl:hidden"} mt-4 pb-6 border-t border-border/30 max-h-[calc(100vh-5rem)] overflow-y-auto pr-1 overscroll-contain`}
          >
            <div className="flex flex-col gap-1 mt-4">
              <MobileAccordion
                label={t("nav.astrologySeva", {
                  defaultValue: ASTROLOGY_SEVA_LABEL,
                })}
                items={visibleAstrologySeva}
                currentPath={location.pathname}
                onNavigate={() => setIsOpen(false)}
              />
              <MobileAccordion
                label={t("nav.innerVoice", { defaultValue: INNER_VOICE_LABEL })}
                items={visibleInnerVoiceLinks}
                currentPath={location.pathname}
                onNavigate={() => setIsOpen(false)}
              />

              <Link
                to={shopLink.path}
                onClick={() => setIsOpen(false)}
                className={`mobile-nav-link font-display text-base font-medium px-2 py-2 rounded-lg transition-colors duration-300 ${
                  location.pathname.startsWith(shopLink.path)
                    ? "text-[#BC6A4D]"
                    : "text-foreground/70 hover:text-[#BC6A4D]"
                }`}
              >
                {linkName(shopLink)}
              </Link>

              {/* Live — goes straight to Live Darshan */}
              <Link
                to={liveLink.path}
                onClick={() => setIsOpen(false)}
                className={`mobile-nav-link font-display text-base font-medium px-2 py-2 rounded-lg transition-colors duration-300 ${
                  location.pathname.startsWith("/avatar-live") ? "text-[#BC6A4D]" : "text-foreground/70 hover:text-[#BC6A4D]"
                }`}
              >
                {linkName(liveLink)}
              </Link>

{/* Books & Mantras accordion */}
              <MobileAccordion
                label={t("nav.booksAndMantras", {
                  defaultValue: "Books & Mantras",
                })}
                items={booksAndMantrasLinks.map((l) => ({
                  ...l,
                  name: t(l.key, { defaultValue: l.name }),
                }))}
                currentPath={location.pathname}
                onNavigate={() => setIsOpen(false)}
              />

              {topLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`mobile-nav-link font-display text-base font-medium px-2 py-2 rounded-lg transition-colors duration-300 ${
                    location.pathname === link.path
                      ? "text-[#BC6A4D]"
                      : "text-foreground/70 hover:text-[#BC6A4D]"
                  }`}
                >
                  {linkName(link)}
                </Link>
              ))}

              <Link
                to="/become-astrologer"
                onClick={() => setIsOpen(false)}
                className={`mobile-nav-link font-display text-base font-medium px-2 py-2 rounded-lg transition-colors duration-300 ${
                  location.pathname === "/become-astrologer"
                    ? "text-[#BC6A4D]"
                    : "text-foreground/70 hover:text-[#BC6A4D]"
                }`}
              >
                {t("nav.joinAsAstrologer", {
                  defaultValue: "Join as Astrologer",
                })}
              </Link>

              {isAuthenticated && (
                <Link
                  to="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="mobile-nav-link font-display text-base font-medium px-2 py-2 rounded-lg text-[#BC6A4D]"
                >
                  {t("nav.myDashboard")}
                </Link>
              )}
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="mobile-nav-link font-display text-base font-medium px-2 py-2 rounded-lg text-[#BC6A4D] text-left"
                >
                  {t("nav.signOut")} ({displayName})
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="mobile-nav-link font-display text-base font-medium px-2 py-2 rounded-lg text-[#BC6A4D]"
                >
                  {t("nav.signIn")}
                </Link>
              )}
              <div className="mobile-nav-link px-2 pt-2">
                <LanguageSelector variant="mobile" />
              </div>
            </div>
          </div>
        )}
        <AlertDialog
          open={showLogoutConfirm}
          onOpenChange={setShowLogoutConfirm}
        >
          <AlertDialogContent className="border-[#592209]/20 bg-[#FBF5EC] text-[#301607]">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-lg tracking-wide text-[#592209]">
                {t("nav.confirmLogoutTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-foreground/70">
                {t("nav.confirmLogoutBody")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-[#592209]/30 bg-transparent text-[#301607] hover:bg-[#592209]/5 hover:text-[#301607]">
                {t("common.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowLogoutConfirm(false);
                  void handleLogout();
                }}
                className="bg-[#592209] text-[#F5E9D6] hover:bg-[#461B07]"
              >
                {t("nav.signOut")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </nav>
  );
};

export default Navbar;
