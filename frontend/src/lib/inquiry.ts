import { API_BASE_URL } from "@/lib/api";

export interface PartnershipForm {
  name: string;
  email: string;
  phone: string;
  organisation: string;
  city: string;
  message: string;
  /** Honeypot: real users never see or fill this. */
  website: string;
}

export const EMPTY_PARTNERSHIP: PartnershipForm = { name: "", email: "", phone: "", organisation: "", city: "", message: "", website: "" };

export type PartnershipErrors = Partial<Record<keyof PartnershipForm, string>>;

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

/** Mirrors the server-side rules so users get instant feedback; the server still re-validates. */
export function validatePartnership(f: PartnershipForm): PartnershipErrors {
  const e: PartnershipErrors = {};
  if (f.name.trim().length < 2) e.name = "Please enter your name.";
  if (!EMAIL_RE.test(f.email.trim())) e.email = "Please enter a valid email address.";
  if (!/^\+?\d{10,14}$/.test(f.phone.replace(/[\s\-().]/g, ""))) e.phone = "Please enter a valid phone number (10 to 14 digits).";
  if (f.organisation.trim().length < 2) e.organisation = "Please enter your temple or organisation name.";
  if (f.city.trim().length < 2) e.city = "Please enter the city.";
  if (f.message.trim().length < 10) e.message = "Please write at least 10 characters.";
  return e;
}

export interface SubmitResult {
  ok: boolean;
  message?: string;
  fields?: PartnershipErrors;
}

/** Sends the form. Resolves ok only when the server confirms delivery. */
export async function submitPartnership(f: PartnershipForm): Promise<SubmitResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/partnership`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
  } catch {
    return { ok: false, message: "We couldn't reach the server. Check your connection and try again." };
  }
  const data = await res.json().catch(() => null);
  if (res.ok && data?.success === true) return { ok: true };
  if (res.status === 429) return { ok: false, message: data?.error?.message || "Too many submissions. Please wait a minute and try again." };
  if (res.status === 400 && data?.fields) return { ok: false, message: data.error || "Please check the highlighted fields.", fields: data.fields };
  return { ok: false, message: typeof data?.error === "string" ? data.error : "We couldn't send your message right now. Please try again in a moment." };
}

async function postSimple(path: string, payload: unknown, fallback: string): Promise<SubmitResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch {
    return { ok: false, message: "We couldn't reach the server. Check your connection and try again." };
  }
  const data = await res.json().catch(() => null);
  if (res.ok && data?.success === true) return { ok: true };
  if (res.status === 429) return { ok: false, message: data?.error?.message || "Too many submissions. Please wait a minute and try again." };
  if (res.status === 400 && data?.fields) return { ok: false, message: Object.values(data.fields as Record<string, string>)[0] || data.error, fields: data.fields };
  return { ok: false, message: typeof data?.error === "string" ? data.error : fallback };
}

export const submitContact = (f: { name: string; email: string; subject: string; message: string }) =>
  postSimple("/contact/send", f, "We couldn't send your message right now. Please try again in a moment.");

export const subscribeNewsletter = (email: string) =>
  postSimple("/newsletter/subscribe", { email }, "We couldn't process your subscription right now. Please try again.");
