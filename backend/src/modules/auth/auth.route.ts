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

// Registration flow
router.post("/register", authController.register);
router.post("/verify-otp", verifyOtpLimiter, authController.verifyOtp);
router.post("/verify-phone", authController.verifyPhone);
router.get("/msg91-config", authController.getMsg91Config);
router.post("/resend-otp", resendOtpLimiter, authController.resendOtp);

// Login
router.post("/login", authController.login);
router.post("/google", authController.googleAuth);

// Google / incomplete-profile onboarding (authenticated session continues)
router.post(
  "/complete-profile",
  auth("USER", "ADMIN", "SUPERADMIN"),
  authController.completeProfile,
);

// Session management
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.post("/logout-all", auth("USER", "ADMIN", "SUPERADMIN"), authController.logoutAll);

// Password reset
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);


export default router;
