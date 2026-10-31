import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AuthApiError } from "@/lib/authClient";
import { useAuthStore } from "@/store/authStore";
import { ADMIN_DASHBOARD_QUERY_KEY } from "@/features/admin/hooks/useAdminDashboard";
import { authApi } from "../api/authApi";
import type {
  AuthSession,
  AuthUser,
  CompleteProfilePayload,
  ForgotPasswordPayload,
  GoogleLoginPayload,
  LoginPayload,
  RegisterPayload,
  ResendOtpPayload,
  ResetPasswordPayload,
  VerifyOtpPayload,
  VerifyPhonePayload,
} from "../types";
import { isAuthSession } from "../types";

export const AUTH_USER_QUERY_KEY = ["auth", "user"] as const;

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof AuthApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function useApplySession() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return (session: AuthSession) => {
    setSession(session);
    queryClient.setQueryData(AUTH_USER_QUERY_KEY, session.user);
    void queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY });
  };
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onError: (err) => {
      toast.error(getErrorMessage(err, "Registration failed. Please try again."));
    },
  });
}

export function useLoginMutation() {
  const applySession = useApplySession();

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      if (isAuthSession(data)) {
        applySession(data);
        toast.success("Welcome back.");
      }
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Login failed. Please try again."));
    },
  });
}

export function useGoogleLoginMutation() {
  const applySession = useApplySession();

  return useMutation({
    mutationFn: (payload: GoogleLoginPayload) => authApi.googleLogin(payload),
    onSuccess: (session) => {
      applySession(session);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Google sign-in failed."));
    },
  });
}

/**
 * With `deferSession`, a successful verification does not touch the auth store;
 * the caller applies the returned session (via `useApplySession`) once its own
 * success UI has finished — PublicRoute redirects signed-in users immediately.
 */
export function useVerifyOtpMutation({
  deferSession = false,
}: { deferSession?: boolean } = {}) {
  const applySession = useApplySession();

  return useMutation({
    mutationFn: (payload: VerifyOtpPayload) => authApi.verifyOtp(payload),
    onSuccess: (session) => {
      if (deferSession) return;
      applySession(session);
      toast.success("Verified successfully.");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Invalid OTP. Please try again."));
    },
  });
}

export function useResendOtpMutation() {
  return useMutation({
    mutationFn: (payload: ResendOtpPayload) => authApi.resendOtp(payload),
    onSuccess: () => {
      toast.success("A new OTP has been sent to your email.");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not resend OTP."));
    },
  });
}

export function useVerifyPhoneMutation() {
  const applySession = useApplySession();

  return useMutation({
    mutationFn: (payload: VerifyPhonePayload) => authApi.verifyPhone(payload),
    onSuccess: (session) => {
      applySession(session);
      toast.success("Phone verified successfully.");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Phone verification failed."));
    },
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordPayload) =>
      authApi.forgotPassword(payload),
    onSuccess: () => {
      toast.success("If this email exists, a reset link has been sent.");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not send reset link."));
    },
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) =>
      authApi.resetPassword(payload),
    onSuccess: () => {
      toast.success("Password reset successfully. You can now log in.");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not reset password."));
    },
  });
}

export function useCompleteGoogleProfileMutation() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CompleteProfilePayload) =>
      authApi.completeGoogleProfile(payload),
    onSuccess: (user: AuthUser) => {
      setUser(user);
      queryClient.setQueryData(AUTH_USER_QUERY_KEY, user);
      toast.success("Profile completed successfully.");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not complete profile."));
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: AUTH_USER_QUERY_KEY });
      queryClient.removeQueries({ queryKey: ADMIN_DASHBOARD_QUERY_KEY });
      toast.success("Logged out successfully.");
    },
    onError: () => {
      // Local session is cleared in authApi.logout finally block.
      queryClient.removeQueries({ queryKey: AUTH_USER_QUERY_KEY });
      queryClient.removeQueries({ queryKey: ADMIN_DASHBOARD_QUERY_KEY });
    },
  });
}
