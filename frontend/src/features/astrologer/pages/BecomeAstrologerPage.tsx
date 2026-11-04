import { Link } from "react-router-dom";
import { BadgeCheck, FileText, MessageCircleQuestion, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAuthHydrated } from "@/features/auth/hooks/useAuthHydrated";
import { useAstrologerApplication } from "../hooks/useAstrologerApplication";
import { STATUS_LABELS } from "../types";

const STEPS = [
  { title: "Apply", desc: "Tell us about yourself and your astrology practice in a short multi-step form. Save a draft and come back any time." },
  { title: "Upload documents", desc: "One government ID, your profile photo, and a short note on your training or experience — formal certificates are welcome but never required." },
  { title: "Manual review", desc: "Our team reviews your application and documents by hand. We may ask for more information or an interview before deciding." },
  { title: "Get approved", desc: "Once approved, your astrologer profile is created. You choose when to publish it and set up consultations afterward." },
];

const ELIGIBILITY = [
  "You are at least 18 years old and can be reached by email and phone.",
  "You have genuine knowledge or experience in astrology, tarot, numerology, Vastu, or a related practice.",
  "You can provide one government-issued identity document for verification.",
  "You agree to our professional conduct policy and verification process.",
];

/** Public landing page (Part 2): benefits, process, eligibility, CTA. No OTP phone step anywhere in this flow. */
export default function BecomeAstrologerPage() {
  const ready = useAuthHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const applicationQuery = useAstrologerApplication(ready && isAuthenticated);
  const application = ready && isAuthenticated ? applicationQuery.data : null;

  const ctaTo = isAuthenticated ? "/astrologer-application" : "/login";
  const ctaState = isAuthenticated ? undefined : { from: "/astrologer-application" };
  const ctaLabel = !application
    ? "Apply as Astrologer"
    : application.status === "DRAFT"
      ? "Continue your application"
      : `View application (${STATUS_LABELS[application.status]})`;

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-6">
      <header className="rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-8 text-center sm:p-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#592209]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#592209]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Join MyBhagya
        </span>
        <h1 className="mt-4 font-home-serif text-4xl font-semibold text-[#592209] sm:text-5xl">Become an Astrologer</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-[#4A2E1F]">
          Share your knowledge of Vedic astrology, Tarot, Numerology and more with people looking for guidance — reach genuine
          seekers through a platform that manually verifies every astrologer before they go live.
        </p>
        <div className="mt-6">
          <Link
            to={ctaTo}
            state={ctaState}
            className="inline-flex items-center justify-center rounded-lg bg-[#592209] px-6 py-3 text-base font-semibold text-[#F5E9D6] hover:bg-[#461B07]"
          >
            {ctaLabel}
          </Link>
        </div>
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {[
          { icon: UserCheck, title: "Reach real seekers", desc: "Your profile is shown to people actively looking for astrology guidance on MyBhagya." },
          { icon: ShieldCheck, title: "Verified, trusted platform", desc: "Every astrologer is manually reviewed, so clients know they're speaking with someone genuine." },
          { icon: FileText, title: "No rigid certificate requirement", desc: "Experienced practitioners without a formal certificate can explain their training and provide alternative evidence." },
          { icon: BadgeCheck, title: "You control your profile", desc: "Your profile stays unpublished until you're ready — availability and pricing are set up after approval." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-5">
            <Icon className="h-6 w-6 text-[#592209]" aria-hidden="true" />
            <h3 className="mt-3 font-home-serif text-lg font-semibold text-[#301607]">{title}</h3>
            <p className="mt-1 text-sm text-[#4A2E1F]">{desc}</p>
          </div>
        ))}
      </div>

      <section className="mt-12" aria-labelledby="how-it-works-h">
        <h2 id="how-it-works-h" className="font-home-serif text-2xl font-semibold text-[#592209]">How onboarding works</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-4">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#592209] text-sm font-semibold text-[#F5E9D6]">{i + 1}</span>
              <h3 className="mt-2 font-semibold text-[#301607]">{step.title}</h3>
              <p className="mt-1 text-sm text-[#4A2E1F]">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-home-serif text-2xl font-semibold text-[#592209]">Eligibility</h2>
          <ul className="mt-4 space-y-2 text-base text-[#4A2E1F]">
            {ELIGIBILITY.map((item) => (
              <li key={item} className="flex gap-2">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#592209]" aria-hidden="true" /> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-5">
          <h2 className="flex items-center gap-2 font-home-serif text-xl font-semibold text-[#592209]">
            <MessageCircleQuestion className="h-5 w-5" aria-hidden="true" /> A note on phone numbers
          </h2>
          <p className="mt-2 text-base text-[#4A2E1F]">
            We collect a contact phone number for coordination only — there is no OTP or mobile verification step anywhere in
            the astrologer application process.
          </p>
        </div>
      </section>

      <div className="mt-12 text-center">
        <Link
          to={ctaTo}
          state={ctaState}
          className="inline-flex items-center justify-center rounded-lg bg-[#592209] px-6 py-3 text-base font-semibold text-[#F5E9D6] hover:bg-[#461B07]"
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
