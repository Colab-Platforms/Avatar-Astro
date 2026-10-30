import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import Msg91PhoneWidget from "@/components/auth/Msg91PhoneWidget";
import { useVerifyPhone } from "../hooks/useVerifyPhone";
import { AuthLayout } from "../components/AuthLayout";
import { AuthTextField } from "../components/AuthTextField";
import { PasswordField } from "../components/PasswordField";
import { AuthSubmitButton } from "../components/AuthSubmitButton";
import { AuthDivider } from "../components/AuthDivider";
import { GoogleAuthButton } from "../components/GoogleAuthButton";
import { StateSelect } from "../components/StateSelect";
import {
  VerificationMethodPicker,
  type VerificationMethod,
} from "../components/VerificationMethodPicker";
import {
  useGoogleLoginMutation,
  useRegisterMutation,
  useResendOtpMutation,
} from "../hooks/useAuthMutations";
import {
  registerSchema,
  type RegisterFormValues,
} from "../schemas/authSchemas";
import { getPostAuthPath } from "../utils/postAuthRedirect";
import {
  clearPendingRegistration,
  savePendingRegistration,
} from "../utils/pendingRegistration";
import { safeZodResolver } from "../utils/safeZodResolver";

type Step = "details" | "method" | "phone";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("details");
  const [method, setMethod] = useState<VerificationMethod | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");

  const registerMutation = useRegisterMutation();
  const resendOtpMutation = useResendOtpMutation();
  const googleMutation = useGoogleLoginMutation();
  const {
    verifyPhone,
    handleWidgetError,
    loading: phoneLoading,
    error: phoneError,
  } = useVerifyPhone(pendingEmail);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: safeZodResolver<RegisterFormValues>(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phoneNo: "",
      state: "",
      city: "",
      country: "India",
    },
  });

  const onSubmitDetails = handleSubmit(async (values) => {
    await registerMutation.mutateAsync({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim().toLowerCase(),
      password: values.password,
      phoneNo: values.phoneNo.trim(),
      state: values.state.trim(),
      country: (values.country || "India").trim(),
      city: values.city.trim(),
    });

    toast.success("Account created. Choose how you'd like to verify.");
    setPendingEmail(values.email);
    setPendingPhone(values.phoneNo);
    savePendingRegistration({
      email: values.email,
      phoneNo: values.phoneNo,
    });
    setStep("method");
  });

  const continueWithMethod = async () => {
    if (!method) {
      toast.error("Please choose a verification method.");
      return;
    }

    if (method === "email") {
      await resendOtpMutation.mutateAsync({
        email: pendingEmail,
        type: "REGISTER",
      });
      navigate("/verify-otp", {
        state: {
          email: pendingEmail,
          type: "REGISTER" as const,
          phoneNo: pendingPhone,
        },
      });
      return;
    }

    setStep("phone");
  };

  const handlePhoneVerified = async (accessToken: string) => {
    await verifyPhone(accessToken);
    clearPendingRegistration();
    navigate(getPostAuthPath(null), { replace: true });
  };

  const handleGoogle = async (idToken: string) => {
    const session = await googleMutation.mutateAsync({ idToken });
    navigate(getPostAuthPath(session.user), { replace: true });
  };

  return (
    <AuthLayout
      title={
        step === "details"
          ? "Create Account"
          : step === "method"
            ? "Verify Account"
            : "Verify Mobile"
      }
      subtitle={
        step === "details"
          ? "Join Spiritual and unlock personalized cosmic guidance."
          : step === "method"
            ? "Choose how you want to verify your new account."
            : `Confirm the OTP sent to +91 ${pendingPhone}`
      }
    >
      <AnimatePresence mode="wait">
        {step === "details" ? (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.28 }}
          >
            <form onSubmit={onSubmitDetails} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AuthTextField
                  label="First Name"
                  autoComplete="given-name"
                  error={errors.firstName?.message}
                  {...register("firstName")}
                />
                <AuthTextField
                  label="Last Name"
                  autoComplete="family-name"
                  error={errors.lastName?.message}
                  {...register("lastName")}
                />
              </div>

              <AuthTextField
                label="Email"
                type="email"
                autoComplete="email"
                error={errors.email?.message}
                {...register("email")}
              />

              <PasswordField
                label="Password"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register("password")}
              />

              <PasswordField
                label="Confirm Password"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register("confirmPassword")}
              />

              <AuthTextField
                label="Phone Number"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit Indian mobile"
                autoComplete="tel-national"
                error={errors.phoneNo?.message}
                {...register("phoneNo")}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StateSelect
                  error={errors.state?.message}
                  {...register("state")}
                />
                <AuthTextField
                  label="City"
                  autoComplete="address-level2"
                  error={errors.city?.message}
                  {...register("city")}
                />
              </div>

              <AuthTextField
                label="Country"
                autoComplete="country-name"
                error={errors.country?.message}
                {...register("country")}
              />

              <AuthSubmitButton
                loading={registerMutation.isPending}
                loadingText="Creating account…"
                className="mt-2"
              >
                Continue
              </AuthSubmitButton>
            </form>

            <AuthDivider />
            <GoogleAuthButton
              onCredential={handleGoogle}
              disabled={registerMutation.isPending || googleMutation.isPending}
            />

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-primary transition-colors hover:text-primary/80"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        ) : null}

        {step === "method" ? (
          <motion.div
            key="method"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.28 }}
            className="space-y-6"
          >
            <VerificationMethodPicker value={method} onChange={setMethod} />
            <AuthSubmitButton
              type="button"
              loading={resendOtpMutation.isPending}
              loadingText="Sending OTP…"
              onClick={() => void continueWithMethod()}
            >
              Continue
            </AuthSubmitButton>
          </motion.div>
        ) : null}

        {step === "phone" ? (
          <motion.div
            key="phone"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.28 }}
            className="space-y-4"
          >
            <Msg91PhoneWidget
              phoneNo={pendingPhone}
              onVerified={(token) => void handlePhoneVerified(token)}
              onError={handleWidgetError}
            />
            {phoneLoading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Completing registration…
              </div>
            ) : null}
            {phoneError ? (
              <p className="text-center text-xs text-red-800">{phoneError}</p>
            ) : null}
            <button
              type="button"
              onClick={() => setStep("method")}
              className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Choose another method
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AuthLayout>
  );
}
