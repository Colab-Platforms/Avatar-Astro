-- OTP hardening.
--
-- 1) Additive: per-OTP counter of verification attempts (existing rows start at 0).
ALTER TABLE "otp_verifications" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- 2) OTPs used to be stored as an unkeyed SHA-256 of the 6-digit code, which can be reversed by trying all
--    900,000 codes. New OTPs are stored as "h2:" + HMAC-SHA256 (keyed with OTP_HMAC_SECRET). The application never
--    accepts a legacy value, so any still-outstanding legacy OTP is retired here (the user simply requests a new
--    one; OTPs live 10 minutes anyway) and every legacy hash is overwritten so no brute-forceable value remains.
--    Only otp_verifications is touched: no users, sessions or password-reset tokens are modified, and no OTP value
--    is read or exposed.
UPDATE "otp_verifications"
SET "used" = true,
    "otp_code" = 'legacy-invalidated'
WHERE "otp_code" NOT LIKE 'h2:%';
