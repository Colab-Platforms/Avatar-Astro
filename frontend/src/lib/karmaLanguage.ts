import { calendarFacts, type TodayCalendar } from "@/lib/karmaCalendar";

/**
 * Languages for Know Your Karma: English, Hindi (Devanagari) and Hinglish (Hindi in Roman letters).
 *
 * Everything the app itself writes (labels, the calendar explanation, notes) is fixed text in each language below.
 * Calendar VALUES come from the verified calendar service; this file only translates their names (for example
 * "Tuesday" to "मंगलवार"). Where no translation table exists (yoga, karana) the original name is kept.
 */
export type KarmaLang = "en" | "hi" | "hinglish";

export const KARMA_LANGS: { id: KarmaLang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिंदी" },
  { id: "hinglish", label: "Hinglish" },
];

const KEY = "karma_lang";
export function loadKarmaLang(): KarmaLang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "en" || v === "hi" || v === "hinglish") return v;
  } catch { /* storage unavailable */ }
  return "en";
}
export function saveKarmaLang(l: KarmaLang): void {
  try { localStorage.setItem(KEY, l); } catch { /* storage unavailable */ }
}

/** What the model is told about the reply language. */
export const REPLY_DIRECTIVE: Record<KarmaLang, string> = {
  en: "Write in very simple English that a 10-year-old can follow.",
  hi: "Write in very simple Hindi in Devanagari script (सरल हिंदी) that a 10-year-old can follow. Do not write in Roman letters.",
  hinglish: "Write in very simple Hinglish: Hindi in Roman letters mixed with easy English words, the way people chat. Do not use Devanagari script.",
};

