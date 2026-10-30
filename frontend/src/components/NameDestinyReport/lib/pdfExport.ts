import { jsPDF } from "jspdf";
import { planetForNumber, themeFor, datesForNumber, type NameProfile, type Working } from "@/lib/numerology";

const PURPLE: [number, number, number] = [124, 58, 237];
const INDIGO: [number, number, number] = [79, 70, 229];
const SLATE: [number, number, number] = [51, 65, 85];

/** "44 → 4 + 4 = 8" style working shared with the on-screen result. */
export function chainText(chain: number[]): string {
  if (chain.length === 1) return `${chain[0]} (already a single digit)`;
  const steps: string[] = [];
  for (let i = 0; i < chain.length - 1; i++) {
    steps.push(`${String(chain[i]).split("").join(" + ")} = ${chain[i + 1]}`);
  }
  const last = chain[chain.length - 1];
  return steps.join(" → ") + (last > 9 ? " (master number, kept)" : "");
}

/** The numbers shown on screen and in the PDF — one list so the two can never disagree. */
export function numberRows(p: NameProfile): { title: string; basis: string; result: number; working: string; empty?: string }[] {
  const nameWorking = (w: Working) =>
    w.letters.length ? `${w.letters.map((l) => `${l.ch}${l.value}`).join(" ")} → ${w.letters.map((l) => l.value).join(" + ")} = ${w.total}; ${chainText(w.chain)}` : "";
  return [
    { title: "Destiny (Expression) Number", basis: "Pythagorean, all letters of the name", result: p.destiny.result, working: nameWorking(p.destiny) },
    { title: "Soul Urge Number", basis: "Pythagorean, vowels A E I O U only", result: p.soulUrge.result, working: nameWorking(p.soulUrge), empty: p.soulUrge.letters.length ? undefined : "This name has no vowels (A, E, I, O, U), so there is no Soul Urge number." },
    { title: "Personality Number", basis: "Pythagorean, consonants only (Y counts as a consonant)", result: p.personality.result, working: nameWorking(p.personality), empty: p.personality.letters.length ? undefined : "This name has no consonants, so there is no Personality number." },
    { title: "Chaldean Name Number", basis: "Chaldean letter values, reduced to 1–9", result: p.chaldean.result, working: nameWorking(p.chaldean) },
    { title: "Life Path Number", basis: "All digits of the date of birth", result: p.lifePath.result, working: `${p.lifePath.digits.join(" + ")} = ${p.lifePath.total}; ${chainText(p.lifePath.chain)}` },
    { title: "Birth Number", basis: "Day of the month of birth", result: p.birth.result, working: `Day ${p.birth.day}; ${chainText(p.birth.chain)}` },
  ];
}

/** jsPDF's built-in font only covers basic Latin; swap the few symbols the screen text uses so the PDF never garbles a line. */
function pdfSafe(str: string): string {
  return str
    .replace(/→/g, "->")
    .replace(/[·•]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

export function downloadBlueprintPDF(profile: NameProfile) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  let y = margin;

  function ensurePage(extra = 0) {
    if (y + extra > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }
  function text(str: string, size: number, bold: boolean, color: [number, number, number], gap = 15) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    for (const line of doc.splitTextToSize(pdfSafe(str), pageWidth - margin * 2) as string[]) {
      ensurePage(gap);
      doc.text(line, margin, y);
      y += gap;
    }
  }

  text("Naamank Jyotish", 22, true, PURPLE, 28);
  text("Name and birth-date numerology", 11, false, SLATE, 18);
  y += 8;
  text(`Name: ${profile.name}`, 11, true, INDIGO);
  text(`Date of birth: ${profile.dob}`, 11, false, SLATE);
  text(`Sun sign (Western, by date): ${profile.zodiac}`, 11, false, SLATE);
  y += 6;
  text(
    "How this was made: each number below is simple arithmetic on your name's letters or your birth date, shown step by step. The descriptions are fixed traditional interpretations. No AI, score or prediction is involved.",
    9,
    false,
    SLATE,
    13,
  );
  y += 10;

  for (const row of numberRows(profile)) {
    ensurePage(90);
    doc.setFillColor(...PURPLE);
    doc.roundedRect(margin, y - 11, 4, 16, 2, 2, "F");
    text(`${row.title}: ${row.result || "–"}`, 13, true, SLATE, 18);
    text(row.basis, 9, false, INDIGO, 13);
    if (row.empty) {
      text(row.empty, 10, false, SLATE);
    } else {
      text(`Working: ${row.working}`, 9, false, SLATE, 13);
      const planet = planetForNumber(row.result);
      const theme = themeFor(row.result);
      text(`Traditional planet: ${planet.planet}. Themes: ${theme.keywords}.`, 10, false, SLATE);
      text(theme.text, 10, false, SLATE);
    }
    y += 10;
  }

  ensurePage(60);
  text(`Days of the month that reduce to your Life Path number: ${datesForNumber(profile.lifePath.result).join(", ")}`, 10, false, SLATE);
  y += 14;
  text(
    "This report is for personal interest and reflection. Numerology is a traditional belief system that is not scientifically proven, and the report is not a prediction or professional advice.",
    9,
    false,
    SLATE,
    13,
  );

  doc.save(`Naamank-Jyotish-${profile.name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "report"}.pdf`);
}
