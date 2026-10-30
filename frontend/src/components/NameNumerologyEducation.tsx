import EducationSection, { EducationBlock, EducationFaq } from "@/components/EducationSection";
import { CHALDEAN_MAP, PYTHAGOREAN_MAP, buildProfile } from "@/lib/numerology";
import { chainText } from "@/components/NameDestinyReport/lib/pdfExport";

/** Rows of [value, letters] built from the real letter tables, so the page can never disagree with the calculator. */
function mapRows(map: Record<string, number>): string[][] {
  const byValue: Record<number, string[]> = {};
  Object.entries(map).forEach(([ch, v]) => (byValue[v] ||= []).push(ch));
  return Object.keys(byValue)
    .map(Number)
    .sort((a, b) => a - b)
    .map((v) => [String(v), byValue[v].join(" ")]);
}

// The worked example is computed by the same code the tool uses.
const EXAMPLE_NAME = "John Smith";
const EXAMPLE_DOB = "1990-05-17";
const ex = buildProfile(EXAMPLE_NAME, EXAMPLE_DOB);
if ("error" in ex) throw new Error("Worked example must be valid");
const seq = (w: { letters: { ch: string; value: number }[] }) => w.letters.map((l) => `${l.ch}=${l.value}`).join(", ");

const blocks: EducationBlock[] = [
  {
    heading: "What Is Name Numerology?",
    paragraphs: [
      "Name numerology is a traditional practice that turns the letters of a name, and the digits of a birth date, into numbers, then reads each number as a symbol for personality themes. Different cultures have used it for centuries, including in India and the Greek and Hebrew traditions.",
      "The adding-up part is plain arithmetic that anyone can check. The meanings attached to the numbers are traditional beliefs, and they are not scientifically proven. Naamank Jyotish is useful if you are curious about the numbers in your name and birth date, and what numerologists say about them.",
    ],
  },
  {
    heading: "How Does Naamank Jyotish Work?",
    list: [
      "Enter your first name, your optional last name, and your date of birth.",
      "The Seva turns each letter into a number using two letter tables, adds the numbers and reduces the total to a single digit. It does the same with the digits of your birth date.",
      "You see six numbers with the working shown step by step, the traditional theme and ruling planet for each, the days of the month that match your Life Path, and a spelling lab for trying other spellings.",
    ],
    ordered: true,
    after: [
      "Everything runs in your browser. Your name and birth date are not sent to a server, and no AI is used.",
    ],
  },
  {
    heading: "Which Numerology System Is Used?",
    paragraphs: [
      "Naamank Jyotish implements two systems and uses each for specific numbers.",
    ],
    list: [
      "Pythagorean: letters run A=1 to I=9, then the cycle repeats. It is used for the Destiny (Expression), Soul Urge and Personality numbers.",
      "Chaldean: an older system with values from 1 to 8 and no 9 for any letter. It is used for the Chaldean Name Number only.",
      "Master numbers: 11, 22 and 33 are kept (not reduced further) for the Pythagorean numbers and the Life Path and Birth numbers. The Chaldean number is always reduced to 1–9. Many numerologists do not use 33.",
    ],
    after: [
      "Other systems, such as Sepharial or other modern variants, are not implemented. No single system is proven to be the most accurate, and numerologists disagree about which to use. Y is counted as a consonant, and only A, E, I, O and U count as vowels.",
    ],
  },
  {
    heading: "How Are Name Numbers Calculated?",
    paragraphs: ["Each letter is replaced by its value from the table, the values are added, and the total is reduced by adding its digits until one digit remains (or a kept master number). Case, spaces, hyphens and repeated letters do not matter, and every repeated letter is counted each time. Accents are removed (é counts as E), and names must use English letters because the tables only cover A–Z."],
    table: { caption: "Pythagorean values", head: ["Value", "Letters"], rows: mapRows(PYTHAGOREAN_MAP) },
    after: [],
  },
  {
    heading: "The Chaldean Letter Values",
    table: { caption: "Chaldean values", head: ["Value", "Letters"], rows: mapRows(CHALDEAN_MAP) },
    after: ["The Chaldean total (called the compound number) is shown before it is reduced, for example 35 reduces to 3 + 5 = 8."],
  },
  {
    heading: "A Worked Example",
    paragraphs: [`Take the name ${EXAMPLE_NAME} and the birth date ${EXAMPLE_DOB}. Every figure below comes from the same code the Seva uses.`],
    list: [
      `Destiny (all letters, Pythagorean): ${seq(ex.destiny)}. These add to ${ex.destiny.total}, and ${chainText(ex.destiny.chain)}. Destiny number ${ex.destiny.result}.`,
      `Soul Urge (vowels only): ${seq(ex.soulUrge)}. The total is ${ex.soulUrge.total}, and ${chainText(ex.soulUrge.chain)}. Soul Urge number ${ex.soulUrge.result}.`,
      `Personality (consonants only): ${seq(ex.personality)}. The total is ${ex.personality.total}, and ${chainText(ex.personality.chain)}. Personality number ${ex.personality.result}.`,
      `Chaldean (all letters): ${seq(ex.chaldean)}. The total is ${ex.chaldean.total}, and ${chainText(ex.chaldean.chain)}. Chaldean number ${ex.chaldean.result}.`,
      `Life Path (birth date digits): ${ex.lifePath.digits.join(" + ")} = ${ex.lifePath.total}, and ${chainText(ex.lifePath.chain)}. Life Path ${ex.lifePath.result}.`,
      `Birth Number (day of the month): day ${ex.birth.day}, and ${chainText(ex.birth.chain)}. Birth Number ${ex.birth.result}.`,
    ],
    after: ["Those are the arithmetic results. What each number is said to mean is a separate, traditional interpretation."],
  },
  {
    heading: "What Do the Different Numbers Represent?",
    list: [
      "Destiny (Expression) Number: traditionally read as the talents and approach to life shown by your full name.",
      "Soul Urge Number: traditionally read as inner motivation, taken from the vowels.",
      "Personality Number: traditionally read as how others tend to perceive you, taken from the consonants.",
      "Chaldean Name Number: the same idea using the Chaldean table, an older system.",
      "Life Path Number: traditionally read as the main themes of your life direction, from your birth date.",
      "Birth Number: traditionally read as a supporting influence from the day you were born.",
      "Ruling planet: Indian numerology links 1 with the Sun, 2 the Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn and 9 Mars. Master numbers use the planet of their root digit.",
    ],
    after: ["Each description is a fixed traditional theme. It is not a measurement, and it does not describe any one person."],
  },
  {
    heading: "How Can Different Spellings Affect the Result?",
    paragraphs: [
      "Changing a letter, adding a letter or using a different form of the name changes the letter values, so the name-based numbers can change. Your Life Path and Birth Number come from your birth date, so they never change with spelling.",
      "The spelling lab on the result page lets you compare spellings side by side. It shows only the arithmetic. It does not rank spellings as better or worse, and there is no evidence that changing your spelling changes your life. Choose a spelling that suits you and your documents.",
    ],
  },
];

