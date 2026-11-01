import { useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { OtpForm } from "../components/OtpForm";
import {
  useApplySession,
  useResendOtpMutation,
  useVerifyOtpMutation,
} from "../hooks/useAuthMutations";
import type { AuthSession, OtpType, VerifyOtpLocationState } from "../types";
import {
  clearPendingRegistration,
  loadPendingRegistration,
} from "../utils/pendingRegistration";

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as VerifyOtpLocationState | null;
  const pending = loadPendingRegistration();

  const email = state?.email ?? pending?.email ?? "";
  const type: OtpType = state?.type ?? "REGISTER";

  const verifyMutation = useVerifyOtpMutation({ deferSession: true });
  const applySession = useApplySession();
  // OtpForm calls handleVerified from a closure taken at submit time, so the
  // confirmed session lives in a ref rather than in mutation state.
  const sessionRef = useRef<AuthSession | null>(null);
  const resendMutation = useResendOtpMutation();

  const subtitle = useMemo(() => {
    if (type === "LOGIN") {
      return "Your account needs verification before you can continue.";
    }
    return "Enter the code we emailed you to finish registration.";
  }, [type]);

  useEffect(() => {
    if (!email) {
      navigate("/login", { replace: true });
    }
  }, [email, navigate]);

  if (!email) return null;

  // Rejects on an invalid code; OtpForm only plays its success animation once
  // the backend has confirmed, then calls handleVerified.
  const handleSubmit = async (otp: string) => {
    sessionRef.current = await verifyMutation.mutateAsync({ email, otp, type });
  };

  const handleVerified = () => {
    const session = sessionRef.current;
    if (!session) return;
    clearPendingRegistration();
    // Storing the session is what navigates: PublicRoute redirects signed-in
    // users to getPostAuthPath(user). An explicit navigate() here would be a
    // second, duplicate redirect to the same place.
    applySession(session);
  };

  const handleResend = () => {
    void resendMutation.mutateAsync({ email, type });
  };

  return (
    <AuthLayout title="Verify OTP" subtitle={subtitle}>
      <OtpForm
        email={email}
        resending={resendMutation.isPending}
        onSubmit={handleSubmit}
        onVerified={handleVerified}
        onResend={handleResend}
      />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Wrong email?{" "}
        <Link
          to={type === "REGISTER" ? "/register" : "/login"}
          className="font-medium text-primary transition-colors hover:text-primary/80"
        >
          Go back
        </Link>
      </p>
    </AuthLayout>
  );
}
