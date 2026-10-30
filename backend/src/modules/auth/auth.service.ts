import prisma from "@root/prisma.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { AuthProvider, OtpType } from "@prisma/client";
import { hashPassword, comparePassword } from "@/utils/auth.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendOtpEmail, sendPasswordResetEmail } from "@/utils/mailer.js";
import { verifyMsg91AccessToken, getMsg91WidgetConfig } from "@/utils/msg91.js";
import { verifyGoogleIdToken, type GoogleProfile } from "@/utils/googleAuth.js";
import { recordEvent } from "@/utils/usage.js";
import { EVENT_TYPES, AUTH_FEATURE } from "@/config/events.js";
import {
  RegisterBody,
  LoginBody,
  VerifyOtpBody,
  ResendOtpBody,
  VerifyPhoneBody,
  GoogleAuthBody,
  CompleteProfileBody,
} from "./auth.types.js";

dayjs.extend(utc);

const REFRESH_TOKEN_TTL_DAYS = 30;
const ACCESS_TOKEN_TTL = "1d";
const MIN_PROFILE_AGE_YEARS = 10;

const getHighestRole = (
  roleNames: string[],
): "USER" | "ADMIN" | "SUPERADMIN" => {
  if (roleNames.includes("SUPERADMIN") || roleNames.includes("SUPER_ADMIN"))
    return "SUPERADMIN";
  if (roleNames.includes("ADMIN")) return "ADMIN";
  return "USER";
};

const signAccessToken = (
  userId: string,
  role: "USER" | "ADMIN" | "SUPERADMIN",
): string => {
  if (!process.env.JWT_SECRET)
    throw new ApiError("JWT secret is not defined", STATUS_CODES.SERVER_ERROR);
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
};

const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

const hashOtp = (otp: string): string =>
  crypto.createHash("sha256").update(otp).digest("hex");

const generateOtp = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

// Creates a session, stores hashed refresh token, returns plain token to caller
const createSession = async (
  userId: string,
  device?: string,
): Promise<string> => {
  const rawToken = crypto.randomBytes(32).toString("hex");

  await prisma.session.create({
    data: {
      userId,
      refreshToken: hashToken(rawToken),
      device: device ?? null,
      expiresAt: dayjs().add(REFRESH_TOKEN_TTL_DAYS, "day").toDate(),
    },
  });

  return rawToken;
};

