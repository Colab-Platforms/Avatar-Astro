import type { KundaliResult } from "./types";
import { buildKundaliGuide, dashaTheme, rashiName, signName, planetName } from "./kundaliInsights";
import i18n from "@/i18n";
import { glossName } from "@/i18n/glossary";

// "Your Personal Growth Guide": practical advice built ONLY from what the reading already calculated (confirmed Rashis, Life Path,
// Panchang, and, when a birth time was given, the houses, dignity and Dasha). Nothing here recalculates the chart, adds a placement
// or predicts an event. Each area keeps two kinds of text apart:
//   chart   - calculated facts taken from the reading, shown as "From your chart"
//   the rest - traditional tendencies and everyday advice, which are interpretation, not fact
// When a factor is missing (no birth time, uncertain Moon sign) it is simply not used, and the guide says so.

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;
type Sign = (typeof SIGNS)[number];
type Element = "fire" | "earth" | "air" | "water";
type Quality = "cardinal" | "fixed" | "mutable";
type Group = 0 | 1 | 2;

export type AreaKey = "personality" | "career" | "love" | "money" | "health" | "spirit";
const AREAS: AreaKey[] = ["personality", "career", "love", "money", "health", "spirit"];

export interface GrowthArea {
  key: AreaKey;
  title: string;
  /** Calculated facts from the reading (empty when none apply). */
  chart: string[];
  strengths: string[];
  improve: string[];
  /** Exactly three practical actions. */
  actions: string[];
  /** One line saying what this area was built from. */
  basis: string;
}

export interface GrowthPlanItem { label: string; text: string }

export interface GrowthGuide {
  areas: GrowthArea[];
  plan: GrowthPlanItem[];
  message: string;
  /** Short notices about what was and was not used (birth time missing, Moon sign uncertain). */
  notices: string[];
}

export interface GrowthInput {
  kundali: KundaliResult;
  /** Vedic Surya Rashi in English (e.g. "Aries"), as shown on the page. */
  sunSign: string;
  lifePath: number;
  name?: string;
}

const ELEMENT: Record<Sign, Element> = {
  Aries: "fire", Leo: "fire", Sagittarius: "fire", Taurus: "earth", Virgo: "earth", Capricorn: "earth",
  Gemini: "air", Libra: "air", Aquarius: "air", Cancer: "water", Scorpio: "water", Pisces: "water",
};
const QUALITY: Record<Sign, Quality> = {
  Aries: "cardinal", Cancer: "cardinal", Libra: "cardinal", Capricorn: "cardinal",
  Taurus: "fixed", Leo: "fixed", Scorpio: "fixed", Aquarius: "fixed",
  Gemini: "mutable", Virgo: "mutable", Sagittarius: "mutable", Pisces: "mutable",
};

/** strength / watch-out / what feels like home in a relationship / working style, in everyday words. */
const SIGN: Record<Sign, { strength: string; watch: string; need: string; work: string }> = {
  Aries: { strength: "courage and a readiness to start things", watch: "acting before thinking", need: "honesty and room to act", work: "starting projects and leading from the front" },
  Taurus: { strength: "steadiness and patience", watch: "stubbornness and resisting change", need: "security and loyalty", work: "building things steadily and reliably" },
  Gemini: { strength: "curiosity and quick thinking", watch: "scattered attention", need: "conversation and variety", work: "communicating, learning and connecting ideas" },
  Cancer: { strength: "care for others and deep feeling", watch: "taking things too personally", need: "safety and emotional closeness", work: "caring for people and working with heart" },
  Leo: { strength: "warmth and confidence", watch: "needing praise, or pride getting in the way", need: "appreciation and warmth", work: "leading, creating and being visible" },
  Virgo: { strength: "attention to detail and a wish to help", watch: "being too critical of yourself and others", need: "reliability and practical care", work: "improving systems and working with precision" },
  Libra: { strength: "fairness and a gift for harmony", watch: "putting off decisions to keep the peace", need: "balance and mutual respect", work: "working with people and weighing things fairly" },
  Scorpio: { strength: "determination and emotional depth", watch: "holding on to hurts or hiding feelings", need: "trust and honesty", work: "focus, research and seeing things through" },
  Sagittarius: { strength: "optimism and a love of learning", watch: "overpromising or speaking too bluntly", need: "freedom and a shared purpose", work: "teaching, exploring and thinking big" },
  Capricorn: { strength: "discipline and responsibility", watch: "being too hard on yourself, or all work and no rest", need: "commitment and stability", work: "planning, persistence and long-term goals" },
  Aquarius: { strength: "original thinking and friendliness", watch: "keeping an emotional distance", need: "friendship and independence", work: "new ideas and working for a wider good" },
  Pisces: { strength: "imagination and compassion", watch: "absorbing other people's moods or avoiding hard facts", need: "tenderness and understanding", work: "creative and caring work" },
};

