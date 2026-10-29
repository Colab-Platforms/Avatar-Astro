import { Router, Request, Response } from "express";
import express from "express";
import { createRateLimiter } from "../utils/rateLimit.js";
import { validateInquiry, renderInquiry, type InquiryKind } from "../utils/inquiry.js";

/**
 * Public inquiry forms (contact + partnership). A submission is only reported as
 * successful once the mail provider has accepted the message for delivery to
 * SUPPORT_EMAIL. Nothing is stored in a database.
 */
export type SendInquiryMail = (msg: { to: string; replyTo: string; subject: string; html: string; text: string }) => Promise<void>;

async function defaultSend(msg: Parameters<SendInquiryMail>[0]): Promise<void> {
  // Imported lazily so tests and tools that never send mail don't need Resend configured.
  const { resend, FROM_EMAIL, APP_NAME } = await import("../utils/mailer.js");
  if (!resend || !FROM_EMAIL) throw Object.assign(new Error("mail not configured"), { code: "NOT_CONFIGURED" });
  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: msg.to,
    replyTo: msg.replyTo,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  });
  if (error) throw Object.assign(new Error(error.message || "mail provider error"), { code: "PROVIDER" });
  console.log(`[inquiry] accepted by mail provider, id=${data?.id}`);
}

export function createInquiryRouter(send: SendInquiryMail = defaultSend): Router {
  const router = Router();
  router.use(express.json({ limit: "20kb" }));
  const limiter = createRateLimiter({ windowMs: 60_000, max: 5, message: "Too many submissions. Please wait a minute and try again." });

  const handle = (kind: InquiryKind) => async (req: Request, res: Response) => {
    // Honeypot: real users never fill this hidden field. Pretend success so bots learn nothing.
    if (typeof req.body?.website === "string" && req.body.website.trim() !== "") {
      return res.json({ success: true, message: "Thank you." });
    }
    const parsed = validateInquiry(kind, req.body);
    if (!parsed.ok) return res.status(400).json({ success: false, error: "Please check the highlighted fields.", fields: parsed.errors });

    const to = process.env.SUPPORT_EMAIL;
    if (!to) {
      console.error(`[inquiry:${kind}] SUPPORT_EMAIL is not configured`);
      return res.status(503).json({ success: false, error: "We can't accept submissions right now. Please try again later." });
    }
    const { subject, html, text } = renderInquiry(kind, parsed.value);
    try {
      await send({ to, replyTo: parsed.value.email, subject, html, text });
    } catch (err: any) {
      console.error(`[inquiry:${kind}] delivery failed:`, err?.code ?? err?.name);
      const notConfigured = err?.code === "NOT_CONFIGURED";
      return res.status(notConfigured ? 503 : 502).json({
        success: false,
        error: "We couldn't send your message right now. Please try again in a moment.",
      });
    }
    return res.json({
      success: true,
      message:
        kind === "partnership"
          ? "Thank you. Our team has received your partnership enquiry."
          : kind === "newsletter"
            ? "Thanks, we have received your subscription request."
            : "Message sent successfully",
    });
  };

  router.post("/contact/send", limiter, handle("contact"));
  router.post("/partnership", limiter, handle("partnership"));
  router.post("/newsletter/subscribe", limiter, handle("newsletter"));
  return router;
}

export default createInquiryRouter();
