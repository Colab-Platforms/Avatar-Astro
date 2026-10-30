import { recordEvent } from "@/utils/usage.js";
import { EVENT_TYPES, PROFILE_FEATURE } from "@/config/events.js";
import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import AuthService from "./auth.service.js";
import type { AuthRequest } from "@/middleware/authMiddleware.js";
import {
  validateRegisterSchema,
  validateLoginSchema,
  validateVerifyOtpSchema,
  validateResendOtpSchema,
  validateRefreshTokenSchema,
  validateForgotPasswordSchema,
  validateResetPasswordSchema,
  validateVerifyPhoneSchema,
  validateGoogleAuthSchema,
  validateCompleteProfileSchema,
} from "./auth.validators.js";

const authService = new AuthService();

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateRegisterSchema(req.body);
    if (error) {
      sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    const result = await authService.register(value);
    sendResponse(res, true, null, result.message, STATUS_CODES.CREATED);
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateVerifyOtpSchema(req.body);
    if (error) {
      sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    const device = req.headers["user-agent"];
    const result = await authService.verifyOtp(value, device);

    sendResponse(
      res,
      true,
      {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      result.message,
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const resendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateResendOtpSchema(req.body);
    if (error) {
      sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    const result = await authService.resendOtp(value);
    sendResponse(res, true, null, result.message, STATUS_CODES.OK);
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateLoginSchema(req.body);
    if (error) {
      sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    const device = req.headers["user-agent"];
    const result = await authService.login(value, device);
    if ("requiresVerification" in result) {
      sendResponse(
        res,
        true,
        { requiresVerification: true },
        result.message,
        STATUS_CODES.OK,
      );
      return;
    }
    sendResponse(
      res,
      true,
      {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      "Logged in successfully.",
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const googleAuth = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { error, value } = validateGoogleAuthSchema(req.body);
    if (error) {
      sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    const device = req.headers["user-agent"];
    const result = await authService.googleAuth(value, device);
    sendResponse(
      res,
      true,
      {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      "Logged in successfully.",
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateRefreshTokenSchema(req.body);
    if (error) {
      sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    const device = req.headers["user-agent"];
    const result = await authService.refresh(value.refreshToken, device);
    sendResponse(res, true, result, "Token refreshed.", STATUS_CODES.OK);
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateRefreshTokenSchema(req.body);
    if (error) {
      sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    const result = await authService.logout(value.refreshToken);
    sendResponse(res, true, null, result.message, STATUS_CODES.OK);
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const logoutAll = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const result = await authService.logoutAll(req.user!.id);
    sendResponse(res, true, null, result.message, STATUS_CODES.OK);
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { error, value } = validateForgotPasswordSchema(req.body);
    if (error) {
      sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    const result = await authService.forgotPassword(value.email);
    sendResponse(res, true, null, result.message, STATUS_CODES.OK);
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { error, value } = validateResetPasswordSchema(req.body);
    if (error) {
      sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    const result = await authService.resetPassword(value.token, value.password);
    sendResponse(res, true, null, result.message, STATUS_CODES.OK);
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const verifyPhone = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { error, value } = validateVerifyPhoneSchema(req.body);
    if (error) {
      sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }

    const device = req.headers["user-agent"];
    const result = await authService.verifyPhone(value, device);
    sendResponse(
      res,
      true,
      {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      result.message,
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const getMsg91Config = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const config = authService.getMsg91Config();
    sendResponse(res, true, config, "MSG91 config loaded.", STATUS_CODES.OK);
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const completeProfile = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { error, value } = validateCompleteProfileSchema(req.body);
    if (error) {
      sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }

    const result = await authService.completeProfile(req.user!.id, value);
    recordEvent({ userId: req.user!.id, eventType: EVENT_TYPES.profileUpdated, feature: PROFILE_FEATURE, status: "success", metadata: { fields: Object.keys(value ?? {}), source: "complete_profile" } });
    sendResponse(
      res,
      true,
      result,
      "Profile completed successfully.",
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};