/** Numerology Life Path: strength / watch-out / working style / one-word theme for the closing message. */
const LP: Record<number, { strength: string; watch: string; work: string; short: string }> = {
  1: { strength: "independence and initiative", watch: "going it alone or being impatient", work: "leading and starting new things", short: "initiative" },
  2: { strength: "tact and cooperation", watch: "putting your own needs last", work: "teamwork and mediation", short: "cooperation" },
  3: { strength: "creativity and self-expression", watch: "spreading your energy too thin", work: "communicating and creating", short: "creativity" },
  4: { strength: "reliability and a sense of structure", watch: "rigidity and overworking", work: "building solid, lasting systems", short: "reliability" },
  5: { strength: "adaptability and a love of change", watch: "restlessness and sudden moves", work: "variety, travel and persuading", short: "adaptability" },
  6: { strength: "responsibility and care", watch: "taking on too much for others", work: "serving and nurturing roles", short: "care" },
  7: { strength: "thoughtfulness and a search for meaning", watch: "withdrawing or over-analysing", work: "research and deep study", short: "depth of thought" },
  8: { strength: "drive and a gift for organising", watch: "tying your self-worth to results", work: "managing people and larger goals", short: "drive" },
  9: { strength: "compassion and idealism", watch: "giving too much, or finding it hard to let go", work: "service and wide-reaching work", short: "compassion" },
  11: { strength: "intuition and inspiration", watch: "nervous tension and self-doubt", work: "inspiring and guiding others", short: "intuition" },
  22: { strength: "big vision with practical skill", watch: "pressure to be perfect", work: "turning large plans into reality", short: "vision with discipline" },
  33: { strength: "selfless care and a healing presence", watch: "carrying other people's burdens", work: "teaching and healing", short: "care for others" },
};
const lpGroup = (n: number): Group => ([1, 4, 8, 22].includes(n) ? 0 : [2, 6, 9, 33].includes(n) ? 1 : 2);

/** Strength and watch-out for each element, per life area. */
const EL: Record<AreaKey, Record<Element, { s: string; w: string }>> = {
  personality: {
    fire: { s: "natural energy and confidence", w: "a short temper, or rushing ahead" },
    earth: { s: "a grounded, dependable nature", w: "resisting change or worrying too long" },
    air: { s: "a curious, flexible mind", w: "overthinking, or moving on too soon" },
    water: { s: "emotional insight and empathy", w: "mood swings, or taking on other people's feelings" },
  },
  career: {
    fire: { s: "willingness to take the initiative", w: "losing interest once the excitement fades" },
    earth: { s: "consistency and a practical approach", w: "avoiding sensible risks that could help you grow" },
    air: { s: "good communication and a stream of ideas", w: "starting many things and finishing few" },
    water: { s: "reading people and situations well", w: "letting moods affect your work" },
  },
  love: {
    fire: { s: "warmth and enthusiasm in relationships", w: "impatience during disagreements" },
    earth: { s: "loyalty and steady care", w: "holding back feelings, or being too rigid" },
    air: { s: "easy conversation and a sense of fun", w: "staying in your head instead of sharing feelings" },
    water: { s: "deep care and sensitivity", w: "hurt feelings that go unspoken" },
  },
  money: {
    fire: { s: "confidence to earn and invest in yourself", w: "impulsive spending and big risks" },
    earth: { s: "a natural feel for saving and security", w: "holding on out of fear and missing sensible chances" },
    air: { s: "an eye for ideas and opportunities", w: "unplanned spending on new interests" },
    water: { s: "care for the security of your family", w: "spending to soothe your mood" },
  },
  health: {
    fire: { s: "plenty of energy for activity", w: "burning out or pushing through tiredness" },
    earth: { s: "a body that responds well to routine", w: "sitting too long, or heavy comfort eating" },
    air: { s: "a quick mind that enjoys variety", w: "a busy mind that disturbs your sleep" },
    water: { s: "awareness of how feelings affect your body", w: "stress showing up in sleep and appetite" },
  },
  spirit: {
    fire: { s: "a spirit that grows through action and purpose", w: "finding stillness hard" },
    earth: { s: "a practical faith in routine and service", w: "leaving your inner life for last" },
    air: { s: "a love of ideas, reading and reflection", w: "thinking about peace instead of practising it" },
    water: { s: "a natural feeling for devotion and compassion", w: "getting lost in emotion without grounding" },
  },
};

