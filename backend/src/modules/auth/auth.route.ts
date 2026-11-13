import { Router } from "express";
import { auth } from "@/middleware/authMiddleware.js";
import { createRateLimiter } from "@/utils/rateLimit.js";
import * as authController from "./auth.controller.js";

const router = Router();

// Per-IP brakes (in-memory, per process). Per-account limits live in the service: attempts per OTP, and OTPs per hour.
const verifyOtpLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 30,
  message: "Too many verification attempts. Please try again in a few minutes.",
  envelope: true,
});
const resendOtpLimiter = createRateLimiter({
  windowMs: 60 * 60_000,
  max: 10,
  message: "Too many OTP requests. Please try again later.",
  envelope: true,
});
// Credential endpoints: generous enough for a shared office NAT, far too tight for online
// brute force (per-account OTP/attempt caps still apply in the service underneath).
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 50,
  message: "Too many sign-in attempts. Please try again in a few minutes.",
  envelope: true,
});
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60_000,
  max: 20,
  message: "Too many registration attempts. Please try again later.",
  envelope: true,
});
const forgotPasswordLimiter = createRateLimiter({
  windowMs: 60 * 60_000,
  max: 10,
  message: "Too many password reset requests. Please try again later.",
  envelope: true,
});
// Refresh fires on every token expiry for every open tab — the ceiling only exists to stop floods.
const refreshLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 300,
  message: "Too many requests. Please try again shortly.",
  envelope: true,
});

// Registration flow
router.post("/register", registerLimiter, authController.register);
router.post("/verify-otp", verifyOtpLimiter, authController.verifyOtp);
router.post("/verify-phone", authController.verifyPhone);
router.get("/msg91-config", authController.getMsg91Config);
router.post("/resend-otp", resendOtpLimiter, authController.resendOtp);

// Login
router.post("/login", loginLimiter, authController.login);
router.post("/google", loginLimiter, authController.googleAuth);

// Google / incomplete-profile onboarding (authenticated session continues)
router.post(
  "/complete-profile",
  auth("USER", "ADMIN", "SUPERADMIN"),
  authController.completeProfile,
);

// Session management
router.post("/refresh", refreshLimiter, authController.refresh);
router.post("/logout", authController.logout);
router.post("/logout-all", auth("USER", "ADMIN", "SUPERADMIN"), authController.logoutAll);

// Password reset
router.post("/forgot-password", forgotPasswordLimiter, authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);


export default router;
