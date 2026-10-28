import { jsPDF } from "jspdf";
import type { NameProfileScore, NameVariant } from "@/lib/numerology";
import type { NarrativeResponse } from "../types";

const PURPLE: [number, number, number] = [124, 58, 237];
const INDIGO: [number, number, number] = [79, 70, 229];
const SLATE: [number, number, number] = [51, 65, 85];

interface PdfData {
  name: string;
  dob: string;
  profile: NameProfileScore;
  narrative: NarrativeResponse | null;
  topVariants: NameVariant[];
}

export function downloadDestinyReportPDF(data: PdfData) {
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

  function sectionHeader(text: string) {
    ensurePage(30);
    doc.setFillColor(...PURPLE);
    doc.roundedRect(margin, y, 4, 18, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...SLATE);
    doc.text(text, margin + 12, y + 13);
    y += 30;
  }

  function label(text: string, value: string) {
    ensurePage(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INDIGO);
    doc.text(text, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE);
    doc.text(value, margin + 140, y);
    y += 18;
  }

  function body(text: string, size = 10) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...SLATE);
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
    for (const line of lines) {
      ensurePage(15);
      doc.text(line, margin, y);
      y += 15;
    }
    y += 6;
  }

  function progressBar(labelText: string, value: number) {
    ensurePage(28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(`${labelText} — ${value}%`, margin, y);
    y += 6;
    doc.setFillColor(237, 233, 254);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 8, 4, 4, "F");
    doc.setFillColor(...PURPLE);
    doc.roundedRect(margin, y, ((pageWidth - margin * 2) * value) / 100, 8, 4, 4, "F");
    y += 20;
  }

  // ── Page 1: Cover ──
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, pageWidth, 160, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text("Cosmic Blueprint", margin, 70);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text(data.name, margin, 100);
  doc.setFontSize(10);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, margin, 122);

  y = 200;
  doc.setFontSize(48);
  doc.setTextColor(...PURPLE);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.profile.overallScore}%`, margin, y);
  doc.setFontSize(12);
  doc.setTextColor(...SLATE);
  doc.text("Overall Destiny Alignment Score", margin, y + 22);
  y += 60;

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("For guidance purposes; not a guarantee of outcomes.", margin, pageHeight - 30);

  // ── Page 2: Core numbers + narrative ──
  doc.addPage();
  y = margin;
  sectionHeader("Core Numerology Numbers");
  label("Life Path Number", `${data.profile.lifePath} (${data.profile.lifePathPlanet})`);
  label("Destiny Number", `${data.profile.destiny} (${data.profile.destinyPlanet})`);
  label("Soul Urge Number", String(data.profile.soulUrge));
  label("Personality Number", String(data.profile.personality));
  label("Chaldean Number", String(data.profile.chaldean));
  y += 10;

  sectionHeader("Name & Destiny Alignment");
  body(data.narrative?.frictionExplanation || "Analysis pending — please regenerate your report.");

  sectionHeader("Top Recommended Spellings");
  data.topVariants.slice(0, 3).forEach((v) => progressBar(v.spelling, v.score));

  // ── Page 3: Remedies + narratives ──
  doc.addPage();
  y = margin;
  sectionHeader("Personalized Remedies");
  (data.narrative?.remedies || []).forEach((r) => body(`• ${r}`));

  sectionHeader("Wealth Potential");
  body(data.narrative?.wealthPotential || "");

  sectionHeader("Relationship Energy");
  body(data.narrative?.relationshipEnergy || "");

  sectionHeader("Career Alignment");
  body(data.narrative?.careerAlignment || "");

  ensurePage(30);
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("This report is for guidance and self-reflection purposes only and does not guarantee outcomes.", margin, pageHeight - 30);

  doc.save(`${data.name.replace(/\s+/g, "_")}_Destiny_Report.pdf`);
}
