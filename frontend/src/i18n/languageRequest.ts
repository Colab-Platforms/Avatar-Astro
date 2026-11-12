import type { LocaleCode } from "./languages";

/**
 * Recognises an explicit request to change the language, such as "talk in Tamil", "please reply in Marathi", "हिंदी में जवाब दो" or
 * "தமிழில் பேசுங்கள்". It returns the language asked for, or null when the message is an ordinary one.
 *
 * It is deliberately cautious: the message has to name a language AND ask for it (a verb like talk/reply, "<language> mein", or a native
 * word for speak/answer), it must be short, and "I can't speak English" is not a request. An ordinary message in some language never
 * changes the language; only an explicit request does.
 */

/** Names written in Latin letters (English and the way Hindi speakers type them). */
const ROMAN: Record<LocaleCode, string[]> = {
  en: ["english", "angrezi", "angreji"],
  hi: ["hindi"],
  mr: ["marathi"],
  ta: ["tamil", "tamizh", "thamizh"],
  te: ["telugu"],
  gu: ["gujarati", "gujrati"],
  bn: ["bengali", "bangla", "bangali"],
  kn: ["kannada", "kannad"],
  ml: ["malayalam"],
  pa: ["punjabi", "panjabi"],
};

/** Name stems in the scripts of the ten languages (an ending may follow: தமிழில், मराठीत, മലയാളത്തിൽ ...). */
const NATIVE: Record<LocaleCode, string[]> = {
  en: ["इंग्लिश", "अंग्रेज़ी", "अंग्रेजी", "ஆங்கில", "ఇంగ్లీష్", "ఆంగ్ల", "અંગ્રેજી", "ইংরেজি", "ಇಂಗ್ಲಿಷ್", "ഇംഗ്ലീഷ്", "ਅੰਗਰੇਜ਼ੀ"],
  hi: ["हिंदी", "हिन्दी", "ஹிந்தி", "హిందీ", "હિન્દી", "હિંદી", "হিন্দি", "ಹಿಂದಿ", "ഹിന്ദി", "ਹਿੰਦੀ"],
  mr: ["मराठी", "மராத்தி", "మరాఠీ", "મરાઠી", "মারাঠি", "ಮರಾಠಿ", "മറാത്തി", "ਮਰਾਠੀ"],
  ta: ["तमिल", "தமிழ", "తమిళ", "તમિલ", "তামিল", "ತಮಿಳು", "തമിഴ്", "ਤਮਿਲ"],
  te: ["तेलुगु", "தெலுங்கு", "తెలుగు", "તેલુગુ", "তেলুগু", "ತೆಲುಗು", "തെലുങ്ക്", "ਤੇਲਗੂ"],
  gu: ["गुजराती", "குஜராத்தி", "గుజరాతీ", "ગુજરાતી", "গুজরাটি", "ಗುಜರಾತಿ", "ഗുജറാത്തി", "ਗੁਜਰਾਤੀ"],
  bn: ["बांग्ला", "बंगाली", "வங்காள", "బెంగాలీ", "બંગાળી", "বাংলা", "ಬಂಗಾಳಿ", "ബംഗാളി", "ਬੰਗਾਲੀ"],
  kn: ["कन्नड़", "கன்னட", "కన్నడ", "કન્નડ", "কন্নড়", "ಕನ್ನಡ", "കന്നഡ", "ਕੰਨੜ"],
  ml: ["मलयालम", "மலையாள", "మలయాళ", "મલયાલમ", "মালায়ালাম", "ಮಲಯಾಳಂ", "മലയാള", "ਮਲਿਆਲਮ"],
  pa: ["पंजाबी", "பஞ்சாபி", "పంజాబీ", "પંજાબી", "পাঞ্জাবি", "ಪಂಜಾಬಿ", "പഞ്ചാബി", "ਪੰਜਾਬੀ"],
};

/** Words that ask for a language in the native scripts: speak / answer / reply / talk. */
const NATIVE_CUES = [
  "जवाब", "उत्तर", "बोलो", "बोलिए", "बोल", "बात", "सांग", "सांगा", "बोला", "लिखो", // Hindi, Marathi
  "பேசு", "பதில்", "சொல்", // Tamil
  "మాట్లాడ", "చెప్పు", "సమాధాన", // Telugu
  "બોલો", "જવાબ", "વાત", // Gujarati
  "বলো", "বলুন", "উত্তর", "কথা", // Bengali
  "ಮಾತನಾಡ", "ಉತ್ತರ", "ಹೇಳಿ", // Kannada
  "സംസാരി", "മറുപടി", "പറയ", // Malayalam
  "ਬੋਲੋ", "ਜਵਾਬ", "ਗੱਲ", // Punjabi
];

const MAX_LENGTH = 120;
const LATIN_VERB = "talk|speak|reply|respond|answer|chat|write|continue|switch|change|use|say|tell|give|explain";
const NEGATION = /\b(can'?t|cannot|can not|don'?t|do not|didn'?t|not|never|no)\b[^.?!]{0,16}$/i;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function detectLanguageRequest(text: string): LocaleCode | null {
  const t = (text ?? "").trim();
  if (!t || t.length > MAX_LENGTH) return null;
  const lower = t.toLowerCase();
  let best: { code: LocaleCode; at: number } | null = null;
  const consider = (code: LocaleCode, at: number) => { if (!best || at < best.at) best = { code, at }; };

  for (const code of Object.keys(ROMAN) as LocaleCode[]) {
    for (const name of ROMAN[code]) {
      // "talk in Tamil", "reply using Marathi", "please speak in the Hindi language"
      const asked = new RegExp(`\\b(${LATIN_VERB})\\b[^.?!]{0,25}?\\b(?:in|into|using|with)\\s+(?:the\\s+)?${esc(name)}\\b`, "i").exec(lower);
      if (asked && !NEGATION.test(lower.slice(0, asked.index + asked[1].length))) { consider(code, asked.index); continue; }
      // Roman Hindi: "tamil mein bolo", "marathi me jawab do"
      const roman = new RegExp(`\\b${esc(name)}\\s+(?:mein|me|mai|main)\\b`, "i").exec(lower);
      if (roman) consider(code, roman.index);
    }
  }

  const hasNativeCue = NATIVE_CUES.some((c) => t.includes(c));
  if (hasNativeCue) {
    for (const code of Object.keys(NATIVE) as LocaleCode[]) {
      for (const stem of NATIVE[code]) {
        const at = t.indexOf(stem);
        if (at >= 0) consider(code, at);
      }
    }
  }
  return best ? (best as { code: LocaleCode }).code : null;
}
