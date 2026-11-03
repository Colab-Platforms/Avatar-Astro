import { useState } from "react";
import AskDivyaSection from "@/features/guru/AskDivyaSection";
import { FEATURES } from "@/data/featureCatalog";
import { useFeatureTitle } from "@/hooks/useFeatureTitle";
import NameDestinyReport from "@/components/NameDestinyReport";
import NameNumerologyEducation from "@/components/NameNumerologyEducation";
import { buildProfile, checkName, type NameProfile } from "@/lib/numerology";
import { authedFetch, requireSignIn, SignInRequiredError } from "@/lib/authedFetch";
import { AUTH_API_BASE_URL } from "@/lib/authClient";

interface FormState {
  firstName: string;
  lastName: string;
  dob: string;
}

const emptyForm = (): FormState => ({ firstName: "", lastName: "", dob: "" });

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#FBF5EC",
  border: "1px solid rgba(89,34,9,0.2)",
  borderBottom: "2px solid rgba(89,34,9,0.5)",
  borderRadius: 10,
  padding: "14px 18px",
  color: "#301607",
  fontSize: 16,
  outline: "none",
};

export default function NameDestinyReportPage() {
  useFeatureTitle(FEATURES.numerology);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [profile, setProfile] = useState<NameProfile | null>(null);
  const [error, setError] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  function up<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requireSignIn(() => handleSubmit({ preventDefault() {} } as React.FormEvent))) return; // signed out: ask, keep the form, then run this once
    if (!form.firstName.trim() || !form.dob) {
      setError("Please enter your first name and date of birth.");
      return;
    }
    if (form.dob > today || form.dob < "1900-01-01") {
      setError("Please enter a valid date of birth (between 1900 and today).");
      return;
    }
    const first = checkName(form.firstName);
    if (!first.ok) {
      setError(`First name: ${first.error}`);
      return;
    }
    if (form.lastName.trim()) {
      const last = checkName(form.lastName);
      if (!last.ok) {
        setError(`Last name: ${last.error}`);
        return;
      }
    }
    const result = buildProfile([form.firstName, form.lastName].filter((p) => p.trim()).join(" "), form.dob);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    try {
      const checkRes = await authedFetch(`${AUTH_API_BASE_URL}/name-analysis/check`, { method: "POST" });
      if (!checkRes.ok) {
        const body = await checkRes.json().catch(() => null);
        setError(body?.message || "This tool is temporarily unavailable. Please try again later.");
        return;
      }
    } catch (err) {
      if (!(err instanceof SignInRequiredError)) setError("Couldn't verify usage limit. Please check your connection and try again.");
      return;
    }
    setError("");
    setProfile(result);
    window.scrollTo({ top: 0 });
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px 40px" }}>
      {!profile && (
        <>
          <header className="mx-auto mb-8 max-w-3xl px-4 pt-10 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#592209]">Name Numerology</p>
            <h1 className="mb-4 text-4xl text-[#301607] sm:text-6xl" style={{ fontFamily: "'Astra','Cinzel',serif" }}>
              {FEATURES.numerology.name}
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#4A2E1F] sm:text-lg">{FEATURES.numerology.subtitle}</p>
          </header>

          <p className="mx-auto mb-4 max-w-2xl px-4 text-center text-base leading-relaxed text-foreground/75 sm:text-lg">
            Explore what the letters of your name and the digits of your birth date add up to in numerology. Naamank Jyotish calculates your Destiny, Soul Urge, Personality, Chaldean, Life Path and Birth numbers, shows every step of the working, and gives the traditional meaning of each.
          </p>

          <form id="destiny-form" onSubmit={handleSubmit} noValidate style={{ maxWidth: 600, margin: "0 auto", padding: "32px 0 20px", scrollMarginTop: 100 }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <h2 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "clamp(24px,3.5vw,34px)", fontWeight: 700, color: "#301607", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                Your Details
              </h2>
              <p style={{ color: "#6B4A37", fontStyle: "italic", fontSize: 16 }}>Free with an account. Your details stay in your browser.</p>
            </div>

            {error && (
              <div role="alert" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "12px 16px", color: "#9B2C1D", fontSize: 14, marginBottom: 24, textAlign: "center" }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ background: "rgba(89,34,9,0.2)", border: "1px solid rgba(89,34,9,0.2)", borderRadius: 20, padding: "32px 28px", backdropFilter: "blur(16px)" }}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2" style={{ marginBottom: 20 }}>
                <div>
                  <label htmlFor="nd-first" style={{ display: "block", color: "#592209", fontWeight: 700, fontSize: 15, marginBottom: 10 }}>First Name *</label>
                  <input id="nd-first" style={inputStyle} maxLength={60} autoComplete="given-name" value={form.firstName} onChange={(e) => up("firstName", e.target.value)} placeholder="e.g. Rohan" />
                </div>
                <div>
                  <label htmlFor="nd-last" style={{ display: "block", color: "#592209", fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Last Name <span style={{ opacity: 0.6, fontWeight: 400 }}>(Optional)</span></label>
                  <input id="nd-last" style={inputStyle} maxLength={60} autoComplete="family-name" value={form.lastName} onChange={(e) => up("lastName", e.target.value)} placeholder="e.g. Mehta" />
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <label htmlFor="nd-dob" style={{ display: "block", color: "#592209", fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Date of Birth *</label>
                <input id="nd-dob" type="date" min="1900-01-01" max={today} style={inputStyle} value={form.dob} onChange={(e) => up("dob", e.target.value)} />
              </div>

              <button
                type="submit"
                style={{
                  width: "100%", padding: "20px", background: "#592209", border: "none", borderRadius: 40,
                  color: "#F5E9D6", fontWeight: 800, fontSize: 18, letterSpacing: "0.05em", textTransform: "uppercase",
                  cursor: "pointer", boxShadow: "0 0 30px rgba(89,34,9,0.35)",
                }}
              >
                ✦ Show My Naamank Jyotish ✦
              </button>
            </div>
          </form>
        </>
      )}

      {profile && (
        <>
          <NameDestinyReport profile={profile} />
          <button
            onClick={() => {
              setProfile(null);
              setForm(emptyForm());
            }}
            style={{
              display: "block", margin: "0 auto", padding: "14px 40px", background: "transparent",
              border: "1px solid rgba(89,34,9,0.3)", borderRadius: 50, color: "#6B4A37",
              fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            ✦ Analyze Another Name
          </button>
        </>
      )}

      {profile && (
        <AskDivyaSection
          feature="numerology"
          context={`Name: ${profile.name}. Born ${profile.dob}. Destiny ${profile.destiny.result}, Soul Urge ${profile.soulUrge.result}, Personality ${profile.personality.result}, Chaldean ${profile.chaldean.result}, Life Path ${profile.lifePath.result}, Birth number ${profile.birth.result}.`}
        />
      )}

      <NameNumerologyEducation />
    </div>
  );
}
