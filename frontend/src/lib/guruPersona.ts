import type { Astrologer, Expertise } from "@/data/astrologers";

/**
 * Chooses which approved astrologer profile frames a Divya Margdarshak conversation.
 * The answer is still AI-generated: the profile only sets the area of expertise the guidance leans on.
 */

const KEYWORDS: Record<Expertise, RegExp> = {
  "Vedic Astrology": /kundali|kundli|chart|rashi|nakshatra|dasha|lagna|planet|graha|saturn|shani|rahu|ketu|jupiter|guru|vedic|jyotish|ratna|gemstone|mangal|manglik/i,
  "Tarot Reading": /tarot|card|spread/i,
  "Prashna Astrology": /should i|will i|when will|yes or no|prashna|decision|choose|choice/i,
  Numerology: /number|numerolog|name|lucky|destiny|life path|spelling/i,
  "Face Reading": /face|facial|forehead/i,
  Palmistry: /palm|hand|finger|line/i,
  "Relationship Guidance": /love|marriage|relationship|partner|husband|wife|spouse|boyfriend|girlfriend|family|breakup|compatib|jodi/i,
  "Career Guidance": /career|job|work|business|money|finance|promotion|salary|study|exam|profession/i,
  "Horoscope Analysis": /horoscope|sign|zodiac|daily|prediction|future/i,
};

/** Which expertise suits a feature the user is coming from. */
const FEATURE_HINT: Record<string, Expertise[]> = {
  tarot: ["Tarot Reading"],
  zodiac: ["Horoscope Analysis", "Vedic Astrology"],
  birthChart: ["Vedic Astrology", "Horoscope Analysis"],
  compatibility: ["Relationship Guidance", "Vedic Astrology"],
  palm: ["Palmistry", "Face Reading"],
  ratna: ["Vedic Astrology"],
  karma: ["Vedic Astrology", "Prashna Astrology"],
  karmaScore: ["Vedic Astrology"],
  futurePath: ["Career Guidance", "Horoscope Analysis", "Vedic Astrology"],
  numerology: ["Numerology"],
  shloka: ["Vedic Astrology"],
};

export interface PersonaChoice {
  profile: Astrologer;
  /** Expertise areas that matched the question or feature. */
  matched: Expertise[];
}

/**
 * A profile is eligible when it is not known to be unavailable. Availability is only trusted for real
 * profiles: for placeholder (demo) profiles the online flag is invented, so it is ignored.
 */
export const eligibleProfiles = (profiles: Astrologer[]): Astrologer[] => profiles.filter((p) => p.demo || p.online);

export function assignPersona(
  profiles: Astrologer[],
  question: string,
  featureKey?: string,
  avoidIds: string[] = [],
  random: () => number = Math.random,
): PersonaChoice | null {
  const pool = eligibleProfiles(profiles);
  if (pool.length === 0) return null;
  const hints = FEATURE_HINT[featureKey ?? ""] ?? [];
  const scored = pool.map((p) => {
    const matched = p.expertise.filter((e) => KEYWORDS[e].test(question) || hints.includes(e));
    const score = p.expertise.reduce((s, e) => s + (KEYWORDS[e].test(question) ? 2 : 0) + (hints.includes(e) ? 1 : 0), 0);
    return { p, matched, score };
  });
  const top = Math.max(...scored.map((s) => s.score));
  let best = scored.filter((s) => s.score === top);
  // Do not hand every question to the same profile: prefer one not used for the previous conversation.
  const fresh = best.filter((s) => !avoidIds.includes(s.p.id));
  if (fresh.length > 0) best = fresh;
  const pick = best[Math.floor(random() * best.length)];
  return { profile: pick.p, matched: pick.matched };
}

/** Instruction that frames the AI answer by the profile's expertise without claiming a human is replying. */
export function personaInstruction(choice: PersonaChoice | null): string {
  if (!choice) return "";
  const areas = (choice.matched.length ? choice.matched : choice.profile.expertise).join(", ");
  return `Lean your guidance toward this area of expertise: ${areas}. You are an AI guide. Never say or imply that you are a human, that a particular person is writing or speaking, or that this is a live consultation, and never invent credentials, experience or availability.`;
}

const LAST_KEY = "guru:lastPersona";
export const lastPersonaId = (): string[] => {
  try {
    const v = sessionStorage.getItem(LAST_KEY);
    return v ? [v] : [];
  } catch {
    return [];
  }
};
export const rememberPersona = (id: string | null): void => {
  try {
    if (id) sessionStorage.setItem(LAST_KEY, id);
    else sessionStorage.removeItem(LAST_KEY);
  } catch {
    /* ignore */
  }
};
