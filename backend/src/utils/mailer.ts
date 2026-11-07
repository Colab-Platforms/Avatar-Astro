import "dotenv/config";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL;
const APP_NAME = process.env.APP_NAME || "MyBhagya";

if (!RESEND_API_KEY || !FROM_EMAIL) {
  console.warn(
    "[mailer] RESEND_API_KEY/SMTP_FROM_EMAIL not set — email sending is disabled.",
  );
}

// Exported so other modules (e.g. counselling notifications) can reuse the
// same Resend client/sender identity instead of creating their own.
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
export { resend, FROM_EMAIL, APP_NAME };

function requireMailerConfig(): { client: Resend; fromEmail: string } {
  if (!resend || !FROM_EMAIL) {
    throw new Error(
      "Email sending is disabled: RESEND_API_KEY and SMTP_FROM_EMAIL must be set in backend environment variables.",
    );
  }
  return { client: resend, fromEmail: FROM_EMAIL };
}

//send OTP email via Resend
export const sendOtpEmail = async (
  email: string,
  otp: string,
  type: "REGISTER" | "LOGIN",
) => {
  const subject =
    type === "REGISTER"
      ? `Verify your ${APP_NAME} account`
      : `Your ${APP_NAME} login OTP`;

  const heading = type === "REGISTER" ? "Verify Your Email" : "Login OTP";
  const body =
    type === "REGISTER"
      ? "Use the OTP below to verify your email and complete registration."
      : "Use the OTP below to complete your login.";

  console.log(`[Resend] Sending OTP email (${type}) to: ${email}`);
  const { client, fromEmail } = requireMailerConfig();
  try {
    const { data, error } = await client.emails.send({
      from: `${APP_NAME} <${fromEmail}>`,
      to: email,
      subject,
      html: `
            <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 24px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #0f172a; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">${APP_NAME}</h1>
        </div>
        
        <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 12px; line-height: 1.3;">${heading}</h2>
        <p style="color: #64748b; font-size: 15px; line-height: 1.7; margin-top: 0; margin-bottom: 28px;">${body}</p>
        
        <div style="background-color: #f1f5f9; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #4f46e5; font-family: 'Courier New', Courier, monospace; display: inline-block; padding-left: 6px;">${otp}</span>
        </div>
        
        <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 0; margin-bottom: 24px; line-height: 1.5;">
            This OTP expires in <strong style="color: #64748b; font-weight: 600;">10 minutes</strong>. Do not share it with anyone.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0; line-height: 1.5;">
            If you did not request this, you can safely ignore this email.
        </p>
         </div>
        </div>
            `,
    });

    if (error) {
      console.error(
        `[Resend Error] Failed to send OTP email to ${email}:`,
        error,
      );
      throw error;
    }

    console.log(`[Resend Success] OTP email sent! ID: ${data?.id}`);
    return data;
  } catch (error: any) {
    console.error(`[Resend] Error sending OTP email to ${email}:`, error);
    throw error;
  }
};

/**
 * Send Password Reset Email via Resend
 */
export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}`;
  console.log(`[Resend] Sending password reset email to: ${email}`);
  const { client, fromEmail } = requireMailerConfig();
  try {
    const { data, error } = await client.emails.send({
      from: `${APP_NAME} <${fromEmail}>`,
      to: email,
      subject: `Reset your ${APP_NAME} password`,
      html: `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
                <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <h1 style="color: #0f172a; font-size: 28px; font-weight: 800; margin: 16px 0 4px;">${APP_NAME}</h1>
                    </div>
                    <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin-bottom: 12px;">Reset Your Password</h2>
                    <p style="color: #64748b; font-size: 15px; line-height: 1.7; margin-bottom: 28px;">
                        You requested a password reset. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
                    </p>
                    <a href="${resetUrl}" style="display: block; text-align: center; background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; text-decoration: none; padding: 16px 32px; border-radius: 14px; font-weight: 700; font-size: 16px; margin-bottom: 24px;">
                        Reset Password →
                    </a>
                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                        Or copy this link: <a href="${resetUrl}" style="color: #6366f1;">${resetUrl}</a>
                    </p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
                </div>
            </div>
            `,
    });

    if (error) {
      console.error(
        `[Resend Error] Error sending reset email to ${email}:`,
        error,
      );
      throw error;
    }

    console.log(`[Resend Success] Reset email sent! ID: ${data?.id}`);
    return data;
  } catch (error: any) {
    if (
      error?.name === "validation_error" ||
      error?.message?.includes("verify a domain")
    ) {
      const validationMessage = `Resend blocked email delivery. Verify SMTP_FROM_EMAIL (${FROM_EMAIL}) on Resend or use a verified domain.`;
      console.error(`[Resend Validation Error] ${validationMessage}`, error);
      throw new Error(validationMessage);
    }

    console.error(`Error sending reset email to ${email}:`, error);
    throw error;
  }
};

/**
 * Astrologer onboarding status emails (Part 13 of the brief). Fire-and-forget by
 * design: a notification failing must never block or roll back the actual status
 * change it's reporting on — callers do `void sendAstrologerStatusEmail(...)`, never
 * await it inside a transaction. Reuses this file's existing Resend client/sender
 * identity rather than creating a new one.
 */
export type AstrologerNotificationStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "MORE_INFORMATION_REQUIRED"
  | "INTERVIEW_PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "REINSTATED";

const ASTROLOGER_STATUS_COPY: Record<AstrologerNotificationStatus, { subject: string; heading: string; body: (reason?: string | null) => string }> = {
  SUBMITTED: {
    subject: `Your ${APP_NAME} astrologer application was received`,
    heading: "Application received",
    body: () => "Thanks for applying to become an astrologer on MyBhagya. Our team manually reviews every application and document — we'll email you as soon as there's an update.",
  },
  UNDER_REVIEW: {
    subject: `Your ${APP_NAME} astrologer application is under review`,
    heading: "Application under review",
    body: () => "Your application has moved into review. No action is needed from you right now.",
  },
  MORE_INFORMATION_REQUIRED: {
    subject: `Action needed on your ${APP_NAME} astrologer application`,
    heading: "More information needed",
    body: (reason) => reason || "Please sign in and check your application for details on what's needed.",
  },
  INTERVIEW_PENDING: {
    subject: `Interview step for your ${APP_NAME} astrologer application`,
    heading: "Interview pending",
    body: () => "Your application requires a short interview before a final decision. Our team will reach out to schedule it.",
  },
  APPROVED: {
    subject: `You're approved as a ${APP_NAME} astrologer!`,
    heading: "Application approved",
    body: () => "Congratulations — your astrologer application has been approved. Sign in to set up and publish your public profile whenever you're ready.",
  },
  REJECTED: {
    subject: `Update on your ${APP_NAME} astrologer application`,
    heading: "Application not approved",
    body: (reason) => reason || "After careful review, we're unable to approve your application at this time.",
  },
  SUSPENDED: {
    subject: `Your ${APP_NAME} astrologer access has been suspended`,
    heading: "Account suspended",
    body: (reason) => reason || "Your astrologer access has been suspended. Contact support for more information.",
  },
  REINSTATED: {
    subject: `Your ${APP_NAME} astrologer access has been reinstated`,
    heading: "Access reinstated",
    body: () => "Your astrologer access has been reinstated and you can publish your profile again whenever you're ready.",
  },
};

