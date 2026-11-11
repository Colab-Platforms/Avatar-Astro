/** Copy and share for a vehicle number, including a result card drawn as an image where the browser can do it. */

export interface ShareInput {
  /** The number as it should read, leading zeros kept: 0007. */
  number: string;
  total: number;
  reduced: number;
  planet: string;
  label: string;
  /** A few traditional keywords for the number. */
  keywords: string;
}

export const shareText = (i: ShareInput): string =>
  `${i.number}: digit total ${i.total}, numerology number ${i.reduced} (${i.planet}). ${i.label}. Traditional numerology, not a guarantee. Found with Lucky Vehicle Number on Bhagya.`;

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through */ }
  try {
    const t = document.createElement("textarea");
    t.value = text;
    t.setAttribute("readonly", "");
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(t);
    return ok;
  } catch {
    return false;
  }
}

/** A cream, brown and gold result card as a PNG. Null when the browser cannot draw it (for example, no canvas). */
export async function renderShareCard(i: ShareInput): Promise<Blob | null> {
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
  ctx.fillStyle = "#592209";
  ctx.font = "600 44px Georgia, serif";
  ctx.fillText("Lucky Vehicle Number", c.width / 2, 170);
  ctx.fillStyle = "#8A5A1E";
  ctx.font = "30px Georgia, serif";
  ctx.fillText("Vahana Ank Jyotish", c.width / 2, 224);
  // The number on a plate.
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#592209";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.roundRect?.(150, 330, 780, 300, 36);
  if (!ctx.roundRect) ctx.rect(150, 330, 780, 300);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#301607";
  ctx.font = "700 220px Georgia, serif";
  ctx.fillText(i.number, c.width / 2, 540);
  ctx.fillStyle = "#592209";
  ctx.font = "600 46px Georgia, serif";
  ctx.fillText(`Digit total ${i.total}  ·  Number ${i.reduced}  ·  ${i.planet}`, c.width / 2, 760);
  ctx.fillStyle = "#C9873A";
  ctx.font = "700 56px Georgia, serif";
  ctx.fillText(i.label, c.width / 2, 860);
  ctx.fillStyle = "#4A2E1F";
  ctx.font = "34px Georgia, serif";
  ctx.fillText(i.keywords, c.width / 2, 940);
  ctx.fillStyle = "#6B4A37";
  ctx.font = "italic 28px Georgia, serif";
  ctx.fillText("Traditional numerology. Not a guarantee of any outcome.", c.width / 2, 1180);
  ctx.fillText("Availability depends on your RTO.", c.width / 2, 1224);
  ctx.fillStyle = "#592209";
  ctx.font = "600 34px Georgia, serif";
  ctx.fillText("Bhagya", c.width / 2, 1290);
  return new Promise((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/** Shares the card image where the device allows it, otherwise the text, otherwise copies the text. */
export async function shareNumber(i: ShareInput): Promise<ShareOutcome> {
  const text = shareText(i);
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean };
  try {
    if (typeof nav.share === "function") {
      const blob = await renderShareCard(i);
      if (blob && typeof File !== "undefined") {
        const file = new File([blob], `lucky-vehicle-number-${i.number}.png`, { type: "image/png" });
        if (nav.canShare?.({ files: [file] })) {
          await nav.share({ files: [file], title: `Lucky Vehicle Number ${i.number}`, text });
          return "shared";
        }
      }
      await nav.share({ title: `Lucky Vehicle Number ${i.number}`, text });
      return "shared";
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return "cancelled";
  }
  return (await copyText(text)) ? "copied" : "failed";
}
