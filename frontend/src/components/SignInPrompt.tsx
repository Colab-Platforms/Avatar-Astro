import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSignInPrompt } from "@/lib/authedFetch";
import { useAuthStore } from "@/store/authStore";
import { AuthTextField } from "@/features/auth/components/AuthTextField";
import { PasswordField } from "@/features/auth/components/PasswordField";
import { AuthSubmitButton } from "@/features/auth/components/AuthSubmitButton";
import { AuthDivider } from "@/features/auth/components/AuthDivider";
import { GoogleAuthButton } from "@/features/auth/components/GoogleAuthButton";
import { useGoogleLoginMutation, useLoginMutation } from "@/features/auth/hooks/useAuthMutations";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/authSchemas";
import { safeZodResolver } from "@/features/auth/utils/safeZodResolver";
import { isAuthSession } from "@/features/auth/types";

/**
 * The one sign-in gate for every feature that produces a personal result.
 *
 * Features call requireSignIn(resume) when the visitor presses Generate. Signed out, this dialog opens
 * over the page, so nothing they typed or uploaded is lost. Signing in here (email or Google) runs the
 * pending action once. Closing the dialog runs nothing and leaves the form as it was. Creating an
 * account opens the registration page, because it needs OTP or phone verification; it returns here.
 */
const SignInPrompt = () => {
  const { open, hide, resume } = useSignInPrompt();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated && !!s.accessToken);
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.pathname + location.search;

  const loginMutation = useLoginMutation();
  const googleMutation = useGoogleLoginMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: safeZodResolver<LoginFormValues>(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Close if the visitor navigates elsewhere while it is open.
  useEffect(() => {
    hide();
  }, [location.pathname, hide]);

  // The session became valid while the dialog was open: carry on with what they were doing, exactly once.
  useEffect(() => {
    if (open && isAuthenticated) {
      reset();
      resume();
    }
  }, [open, isAuthenticated, resume, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const result = await loginMutation.mutateAsync({
      email: values.email.trim().toLowerCase(),
      password: values.password,
    });
    if (!isAuthSession(result) && "requiresVerification" in result && result.requiresVerification) {
      hide();
      navigate("/verify-otp", { state: { email: values.email, type: "LOGIN" as const, from } });
    }
    // On success the session is stored and the effect above resumes the pending action.
  });

  const handleGoogle = async (idToken: string) => {
    await googleMutation.mutateAsync({ idToken });
  };

  const busy = loginMutation.isPending || googleMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && hide()}>
      <DialogContent
        className="max-h-[92vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto border-[#592209]/30 bg-[#FBF5EC] text-[#301607]"
        data-testid="signin-gate"
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-[#592209]">Your cosmic insights are ready to be unlocked.</DialogTitle>
          <DialogDescription className="text-[#4A2E1F]">
            Please log in or create an account to view your personalized results. What you entered is kept, and your result
            will be prepared as soon as you sign in.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <AuthTextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <PasswordField label="Password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
          <div className="flex justify-end">
            <Link to="/forgot-password" state={{ from }} onClick={hide} className="text-xs text-[#592209] underline underline-offset-2">
              Forgot password?
            </Link>
          </div>
          <AuthSubmitButton loading={loginMutation.isPending} loadingText="Signing in…">
            Continue to Login
          </AuthSubmitButton>
        </form>

        <AuthDivider />
        <GoogleAuthButton onCredential={handleGoogle} disabled={busy} />

        <Link
          to="/register"
          state={{ from }}
          onClick={hide}
          className="block rounded-lg border border-[#592209]/50 px-5 py-3 text-center text-sm font-bold uppercase tracking-wider text-[#592209] hover:bg-[#592209]/10"
        >
          Create Account
        </Link>
        <button type="button" onClick={hide} className="text-center text-sm text-[#6B4A37] underline underline-offset-2 hover:text-[#301607]">
          Not now
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default SignInPrompt;