/**
 * SUPERADMIN-facing operational alerts (Part 13: "notify SUPERADMIN when a new
 * application is submitted" / "requested documents are resubmitted"). Reuses the
 * same SUPPORT_EMAIL team inbox the contact form already delivers to
 * (routes/inquiryRoutes.ts) rather than inventing a second admin-notification
 * channel. Silently no-ops if SUPPORT_EMAIL isn't configured — this is an
 * operational nice-to-have, never something that should block the request that
 * triggered it.
 */
export async function sendAstrologerAdminAlertEmail(subject: string, heading: string, message: string, applicationId: string): Promise<void> {
  const to = process.env.SUPPORT_EMAIL;
  if (!resend || !FROM_EMAIL || !to) {
    console.warn(`[mailer] Skipping astrologer admin alert ("${subject}") — SUPPORT_EMAIL or mailer not configured.`);
    return;
  }
  const reviewUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/admin/astrologers/applications/${applicationId}`;
  try {
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html: `
            <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 24px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #0f172a; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">${APP_NAME} Admin</h1>
        </div>

        <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 12px; line-height: 1.3;">${heading}</h2>
        <p style="color: #64748b; font-size: 15px; line-height: 1.7; margin-top: 0; margin-bottom: 28px;">${message}</p>

        <a href="${reviewUrl}" style="display: block; text-align: center; background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; text-decoration: none; padding: 16px 32px; border-radius: 14px; font-weight: 700; font-size: 16px; margin-bottom: 24px;">
            Open in admin panel →
        </a>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0; line-height: 1.5;">
            Or copy this link: <a href="${reviewUrl}" style="color: #6366f1;">${reviewUrl}</a>
        </p>
         </div>
        </div>
            `,
    });
    if (error) {
      console.error(`[Resend Error] Failed to send astrologer admin alert to ${to}:`, error);
      return;
    }
    console.log(`[Resend Success] Astrologer admin alert sent! ID: ${data?.id}`);
  } catch (err) {
    console.error(`[mailer] Error sending astrologer admin alert to ${to}:`, err);
  }
}

export async function sendAstrologerStatusEmail(email: string, status: AstrologerNotificationStatus, reason?: string | null): Promise<void> {
  if (!resend || !FROM_EMAIL) {
    console.warn(`[mailer] Skipping astrologer ${status} email to ${email} — mailer not configured.`);
    return;
  }
  const copy = ASTROLOGER_STATUS_COPY[status];
  try {
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: copy.subject,
      html: `
            <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 24px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #0f172a; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">${APP_NAME}</h1>
        </div>

        <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 12px; line-height: 1.3;">${copy.heading}</h2>
        <p style="color: #64748b; font-size: 15px; line-height: 1.7; margin-top: 0; margin-bottom: 24px;">${copy.body(reason)}</p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0; line-height: 1.5;">
            Sign in to your ${APP_NAME} account to see the full details of your astrologer application.
        </p>
         </div>
        </div>
            `,
    });

    if (error) {
      console.error(`[Resend Error] Failed to send astrologer ${status} email to ${email}:`, error);
      return;
    }
    console.log(`[Resend Success] Astrologer ${status} email sent! ID: ${data?.id}`);
  } catch (err) {
    console.error(`[mailer] Error sending astrologer ${status} email to ${email}:`, err);
  }
}