/** Three practical actions per area, chosen by element, quality and Life Path group so different charts get different advice. */
const ACT_EL: Record<AreaKey, Record<Element, string>> = {
  personality: {
    fire: "Pause for three slow breaths before you react.",
    earth: "Try one small new thing each week to stay flexible.",
    air: "Finish one task fully before you start another.",
    water: "Name the feeling in one line before you act on it.",
  },
  career: {
    fire: "Pick one goal and see it through before starting the next.",
    earth: "Take one small, calculated step outside your comfort zone each month.",
    air: "Write your top three work priorities every morning.",
    water: "Keep a short work log, so facts and not moods guide your decisions.",
  },
  love: {
    fire: "Wait ten seconds before replying in a disagreement.",
    earth: "Share one feeling out loud each week, even a small one.",
    air: "Ask one real question about how someone close to you is feeling.",
    water: "Say what hurt you, gently and soon, instead of staying silent.",
  },
  money: {
    fire: "Wait 48 hours before any non-essential purchase.",
    earth: "Review one subscription or expense a month and keep only what helps.",
    air: "Plan a simple monthly budget with a fixed amount for fun.",
    water: "Move a fixed amount to savings on the day you are paid.",
  },
  health: {
    fire: "Walk or stretch for 20 minutes a day, and keep one full rest day each week.",
    earth: "Stand up and move for five minutes every hour you sit.",
    air: "Switch screens off 30 minutes before bed.",
    water: "Keep a regular sleep time and eat meals at fixed hours.",
  },
  spirit: {
    fire: "Sit quietly for five minutes with no phone, even if it feels hard.",
    earth: "Turn one daily task, like a meal or a walk, into a mindful moment.",
    air: "Read one verse or a page of a book that matters to you, and think about it.",
    water: "End each day by noting one thing you are grateful for.",
  },
};
const ACT_Q: Record<AreaKey, Record<Quality, string>> = {
  personality: {
    cardinal: "Choose one habit, start it today and keep it small.",
    fixed: "Ask someone you trust for a view that differs from yours.",
    mutable: "Fix your wake-up time and keep it for the month.",
  },
  career: {
    cardinal: "Set one weekly career goal and review it every Sunday.",
    fixed: "Ask for feedback once a month and act on one point.",
    mutable: "Spend 30 minutes a week on a skill you want to build.",
  },
  love: {
    cardinal: "Plan one small thing for someone you care about each week.",
    fixed: "Be the first to say sorry or reach out after a quarrel.",
    mutable: "Keep your word on small plans so people can rely on you.",
  },
  money: {
    cardinal: "Track every expense for a month.",
    fixed: "Set one saving target and keep it where you can see it.",
    mutable: "Write down the reason before every large spend.",
  },
  health: {
    cardinal: "Start the day with a glass of water and a short walk.",
    fixed: "Keep one workout slot in your week that you do not cancel.",
    mutable: "Prepare simple, healthy food for the next day each evening.",
  },
  spirit: {
    cardinal: "Begin the day with a minute of stillness or a short prayer.",
    fixed: "Keep one practice, such as a mantra or a quiet walk, for the whole month.",
    mutable: "Try a different quiet practice each week and keep the one that suits you.",
  },
};
const ACT_G: Record<AreaKey, [string, string, string]> = {
  personality: ["Write three priorities for tomorrow before you sleep.", "Set one clear limit this week and say it kindly.", "Write a few lines each night about what went well."],
  career: ["Ask for help with one task you usually hold on to.", "Offer help to a colleague and note what you learn.", "Share one idea with a teammate or mentor each week."],
  love: ["Listen without fixing for ten minutes in one conversation.", "Tell someone what you need instead of hoping they guess.", "Send one thoughtful message to someone you have not spoken to in a while."],
  money: ["Build towards an emergency fund of three months of expenses.", "Talk openly about money with your family so no one has to guess.", "Learn one money basic, such as budgeting, each month."],
  health: ["Fix a regular time for exercise and treat it like a meeting.", "Book your own check-ups and rest, not only other people's needs.", "Try one new, gentle form of movement, such as yoga or dance."],
  spirit: ["Do five minutes of breathing meditation at the same time each day.", "Do one quiet act of kindness a day without telling anyone.", "Keep a short journal of what you noticed or learned each day."],
};

