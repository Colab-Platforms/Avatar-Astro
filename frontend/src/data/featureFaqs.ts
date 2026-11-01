/**
 * FAQs for every feature, in one place. Each answer describes what the feature actually does today, so
 * keep them in step with the pages. Questions are specific to one feature and never repeated across features.
 */
import type { FeatureKey } from "./featureCatalog";

export interface Faq {
  question: string;
  answer: string;
}

export type FaqKey = FeatureKey | "astrologers";

export const FEATURE_FAQS: Record<FaqKey, Faq[]> = {
  tarot: [
    {
      question: "What can I ask during a tarot reading?",
      answer:
        "Choose a life area such as Career, Love, Marriage, Business or Finance, or reflect on a question you have in mind. Tarot Drishti works best with open questions like \"What should I focus on in my career right now?\" rather than yes-or-no ones.",
    },
    {
      question: "Which spreads can I choose from?",
      answer:
        "Life Timeline Tarot lays out five cards across your past, present and future for a life area you pick. Karma Mirror is a three-card reading about the patterns you are carrying. Each card is explained in your reading.",
    },
    {
      question: "How should I understand the cards in my reading?",
      answer:
        "Tap each card to read its meaning in its position, then read the overall reading, which ties the cards together. Take the themes that feel true to you and treat the rest as something to think about.",
    },
    {
      question: "What should I do after receiving my reading?",
      answer:
        "Pick one idea from the reading and turn it into a small step this week. You can also draw a new reading for a different area of life whenever you like.",
    },
    {
      question: "Can I get additional guidance about my reading?",
      answer:
        "Yes. Use the \"Need More Guidance?\" box under your reading to ask Divya Margdarshak a follow-up question. Your cards and question are carried over, so you do not need to explain them again.",
    },
  ],
  zodiac: [
    {
      question: "How can I discover my Rashi?",
      answer:
        "Open Janma Kundali and enter your birth date, time and birthplace. It calculates your Surya Rashi and Chandra Rashi in the Vedic (sidereal) zodiac. Rashi Chakra here introduces all twelve signs so you can read about each one.",
    },
    {
      question: "What does each sign describe?",
      answer:
        "Every sign page covers its element, ruling planet, symbol and traditional personality themes, along with its strengths and areas to watch. Tap a sign on the wheel to read its profile.",
    },
    {
      question: "How do planets relate to the signs?",
      answer:
        "In Vedic astrology each sign is ruled by a planet, for example Mars for Mesha and Venus for Vrishabha. That ruling planet is part of how the sign's qualities are described on its page.",
    },
    {
      question: "What can I explore after finding my sign?",
      answer:
        "Read your sign's full profile, then try Janma Kundali for your own Rashi and Nakshatra, or Jodi Jyotish to see how your sign pairs with someone else's.",
    },
    {
      question: "Where can I find daily guidance for my sign?",
      answer: "Visit the Daily Horoscope page and choose your sign to read the guidance for today.",
    },
  ],
  birthChart: [
    {
      question: "What can I discover from my Janma Kundali?",
      answer:
        "Your Surya Rashi, Chandra Rashi, Janma Nakshatra with its pada, and the Panchang of your birth: Hindu month, Paksha, Tithi, Yoga, Karana and weekday. With an exact birth time you also see your Lagna, the nine grahas in their Rashis and houses, and your current Vimshottari dasha.",
    },
    {
      question: "How does my birth time influence my chart?",
      answer:
        "Your birth time fixes your Lagna and the houses, which are the heart of the chart. If you do not know it, you still get the Rashis and Panchang that stay the same through your birth date, and anything that depends on the exact time is clearly marked.",
    },
    {
      question: "How does my birth location help create my chart?",
      answer:
        "Your birthplace gives the local time zone and the coordinates needed to place your Lagna and sunrise correctly, so the chart matches the sky at the moment you were born.",
    },
    {
      question: "What do the planets and houses represent?",
      answer:
        "The nine grahas stand for different qualities, such as the Sun for self and the Moon for mind, and the twelve houses stand for areas of life. Each graha's Rashi and house is listed in your chart.",
    },
    {
      question: "Which details should I look at first?",
      answer:
        "Start with your Chandra Rashi and Janma Nakshatra, which Indian astrology uses for temperament, then your Lagna. After that, explore the Panchang details and your running dasha.",
    },
    {
      question: "Can I get guidance about career and relationships?",
      answer:
        "Yes. Ask Divya Margdarshak from the \"Need More Guidance?\" box under your chart. Your result is shared with the question so the answer can refer to it.",
    },
  ],
  compatibility: [
    {
      question: "How does Jodi Jyotish compare two people?",
      answer:
        "It works out each person's sun sign from their birth date, then compares the two signs' elements and the traditional aspect between them.",
    },
    {
      question: "Which details are needed for both partners?",
      answer:
        "A name and a complete date of birth for each person. Gender is optional and is collected separately for each partner. It does not change the comparison.",
    },
    {
      question: "What parts of a relationship does it explore?",
      answer:
        "Your result shows the aspect between the two signs, how their elements pair, and a set of questions to talk about together.",
    },
    {
      question: "How should we read the results?",
      answer:
        "Read them as conversation starters. There is no single score, so focus on the themes you both recognise and use the questions at the end to talk things through.",
    },
    {
      question: "What can we explore to strengthen our relationship?",
      answer:
        "Each of you can open Janma Kundali for your own Rashi and Nakshatra, and you can ask Divya Margdarshak about the result from the \"Need More Guidance?\" box.",
    },
  ],
  palm: [
    {
      question: "Which hand should I use for my reading?",
      answer:
        "Use the hand you would like to explore. The result notes which hand was in your photo. Keep your whole palm open, fingers slightly apart, in bright even light.",
    },
    {
      question: "What does Hasta Rekha tell me?",
      answer:
        "It measures your palm's width and length and your finger lengths from your photo, then gives your hand shape: Earth, Air, Water or Fire, with its traditional description.",
    },
    {
      question: "How do I get a clear photo?",
      answer:
        "Place your hand flat against a plain background, fill most of the frame, avoid shadows and blur, and hold still. You can upload a photo or scan live with your camera.",
    },
    {
      question: "What can my palm reading help me explore?",
      answer:
        "Your hand shape is a traditional way to reflect on temperament, such as practical, thoughtful, intuitive or energetic. Use it as a prompt for self-reflection.",
    },
    {
      question: "Is my photo kept private?",
      answer: "Your photo is processed on your device for the hand measurements. It is not stored by MyBhagya Astro.",
    },
    {
      question: "Can I ask for more guidance about my reading?",
      answer: "Yes. Use the \"Need More Guidance?\" box under your result to ask Divya Margdarshak a follow-up question.",
    },
  ],
  ratna: [
    {
      question: "How is my recommended Rashi Ratna determined?",
      answer:
        "With your birth time, your Lagna lord's gemstone is the primary Ratna, and the rulers of the 5th and 9th houses give alternatives when they are not also lords of difficult houses. Without a birth time, the traditional weekday ruler of your birth date is used.",
    },
    {
      question: "How does my birth information help create my result?",
      answer:
        "Your date, exact time and birthplace let the app calculate your Lagna, planetary positions, Nakshatras and current dasha. That is why the form asks for them.",
    },
    {
      question: "What is the traditional significance of my gemstone?",
      answer:
        "Your result lists the planet the Ratna is associated with, its customary themes, and the weekday, metal and finger usually mentioned in tradition. These are traditional beliefs, not guaranteed outcomes.",
    },
    {
      question: "What should I consider before choosing a gemstone?",
      answer:
        "Read the cautions shown for your chart, compare the primary and alternative Ratnas, and speak to a qualified astrologer and a reputable gemologist before buying. Quality, certification and fit matter.",
    },
    {
      question: "Why do I enter my weight?",
      answer:
        "It is optional. It only shows a traditional rule of thumb for stone size in the wearing guidance. It never affects which Ratna is chosen.",
    },
    {
      question: "Can I explore the connection between my Kundali and Ratna?",
      answer:
        "Yes. The reasoning section shows the Kundali facts behind each recommendation, and the \"Need More Guidance?\" box lets you ask Divya Margdarshak about them.",
    },
  ],
  karma: [
    {
      question: "What can I share in Know Your Karma?",
      answer:
        "Describe a situation, a relationship, a decision or a pattern that keeps repeating, in English, Hindi or Hinglish. You can also tap an example to start.",
    },
    {
      question: "What will I receive?",
      answer:
        "A reflection on the karmic pattern in your situation, the lesson it may hold, what it could mean for you, and practices to try, plus next steps you can explore.",
    },
    {
      question: "How should I use the insights?",
      answer:
        "Treat them as a mirror for reflection. Choose one practice that feels doable and notice how you respond over a few days.",
    },
    {
      question: "Does it need my birth details?",
      answer: "No. This reading is based on what you write about your situation, so you can begin straight away.",
    },
    {
      question: "How do I go deeper?",
      answer:
        "Ask Divya Margdarshak about your reflection from the box under your result, or track your daily practices in Karma Sankhya.",
    },
  ],
  guru: [
    {
      question: "What kinds of questions can I ask?",
      answer:
        "Anything you would like perspective on: relationships, career, family, purpose, stress, or spiritual practice. You can also ask about your own Kundali, tarot, palm or numerology result.",
    },
    {
      question: "How does Divya Margdarshak understand my question?",
      answer:
        "It reads your message, the conversation so far and, when you arrive from a result, the details of that result. It then matches your question to a guidance area and replies in your language.",
    },
    {
      question: "Can I ask follow-up questions?",
      answer:
        "Yes. Keep the conversation going and the earlier messages are taken into account. Start a new conversation whenever you want to explore something different.",
    },
    {
      question: "Can I explore spiritual and astrological guidance?",
      answer:
        "Yes. Replies draw on Vedic and Indian spiritual traditions, including the Gita and Upanishads, as well as Jyotish, always offered as perspectives for reflection.",
    },
    {
      question: "How can I get more personalised guidance?",
      answer:
        "Share specifics in your own words. You can also generate a Janma Kundali or another reading first and use \"Ask Divya\" from it, so your result travels with your question.",
    },
    {
      question: "Are the answers written by a person?",
      answer:
        "No. Divya Margdarshak is AI-guided. Replies are generated for your question, with a focus area chosen from the guidance profiles, and they are not a live consultation.",
    },
  ],
  karmaScore: [
    {
      question: "What is Karma Sankhya?",
      answer:
        "A simple daily tracker. You tick the mindful practices you completed today, such as a mantra, meditation, truthful speech or helping someone, and it turns them into a score out of 100.",
    },
    {
      question: "How is my score worked out?",
      answer:
        "Each practice carries points. Your score is the points from the practices you tick divided by the total points, times 100, so you can see exactly how it was reached.",
    },
    {
      question: "How can I improve my score?",
      answer:
        "Pick the practices that fit your day, and aim for steady habits over perfect days. Your recent average shows your consistency over time.",
    },
    {
      question: "Do I need to enter birth details?",
      answer: "No. Your name is enough to begin. Date of birth, Chandra Rashi and Nakshatra are optional extras for your profile.",
    },
    {
      question: "Can I save my progress?",
      answer: "Yes. Save today's practices and your recent days are shown so you can follow your progress.",
    },
  ],
  futurePath: [
    {
      question: "What can I explore in Bhavishya Marg?",
      answer:
        "A written reading of possible directions in your life, such as opportunities, challenges and themes to focus on, shaped by your birth details and the area of life you choose.",
    },
    {
      question: "Which details should I enter?",
      answer:
        "Your date of birth is required. Time and place of birth, and an area of interest such as career or relationships, are optional and help the reading feel more relevant.",
    },
    {
      question: "How should I read my life path reading?",
      answer:
        "Think of it as a set of themes to reflect on, not fixed events. Note what resonates and turn it into a goal or a conversation.",
    },
    {
      question: "How is this different from Janma Kundali?",
      answer:
        "Janma Kundali calculates your chart: Rashi, Nakshatra, Lagna and planets. Bhavishya Marg is a written, interpretive reading of possible paths and does not draw a chart.",
    },
    {
      question: "Can I ask more about my reading?",
      answer: "Yes. Use the \"Need More Guidance?\" box under your result to ask Divya Margdarshak a follow-up question.",
    },
  ],
  shloka: [
    {
      question: "How do I find a shloka for my situation?",
      answer:
        "Describe what is on your mind, or tap one of the suggestions, and Divya Shloka brings you a verse from the Bhagavad Gita or the Upanishads that speaks to it.",
    },
    {
      question: "What will I see with each verse?",
      answer:
        "The Sanskrit verse with its transliteration and meaning, how it relates to your situation, a deeper reflection, a practical lesson for today and a question to reflect on.",
    },
    {
      question: "Can I choose a scripture?",
      answer: "Yes. Pick the Bhagavad Gita or the Upanishads, or leave it open to be matched automatically.",
    },
    {
      question: "Can I save verses I like?",
      answer: "Yes. Save a shloka from its result and open it again later.",
    },
    {
      question: "How can I make the most of a shloka?",
      answer:
        "Read it aloud, sit with the meaning for a minute, and try the practical lesson for the day. Return to the same verse when you need it.",
    },
  ],
  numerology: [
    {
      question: "What does Naamank Jyotish reveal?",
      answer:
        "Your Destiny, Soul Urge, Personality, Chaldean, Life Path and Birth numbers, each with its traditional meaning.",
    },
    {
      question: "What details do I need to enter?",
      answer: "Your first name and date of birth. Your last name is optional, and the result shows how it changes the numbers.",
    },
    {
      question: "Can I see how each number is calculated?",
      answer:
        "Yes. Every letter value and addition is shown step by step, so you can follow how your name and birth date turn into numbers.",
    },
    {
      question: "What if I use a different spelling of my name?",
      answer:
        "Try it. A different spelling gives different numbers, and the result shows the change so you can compare the numbers side by side.",
    },
    {
      question: "How can I use my numbers?",
      answer:
        "Use them as themes for reflection, such as strengths to lean on and areas to grow. Ask Divya Margdarshak about them from the \"Need More Guidance?\" box.",
    },
    {
      question: "Can I download my report?",
      answer: "Yes. You can download your Naamank Jyotish report as a PDF from the result page.",
    },
  ],
  astrologers: [
    {
      question: "How do I find the right astrologer?",
      answer:
        "Search by name, or filter by expertise, language and availability. Open a profile to read about their focus, languages and experience.",
    },
    {
      question: "What areas of expertise can I look for?",
      answer:
        "Vedic astrology, tarot, prashna, numerology, face reading, palmistry, relationship and career guidance, and horoscope analysis.",
    },
    {
      question: "What information does a profile show?",
      answer: "Their expertise, languages, experience, rating and consultation price, along with an introduction and availability.",
    },
    {
      question: "Can I get guidance while I wait?",
      answer:
        "Yes. Ask Divya Margdarshak any question, or generate a reading in one of the Seva and explore it further.",
    },
  ],
};
