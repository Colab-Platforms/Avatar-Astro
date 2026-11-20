import { useForm } from "react-hook-form";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { AuthTextField } from "../components/AuthTextField";
import { PasswordField } from "../components/PasswordField";
import { AuthSubmitButton } from "../components/AuthSubmitButton";
import { AuthDivider } from "../components/AuthDivider";
import { GoogleAuthButton } from "../components/GoogleAuthButton";
import {
  useGoogleLoginMutation,
  useLoginMutation,
} from "../hooks/useAuthMutations";
import { loginSchema, type LoginFormValues } from "../schemas/authSchemas";
import { isAuthSession } from "../types";
import { getPostAuthPath } from "../utils/postAuthRedirect";
import { safeZodResolver } from "../utils/safeZodResolver";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from ?? undefined;

  const loginMutation = useLoginMutation();
  const googleMutation = useGoogleLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: safeZodResolver<LoginFormValues>(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // A failed sign-in is already reported to the user by the mutation's toast (with the server's message), so the
  // rejection is caught here rather than left as an "Uncaught (in promise)" error in the console.
  const onSubmit = handleSubmit(async (values: LoginFormValues) => {
    let result: Awaited<ReturnType<typeof loginMutation.mutateAsync>>;
    try {
      result = await loginMutation.mutateAsync({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
    } catch {
      return;
    }

    if (isAuthSession(result)) {
      navigate(from ?? getPostAuthPath(result.user), { replace: true });
      return;
    }

    if ("requiresVerification" in result && result.requiresVerification) {
      navigate("/verify-otp", {
        replace: true,
        state: { email: values.email, type: "LOGIN" as const },
      });
    }
  });

  // Called by Google's script, not by React: nothing would catch a rejection, so failures are handled here
  // (the mutation's toast already tells the user what went wrong).
  const handleGoogle = async (idToken: string) => {
    try {
      const session = await googleMutation.mutateAsync({ idToken });
      navigate(from ?? getPostAuthPath(session.user), { replace: true });
    } catch {
      /* reported by the mutation's toast */
    }
  };

  const busy = loginMutation.isPending || googleMutation.isPending;

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to continue your spiritual journey."
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <AuthTextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <PasswordField
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs text-primary transition-colors hover:text-primary/80"
          >
            Forgot password?
          </Link>
        </div>

        <AuthSubmitButton loading={loginMutation.isPending} loadingText="Signing in…">
          Sign In
        </AuthSubmitButton>
      </form>

      <AuthDivider />

      <GoogleAuthButton onCredential={handleGoogle} disabled={busy} />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          to="/register"
          className="font-medium text-primary transition-colors hover:text-primary/80"
        >
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