const faqs: EducationFaq[] = [
  {
    question: "Which spelling of my name should I enter?",
    answer:
      "Use the name you want to explore, for example the one on your birth certificate or the one you use every day. You can try other spellings in the spelling lab after you see your result.",
  },
  {
    question: "Why are some of my numbers 11, 22 or 33?",
    answer:
      "Those are master numbers. When a total reaches 11, 22 or 33, the Seva keeps it instead of reducing it further, except for the Chaldean number, which is always reduced to 1–9.",
  },
  {
    question: "Why can't I enter my name in my own language?",
    answer:
      "The letter tables only cover the English letters A to Z. Enter the common English spelling of your name. Accented letters are accepted and treated as their plain letter.",
  },
  {
    question: "Does the PDF match what I see on screen?",
    answer: "Yes. The PDF lists the same six numbers with the same working and traditional themes.",
  },
  {
    question: "Can I use Naamank Jyotish for free?",
    answer: "Yes. Naamank Jyotish is one of MyBhagya Astro's free Seva. It needs no sign-in and no payment.",
  },
];

const DISCLAIMER =
  "Numerology is offered for personal interest, cultural exploration and reflection. It is a traditional belief system that is not scientifically proven. Results are not predictions, and they are not professional advice.";

export default function NameNumerologyEducation() {
  return <EducationSection idPrefix="numerology" title="About Naamank Jyotish" blocks={blocks} faqs={faqs} disclaimer={DISCLAIMER} />;
}
