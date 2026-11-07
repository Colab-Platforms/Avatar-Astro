/** Copy, share (as a drawn result card where the browser can) and a calendar file for a Muhurat window. */
import { copyText } from "@/features/vehicleNumber/sharing";
import { longDate, placeLabel, range12, windowText } from "./format";
import type { MuhuratPlace, MuhuratWindow } from "./types";

export { copyText, windowText };

/** A cream, brown and gold result card as a PNG. Null when the browser cannot draw it. */
export async function renderMuhuratCard(eventLabel: string, place: MuhuratPlace, w: MuhuratWindow): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  const ctx = c.getContext?.("2d");
  if (!ctx) return null;
  c.width = 1080;
  c.height = 1350;
  const bg = ctx.createLinearGradient(0, 0, 0, c.height);
  bg.addColorStop(0, "#FFF7E6");
  bg.addColorStop(1, "#F4E3C3");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "#C9873A";
  ctx.lineWidth = 8;
  ctx.strokeRect(36, 36, c.width - 72, c.height - 72);
  ctx.textAlign = "center";
  const line = (text: string, y: number, font: string, color: string) => { ctx.font = font; ctx.fillStyle = color; ctx.fillText(text, c.width / 2, y, c.width - 160); };
  line("Muhurat Finder", 150, "600 42px Georgia, serif", "#8A5A1E");
  line(eventLabel, 250, "700 62px Georgia, serif", "#592209");
  line(longDate(w.date), 420, "600 54px Georgia, serif", "#301607");
  line(range12(w.startLocal, w.endLocal), 560, "700 96px Georgia, serif", "#C9873A");
  line(placeLabel(place), 650, "36px Georgia, serif", "#4A2E1F");
  line("local time at the event location", 700, "italic 28px Georgia, serif", "#6B4A37");
  line(`${w.panchang.paksha} ${w.panchang.tithi}  ·  ${w.panchang.nakshatra}`, 820, "600 46px Georgia, serif", "#592209");
  line(`${w.panchang.yoga} yoga  ·  ${w.panchang.karana} karana`, 890, "36px Georgia, serif", "#4A2E1F");
  line("Traditional Jyotish guidance for personal and cultural", 1150, "italic 28px Georgia, serif", "#6B4A37");
  line("use. Not a prediction or a guarantee of any outcome.", 1192, "italic 28px Georgia, serif", "#6B4A37");
  line("MyBhagya", 1280, "600 34px Georgia, serif", "#592209");
  return new Promise((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

export async function shareMuhurat(eventLabel: string, place: MuhuratPlace, w: MuhuratWindow): Promise<ShareOutcome> {
  const text = windowText(w, eventLabel, place);
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean };
  try {
    if (typeof nav.share === "function") {
      const blob = await renderMuhuratCard(eventLabel, place, w);
      if (blob && typeof File !== "undefined") {
        const file = new File([blob], `muhurat-${w.date}.png`, { type: "image/png" });
        if (nav.canShare?.({ files: [file] })) {
          await nav.share({ files: [file], title: eventLabel, text });
          return "shared";
        }
      }
      await nav.share({ title: eventLabel, text });
      return "shared";
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return "cancelled";
  }
  return (await copyText(text)) ? "copied" : "failed";
}

const icsStamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** An iCalendar (.ics) file for the window. The event is given in UTC so every calendar app places it at the right moment. */
export const buildIcs = (eventLabel: string, place: MuhuratPlace, w: MuhuratWindow, now: Date = new Date()): string =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MyBhagya//Muhurat Finder//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${icsStamp(w.startUtc)}-${eventLabel.replace(/\W+/g, "-").toLowerCase()}@mybhagya`,
    `DTSTAMP:${icsStamp(now.toISOString())}`,
    `DTSTART:${icsStamp(w.startUtc)}`,
    `DTEND:${icsStamp(w.endUtc)}`,
    `SUMMARY:${icsText(eventLabel)}`,
    `LOCATION:${icsText(placeLabel(place))}`,
    `DESCRIPTION:${icsText(`${range12(w.startLocal, w.endLocal)} local time. ${w.panchang.paksha} ${w.panchang.tithi}, ${w.panchang.nakshatra}. Traditional Jyotish guidance, not a guarantee. Confirm the final time with your priest or jyotishi.`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

/** Starts a download of the .ics file. Returns true if the browser accepted it; the page must not say the event was "added". */
export function downloadIcs(eventLabel: string, place: MuhuratPlace, w: MuhuratWindow): boolean {
  try {
    const blob = new Blob([buildIcs(eventLabel, place, w)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `muhurat-${w.date}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