const issueAuthTokens = async (
  user: {
    id: string;
    password: string | null;
    userRoleMappings: { role: { name: string } }[];
    [key: string]: unknown;
  },
  device?: string,
  method: "password" | "otp" | "phone_otp" | "google" = "password",
) => {
  const roleNames = user.userRoleMappings.map((ur) => ur.role.name);
  const accessToken = signAccessToken(user.id, getHighestRole(roleNames));
  const refreshToken = await createSession(user.id, device);
  // Customer activity: a session was really issued. Method only; never credentials.
  recordEvent({ userId: user.id, eventType: EVENT_TYPES.authLogin, feature: AUTH_FEATURE, status: "success", metadata: { method } });
  const { password: _, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
};

/**
 * Existing email/password accounts created before profileCompleted existed
 * should not be forced through Google onboarding. Google-only accounts
 * (no password) must complete the dedicated profile step.
 */
const ensureEmailProfileCompleted = async <
  T extends {
    id: string;
    password: string | null;
    authProvider: AuthProvider;
    profileCompleted: boolean;
    userRoleMappings: { role: { name: string } }[];
  },
>(
  user: T,
): Promise<T> => {
  if (user.profileCompleted) return user;
  if (user.authProvider === AuthProvider.GOOGLE && !user.password) return user;

  return prisma.user.update({
    where: { id: user.id },
    data: { profileCompleted: true },
    include: { userRoleMappings: { include: { role: true } } },
  }) as unknown as Promise<T>;
};

class AuthService {
  async register(data: RegisterBody) {
    const existingUser = await prisma.user.findFirst({
      where: { email: data.email, isDeleted: false },
    });

    if (existingUser?.isEmailVerified || existingUser?.isPhoneVerified) {
      throw new ApiError("Email already registered", STATUS_CODES.CONFLICT);
    }

    //fetch role and hash password in parallel
    const [hashedPassword, roleRecord] = await Promise.all([
      hashPassword(data.password),
      prisma.role.findUnique({ where: { name: "USER" } }),
    ]);
    if (!roleRecord)
      throw new ApiError(
        "USER role not found — run db:seed first",
        STATUS_CODES.SERVER_ERROR,
      );

    const phoneConflict = await prisma.user.findFirst({
      where: {
        phoneNo: data.phoneNo,
        isDeleted: false,
        ...(existingUser ? { NOT: { id: existingUser.id } } : {}),
      },
    });
    if (phoneConflict) {
      throw new ApiError(
        "This phone number is already registered to another account.",
        STATUS_CODES.CONFLICT,
      );
    }

    //email not verfied
    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          password: hashedPassword,
          phoneNo: data.phoneNo,
          state: data.state,
          country: data.country,
          city: data.city,
          isPhoneVerified: false,
          profileCompleted: true,
        },
      });
    }
    //new user
    else {
      const created = await prisma.$transaction(async (tx) => {
        //creating user and mapping role in a transaction
        const user = await tx.user.create({
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            password: hashedPassword,
            phoneNo: data.phoneNo,
            state: data.state,
            country: data.country,
            city: data.city,
            isEmailVerified: false,
            isPhoneVerified: false,
            profileCompleted: true,
          },
        });
        await tx.userRoleMapping.create({
          data: { userId: user.id, roleId: roleRecord.id },
        });

        return user;
      });
      recordEvent({ userId: created.id, eventType: EVENT_TYPES.authRegister, feature: AUTH_FEATURE, status: "success", metadata: { method: "email" } });
    }

    return {
      message:
        "Account created. Please choose a verification method to continue.",
    };
  }

  async verifyOtp(data: VerifyOtpBody, device?: string) {
    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        email: data.email,
        otpCode: hashOtp(data.otp),
        type: data.type as OtpType,
        used: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) throw new ApiError("Invalid OTP", STATUS_CODES.BAD_REQUEST);

    if (dayjs().isAfter(otpRecord.expiresAt)) {
      throw new ApiError(
        "OTP has expired. Please request a new one.",
        STATUS_CODES.BAD_REQUEST,
      );
    }

    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    const user = await prisma.user.findFirst({
      where: { email: data.email, isDeleted: false },
      include: { userRoleMappings: { include: { role: true } } },
    });

    if (!user) throw new ApiError("User not found", STATUS_CODES.NOT_FOUND);

    if (data.type === "REGISTER" && !user.isEmailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true },
      });
      user.isEmailVerified = true;
    }

    const readyUser = await ensureEmailProfileCompleted(user);
    const tokens = await issueAuthTokens(readyUser, device, "otp");

    return {
      ...tokens,
      message:
        data.type === "REGISTER"
          ? "Registration complete. Welcome to Avatar Learner!"
          : "Logged in successfully.",
    };
  }

  async verifyPhone(data: VerifyPhoneBody, device?: string) {
    const user = await prisma.user.findFirst({
      where: { email: data.email, isDeleted: false },
      include: { userRoleMappings: { include: { role: true } } },
    });

    if (!user) throw new ApiError("User not found", STATUS_CODES.NOT_FOUND);

    if (user.isPhoneVerified) {
      throw new ApiError(
        "Phone number is already verified.",
        STATUS_CODES.CONFLICT,
      );
    }

    const verification = await verifyMsg91AccessToken(data.accessToken);
    if (!verification.success) {
      throw new ApiError(
        verification.message ?? "Invalid or expired phone verification.",
        STATUS_CODES.BAD_REQUEST,
      );
    }

    if (verification.mobile && user.phoneNo) {
      const verifiedDigits = verification.mobile.replace(/\D/g, "");
      if (!verifiedDigits.endsWith(user.phoneNo)) {
        throw new ApiError(
          "Verified phone number does not match the number you registered with.",
          STATUS_CODES.BAD_REQUEST,
        );
      }
    }

    const phoneConflict = await prisma.user.findFirst({
      where: {
        phoneNo: user.phoneNo,
        isDeleted: false,
        NOT: { id: user.id },
      },
    });
    if (phoneConflict) {
      throw new ApiError(
        "This phone number is already registered to another account.",
        STATUS_CODES.CONFLICT,
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isPhoneVerified: true },
    });

    user.isPhoneVerified = true;

    const readyUser = await ensureEmailProfileCompleted(user);
    const tokens = await issueAuthTokens(readyUser, device, "phone_otp");

    return {
      ...tokens,
      message: "Phone verified. Welcome to Avatar Learner!",
    };
  }

  getMsg91Config() {
    const config = getMsg91WidgetConfig();
    if (!config) {
      throw new ApiError(
        "Phone verification is not configured.",
        STATUS_CODES.SERVER_ERROR,
      );
    }
    return config;
  }

  async login(data: LoginBody, device?: string) {
    const user = await prisma.user.findFirst({
      where: { email: data.email, isDeleted: false },
      include: { userRoleMappings: { include: { role: true } } },
    });

    if (!user)
      throw new ApiError(
        "User with this Email doesn't exist",
        STATUS_CODES.NOT_FOUND,
      );

    if (!user || !user.password) {
      throw new ApiError(
        "Invalid email or password",
        STATUS_CODES.UNAUTHORIZED,
      );
    }

    const isPasswordValid = await comparePassword(data.password, user.password);
    if (!isPasswordValid) {
      recordEvent({ userId: user.id, eventType: EVENT_TYPES.authLoginFailed, feature: AUTH_FEATURE, status: "failed", metadata: { method: "password", reason: "bad_password" } });
      throw new ApiError(
        "Invalid email or password",
        STATUS_CODES.UNAUTHORIZED,
      );
    }

    if (!user.isActive) {
      recordEvent({ userId: user.id, eventType: EVENT_TYPES.authLoginFailed, feature: AUTH_FEATURE, status: "failed", metadata: { method: "password", reason: "inactive" } });
      throw new ApiError(
        "Your account has been deactivated. Contact support.",
        STATUS_CODES.FORBIDDEN,
      );
    }

    if (!user.isEmailVerified && !user.isPhoneVerified) {
      recordEvent({ userId: user.id, eventType: EVENT_TYPES.authLoginFailed, feature: AUTH_FEATURE, status: "failed", metadata: { method: "password", reason: "unverified" } });
      await prisma.otpVerification.updateMany({
        where: { email: data.email, type: OtpType.LOGIN, used: false },
        data: { used: true },
      });

      const otp = generateOtp();
      await prisma.otpVerification.create({
        data: {
          email: data.email,
          otpCode: hashOtp(otp),
          type: OtpType.LOGIN,
          userId: user.id,
          expiresAt: dayjs().add(10, "minute").toDate(),
        },
      });

      await sendOtpEmail(data.email, otp, "LOGIN").catch((err) =>
        console.error("[Auth] Failed to send login OTP email:", err),
      );

      return {
        requiresVerification: true,
        message:
          "Your email is not verified. An OTP has been sent to your email.",
      };
    }

    const readyUser = await ensureEmailProfileCompleted(user);
    const tokens = await issueAuthTokens(readyUser, device, "password");
    return tokens;
  }

  async googleAuth(data: GoogleAuthBody, device?: string) {
    let profile;
    try {
      profile = await verifyGoogleIdToken(data.idToken);
    } catch (err: any) {
      throw new ApiError(
        err.message ?? "Google sign-in failed.",
        STATUS_CODES.UNAUTHORIZED,
      );
    }

    return this.loginWithGoogleProfile(profile, device);
  }

  /**
   * Persists (or links) the user for an already VERIFIED Google profile and issues a session.
   * Lookup order prevents duplicates: Google id first, then the same email (linking an existing account).
   * New accounts get the default USER role. Runs against whatever database this process is connected to.
   */
  async loginWithGoogleProfile(profile: GoogleProfile, device?: string) {
    if (!profile.emailVerified) {
      throw new ApiError(
        "Google account email is not verified.",
        STATUS_CODES.BAD_REQUEST,
      );
    }

    let user = await prisma.user.findFirst({
      where: { googleId: profile.googleId, isDeleted: false },
      include: { userRoleMappings: { include: { role: true } } },
    });

    if (!user) {
      const existingByEmail = await prisma.user.findFirst({
        where: { email: profile.email, isDeleted: false },
        include: { userRoleMappings: { include: { role: true } } },
      });

      if (existingByEmail) {
        // Link the Google account to the existing email/password account
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId: profile.googleId,
            isEmailVerified: true,
            profileImage: existingByEmail.profileImage ?? profile.profileImage,
          },
          include: { userRoleMappings: { include: { role: true } } },
        });
      } else {
        const roleRecord = await prisma.role.findUnique({
          where: { name: "USER" },
        });
        if (!roleRecord) {
          throw new ApiError(
            "USER role not found — run db:seed first",
            STATUS_CODES.SERVER_ERROR,
          );
        }

        const created = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              firstName: profile.firstName,
              lastName: profile.lastName,
              email: profile.email,
              googleId: profile.googleId,
              authProvider: AuthProvider.GOOGLE,
              profileImage: profile.profileImage,
              isEmailVerified: true,
            },
          });
          await tx.userRoleMapping.create({
            data: { userId: newUser.id, roleId: roleRecord.id },
          });

          return newUser;
        });

        recordEvent({ userId: created.id, eventType: EVENT_TYPES.authRegister, feature: AUTH_FEATURE, status: "success", metadata: { method: "google" } });

        // Defer Google Sheets sync until /complete-profile — phone/location
        // are not available at Google account creation time.

        user = await prisma.user.findUniqueOrThrow({
          where: { id: created.id },
          include: { userRoleMappings: { include: { role: true } } },
        });
      }
    }

    if (!user.isActive) {
      recordEvent({ userId: user.id, eventType: EVENT_TYPES.authLoginFailed, feature: AUTH_FEATURE, status: "failed", metadata: { method: "google", reason: "inactive" } });
      throw new ApiError(
        "Your account has been deactivated. Contact support.",
        STATUS_CODES.FORBIDDEN,
      );
    }

    return issueAuthTokens(user, device, "google");
  }

  async refresh(rawRefreshToken: string, device?: string) {
    const hashed = hashToken(rawRefreshToken);

    const session = await prisma.session.findFirst({
      where: { refreshToken: hashed },
      include: {
        user: { include: { userRoleMappings: { include: { role: true } } } },
      },
    });

    if (!session)
      throw new ApiError("Invalid refresh token", STATUS_CODES.UNAUTHORIZED);

    if (dayjs().isAfter(session.expiresAt)) {
      await prisma.session.delete({ where: { id: session.id } });
      throw new ApiError(
        "Refresh token has expired. Please log in again.",
        STATUS_CODES.UNAUTHORIZED,
      );
    }

    if (!session.user.isActive || session.user.isDeleted) {
      throw new ApiError(
        "Account is no longer active.",
        STATUS_CODES.FORBIDDEN,
      );
    }

    // Rotate: delete old session, create new one
    await prisma.session.delete({ where: { id: session.id } });

    const roleNames = session.user.userRoleMappings.map((ur) => ur.role.name);
    const accessToken = signAccessToken(
      session.user.id,
      getHighestRole(roleNames),
    );
    const newRefreshToken = await createSession(
      session.user.id,
      device ?? session.device ?? undefined,
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(rawRefreshToken: string) {
    const hashed = hashToken(rawRefreshToken);

    await prisma.session.deleteMany({ where: { refreshToken: hashed } });

    return { message: "Logged out successfully." };
  }

  async logoutAll(userId: string) {
    await prisma.session.deleteMany({ where: { userId } });
    return { message: "Logged out from all devices." };
  }

  async resendOtp(data: ResendOtpBody) {
    const user = await prisma.user.findFirst({
      where: { email: data.email, isDeleted: false },
    });

    if (!user)
      return { message: "If this email is registered, an OTP has been sent." };

    if (
      data.type === "REGISTER" &&
      user.isEmailVerified &&
      user.isPhoneVerified
    ) {
      throw new ApiError(
        "This account is already verified.",
        STATUS_CODES.CONFLICT,
      );
    }

    const recentOtp = await prisma.otpVerification.findFirst({
      where: {
        email: data.email,
        type: data.type as OtpType,
        used: false,
        createdAt: { gte: dayjs().subtract(60, "second").toDate() },
      },
    });

    if (recentOtp) {
      throw new ApiError(
        "Please wait 60 seconds before requesting another OTP.",
        STATUS_CODES.TOO_MANY_REQUESTS,
      );
    }

    await prisma.otpVerification.updateMany({
      where: { email: data.email, type: data.type as OtpType, used: false },
      data: { used: true },
    });

    const otp = generateOtp();
    await prisma.otpVerification.create({
      data: {
        email: data.email,
        otpCode: hashOtp(otp),
        type: data.type as OtpType,
        userId: user.id,
        expiresAt: dayjs().add(10, "minute").toDate(),
      },
    });

    await sendOtpEmail(data.email, otp, data.type).catch((err) =>
      console.error("[Auth] Failed to resend OTP email:", err),
    );

    return { message: "A new OTP has been sent to your email." };
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findFirst({
      where: { email, isDeleted: false },
    });

    if (!user)
      throw new ApiError(
        "Account with this Email doesn't exist",
        STATUS_CODES.NOT_FOUND,
      );

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const token = crypto.randomBytes(32).toString("hex");

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: dayjs().add(1, "hour").toDate(),
      },
    });

    sendPasswordResetEmail(email, token).catch((err) =>
      console.error("[Auth] Failed to send password reset email:", err),
    );

    return { message: "If this email exists, a reset link has been sent." };
  }

  async resetPassword(token: string, newPassword: string) {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.used) {
      throw new ApiError(
        "Invalid or expired reset link",
        STATUS_CODES.BAD_REQUEST,
      );
    }

    if (dayjs().isAfter(resetToken.expiresAt)) {
      throw new ApiError(
        "Password reset link has expired. Please request a new one.",
        STATUS_CODES.BAD_REQUEST,
      );
    }

    const hashed = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashed },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    return { message: "Password reset successfully. You can now log in." };
  }

  async completeProfile(userId: string, data: CompleteProfileBody) {
    const user = await prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
      include: { userRoleMappings: { include: { role: true } } },
    });

    if (!user) throw new ApiError("User not found", STATUS_CODES.NOT_FOUND);

    if (user.profileCompleted) {
      throw new ApiError(
        "Profile has already been completed.",
        STATUS_CODES.CONFLICT,
      );
    }

    const dob = dayjs(data.dateOfBirth);
    if (!dob.isValid()) {
      throw new ApiError(
        "Enter a valid date of birth",
        STATUS_CODES.BAD_REQUEST,
      );
    }
    if (dob.isAfter(dayjs())) {
      throw new ApiError(
        "Date of birth cannot be in the future",
        STATUS_CODES.BAD_REQUEST,
      );
    }
    if (dayjs().diff(dob, "year") < MIN_PROFILE_AGE_YEARS) {
      throw new ApiError(
        `You must be at least ${MIN_PROFILE_AGE_YEARS} years old`,
        STATUS_CODES.BAD_REQUEST,
      );
    }

    const phoneConflict = await prisma.user.findFirst({
      where: {
        phoneNo: data.phoneNo,
        isDeleted: false,
        NOT: { id: user.id },
      },
    });
    if (phoneConflict) {
      throw new ApiError(
        "This phone number is already registered to another account.",
        STATUS_CODES.CONFLICT,
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNo: data.phoneNo,
        state: data.state,
        country: data.country,
        city: data.city,
        dateOfBirth: dob.startOf("day").toDate(),
        profileCompleted: true,
      },
      include: { userRoleMappings: { include: { role: true } } },
    });

    const { password: _, ...safeUser } = updated;
    return safeUser;
  }
}

export default AuthService;
