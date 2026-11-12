import { motion } from 'framer-motion';
import { X, Star, Zap, AlertTriangle, Briefcase, Heart, Activity, Sparkles } from 'lucide-react';
import { Planet, PlanetaryInfluence, ZodiacSign, PLANET_DETAILS } from '@/data/planetaryData';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from 'react-i18next';
import { useGlossary } from '@/i18n/glossary';

interface PlanetInfoPanelProps {
  planet: Planet | null;
  influence: PlanetaryInfluence | null;
  isOpen: boolean;
  onClose: () => void;
  zodiacSign: ZodiacSign | string;
}

const NATURE_COLORS: Record<string, string> = {
  Benefic:  '#4ade80',
  Malefic:  '#f87171',
  Neutral:  '#94a3b8',
};

export const PlanetInfoPanel = ({ planet, influence, isOpen, onClose, zodiacSign }: PlanetInfoPanelProps) => {
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { g } = useGlossary();

  if (!planet || !influence) return null;

  const detail = PLANET_DETAILS[planet.id];
  // The planet data (planetaryData.ts) keeps its English text and ids; the text shown is looked up by planet id (English is the fallback).
  const pt = (path: string, english: string) => t(`kundali.planetInfo.planet.${planet.id}.${path}`, { defaultValue: english });
  const ptList = (path: string, items: string[]) => items.map((e, i) => pt(`${path}.${i}`, e));
  const signKey = String(influence.zodiacSign);
  const signShown = zodiacSign.charAt(0).toUpperCase() + zodiacSign.slice(1);

  const mobileVariants = {
    initial: { opacity: 0, y: 120 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: 120 },
  };

  const desktopVariants = {
    initial: { opacity: 0, x: -60 },
    animate: { opacity: 1, x: 0 },
    exit:    { opacity: 0, x: -60 },
  };

  const variants = isMobile ? mobileVariants : desktopVariants;

  const panelClass = isMobile
    ? 'fixed bottom-0 left-0 right-0 w-full max-h-[82vh] rounded-t-3xl z-40 overflow-y-auto pointer-events-auto'
    : 'fixed left-6 top-1/2 -translate-y-1/2 w-[22rem] max-h-[90vh] rounded-3xl z-40 overflow-y-auto pointer-events-auto';

  return (
    <motion.div
      className={panelClass}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Glass background */}
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          background: 'linear-gradient(160deg, rgba(0,0,0,0.72) 0%, rgba(5,5,20,0.82) 100%)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          border: `1px solid ${planet.color}30`,
          boxShadow: `0 0 60px ${planet.color}18, inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}
      />

      {/* Mobile drag handle */}
      {isMobile && (
        <div className="relative flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/25" />
        </div>
      )}

      <div className="relative px-6 pt-5 pb-10 text-white">

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label={t("kundali.planetInfo.close")}
          className="absolute top-4 right-5 p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>

        {/* ── Planet header ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.04 }}
          className="mb-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-full flex-shrink-0"
              style={{
                backgroundColor: planet.color,
                boxShadow: `0 0 18px ${planet.color}90, 0 0 40px ${planet.color}40`,
              }}
            />
            <div>
              <h2 className="text-2xl font-display tracking-widest leading-none">{g("planet", planet.name).toUpperCase()}</h2>
              <p className="text-[10px] text-white/45 uppercase tracking-[0.22em] mt-0.5">
                {t("kundali.planetInfo.cosmicGuide", { sign: g("rashi", signShown) })}
              </p>
            </div>
          </div>

          {/* Nature + Strength row */}
          {detail && (
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border"
                style={{
                  color: NATURE_COLORS[detail.nature],
                  borderColor: `${NATURE_COLORS[detail.nature]}50`,
                  background: `${NATURE_COLORS[detail.nature]}12`,
                }}
              >
                {t(`kundali.planetInfo.nature.${detail.nature}`, { defaultValue: detail.nature })}
              </span>
              <span className="text-[10px] text-white/45 uppercase tracking-widest">{t("kundali.planetInfo.strength")}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: i < detail.strengthScore ? planet.color : 'rgba(255,255,255,0.12)',
                      boxShadow: i < detail.strengthScore ? `0 0 4px ${planet.color}` : 'none',
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-white/50">{detail.strengthScore}/10</span>
            </div>
          )}
        </motion.div>

        {/* ── Astrological placement ──────────────────────────────── */}
        {detail && (
          <FadeRow delay={0.1}>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <InfoChip label={t("kundali.planetInfo.zodiac")} value={pt("zodiacPlacement", detail.zodiacPlacement)} color={planet.color} />
              <InfoChip label={t("kundali.planetInfo.house")} value={pt("housePlacement", detail.housePlacement.split('(')[0].trim())} color={planet.color} />
            </div>
          </FadeRow>
        )}

        {/* ── Key Traits ─────────────────────────────────────────── */}
        {detail && (
          <Section delay={0.16} label={t("kundali.planetInfo.keyTraits")} accent={planet.color}>
            <div className="flex flex-wrap gap-1.5">
              {detail.keyTraits.map((trait, i) => (
                <span
                  key={trait}
                  className="text-[10px] px-2.5 py-1 rounded-full border"
                  style={{
                    color: planet.color,
                    borderColor: `${planet.color}40`,
                    background: `${planet.color}10`,
                  }}
                >
                  {pt(`keyTraits.${i}`, trait)}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* ── Today's Influence ──────────────────────────────────── */}
        <Section delay={0.22} label={t("kundali.planetInfo.todaysInfluence")} accent={planet.color}>
          <p className="text-sm leading-relaxed italic text-white/75">"{t(`kundali.planetInfo.influence.${planet.id}.${signKey}`, { defaultValue: influence.influence })}"</p>
        </Section>

        {/* ── Positive & Challenging Effects ─────────────────────── */}
        {detail && (
          <Section delay={0.28} label={t("kundali.planetInfo.effects")} accent={planet.color}>
            <div className="space-y-3">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-green-400/60 mb-1.5 font-bold flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> {t("kundali.planetInfo.positive")}
                </p>
                <ul className="space-y-1">
                  {ptList("positiveEffects", detail.positiveEffects).map((e, i) => (
                    <li key={i} className="flex gap-2 text-xs text-white/70">
                      <span className="text-green-400/70 flex-shrink-0 mt-0.5">+</span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-red-400/60 mb-1.5 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> {t("kundali.planetInfo.challenging")}
                </p>
                <ul className="space-y-1">
                  {ptList("challengingEffects", detail.challengingEffects).map((e, i) => (
                    <li key={i} className="flex gap-2 text-xs text-white/60">
                      <span className="text-red-400/70 flex-shrink-0 mt-0.5">−</span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>
        )}

        {/* ── Life Domain Influences ─────────────────────────────── */}
        {detail && (
          <Section delay={0.34} label={t("kundali.planetInfo.lifeDomains")} accent={planet.color}>
            <div className="space-y-2.5">
              <DomainRow icon={<Briefcase className="w-3 h-3" />} label={t("kundali.planetInfo.career")} text={pt("careerInfluence", detail.careerInfluence)} color={planet.color} />
              <DomainRow icon={<Heart className="w-3 h-3" />} label={t("kundali.planetInfo.relationships")} text={pt("relationshipInfluence", detail.relationshipInfluence)} color={planet.color} />
              <DomainRow icon={<Activity className="w-3 h-3" />} label={t("kundali.planetInfo.health")} text={pt("healthInfluence", detail.healthInfluence)} color={planet.color} />
            </div>
          </Section>
        )}

        {/* ── Stats grid ─────────────────────────────────────────── */}
        <FadeRow delay={0.4}>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Stat label={t("kundali.planetInfo.energy")} value={`${influence.energyLevel}/10`} />
            <Stat label={t("kundali.planetInfo.luckyNo")} value={String(influence.luckyNumber)} />
            <div className="bg-white/5 rounded-xl p-3 border border-white/8 flex flex-col gap-2">
              <p className="text-[9px] uppercase tracking-widest text-white/40">{t("kundali.planetInfo.color")}</p>
              <div
                className="w-5 h-5 rounded-full border border-white/20"
                style={{ backgroundColor: influence.luckyColor, boxShadow: `0 0 8px ${influence.luckyColor}` }}
              />
            </div>
          </div>
        </FadeRow>

        {/* ── Chakra ─────────────────────────────────────────────── */}
        <Section delay={0.44} label={t("kundali.planetInfo.chakra")} accent={planet.color}>
          <p className="text-sm font-semibold" style={{ color: influence.luckyColor }}>{t(`kundali.planetInfo.chakraName.${signKey}`, { defaultValue: influence.chakra })}</p>
        </Section>

        {/* ── Best activities ────────────────────────────────────── */}
        <Section delay={0.5} label={t("kundali.planetInfo.bestActivities")} accent={planet.color}>
          <ul className="space-y-1.5">
            {influence.bestActivities.map((a0, i) => t(`kundali.planetInfo.activities.${planet.id}.${i}`, { defaultValue: a0 })).map((a, i) => (
              <li key={i} className="flex gap-2 text-xs text-white/75">
                <span style={{ color: planet.color }} className="flex-shrink-0 mt-0.5">•</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* ── Things to avoid ────────────────────────────────────── */}
        <Section delay={0.56} label={t("kundali.planetInfo.avoidToday")} accent={planet.color}>
          <ul className="space-y-1.5">
            {influence.thingsToAvoid.map((a0, i) => t(`kundali.planetInfo.avoid.${planet.id}.${i}`, { defaultValue: a0 })).map((a, i) => (
              <li key={i} className="flex gap-2 text-xs text-white/65">
                <span className="text-red-400/70 flex-shrink-0 mt-0.5">•</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* ── Spiritual essence ──────────────────────────────────── */}
        <Section delay={0.62} label={t("kundali.planetInfo.spiritualEssence")} accent={planet.color}>
          <p className="text-xs leading-relaxed text-white/70">{pt("spiritualMeaning", planet.spiritualMeaning)}</p>
        </Section>

        {/* ── Karmic lessons ─────────────────────────────────────── */}
        {detail && (
          <Section delay={0.68} label={t("kundali.planetInfo.karmicLessons")} accent={planet.color}>
            <p className="text-xs leading-relaxed text-white/70 italic">{pt("karmicLessons", detail.karmicLessons)}</p>
          </Section>
        )}

        {/* ── AI Interpretation ──────────────────────────────────── */}
        {detail && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.74 }}
            className="rounded-2xl p-4 border"
            style={{
              background: `linear-gradient(135deg, ${planet.color}1a, ${planet.color}08)`,
              borderColor: `${planet.color}35`,
            }}
          >
            <p className="text-[9px] uppercase tracking-widest text-white/45 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-2.5 h-2.5" style={{ color: planet.color }} />
              {t("kundali.planetInfo.cosmicReading")}
            </p>
            <p className="text-xs leading-relaxed text-white/80">{pt("aiInterpretation", detail.aiInterpretation)}</p>
          </motion.div>
        )}

        {/* ── Affirmation ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.8 }}
          className="mt-3 rounded-2xl p-4 border"
          style={{
            background: 'rgba(255,215,0,0.06)',
            borderColor: 'rgba(255,215,0,0.25)',
          }}
        >
          <p className="text-[9px] uppercase tracking-widest text-white/40 mb-2">{t("kundali.planetInfo.todaysAffirmation")}</p>
          <p className="text-xs leading-relaxed font-semibold italic" style={{ color: planet.color }}>
            "{t(`kundali.planetInfo.affirmation.${signKey}`, { defaultValue: influence.affirmation })}"
          </p>
        </motion.div>

      </div>
    </motion.div>
  );
};

// ── Sub-components ──────────────────────────────────────────────────────────

const Section = ({
  label, children, delay, accent,
}: { label: string; children: React.ReactNode; delay: number; accent?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.32, delay }}
    className="mb-4 pb-4 border-b"
    style={{ borderColor: accent ? `${accent}18` : 'rgba(255,255,255,0.08)' }}
  >
    <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold mb-2">{label}</p>
    {children}
  </motion.div>
);

const FadeRow = ({ children, delay }: { children: React.ReactNode; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.32, delay }}
  >
    {children}
  </motion.div>
);

const InfoChip = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div
    className="rounded-xl p-2.5 border"
    style={{ background: `${color}0a`, borderColor: `${color}25` }}
  >
    <p className="text-[8px] uppercase tracking-widest text-white/35 mb-0.5">{label}</p>
    <p className="text-[11px] font-semibold text-white/85 leading-tight">{value}</p>
  </div>
);

const DomainRow = ({
  icon, label, text, color,
}: { icon: React.ReactNode; label: string; text: string; color: string }) => (
  <div className="flex gap-2.5">
    <div
      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
      style={{ background: `${color}20`, color }}
    >
      {icon}
    </div>
    <div>
      <p className="text-[9px] uppercase tracking-widest text-white/40 mb-0.5">{label}</p>
      <p className="text-xs text-white/65 leading-relaxed">{text}</p>
    </div>
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white/5 rounded-xl p-3 border border-white/8">
    <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">{label}</p>
    <p className="text-lg font-bold text-white">{value}</p>
  </div>
);