/** One extra, area-specific line per quality, so the same Life Path or watch-out is not repeated in every card. */
const Q_IMPROVE: Partial<Record<AreaKey, Record<Quality, string>>> = {
  career: {
    cardinal: "Starting is easy for you; finishing and reviewing take planning.",
    fixed: "You may resist feedback or new methods at first.",
    mutable: "Your priorities can shift often, so write them down.",
  },
  love: {
    cardinal: "You may take the lead and forget to ask what the other person wants.",
    fixed: "You may hold on to old hurts for longer than you realise.",
    mutable: "Changing plans often can confuse people who rely on you.",
  },
  money: {
    cardinal: "Starting a money plan is easy; sticking with it takes care.",
    fixed: "A money habit, once set, tends to stay, so choose it carefully.",
    mutable: "Money plans can change often, so write your goals down.",
  },
};
const Q_SPIRIT: Record<Quality, string> = {
  cardinal: "You may prefer to begin a practice yourself rather than be told what to do.",
  fixed: "Once you commit to a practice, you tend to keep it.",
  mutable: "You may enjoy trying a few practices before choosing one.",
};

const TITLE: Record<AreaKey, string> = {
  personality: "Personality & Self-Development",
  career: "Career & Professional Growth",
  love: "Love & Relationships",
  money: "Money & Financial Discipline",
  health: "Health & Well-being",
  spirit: "Spirituality & Inner Growth",
};

const asSign = (s: string | undefined | null): Sign | null => ((SIGNS as readonly string[]).includes(s ?? "") ? (s as Sign) : null);
const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

// The static tables above keep the English text and ids; the text shown is looked up by a stable key (English is the fallback).
const T = (key: string, values?: Record<string, string | number>): string => i18n.t(key, values) as string;
const D = (key: string, english: string): string => i18n.t(key, { defaultValue: english }) as string;
const signText = (s: Sign, f: "strength" | "watch" | "need" | "work") => D(`kundali.growth.sign.${s}.${f}`, SIGN[s][f]);
const lpText = (n: number, f: "strength" | "watch" | "work" | "short") => D(`kundali.growth.lifePath.${n}.${f}`, LP[n][f]);
const elText = (a: AreaKey, e: Element, f: "s" | "w") => D(`kundali.growth.element.${a}.${e}.${f === "s" ? "strength" : "watch"}`, EL[a][e][f]);
const actEl = (a: AreaKey, e: Element) => D(`kundali.growth.action.element.${a}.${e}`, ACT_EL[a][e]);
const actQ = (a: AreaKey, q: Quality) => D(`kundali.growth.action.quality.${a}.${q}`, ACT_Q[a][q]);
const actG = (a: AreaKey, g: Group) => D(`kundali.growth.action.group.${a}.${g}`, ACT_G[a][g]);
const qImprove = (a: AreaKey, q: Quality) => D(`kundali.growth.qualityImprove.${a}.${q}`, Q_IMPROVE[a]![q]);
const qSpirit = (q: Quality) => D(`kundali.growth.qualitySpirit.${q}`, Q_SPIRIT[q]);
const elName = (e: Element) => T(`kundali.growth.elementName.${e}`);

