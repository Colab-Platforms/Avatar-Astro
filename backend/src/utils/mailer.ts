import "dotenv/config";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL;
const APP_NAME = process.env.APP_NAME || "Astro";

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
