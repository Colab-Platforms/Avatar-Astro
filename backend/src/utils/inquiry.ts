/**
 * Validation + rendering for public inquiry forms (contact, partnership).
 * Pure functions so they can be unit-tested without a mail provider.
 */
export type InquiryKind = "contact" | "partnership" | "newsletter";

export interface InquiryInput {
  name: string;
  email: string;
  phone?: string;
  organisation?: string;
  city?: string;
  subject?: string;
  message: string;
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

const clean = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "";

export function normalisePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, "");
}

export type FieldErrors = Partial<Record<keyof InquiryInput, string>>;

export function validateInquiry(kind: InquiryKind, body: unknown): { ok: true; value: InquiryInput } | { ok: false; errors: FieldErrors } {
  const b = (body ?? {}) as Record<string, unknown>;
  const errors: FieldErrors = {};
  if (kind === "newsletter") {
    const email = clean(b.email, 254);
    return EMAIL_RE.test(email) ? { ok: true, value: { name: "", email, message: "" } } : { ok: false, errors: { email: "Please enter a valid email address." } };
  }
  const value: InquiryInput = {
    name: clean(b.name, 100),
    email: clean(b.email, 254),
    phone: clean(b.phone, 30),
    organisation: clean(b.organisation, 150),
    city: clean(b.city, 100),
    subject: clean(b.subject, 150),
    message: clean(b.message, 2000),
  };

  if (value.name.length < 2) errors.name = "Please enter your name.";
  if (!EMAIL_RE.test(value.email)) errors.email = "Please enter a valid email address.";

  if (kind === "partnership") {
    if (!value.organisation || value.organisation.length < 2) errors.organisation = "Please enter your temple or organisation name.";
    if (!value.city || value.city.length < 2) errors.city = "Please enter the city.";
    if (!/^\+?\d{10,14}$/.test(normalisePhone(value.phone ?? ""))) errors.phone = "Please enter a valid phone number (10 to 14 digits).";
  } else {
    if (!value.subject || value.subject.length < 2) errors.subject = "Please enter a subject.";
    if (value.phone && !/^\+?\d{10,14}$/.test(normalisePhone(value.phone))) errors.phone = "Please enter a valid phone number.";
  }
  if (value.message.length < 10) errors.message = "Please write at least 10 characters.";

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

export const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Header-safe single line (no CR/LF) for the email subject. */
export const oneLine = (s: string): string => s.replace(/[\r\n]+/g, " ").trim();

export function renderInquiry(kind: InquiryKind, v: InquiryInput): { subject: string; html: string; text: string } {
  if (kind === "newsletter") {
    const subject = oneLine(`Newsletter subscription request: ${v.email}`).slice(0, 200);
    return {
      subject,
      html: `<div style="font-family:Segoe UI,Arial,sans-serif"><h2>Newsletter subscription request</h2><p>${escapeHtml(v.email)} asked to subscribe.</p></div>`,
      text: `Newsletter subscription request

Email: ${v.email}`,
    };
  }
  const title = kind === "partnership" ? "New partnership enquiry" : "New contact message";
  const rows: [string, string][] = [
    ["Name", v.name],
    ["Email", v.email],
    ["Phone", v.phone || "-"],
    ...(kind === "partnership"
      ? ([["Temple / organisation", v.organisation || "-"], ["City", v.city || "-"]] as [string, string][])
      : ([["Subject", v.subject || "-"]] as [string, string][])),
    ["Message", v.message],
  ];
  const subject = oneLine(kind === "partnership" ? `${title}: ${v.organisation} (${v.city})` : `${title}: ${v.subject}`).slice(0, 200);
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px">
<h2>${title}</h2>
<table cellpadding="6" style="border-collapse:collapse;width:100%">
${rows.map(([k, val]) => `<tr><td style="vertical-align:top;font-weight:600;white-space:nowrap">${escapeHtml(k)}</td><td style="white-space:pre-wrap">${escapeHtml(val)}</td></tr>`).join("\n")}
</table>
<p style="color:#64748b;font-size:12px">Reply to this email to respond to the sender.</p></div>`;
  const text = `${title}\n\n${rows.map(([k, val]) => `${k}: ${val}`).join("\n")}`;
  return { subject, html, text };
}