/** The text of the reply must be in the chosen script. */
export function matchesLanguage(text: string, lang: KarmaLang): boolean {
  const dev = (text.match(/[ऀ-ॿ]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  if (lang === "hi") return dev > 0 && latin <= dev * 0.3;
  return dev === 0;
}

const WEEKDAY: Record<KarmaLang, Record<string, string>> = {
  en: {},
  hi: { Sunday: "रविवार", Monday: "सोमवार", Tuesday: "मंगलवार", Wednesday: "बुधवार", Thursday: "गुरुवार", Friday: "शुक्रवार", Saturday: "शनिवार" },
  hinglish: { Sunday: "Ravivar", Monday: "Somvar", Tuesday: "Mangalvar", Wednesday: "Budhvar", Thursday: "Guruvar", Friday: "Shukravar", Saturday: "Shanivar" },
};

const TITHI_HI: Record<string, string> = {
  Pratipada: "प्रतिपदा", Dwitiya: "द्वितीया", Dvitiya: "द्वितीया", Tritiya: "तृतीया", Chaturthi: "चतुर्थी", Panchami: "पंचमी", Shashthi: "षष्ठी",
  Saptami: "सप्तमी", Ashtami: "अष्टमी", Navami: "नवमी", Dashami: "दशमी", Ekadashi: "एकादशी", Dwadashi: "द्वादशी", Dvadashi: "द्वादशी",
  Trayodashi: "त्रयोदशी", Chaturdashi: "चतुर्दशी", Purnima: "पूर्णिमा", Amavasya: "अमावस्या",
};

const NAKSHATRA_HI: Record<string, string> = {
  Ashwini: "अश्विनी", Bharani: "भरणी", Krittika: "कृत्तिका", Rohini: "रोहिणी", Mrigashira: "मृगशिरा", Ardra: "आर्द्रा", Punarvasu: "पुनर्वसु",
  Pushya: "पुष्य", Ashlesha: "आश्लेषा", Magha: "मघा", "Purva Phalguni": "पूर्वा फाल्गुनी", "Uttara Phalguni": "उत्तरा फाल्गुनी", Hasta: "हस्त",
  Chitra: "चित्रा", Swati: "स्वाति", Vishakha: "विशाखा", Anuradha: "अनुराधा", Jyeshtha: "ज्येष्ठा", Mula: "मूल", "Purva Ashadha": "पूर्वाषाढ़ा",
  "Uttara Ashadha": "उत्तराषाढ़ा", Shravana: "श्रवण", Dhanishta: "धनिष्ठा", Shatabhisha: "शतभिषा", "Purva Bhadrapada": "पूर्वाभाद्रपद",
  "Uttara Bhadrapada": "उत्तराभाद्रपद", Revati: "रेवती",
};

const MONTH_HI: Record<string, string> = {
  Chaitra: "चैत्र", Vaishakha: "वैशाख", Jyeshtha: "ज्येष्ठ", Ashadha: "आषाढ़", Shravana: "श्रावण", Bhadrapada: "भाद्रपद", Ashvina: "आश्विन",
  Kartika: "कार्तिक", Margashirsha: "मार्गशीर्ष", Pausha: "पौष", Magha: "माघ", Phalguna: "फाल्गुन",
};

const ORDINAL_HI = ["", "पहला", "दूसरा", "तीसरा", "चौथा", "पाँचवाँ", "छठा", "सातवाँ", "आठवाँ", "नौवाँ", "दसवाँ", "ग्यारहवाँ", "बारहवाँ", "तेरहवाँ", "चौदहवाँ", "पंद्रहवाँ"];
const ordinalEn = (n: number): string => {
  const v = n % 100;
  return `${n}${v >= 11 && v <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
};

const FACT_LABEL: Record<KarmaLang, Record<string, string>> = {
  en: {},
  hi: { Tithi: "तिथि", Paksha: "पक्ष", Nakshatra: "नक्षत्र", Day: "दिन", Month: "माह", Yoga: "योग", Karana: "करण" },
  hinglish: { Tithi: "Tithi", Paksha: "Paksh", Nakshatra: "Nakshatra", Day: "Din", Month: "Maah", Yoga: "Yog", Karana: "Karan" },
};

/** The calendar chips in the chosen language. A value is translated only when a table for it exists. */
export function localizedFacts(c: TodayCalendar, lang: KarmaLang): { label: string; value: string }[] {
  return calendarFacts(c).map((f) => {
    let value = f.value;
    if (lang === "hi") {
      if (f.label === "Tithi") value = TITHI_HI[f.value] ?? f.value;
      else if (f.label === "Nakshatra") value = NAKSHATRA_HI[f.value] ?? f.value;
      else if (f.label === "Paksha") value = f.value === "Krishna" ? "कृष्ण" : "शुक्ल";
      else if (f.label === "Day") value = WEEKDAY.hi[f.value] ?? f.value;
      else if (f.label === "Month") value = MONTH_HI[f.value] ?? f.value;
    } else if (lang === "hinglish" && f.label === "Day") {
      value = WEEKDAY.hinglish[f.value] ?? f.value;
    }
    return { label: FACT_LABEL[lang][f.label] ?? f.label, value };
  });
}

/**
 * "What it means": built here from the verified calendar, never written by a model, so it is always exact.
 * Day, tithi, which half of the Moon's month it is (and what the Moon is doing), and the nakshatra.
 */
export function calendarMeaning(c: TodayCalendar, lang: KarmaLang): string {
  const dark = c.paksha === "Krishna";
  const n = c.tithi.numberInPaksha;
  if (lang === "hi") {
    const vara = WEEKDAY.hi[c.vara] ?? c.vara;
    const tithi = TITHI_HI[c.tithi.name] ?? c.tithi.name;
    const nak = NAKSHATRA_HI[c.nakshatra.name] ?? c.nakshatra.name;
    const half = dark ? "कृष्ण पक्ष (अँधेरा पक्ष) का" : "शुक्ल पक्ष (उजाला पक्ष) का";
    const moon = dark ? "जब चाँद हर रात थोड़ा छोटा होता है" : "जब चाँद हर रात थोड़ा बड़ा होता है";
    return `आज ${vara} है। ${tithi} ${half} ${ORDINAL_HI[n] ?? n} दिन है, ${moon}। चाँद ${nak} नक्षत्र (तारों के समूह) में है।`;
  }
  if (lang === "hinglish") {
    const vara = WEEKDAY.hinglish[c.vara] ?? c.vara;
    const half = dark ? "Krishna Paksha (andhera paksh)" : "Shukla Paksha (ujaala paksh)";
    const moon = dark ? "jab chaand har raat thoda chhota hota hai" : "jab chaand har raat thoda bada hota hai";
    return `Aaj ${vara} hai. ${c.tithi.name} ${half} ka ${ordinalEn(n)} din hai, ${moon}. Chaand ${c.nakshatra.name} nakshatra (taaron ke samooh) mein hai.`;
  }
  const half = dark ? "dark half (Krishna Paksha), when the Moon grows smaller each night" : "bright half (Shukla Paksha), when the Moon grows bigger each night";
  return `Today is ${c.vara}. ${c.tithi.name} is the ${ordinalEn(n)} day of the ${half}. The Moon is in ${c.nakshatra.name} nakshatra (a group of stars).`;
}

/** The idea the model may use about today's Moon half: a standard, simple reading of waxing and waning. */
export const PAKSHA_IDEA: Record<"Shukla" | "Krishna", string> = {
  Shukla: "bright half (the Moon grows bigger each night): starting, building, growing",
  Krishna: "dark half (the Moon grows smaller each night): reflecting, finishing, letting go",
};

export interface KarmaText {
  hello: string; intro: string; language: string;
  calendarTitle: string; calLoading: string; signIn: string; signInRest: string; calUnavailable: string; noCalNote: string;
  meaning: string; thought: string; action: string; remember: string; footer: string;
  tryAsking: string; askAnother: string; placeholder: string; tryAgain: string;
  baseQuestions: string[]; tithiQuestion: (tithi: string) => string;
  errors: { signIn: string; network: string; rate: string; unavailable: string; bad: string; generic: string; voice: string };
}

export const KARMA_TEXT: Record<KarmaLang, KarmaText> = {
  en: {
    hello: "Namaste", intro: "Ask me anything about your karma. I will keep my answers short and simple.", language: "Language",
    calendarTitle: "Today's Calendar", calLoading: "Looking up today's calendar…", signIn: "Sign in", signInRest: " to see today's calendar.",
    calUnavailable: "Today's calendar details are not available right now. You can still ask a question.",
    noCalNote: "Today's calendar details are not available right now, so this is a general reflection.",
    meaning: "What it means", thought: "Your Karma Thought", action: "One Good Action", remember: "Remember",
    footer: "Calendar facts are calculated. The rest is a thought to reflect on, not a prediction.",
    tryAsking: "Try asking", askAnother: "Ask another", placeholder: "Ask about your karma…", tryAgain: "Try again",
    baseQuestions: ["What should I focus on today?", "What habit should I improve?", "How can I bring more peace into my life?", "What can I learn from my current situation?", "Which good action can I practise today?"],
    tithiQuestion: (t) => `What does ${t} tithi mean for me today?`,
    errors: {
      signIn: "Please sign in to continue.", network: "We couldn't reach the guide. Check your connection and try again.",
      rate: "Too many questions at once. Please wait a minute and try again.", unavailable: "The guide is not available right now. Please try again in a moment.",
      bad: "That answer didn't come out right. Please ask again.", generic: "Something went wrong. Please try again.", voice: "Voice input works in Chrome.",
    },
  },
  hi: {
    hello: "नमस्ते", intro: "अपने कर्म के बारे में मुझसे कुछ भी पूछिए। मैं जवाब छोटे और आसान रखूँगा।", language: "भाषा",
    calendarTitle: "आज का पंचांग", calLoading: "आज का पंचांग देखा जा रहा है…", signIn: "साइन इन करें", signInRest: " आज का पंचांग देखने के लिए।",
    calUnavailable: "आज के पंचांग की जानकारी अभी उपलब्ध नहीं है। आप फिर भी सवाल पूछ सकते हैं।",
    noCalNote: "आज के पंचांग की जानकारी अभी उपलब्ध नहीं है, इसलिए यह एक सामान्य विचार है।",
    meaning: "इसका मतलब", thought: "आपका कर्म-विचार", action: "एक अच्छा काम", remember: "याद रखिए",
    footer: "पंचांग की बातें गणना से निकाली गई हैं। बाकी सोचने के लिए एक विचार है, भविष्यवाणी नहीं।",
    tryAsking: "पूछकर देखिए", askAnother: "एक और पूछिए", placeholder: "अपने कर्म के बारे में पूछिए…", tryAgain: "फिर कोशिश करें",
    baseQuestions: ["आज मुझे किस बात पर ध्यान देना चाहिए?", "मुझे कौन-सी आदत सुधारनी चाहिए?", "अपने जीवन में शांति कैसे लाऊँ?", "अभी की स्थिति से मैं क्या सीखूँ?", "आज मैं कौन-सा अच्छा काम करूँ?"],
    tithiQuestion: (t) => `आज ${TITHI_HI[t] ?? t} तिथि मेरे लिए क्या मायने रखती है?`,
    errors: {
      signIn: "जारी रखने के लिए कृपया साइन इन करें।", network: "गाइड से संपर्क नहीं हो पाया। इंटरनेट जाँचकर फिर कोशिश करें।",
      rate: "एक साथ बहुत सारे सवाल हो गए। कृपया एक मिनट रुककर फिर कोशिश करें।", unavailable: "गाइड अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर कोशिश करें।",
      bad: "जवाब ठीक से नहीं बन पाया। कृपया फिर से पूछिए।", generic: "कुछ गड़बड़ हो गई। कृपया फिर कोशिश करें।", voice: "आवाज़ से पूछना Chrome में चलता है।",
    },
  },
  hinglish: {
    hello: "Namaste", intro: "Apne karma ke baare mein mujhse kuch bhi poochiye. Main jawab chhote aur aasan rakhunga.", language: "Bhasha",
    calendarTitle: "Aaj ka Panchang", calLoading: "Aaj ka Panchang dekha ja raha hai…", signIn: "Sign in karein", signInRest: " aaj ka Panchang dekhne ke liye.",
    calUnavailable: "Aaj ke Panchang ki jaankari abhi uplabdh nahi hai. Aap phir bhi sawaal pooch sakte hain.",
    noCalNote: "Aaj ke Panchang ki jaankari abhi uplabdh nahi hai, isliye yeh ek saamaanya vichaar hai.",
    meaning: "Iska matlab", thought: "Aapka Karma Vichaar", action: "Ek Achha Kaam", remember: "Yaad rakhiye",
    footer: "Panchang ki baatein ganit se nikaali gayi hain. Baaki sochne ke liye ek vichaar hai, bhavishyavaani nahi.",
    tryAsking: "Poochkar dekhiye", askAnother: "Ek aur poochiye", placeholder: "Apne karma ke baare mein poochiye…", tryAgain: "Phir koshish karein",
    baseQuestions: ["Aaj mujhe kis baat par dhyan dena chahiye?", "Mujhe kaun si aadat sudhaarni chahiye?", "Apne jeevan mein shaanti kaise laun?", "Abhi ki sthiti se main kya seekhun?", "Aaj main kaun sa achha kaam karun?"],
    tithiQuestion: (t) => `Aaj ${t} tithi mere liye kya matlab rakhti hai?`,
    errors: {
      signIn: "Aage badhne ke liye kripya sign in karein.", network: "Guide se sampark nahi ho paya. Internet check karke phir koshish karein.",
      rate: "Ek saath bahut saare sawaal ho gaye. Kripya ek minute ruk kar phir koshish karein.", unavailable: "Guide abhi uplabdh nahi hai. Kripya thodi der baad phir koshish karein.",
      bad: "Jawab theek se nahi ban paya. Kripya phir se poochiye.", generic: "Kuch gadbad ho gayi. Kripya phir koshish karein.", voice: "Awaaz se poochna Chrome mein chalta hai.",
    },
  },
};