export function buildGrowthGuide({ kundali: k, sunSign, lifePath, name }: GrowthInput): GrowthGuide {
  const sun = asSign(sunSign) ?? asSign(k.sun.rashi?.sign) ?? "Aries";
  const moon = asSign(k.moon.rashi?.sign); // null when the Moon changes sign on the birth date and no birth time was given
  const primary: Sign = moon ?? sun; // the Moon sign (mind and emotions) leads when it is confirmed
  const el = ELEMENT[primary];
  const ql = QUALITY[primary];
  const lp = LP[lifePath] ? lifePath : 9;
  const g = lpGroup(lp);
  const sunName = k.sun.rashi ? rashiName(k.sun.rashi) : k.sun.candidates[0] ? rashiName(k.sun.candidates[0]) : signName(sun);
  const primaryName = moon ? T("kundali.growth.primaryMoon", { name: rashiName(k.moon.rashi!) }) : T("kundali.growth.primarySun", { name: sunName });
  const guide = buildKundaliGuide(k); // calculated facts only; houses and dignity exist only when the birth time was given

  const fact = (it: { title: string; fact: string }) => T("kundali.growth.factJoin", { title: it.title, fact: it.fact });
  const dashaLord = k.dasha?.mahadasha.lord;
  const dashaThemeText = dashaLord ? dashaTheme(dashaLord) : undefined;
  const dashaLordName = dashaLord ? planetName(dashaLord) : "";
  const panchangKnown = k.timeKnown && !k.panchang?.uncertain;

  const act = (a: AreaKey): string[] => [actEl(a, el), actQ(a, ql), actG(a, g)];
  const lpLine = T("kundali.growth.lifePathLabel", { n: lp });
  const elN = elName(el);

  const built: Record<AreaKey, GrowthArea> = {
    personality: {
      key: "personality", title: D("kundali.growth.area.personality", TITLE.personality),
      chart: [...guide.strengths.slice(0, 2), ...guide.challenges.slice(0, 1)].map(fact),
      strengths: [
        T("kundali.growth.personality.strength1", { primary: primaryName, strength: signText(primary, "strength"), element: elText("personality", el, "s") }),
        T("kundali.growth.personality.strength2", { lp: lpLine, strength: lpText(lp, "strength") }),
      ],
      improve: [
        T("kundali.growth.personality.improve1", { watch: signText(primary, "watch"), elementWatch: elText("personality", el, "w") }),
        T("kundali.growth.personality.improve2", { lp: lpLine, watch: lpText(lp, "watch") }),
      ],
      actions: act("personality"),
      basis: T("kundali.growth.personality.basis", { primary: primaryName, lp: lpLine }),
    },
    career: {
      key: "career", title: D("kundali.growth.area.career", TITLE.career),
      chart: [...guide.career.slice(0, 2).map(fact), ...(k.dasha ? [T("kundali.growth.career.runningPeriod", { mahadasha: planetName(k.dasha.mahadasha.lord), antardasha: planetName(k.dasha.antardasha.lord) })] : [])],
      strengths: [
        T("kundali.growth.career.strength1", { sun: sunName, work: signText(sun, "work") }),
        T("kundali.growth.career.strength2", { lp: lpLine, work: lpText(lp, "work"), element: elN, elementStrength: elText("career", el, "s") }),
        ...(dashaThemeText ? [T("kundali.growth.career.strengthDasha", { lord: dashaLordName, theme: dashaThemeText })] : []),
      ],
      improve: [T("kundali.growth.watchFor", { watch: elText("career", el, "w") }), qImprove("career", ql)],
      actions: act("career"),
      basis: T("kundali.growth.career.basis", {
        sun: sunName, lp: lpLine,
        houses: guide.houses ? T("kundali.growth.career.basisHouses") : "",
        dasha: k.dasha ? T("kundali.growth.career.basisDasha") : "",
      }),
    },
    love: {
      key: "love", title: D("kundali.growth.area.love", TITLE.love),
      chart: [...guide.relationships.slice(0, 3).map(fact)],
      strengths: [
        T("kundali.growth.love.strength1", { primary: primaryName, need: signText(primary, "need") }),
        T("kundali.growth.elementBrings", { element: elN, text: elText("love", el, "s") }),
      ],
      improve: [T("kundali.growth.watchFor", { watch: elText("love", el, "w") }), qImprove("love", ql)],
      actions: act("love"),
      basis: T("kundali.growth.love.basis", { primary: primaryName, houses: guide.houses ? T("kundali.growth.love.basisHouses") : "" }),
    },
    money: {
      key: "money", title: D("kundali.growth.area.money", TITLE.money),
      chart: guide.houses ? guide.career.slice(2, 3).map(fact) : [],
      strengths: [
        T("kundali.growth.elementBrings", { element: elN, text: elText("money", el, "s") }),
        T("kundali.growth.money.strength2", { sun: sunName, strength: signText(sun, "strength") }),
      ],
      improve: [T("kundali.growth.watchFor", { watch: elText("money", el, "w") }), qImprove("money", ql)],
      actions: act("money"),
      basis: T("kundali.growth.money.basis", { primary: primaryName, lp: lpLine, houses: guide.houses ? T("kundali.growth.money.basisHouses") : "" }),
    },
    health: {
      key: "health", title: D("kundali.growth.area.health", TITLE.health),
      chart: [],
      strengths: [T("kundali.growth.elementBrings", { element: elN, text: elText("health", el, "s") }), T("kundali.growth.health.strength2")],
      improve: [T("kundali.growth.watchFor", { watch: elText("health", el, "w") })],
      actions: act("health"),
      basis: T("kundali.growth.health.basis"),
    },
    spirit: {
      key: "spirit", title: D("kundali.growth.area.spirit", TITLE.spirit),
      chart: [
        ...guide.important.filter((i) => i.title === T("kundali.insight.nakshatra.title")).map(fact),
        ...(panchangKnown ? [T("kundali.growth.spirit.panchang", { paksha: glossName("paksha", k.panchang.paksha === "shukla" ? "Shukla" : "Krishna"), tithi: glossName("tithi", k.panchang.tithi.name) })] : []),
      ],
      strengths: [T("kundali.growth.elementBrings", { element: elN, text: elText("spirit", el, "s") }), qSpirit(ql)],
      improve: [T("kundali.growth.watchFor", { watch: elText("spirit", el, "w") })],
      actions: act("spirit"),
      basis: T("kundali.growth.spirit.basis", { primary: primaryName, lp: lpLine, nakshatra: k.moon.nakshatra ? T("kundali.growth.spirit.basisNakshatra") : "" }),
    },
  };
  const areas = AREAS.map((a) => built[a]);

  // The 30-day plan reuses the actions generated above, so it always matches this person's guide.
  const A = (key: AreaKey, i: number) => built[key].actions[i];
  const plan: GrowthPlanItem[] = [
    { label: T("kundali.growth.plan.dailyHabit"), text: A("personality", 0) },
    { label: T("kundali.growth.plan.weeklyGoal"), text: A("career", 1) },
    { label: T("kundali.growth.plan.relationship"), text: A("love", 1) },
    { label: T("kundali.growth.plan.careerLearning"), text: A("career", 0) },
    { label: T("kundali.growth.plan.healthHabit"), text: A("health", 0) },
    { label: T("kundali.growth.plan.reflection"), text: A("spirit", 1) },
  ];

  const first = name?.trim() ? name.trim().split(/\s+/)[0] : "";
  const message = [
    T(first ? "kundali.growth.message.openingNamed" : "kundali.growth.message.opening", { name: first, primary: primaryName, lp: lpLine, strength: signText(primary, "strength"), short: lpText(lp, "short") }),
    T("kundali.growth.message.growth", { watch: signText(primary, "watch") }),
    dashaThemeText ? T("kundali.growth.message.dasha", { lord: dashaLordName, theme: dashaThemeText }) : "",
    T("kundali.growth.message.closing", { step: lc(A("personality", 0)) }),
  ].filter(Boolean).join(" ");

  const notices: string[] = [];
  if (!k.timeKnown) notices.push(T("kundali.growth.notice.noTime"));
  else if (!moon) notices.push(T("kundali.growth.notice.noMoon"));

  return { areas, plan, message, notices };
}
